const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
// 상단 패키지 불러오는 곳에 jwt 추가
const jwt = require('jsonwebtoken');
// 파일 최상단 패키지 불러오는 곳에 미들웨어 주입 코드 추가
const { protect } = require('../middlewares/authMiddleware');
const verificationStore = {};
const { sendVerificationMail } = require('../utils/mailer');
const passport = require('passport');
const { generateToken } = require('../utils/token');


/**
 * @route   POST /api/auth/register
 * @desc    회원가입 (패스워드 암호화 및 오라클 시퀀스 인서트)
 * @access  Public
 */
router.post('/register', async (req, res) => {
  const { email, password, nickname, userType } = req.body;

  // [유효성 검사] 필수 파라미터 체크 (MyBatis @NonNull 혹은 유효성 어노테이션 역할)
  if (!email || !password || !nickname) {
    return sendError(res, '필수 입력 항목이 누락되었습니다.', 'BAD_REQUEST', 400);
  }

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1단계: 이메일 중복 체크 (Spring Boot의 UserRepository.existsByEmail 조회와 매핑)
    const checkSql = `SELECT USER_ID FROM CL_USERS WHERE EMAIL = :email`;
    const checkResult = await connection.execute(checkSql, { email });

    if (checkResult.rows.length > 0) {
      return sendError(res, '이미 존재하는 이메일입니다.', 'EMAIL_ALREADY_EXISTS', 400);
    }

    // 2단계: 패스워드 해싱 (BCryptPasswordEncoder.encode 역할)
    // saltRounds인 10은 해싱 속도와 보안 강도의 가장 표준적인 Trade-off 지점입니다.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3단계: 유저 정보 INSERT (MyBatis Mapper XML에 대응하는 오라클 쿼리)
    // 기본값인 USER_TYPE은 입력이 없으면 스키마 상 DEFAULT 'USER'로 처리되도록 바인딩
    const insertSql = `
      INSERT INTO CL_USERS (
        USER_ID, 
        EMAIL, 
        PASSWORD, 
        NICKNAME, 
        USER_TYPE
      ) VALUES (
        SEQ_CL_USERS.NEXTVAL, 
        :email, 
        :password, 
        :nickname, 
        :userType
      )
    `;

    const bindParams = {
      email,
      password: hashedPassword,
      nickname,
      userType: userType || 'USER'
    };

    await connection.execute(insertSql, bindParams);

    // 4단계: 트랜잭션 커밋 처리 (Spring의 @Transactional 자동 커밋 해제 상태이므로 수동 제어 필요)
    await connection.commit();

    // 5단계: 회원가입이 완료된 유저 정보 다시 조회 (비밀번호는 보안상 데이터에서 제외)
    const selectSql = `
      SELECT USER_ID as "userId", EMAIL as "email", NICKNAME as "nickname", USER_TYPE as "userType"
      FROM CL_USERS 
      WHERE EMAIL = :email
    `;
    const finalResult = await connection.execute(selectSql, { email });
    const newUser = finalResult.rows[0];

    // 공통 응답 포맷에 맞추어 반환
    return sendSuccess(res, '회원가입이 완료되었습니다.', newUser, 201);

  } catch (err) {
    // 에러 발생 시 트랜잭션 롤백 (Spring의 RollbackFor=Exception.class와 동일)
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('❌ [ROLLBACK ERROR]:', rollbackErr);
      }
    }
    console.error('❌ [REGISTER ERROR]:', err);
    return sendError(res, '회원가입 처리 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    // 커넥션 풀 반납 (HikariCP 커넥션 반환, 누수 차단을 위한 가장 핵심적인 엣지 케이스 처리)
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('❌ [CONNECTION CLOSE ERROR]:', closeErr);
      }
    }
  }
});

// -------------------------------------------------------------
// [API 1] 📨 이메일 인증번호 발송 라우터
// -------------------------------------------------------------
router.post('/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: '이메일 주소를 입력해 주세요.' });
  }

  try {
    // 1. 6자리 무작위 인증번호 생성 (100000 ~ 999999)
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    
    // 2. 만료 시간 설정 (현재 시간으로부터 3분 뒤)
    const expiresAt = Date.now() + 3 * 60 * 1000;

    // 3. 임시 저장소에 이메일을 키값으로 저장
    verificationStore[email] = {
      code: verificationCode,
      expiresAt
    };

    // 4. 실제로 메일 발송 유틸리티 호출
    await sendVerificationMail(email, verificationCode);
    
    console.log(`📩 [인증번호 발송 완료] ${email} -> ${verificationCode}`);
    return res.status(200).json({ success: true, message: '인증번호가 이메일로 발송되었습니다.' });

  } catch (error) {
    console.error('❌ [MAIL SEND ERROR]:', error);
    return res.status(500).json({ success: false, message: '인증 메일 발송 중 서버 에러가 발생했습니다.' });
  }
});

// -------------------------------------------------------------
// [API 2] ✅ 이메일 인증번호 검증 라우터
// -------------------------------------------------------------
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: '이메일과 인증번호를 모두 입력해 주세요.' });
  }

  const record = verificationStore[email];

  // 1. 해당 이메일로 발송된 기록이 없는 경우
  if (!record) {
    return res.status(400).json({ success: false, message: '인증 요청 기록이 없거나 만료되었습니다.' });
  }

  // 2. 유효 시간(3분)이 지난 경우
  if (Date.now() > record.expiresAt) {
    delete verificationStore[email]; // 만료된 데이터 삭제
    return res.status(400).json({ success: false, message: '인증 시간이 만료되었습니다. 다시 요청해 주세요.' });
  }

  // 3. 인증번호가 틀린 경우
  if (record.code !== String(code)) {
    return res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
  }

  // 4. 인증 성공 시 저장소에서 데이터 제거 후 성공 반환
  delete verificationStore[email];
  return res.status(200).json({ success: true, message: '이메일 인증이 완료되었습니다.' });
});

/**
 * @route   POST /api/auth/login
 * @desc    로그인 및 JWT 발급 (패스워드 검증 및 토큰 발행)
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // [유효성 검사] 필수 파라미터 체크
  if (!email || !password) {
    return sendError(res, '이메일과 비밀번호를 모두 입력해 주세요.', 'BAD_REQUEST', 400);
  }

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1단계: 이메일로 사용자 존재 여부 확인
    // 컬럼명 대소문자 혼선을 방지하기 위해 AS 키워드로 명세서와 매핑
    const selectSql = `
      SELECT USER_ID as "userId", 
             EMAIL as "email", 
             PASSWORD as "password", 
             NICKNAME as "nickname", 
             USER_TYPE as "userType", 
             PROFILE_IMAGE_URL as "profileImageUrl"
      FROM CL_USERS 
      WHERE EMAIL = :email
    `;
    const result = await connection.execute(selectSql, { email });

    // 사용자가 존재하지 않는 경우 (보안을 위해 비밀번호가 틀린 경우와 동일한 메시지 처리)
    if (result.rows.length === 0) {
      return sendError(res, '이메일 또는 비밀번호가 일치하지 않습니다.', 'INVALID_CREDENTIALS', 401);
    }

    const user = result.rows[0];

    // 2단계: bcrypt를 이용한 비밀번호 검증 (Spring의 passwordEncoder.matches 역할)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, '이메일 또는 비밀번호가 일치하지 않습니다.', 'INVALID_CREDENTIALS', 401);
    }

    // 3단계: JWT 토큰 페이로드 구성 및 발행
    // 민감한 정보(비밀번호 등)는 페이로드에서 무조건 제외합니다.
    const payload = {
      userId: user.userId,
      email: user.email,
      userType: user.userType
    };

    // 토큰 서명 및 만료시간 설정 (24시간)
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4단계: 클라이언트 응답 데이터 조립 (비밀번호 정보는 응답객체에서 삭제)
    const responseData = {
      accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        nickname: user.nickname,
        userType: user.userType,
        profileImageUrl: user.profileImageUrl
      }
    };

    return sendSuccess(res, '로그인에 성공했습니다.', responseData, 200);

  } catch (err) {
    console.error('❌ [LOGIN ERROR]:', err);
    return sendError(res, '로그인 처리 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    // 커넥션 반납
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('❌ [CONNECTION CLOSE ERROR]:', closeErr);
      }
    }
  }
});

// 구글 로그인 시작 (사용자가 버튼을 누르면 구글로 이동)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 구글 인증 후 돌아오는 콜백 (구글이 여기로 인증 정보를 보내줌)
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // JWT 토큰 생성 (기존 로그인 로직 활용)
    const userPayload = {
        userId: req.user.USER_ID || req.user.userId, // DB 컬럼명 확인!
        email: req.user.EMAIL || req.user.email,
        userType: 'USER'
    };
    const token = generateToken(userPayload); 
    // 프론트엔드 콜백 페이지로 토큰을 들고 리다이렉트
    console.log("서버에서 생성된 토큰:", token);
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

// 카카오 로그인 시작
router.get('/kakao', passport.authenticate('kakao'));

// 카카오 콜백
router.get('/kakao/callback', 
  passport.authenticate('kakao', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // 이미 일반/구글에서 쓰던 그 generateToken 재사용!
    const token = generateToken(req.user); 
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

/**
 * @route   GET /api/auth/profile   <-- 변경
 * @desc    현재 로그인한 유저의 프로필 정보 조회
 * @access  Private
 */
router.get('/profile', protect, async (req, res) => {
  let connection;
  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    const userId = req.user.userId;

    const selectSql = `
      SELECT USER_ID as "userId", 
             EMAIL as "email", 
             NICKNAME as "nickname", 
             USER_TYPE as "userType", 
             PROFILE_IMAGE_URL as "profileImageUrl"
      FROM CL_USERS 
      WHERE USER_ID = :userId
    `;
    
    const result = await connection.execute(selectSql, { userId });

    if (result.rows.length === 0) {
      return sendError(res, '해당 유저를 찾을 수 없습니다.', 'USER_NOT_FOUND', 404);
    }

    return sendSuccess(res, '유저 프로필 조회 성공', result.rows[0], 200);

  } catch (err) {
    console.error('❌ [GET PROFILE ERROR]:', err);
    return sendError(res, '프로필 조회 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

module.exports = router;