import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, TextField, Button, Avatar } from '@mui/material';
import api from '../api';
import socket from '../socket'; // 1. 소켓 임포트

function GlobalChatPage() {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const myNickname = localStorage.getItem('nickname');
  const myUserId = parseInt(localStorage.getItem('userId'));

  // 1. 기존 메시지 로드
  const fetchGlobalMessages = async () => {
    try {
      const res = await api.get('/chats/global');
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("채팅 로드 실패", err);
    }
  };

  useEffect(() => {
    fetchGlobalMessages();

    // 2. 소켓 연결 및 이벤트 수신
    socket.emit('join_room', '1'); // 채팅방 ID: 1 입장

    socket.on('receive_message', (data) => {
      // 서버로부터 새 메시지 받으면 리스트에 추가
      console.log("🔥 소켓으로 받은 데이터 최종 확인:", data);
      setMessages((prev) => [...prev, data]);
    });

    // 컴포넌트 언마운트 시 소켓 이벤트 해제 (메모리 누수 방지)
    return () => {
      socket.off('receive_message');
    };
  }, []);

  const handleSend = async () => {
  if (!content.trim()) return;

  const messageData = {
    roomId: '1',
    CONTENT: content, // 서버와 대문자 필드명 통일
    SENDER_ID: parseInt(localStorage.getItem('userId'))
  };

  try {
    // 1. DB 저장
    await api.post('/chats/1/messages', { content });
    // 2. 소켓 전송 (필요한 정보만 최소화)
    socket.emit('send_message', messageData);
    setContent('');
  } catch (err) {
    alert("전송 실패");
  }
};

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>전체 채팅방</Typography>
      
      <Box sx={{ height: '60vh', border: '1px solid #ccc', overflowY: 'auto', p: 2, mb: 2, bgcolor: '#f9f9f9', borderRadius: '8px' }}>
        {messages.map((m, i) => {
          const isMyMessage = m.SENDER_ID === myUserId;
          return (
            <Box key={i} sx={{ display: 'flex', justifyContent: isMyMessage ? 'flex-end' : 'flex-start', mb: 2 }}>
              {!isMyMessage && <Avatar src={m.PROFILE_IMAGE_URL} sx={{ mr: 1 }} />}
              <Box sx={{ 
                maxWidth: '60%', p: 1.5, borderRadius: '10px', 
                bgcolor: isMyMessage ? '#ffe812' : '#ffffff', boxShadow: 1
              }}>
                {!isMyMessage && <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>{m.NICKNAME}</Typography>}
                <Typography variant="body1">{m.CONTENT || m.content}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField fullWidth value={content} onChange={(e) => setContent(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
        <Button variant="contained" onClick={handleSend}>전송</Button>
      </Box>
    </Container>
  );
}

export default GlobalChatPage;