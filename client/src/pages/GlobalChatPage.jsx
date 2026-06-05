import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Box, Typography, TextField, Button, Avatar } from '@mui/material';
import api from '../api';
import socket from '../socket';

function GlobalChatPage() {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const messagesEndRef = useRef(null); // 스크롤용 ref
  const myUserId = parseInt(localStorage.getItem('userId'), 10);

  // 시간 형식 변환 함수
  const formatTime = (time) => {
    if (!time) return "";
    const date = new Date(time);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 자동 스크롤 함수
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 메시지가 바뀔 때마다 스크롤 이동
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    socket.emit('join_room', '1'); 

    const handleReceive = (data) => {
      console.log("🔥 소켓으로 받은 데이터:", data);
      setMessages((prev) => [...prev, data]);
    };

    socket.on('receive_message', handleReceive);

    return () => {
      socket.off('receive_message', handleReceive);
    };
  }, []);

  // 3. 메시지 전송
  const handleSend = async () => {
    if (!content.trim()) return;

    const messageData = {
      roomId: '1',
      CONTENT: content,
      SENDER_ID: myUserId
    };

    try {
      await api.post('/chats/1/messages', { content });
      socket.emit('send_message', messageData);
      setContent('');
    } catch (err) {
      alert("전송 실패");
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'text.primary' }}>전체 채팅방</Typography>
      
      {/* 채팅창 영역 */}
      <Box sx={{ 
        height: '60vh', 
        border: '1px solid', 
        borderColor: 'divider', 
        overflowY: 'auto', 
        p: 2, 
        mb: 2, 
        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#f9f9f9', 
        borderRadius: 2 
      }}>
        {messages.map((m, i) => {
          const isMyMessage = m.SENDER_ID === myUserId;
          return (
            <Box key={i} sx={{ display: 'flex', justifyContent: isMyMessage ? 'flex-end' : 'flex-start', mb: 2 }}>
              {!isMyMessage && <Avatar src={m.PROFILE_IMAGE_URL} sx={{ mr: 1 }} />}
              
              <Box sx={{ 
                maxWidth: '60%', 
                p: 1.5, 
                borderRadius: 2, 
                // 본인 메시지: 다크 모드면 톤다운된 포인트 컬러, 라이트 모드면 밝은 포인트 컬러
                bgcolor: isMyMessage 
                  ? (theme) => theme.palette.mode === 'dark' ? '#998800' : '#ffe812' 
                  : 'background.paper',
                boxShadow: 1
              }}>
                {!isMyMessage && (
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', color: 'text.secondary' }}>
                    {m.NICKNAME}
                  </Typography>
                )}
                
                <Typography variant="body1" sx={{ color: 'text.primary' }}>
                  {m.CONTENT || m.content}
                </Typography>
                
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  textAlign: 'right', 
                  fontSize: '0.65rem', 
                  mt: 0.5, 
                  color: 'text.secondary' 
                }}>
                  {formatTime(m.CREATED_AT || m.createdAt)}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* 입력창 영역 */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField 
          fullWidth 
          value={content} 
          onChange={(e) => setContent(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          sx={{ 
            '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } 
          }}
        />
        <Button variant="contained" onClick={handleSend} sx={{ px: 4 }}>전송</Button>
      </Box>
    </Container>
  );
}

export default GlobalChatPage;