const express = require('express');
const router = express.Router();
const db = require('../config/db'); // DB 연결 모듈
const { protect } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
router.use('/editor', express.static(path.join(__dirname, '../../uploads/editor')));
const fs = require('fs');

// 1. app.js의 정적 경로와 일치하도록 uploads 폴더 경로 생성
// __dirname이 server/src/routes 이므로, ../../uploads 로 올라가서 폴더를 잡습니다.
const uploadDir = path.join(__dirname, '../uploads/editor'); 

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // 이곳에 저장
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.get('/me', protect, async (req, res) => {
  const { userId } = req.params;
  const myId = req.user.userId; // 로그인한 유저 ID
  let connection;
  try {
    connection = await db.getPool().getConnection();
    const sql = `
      SELECT u.USER_ID as "userId", 
             u.NICKNAME as "nickname", 
             u.PROFILE_IMAGE_URL as "profileImage",
             u.BIO as "bio",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWING_ID = u.USER_ID) as "followers",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWER_ID = u.USER_ID) as "following",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWER_ID = :myId AND FOLLOWING_ID = u.USER_ID) as "isFollowing"
      FROM CL_USERS u
      WHERE u.USER_ID = :userId
    `;
    const result = await connection.execute(sql, { userId, myId });
    
    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error("프로필 조회 에러:", err);
    res.status(500).json({ error: "프로필 조회 실패" });
  } finally {
    if (connection) await connection.close();
  }
});

router.get('/search', async (req, res) => {
  const { keyword } = req.query;
  
  if (!keyword) {
    return res.json({ users: [] });
  }

  let connection;
  try {
    connection = await db.getPool().getConnection();
    
    // 1. NICKNAME은 문자열이므로 LIKE 검색 가능
    // 2. USER_ID는 숫자이므로 검색어(문자열)를 숫자나 문자열로 캐스팅하여 비교
    //    오라클의 TO_CHAR를 이용해 USER_ID를 문자열로 바꿔서 검색하면 안전합니다.
    const sql = `
      SELECT USER_ID as "userId", 
             NICKNAME as "nickname", 
             PROFILE_IMAGE_URL as "profileImage"
      FROM CL_USERS 
      WHERE NICKNAME LIKE :pattern 
      OR TO_CHAR(USER_ID) LIKE :pattern
    `;
    
    // :pattern에 '%'를 포함한 문자열 전달
    const result = await connection.execute(sql, { pattern: `%${keyword}%` });
    
    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error("유저 조회 실패:", err);
    res.status(500).json({ error: "유저 조회 실패" });
  } finally {
    if (connection) await connection.close();
  }
});

// 특정 유저 정보 조회 (수정본)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  let connection;
  try {
    connection = await db.getPool().getConnection();
    // /me와 동일한 테이블(CL_USERS)과 컬럼(PROFILE_IMAGE_URL) 사용
    const sql = `
      SELECT u.USER_ID as "userId", 
             u.NICKNAME as "nickname", 
             u.PROFILE_IMAGE_URL as "profileImage",
             u.BIO as "bio",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWING_ID = u.USER_ID) as "followers",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWER_ID = u.USER_ID) as "following"
      FROM CL_USERS u WHERE u.USER_ID = :userId
    `;
    const result = await connection.execute(sql, { userId });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "유저를 찾을 수 없습니다." });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("유저 조회 실패:", err);
    res.status(500).json({ error: "유저 조회 실패" });
  } finally {
    if (connection) await connection.close();
  }
});

router.put('/profile', protect, upload.single('profileImage'), async (req, res) => {
  const userId = req.user.userId; // protect 미들웨어에서 제공
  const { nickname, bio } = req.body;
  const profileImageUrl = req.file ? `/uploads/editor/${req.file.filename}` : null;

  let connection;
  try {
    connection = await db.getPool().getConnection();
    
    // 기본 UPDATE 쿼리 (이미지 경로 포함 여부에 따라 유연하게 처리)
    let sql = `UPDATE CL_USERS SET NICKNAME = :nickname, BIO = :bio`;
    const params = { nickname, bio, userId };

    if (profileImageUrl) {
      sql += `, PROFILE_IMAGE_URL = :profileImageUrl`;
      params.profileImageUrl = profileImageUrl;
    }
    sql += ` WHERE USER_ID = :userId`;

    await connection.execute(sql, params);
    await connection.commit();

    res.status(200).json({ 
        success: true, 
        profileImageUrl: profileImageUrl // 클라이언트에서 이미지 갱신용으로 사용
    });
  } catch (err) {
    console.error("프로필 업데이트 실패:", err);
    res.status(500).json({ error: "프로필 수정 실패" });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;