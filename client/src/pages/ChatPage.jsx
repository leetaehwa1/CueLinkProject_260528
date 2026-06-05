import React, { useState, useEffect, useCallback,useRef } from 'react';
import { Box, List, ListItemButton, ListItemAvatar, Avatar, ListItemText, Typography, TextField, Button, Paper } from '@mui/material';
import api from '../api';
import socket from '../socket';
import { useParams, useNavigate } from 'react-router-dom';

function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem('userId'), 10);
  const messagesEndRef = useRef(null); // 1. useRef 생성
  
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // 2. 메시지가 바뀔 때마다 실행되는 함수
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 3. messages 배열이 바뀔 때마다 스크롤 함수 호출
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. 방 목록 로드
  useEffect(() => {
    api.get('/chats/direct/rooms').then(res => setRooms(res.data.rooms));
  }, []);

  // 2. [입장] 방이 바뀌면 메시지 로드 & 소켓 방 입장
  useEffect(() => {
    if (!roomId) return;

    // 메시지 불러오기
    api.get(`/chats/${roomId}/messages`).then(res => setMessages(res.data.messages));
    
    // 소켓 방 입장
    socket.emit('join_room', roomId);

    // 현재 선택된 방 정보 찾기 (목록에서)
    const room = rooms.find(r => r.CHAT_ROOM_ID === parseInt(roomId));
    setSelectedRoom(room);
  }, [roomId, rooms]);

  // 3. [수신] 메시지 수신 (의존성 배열 빈 값 유지, off 필수)
  // 3. [수신] 메시지 수신 로직을 이렇게 보강해보세요
useEffect(() => {
  const handleReceive = (msg) => {
    // 서버가 보내주는 데이터 확인용 로그
    console.log("수신된 메시지 객체:", msg);

    // 데이터가 완전하지 않다면 기본값 세팅 (서버 소켓 로직에 따라 조절)
    const newMsg = {
        MESSAGE_ID: msg.MESSAGE_ID || Date.now(), // ID가 없으면 임시 생성
        SENDER_ID: msg.senderId || msg.SENDER_ID,
        CONTENT: msg.content || msg.CONTENT,
        CREATED_AT: msg.createdAt || msg.CREATED_AT || new Date().toISOString(), // 지금 시간이라도 설정
        NICKNAME: msg.nickname || msg.NICKNAME || "상대방"
    };

    setMessages((prev) => [...prev, newMsg]);
  };
  
  socket.on('receive_message', handleReceive);
  return () => socket.off('receive_message', handleReceive);
}, [roomId]); // roomId가 변할 때마다 바인딩이 꼬이지 않게 [roomId]를 넣는 것이 좋습니다.

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    
    const content = input;
    setInput(''); 

    // [변경점] 여기에서 setMessages를 호출하지 마세요!
    // 서버 DB 저장 후 소켓으로 나에게 돌아오는 메시지를 리스너가 받아서 처리하게 합니다.
    await api.post(`/chats/${roomId}/messages`, { content });
    socket.emit('send_message', { 
        roomId, 
        SENDER_ID: currentUserId, 
        content 
    });
  }, [input, roomId, currentUserId]);
  

  // 1. 유틸리티 함수를 하나 만듭니다 (컴포넌트 바깥이나 상단에)
  const formatTime = (time) => {
    if (!time) return "";
    
    // 1. 이미 Date 객체라면 그대로 사용
    const date = (time instanceof Date) ? time : new Date(time);
    
    // 2. 유효한 날짜인지 확인
    if (isNaN(date.getTime())) return "";
    
    // 3. 시간 출력 (오전/오후 등을 고려한 정석 방식)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 100px)',
      border: '1px solid', 
      borderColor: 'divider', 
      borderRadius: 2, 
      overflow: 'hidden',
      bgcolor: 'background.paper' ,
      mt: 2,
      width: '100%'
    }}>
      {/* 대화 목록 사이드바 */}
      <Box sx={{ 
        width: '280px', 
        flexShrink: 0,
        borderRight: '1px solid', 
        borderColor: 'divider', 
        bgcolor: 'background.default', 
        overflowY: 'auto' 
      }}>
        <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>대화 목록</Typography>
        <List>
          {rooms.map((room) => (
            <ListItemButton 
              key={room.CHAT_ROOM_ID} 
              onClick={() => navigate(`/chat/${room.CHAT_ROOM_ID}`)} 
              selected={parseInt(roomId) === room.CHAT_ROOM_ID}
            >
              <ListItemAvatar><Avatar src={`http://localhost:4000${room.PROFILE_IMAGE_URL}`} /></ListItemAvatar>
              <ListItemText primary={room.NICKNAME} secondary="최신 메시지..." />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* 대화 내용 영역 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', overflow: 'hidden',
    minWidth: 0 }}>
        {selectedRoom ? (
          <>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 'bold' }}>
              {selectedRoom.NICKNAME}님과의 대화
            </Box>
            
            {/* 채팅창 영역: 다크 모드에선 어둡게, 라이트 모드에선 메신저 느낌으로 */}
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              p: 3, 
              bgcolor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#e5ddd5' 
            }}>
             {messages.map((m, i) => (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: m.SENDER_ID === currentUserId ? 'flex-end' : 'flex-start', mb: 2 }}>
                {m.SENDER_ID !== currentUserId && (
                  <Typography variant="caption" sx={{ ml: 1, mb: 0.5, color: 'text.secondary' }}>
                    {m.NICKNAME}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  {m.SENDER_ID === currentUserId && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      {formatTime(m.CREATED_AT)}
                    </Typography>
                  )}

                  <Paper sx={{ 
                    p: 1.5, 
                    px: 2, 
                    borderRadius: 2, 
                    maxWidth: '85%',
                    bgcolor: m.SENDER_ID === currentUserId 
                      ? (theme) => theme.palette.mode === 'dark' ? '#056162' : '#dcf8c6' 
                      : 'background.paper' 
                  }}>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>{m.CONTENT}</Typography>
                  </Paper>

                  {m.SENDER_ID !== currentUserId && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      {formatTime(m.CREATED_AT)}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
            </Box>
            
            <Box sx={{ p: 2, display: 'flex', gap: 1, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
              <TextField fullWidth size="small" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
              <Button variant="contained" onClick={sendMessage}>전송</Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'text.disabled' }}>
            대화할 상대를 선택하세요.
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ChatPage;