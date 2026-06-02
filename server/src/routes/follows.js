const express = require('express');
const router = express.Router();
const db = require('../config/db'); // DB 연결 모듈
const { protect } = require('../middlewares/authMiddleware'); // 인증 미들웨어

// 팔로우/언팔로우 토글
router.post('/:followingId', protect, async (req, res) => {
  const followerId = req.user.userId;
  const { followingId } = req.params;
  let connection;

  try {
    connection = await db.getPool().getConnection();
    
    // 1. 이미 팔로우 중인지 확인
    const checkSql = `SELECT FOLLOW_ID FROM CL_FOLLOWS WHERE FOLLOWER_ID = :followerId AND FOLLOWING_ID = :followingId`;
    const checkResult = await connection.execute(checkSql, { followerId, followingId });

    if (checkResult.rows.length > 0) {
      // 2. 이미 있으면 언팔로우 (삭제)
      await connection.execute(
        `DELETE FROM CL_FOLLOWS WHERE FOLLOWER_ID = :followerId AND FOLLOWING_ID = :followingId`,
        { followerId, followingId }
      );
      await connection.commit();
      res.status(200).json({ followed: false });
    } else {
      // 3. 없으면 팔로우 (삽입)
      await connection.execute(
        `INSERT INTO CL_FOLLOWS (FOLLOW_ID, FOLLOWER_ID, FOLLOWING_ID) VALUES (SEQ_CL_FOLLOWS.NEXTVAL, :followerId, :followingId)`,
        { followerId, followingId }
      );
      await connection.commit();
      res.status(200).json({ followed: true });
    }
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("팔로우 처리 에러:", err);
    res.status(500).json({ error: "팔로우 처리 실패" });
  } finally {
    if (connection) await connection.close();
  }
});

// 팔로우 상태 조회
router.get('/status/:followingId', protect, async (req, res) => {
  const followerId = req.user.userId;
  const { followingId } = req.params;

  // [디버그 로그 추가] 서버 터미널에서 확인하세요
  console.log("팔로우 상태 조회 요청:", { followerId, followingId });

  if (!followingId || followingId === 'undefined') {
    return res.status(400).json({ error: "유효하지 않은 사용자 ID입니다." });
  }
  
  try {
    const connection = await db.getPool().getConnection();
    const result = await connection.execute(
      `SELECT 1 FROM CL_FOLLOWS WHERE FOLLOWER_ID = :followerId AND FOLLOWING_ID = :followingId`,
      { followerId, followingId }
    );
    await connection.close();
    res.status(200).json({ isFollowing: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "상태 조회 실패" });
  }
});

// 1. 나를 팔로우하는 사람 리스트 (Followers)
router.get('/:userId/followers', async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await db.getPool().getConnection();
    const sql = `
      SELECT u.USER_ID, u.NICKNAME, u.PROFILE_IMAGE_URL
      FROM CL_FOLLOWS f
      JOIN CL_USERS u ON f.FOLLOWER_ID = u.USER_ID
      WHERE f.FOLLOWING_ID = :userId
    `;
    const result = await connection.execute(sql, { userId });
    await connection.close();
    res.status(200).json({ list: result.rows });
  } catch (err) {
    res.status(500).json({ error: "팔로워 목록 조회 실패" });
  }
});

// 2. 내가 팔로우하는 사람 리스트 (Following)
router.get('/:userId/following', async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await db.getPool().getConnection();
    const sql = `
      SELECT u.USER_ID, u.NICKNAME, u.PROFILE_IMAGE_URL
      FROM CL_FOLLOWS f
      JOIN CL_USERS u ON f.FOLLOWING_ID = u.USER_ID
      WHERE f.FOLLOWER_ID = :userId
    `;
    const result = await connection.execute(sql, { userId });
    await connection.close();
    res.status(200).json({ list: result.rows });
  } catch (err) {
    res.status(500).json({ error: "팔로잉 목록 조회 실패" });
  }
});

module.exports = router;