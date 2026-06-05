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

router.get('/direct/rooms', protect, async (req, res) => {
    const currentUserId = req.user.userId;
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            SELECT 
                r.CHAT_ROOM_ID, 
                u.NICKNAME, 
                u.PROFILE_IMAGE_URL,
                m.CONTENT AS "latestMessage",
                m.CREATED_AT AS "lastTime",
                (
                    SELECT COUNT(*) 
                    FROM CL_CHAT_MESSAGES msg
                    WHERE msg.CHAT_ROOM_ID = r.CHAT_ROOM_ID
                    AND msg.MESSAGE_ID > rm.LAST_READ_MESSAGE_ID
                    AND msg.SENDER_ID <> :currentUserId
                ) AS "UNREAD_COUNT"
            FROM CL_CHAT_ROOMS r
            JOIN CL_CHAT_ROOM_MEMBERS rm ON r.CHAT_ROOM_ID = rm.CHAT_ROOM_ID
            JOIN CL_USERS u ON rm.USER_ID = u.USER_ID AND u.USER_ID <> :currentUserId
            LEFT JOIN (
                SELECT CHAT_ROOM_ID, CONTENT, CREATED_AT, MESSAGE_ID,
                       ROW_NUMBER() OVER (PARTITION BY CHAT_ROOM_ID ORDER BY CREATED_AT DESC) as rn
                FROM CL_CHAT_MESSAGES
            ) m ON r.CHAT_ROOM_ID = m.CHAT_ROOM_ID AND m.rn = 1
            WHERE r.ROOM_TYPE = 'DIRECT'
            AND r.CHAT_ROOM_ID IN (
                SELECT CHAT_ROOM_ID FROM CL_CHAT_ROOM_MEMBERS WHERE USER_ID = :currentUserId
            )
            ORDER BY m.CREATED_AT DESC NULLS LAST
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
    const io = req.app.get('io'); // 여기서 io를 가져옵니다

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
        // 2. 실시간 알림 전송 (채팅방 멤버들에게)
        io.to(roomId).emit('receive_notification', {
            message: `${req.user.nickname}님으로부터 새 메시지가 왔습니다.`,
            senderId: senderId,
            roomId: roomId,
            content: content
        });
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("🔥 [서버 DB 에러 상세]:", err); // err만 찍지 말고 err를 직접 보세요.
        res.status(500).json({ error: "메시지 전송 실패", details: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

router.post('/direct/:targetId', protect, async (req, res) => {
    const { targetId } = req.params;
    const currentUserId = req.user.userId;
    console.log("🔥 타겟 ID:", targetId, "현재 유저 ID:", currentUserId);
    let connection;

    try {
        connection = await db.getPool().getConnection();

        // 1. 두 유저가 포함된 'DIRECT' 방이 있는지 확인
        const checkSql = `
            SELECT m1.CHAT_ROOM_ID 
            FROM CL_CHAT_ROOM_MEMBERS m1
            JOIN CL_CHAT_ROOM_MEMBERS m2 ON m1.CHAT_ROOM_ID = m2.CHAT_ROOM_ID
            JOIN CL_CHAT_ROOMS r ON m1.CHAT_ROOM_ID = r.CHAT_ROOM_ID
            WHERE m1.USER_ID = :currentUserId AND m2.USER_ID = :targetId
            AND r.ROOM_TYPE = 'DIRECT'
        `;
        const existing = await connection.execute(checkSql, { currentUserId, targetId });

        if (existing.rows.length > 0) {
            return res.status(200).json({ roomId: existing.rows[0].CHAT_ROOM_ID });
        }

        // 2. 방이 없으면 생성
        console.log("방 생성 로직 진입");
        const resultSeq = await connection.execute(`SELECT SEQ_CL_CHAT_ROOMS.NEXTVAL AS NEXT_ID FROM DUAL`);
        
        // Oracle 결과값이 객체인지 배열인지 확인하여 값 추출
        const roomId = resultSeq.rows[0].NEXT_ID || Object.values(resultSeq.rows[0])[0];
        console.log("생성할 방 ID:", roomId);

        // 숫자 타입으로 확실하게 변환하여 삽입
        const roomIdNum = Number(roomId);
        
        await connection.execute(
            `INSERT INTO CL_CHAT_ROOMS (CHAT_ROOM_ID, ROOM_TYPE) VALUES (:roomId, 'DIRECT')`, 
            { roomId: roomIdNum }
        );
        await connection.execute(
            `INSERT INTO CL_CHAT_ROOM_MEMBERS (CHAT_ROOM_ID, USER_ID) VALUES (:roomId, :currentUserId)`, 
            { roomId: roomIdNum, currentUserId }
        );
        await connection.execute(
            `INSERT INTO CL_CHAT_ROOM_MEMBERS (CHAT_ROOM_ID, USER_ID) VALUES (:roomId, :targetId)`, 
            { roomId: roomIdNum, targetId }
        );
        
        await connection.commit();
        res.status(201).json({ roomId: roomIdNum });

    } catch (err) {
        console.error("🔥 서버 에러 상세 정보:", err);
        if (connection) await connection.rollback();
        res.status(500).json({ error: "채팅방 생성 실패", details: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

router.get('/:roomId/messages', protect, async (req, res) => {
    const { roomId } = req.params;
    let connection;
    
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            SELECT m.MESSAGE_ID, m.CONTENT, m.SENDER_ID, u.NICKNAME, 
                   TO_CHAR(m.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as CREATED_AT
            FROM CL_CHAT_MESSAGES m
            JOIN CL_USERS u ON m.SENDER_ID = u.USER_ID
            WHERE m.CHAT_ROOM_ID = :roomId
            ORDER BY m.CREATED_AT ASC
        `;
        const result = await connection.execute(sql, { roomId });
        res.status(200).json({ messages: result.rows });
    } catch (err) {
        res.status(500).json({ error: "메시지 로드 실패" });
    } finally {
        if (connection) await connection.close();
    }
});

// 4. 채팅방 읽음 처리 (입장 시 호출)
router.post('/:roomId/read', protect, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await db.getPool().getConnection();
        
        // 해당 방의 가장 최근 메시지 ID를 가져와서 내 LAST_READ_MESSAGE_ID로 업데이트
        const sql = `
            UPDATE CL_CHAT_ROOM_MEMBERS 
            SET LAST_READ_MESSAGE_ID = (
                SELECT MAX(MESSAGE_ID) 
                FROM CL_CHAT_MESSAGES 
                WHERE CHAT_ROOM_ID = :roomId
            )
            WHERE CHAT_ROOM_ID = :roomId 
            AND USER_ID = :userId
        `;
        
        await connection.execute(sql, { roomId, userId });
        await connection.commit();
        
        res.status(200).json({ success: true });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: "읽음 처리 실패" });
    } finally {
        if (connection) await connection.close();
    }
});

module.exports = router;