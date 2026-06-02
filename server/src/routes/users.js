const express = require('express');
const router = express.Router();
const db = require('../config/db'); // DB 연결 모듈
const { protect } = require('../middlewares/authMiddleware');

router.get('/me', protect, async (req, res) => {
  const userId = req.user.userId;
  let connection;
  try {
    connection = await db.getPool().getConnection();
    const sql = `
      SELECT u.USER_ID as "userId", 
             u.NICKNAME as "nickname", 
             u.PROFILE_IMAGE_URL as "profileImage",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWING_ID = u.USER_ID) as "followers",
             (SELECT COUNT(*) FROM CL_FOLLOWS WHERE FOLLOWER_ID = u.USER_ID) as "following"
      FROM CL_USERS u
      WHERE u.USER_ID = :userId
    `;
    const result = await connection.execute(sql, { userId });
    
    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error("프로필 조회 에러:", err);
    res.status(500).json({ error: "프로필 조회 실패" });
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