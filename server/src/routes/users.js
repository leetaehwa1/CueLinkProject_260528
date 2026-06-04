const express = require('express');
const router = express.Router();
const db = require('../config/db'); // DB 연결 모듈
const { protect } = require('../middlewares/authMiddleware');

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



module.exports = router;