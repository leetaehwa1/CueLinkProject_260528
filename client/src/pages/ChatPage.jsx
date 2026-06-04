import React, { useState, useEffect, useCallback } from 'react';
import { Box, List, ListItemButton, ListItemAvatar, Avatar, ListItemText, Typography, TextField, Button, Paper } from '@mui/material';
import api from '../api';
import socket from '../socket';
import { useParams, useNavigate } from 'react-router-dom';

function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem('userId'), 10);
  
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

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
  useEffect(() => {
    const handleReceive = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on('receive_message', handleReceive);
    return () => socket.off('receive_message', handleReceive);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    
    const content = input;
    setInput(''); 

    // [변경점] 여기에서 setMessages를 호출하지 마세요!
    // 서버 DB 저장 후 소켓으로 나에게 돌아오는 메시지를 리스너가 받아서 처리하게 합니다.
    await api.post(`/chats/${roomId}/messages`, { content });
    socket.emit('send_message', { 
        roomId, 
        senderId: currentUserId, 
        content 
    });
  }, [input, roomId, currentUserId]);

  return (
    <Box sx={{ display: 'flex', height: '80vh', border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ width: '300px', borderRight: '1px solid #ddd', bgcolor: '#f9f9f9', overflowY: 'auto' }}>
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

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedRoom ? (
          <>
            <Box sx={{ p: 2, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>{selectedRoom.NICKNAME}님과의 대화</Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#e5ddd5' }}>
             {messages.map((m, i) => (
  <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: m.SENDER_ID === currentUserId ? 'flex-end' : 'flex-start', mb: 2 }}>
    {/* 상대방일 때만 닉네임 표시 */}
    {m.SENDER_ID !== currentUserId && (
      <Typography variant="caption" sx={{ ml: 1, mb: 0.5, color: 'text.secondary' }}>
        {m.NICKNAME}
      </Typography>
    )}
    
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
      {/* 본인일 때 시간 왼쪽 */}
      {m.SENDER_ID === currentUserId && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {m.CREATED_AT.split(' ')[1].substring(0, 5)}
        </Typography>
      )}

      <Paper sx={{ p: 1, px: 2, borderRadius: 2, bgcolor: m.SENDER_ID === currentUserId ? '#dcf8c6' : 'white' }}>
        <Typography variant="body2">{m.CONTENT}</Typography>
      </Paper>

      {/* 상대방일 때 시간 오른쪽 */}
      {m.SENDER_ID !== currentUserId && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {m.CREATED_AT.split(' ')[1].substring(0, 5)}
        </Typography>
      )}
    </Box>
  </Box>
))}
            </Box>
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
              <TextField fullWidth size="small" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
              <Button variant="contained" onClick={sendMessage}>전송</Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#999' }}>대화할 상대를 선택하세요.</Box>
        )}
      </Box>
    </Box>
  );
}

export default ChatPage;