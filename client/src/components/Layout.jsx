import React, { useEffect, useState } from 'react';
import { 
  Box, Stack, Button, Fab, Avatar, Typography, 
  List, ListItem, ListItemButton, ListItemText, Drawer, TextField 
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [directRooms, setDirectRooms] = useState([]);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  
  // 검색용 상태 추가
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const isLoggedIn = !!localStorage.getItem('token');
  const nickname = localStorage.getItem('nickname');
  const profileImage = localStorage.getItem('profileImage');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  // 검색 로직 (Debounce 적용)
  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?keyword=${keyword}`);
        setSearchResults(res.data.users);
      } catch (err) {
        console.error("검색 실패", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (isLoggedIn) {
      api.get('/chats/direct/rooms').then(res => setDirectRooms(res.data.rooms));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    socket.on('refresh_rooms', () => {
      api.get('/chats/direct/rooms').then(res => setDirectRooms(res.data.rooms));
    });
    return () => socket.off('refresh_rooms');
  }, []);

  return (
    <Box sx={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {/* 1. 좌측 메뉴 */}
      <Box sx={{ width: '250px', borderRight: '1px solid #dbdbdb', height: '100vh', position: 'sticky', top: 0, pt: 3, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ paddingLeft: '20px', cursor: 'pointer', marginTop: 0 }} onClick={() => navigate('/')}>CueLink</h2>
        
        {isLoggedIn && (
          <Box sx={{ px: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer'}} onClick={() => navigate('/profile')}>
            <Avatar src={profileImage} sx={{ width: 30, height: 30 }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{nickname}</Typography>
          </Box>
        )}

        <Stack spacing={2} sx={{ px: 2, flexGrow: 1 }}>
          <Button startIcon={<HomeIcon />} sx={{ justifyContent: 'flex-start', color: 'black' }} onClick={() => navigate('/')}>홈</Button>
          <Button startIcon={<SearchIcon />} sx={{ justifyContent: 'flex-start', color: 'black' }} onClick={() => setSearchDrawerOpen(true)}>검색</Button>
          
          <Button 
            startIcon={<PublicOutlinedIcon />} 
            sx={{ justifyContent: 'flex-start', color: 'black' }} 
            onClick={() => navigate('/chat/global')}
          >
            전체 채팅
          </Button>
          <Button startIcon={<ChatBubbleOutlineOutlined />} sx={{ justifyContent: 'flex-start', color: 'black' }} onClick={() => setChatDrawerOpen(true)}>메시지</Button>
          <Button startIcon={<PersonIcon />} sx={{ justifyContent: 'flex-start', color: 'black' }} onClick={() => navigate('/profile')}>프로필</Button>
        </Stack>

        <Box sx={{ px: 2, mb: 3, pt: 2, borderTop: '1px solid #eee' }}>
          {isLoggedIn ? (
            <Button fullWidth startIcon={<LogoutIcon />} sx={{ justifyContent: 'flex-start', color: 'gray' }} onClick={handleLogout}>로그아웃</Button>
          ) : (
            <Button fullWidth startIcon={<LoginIcon />} sx={{ justifyContent: 'flex-start', color: 'primary.main' }} onClick={() => navigate('/login')}>로그인</Button>
          )}
        </Box>
      </Box>

      {/* 검색 Drawer */}
      <Drawer anchor="left" open={searchDrawerOpen} onClose={() => setSearchDrawerOpen(false)}>
        <Box sx={{ width: 350, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>검색</Typography>
          <TextField 
            fullWidth 
            placeholder="사용자 검색..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)} 
            sx={{ mb: 2 }}
          />
          <List>
            {searchResults.map((user) => (
              <ListItemButton key={user.userId} onClick={() => { navigate(`/profile/${user.userId}`); setSearchDrawerOpen(false); }}>
                <Avatar src={user.profileImage} sx={{ mr: 2 }} />
                <ListItemText primary={user.nickname} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* 메시지 Drawer */}
      <Drawer anchor="right" open={chatDrawerOpen} onClose={() => setChatDrawerOpen(false)}>
        <Box sx={{ width: 350, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>내 메시지</Typography>
          <List>
            {directRooms.map((room) => (
              <ListItem key={room.CHAT_ROOM_ID} disablePadding sx={{ mb: 1 }}>
                <ListItemButton 
                  onClick={() => { navigate(`/chat/${room.CHAT_ROOM_ID}`); setChatDrawerOpen(false); }}
                  selected={location.pathname === `/chat/${room.CHAT_ROOM_ID}`}
                  sx={{ borderRadius: 2 }}
                >
                  <Avatar src={`http://localhost:4000${room.PROFILE_IMAGE_URL}`} sx={{ width: 40, height: 40, mr: 2 }} />
                  <ListItemText primary={room.NICKNAME} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ width: '600px', borderRight: '1px solid #dbdbdb', minHeight: '100vh', p: 3 }}>
        <Outlet />
      </Box>

      <Box sx={{ width: '300px', p: 3 }} />

      {isLoggedIn && location.pathname !== '/write' && location.pathname !== '/chat/global' && (
        <Fab color="primary" sx={{ position: 'fixed', bottom: 30, right: 30 }} onClick={() => navigate('/write')}>
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}

export default Layout;