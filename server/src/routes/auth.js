const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

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

module.exports = router;