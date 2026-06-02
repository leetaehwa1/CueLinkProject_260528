const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware');

// 1. 전체 채팅방 메시지 조회
router.get('/global', async (req, res) => {
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            SELECT m.CONTENT, m.CREATED_AT, u.NICKNAME, u.PROFILE_IMAGE_URL, m.SENDER_ID
            FROM CL_CHAT_MESSAGES m
            JOIN CL_USERS u ON m.SENDER_ID = u.USER_ID
            WHERE m.CHAT_ROOM_ID = (SELECT CHAT_ROOM_ID FROM CL_CHAT_ROOMS WHERE ROOM_TYPE = 'GLOBAL')
            ORDER BY m.CREATED_AT ASC
        `;
        const result = await connection.execute(sql);
        res.json({ messages: result.rows });
    } catch (err) {
        res.status(500).json({ error: "전체 채팅 로드 실패" });
    } finally {
        if (connection) await connection.close();
    }
});

// 2. 내 1:1 채팅방 목록 조회
router.get('/direct/rooms', protect, async (req, res) => {
    const currentUserId = req.user.userId;
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            SELECT r.CHAT_ROOM_ID, u.NICKNAME, u.PROFILE_IMAGE_URL
            FROM CL_CHAT_ROOMS r
            JOIN CL_CHAT_ROOM_MEMBERS m ON r.CHAT_ROOM_ID = m.CHAT_ROOM_ID
            JOIN CL_USERS u ON m.USER_ID = u.USER_ID
            WHERE r.ROOM_TYPE = 'DIRECT'
            AND r.CHAT_ROOM_ID IN (SELECT CHAT_ROOM_ID FROM CL_CHAT_ROOM_MEMBERS WHERE USER_ID = :currentUserId)
            AND u.USER_ID <> :currentUserId
        `;
        const result = await connection.execute(sql, { currentUserId });
        res.json({ rooms: result.rows });
    } catch (err) {
        res.status(500).json({ error: "채팅방 목록 로드 실패" });
    } finally {
        if (connection) await connection.close();
    }
});

// 3. 메시지 전송 (전체/1:1 공통)
router.post('/:roomId/messages', protect, async (req, res) => {
    const { roomId } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;

    console.log("🔥 [디버깅] 받은 데이터:", { roomId, content, senderId });

    if (!content) {
        return res.status(400).json({ error: "내용이 없습니다." });
    }
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const msgId = await connection.execute(`SELECT SEQ_CL_CHAT_MESSAGES.NEXTVAL FROM DUAL`).then(r => r.rows[0][0]);
        
        await connection.execute(`
           INSERT INTO CL_CHAT_MESSAGES (MESSAGE_ID, CHAT_ROOM_ID, SENDER_ID, CONTENT)
            VALUES (SEQ_CL_CHAT_MESSAGES.NEXTVAL, :roomId, :senderId, :content)
        `, { roomId, senderId, content });
        
        await connection.commit();
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("🔥 [서버 DB 에러 상세]:", err); // err만 찍지 말고 err를 직접 보세요.
        res.status(500).json({ error: "메시지 전송 실패", details: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

module.exports = router;