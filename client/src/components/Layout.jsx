import React, { useEffect, useState } from 'react';
import { 
  Box, Stack, Button, Fab, Avatar, Typography, 
  List, ListItem, ListItemButton, ListItemText, Drawer, TextField ,Badge
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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from '@mui/material/styles'; // 테마 정보 확인용

function Layout({ toggleTheme }) {
  const getImageUrl = (path) => {
    if (!path) return ''; 
    const timestamp = new Date().getTime(); // 캐시 방지용
    return `http://localhost:4000${path}?t=${timestamp}`;
  };
  const dummySuggestions = [
    { userId: 1, nickname: '호날두', profileImage: null },
    { userId: 2, nickname: '손흥민', profileImage: null },
    { userId: 3, nickname: '메시', profileImage: null },
  ];
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme(); // 현재 테마 정보를 가져옴
  
  const [directRooms, setDirectRooms] = useState([]);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  
  // 검색용 상태 추가
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const isLoggedIn = !!localStorage.getItem('token');
  const nickname = localStorage.getItem('nickname');
  const profileImage = localStorage.getItem('profileImage');
  const totalUnread = directRooms.reduce((sum, room) => sum + (room.UNREAD_COUNT || 0), 0);

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
    <Box sx={{ display: 'flex', justifyContent: 'center', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', width: '100%'}}>
      {/* 1. 좌측 메뉴 */}
      {/* 좌측 사이드바 */}
      <Box sx={{ 
        width: '240px', 
        flexShrink: 0, 
        borderRight: '1px solid', 
        borderColor: 'divider', // 테마에 맞춰 테두리 색상이 자동 변경됨
        height: '100vh', 
        position: 'sticky', 
        top: 0, 
        pt: 4, 
        pb: 2,
        display: 'flex', 
        flexDirection: 'column',
        px: 2
      }}>
        {/* 로고 영역 */}
        <Typography 
          variant="h5" 
          sx={{ fontWeight: '800', mb: 4, px: 2, cursor: 'pointer' }} 
          onClick={() => navigate('/')}
        >
          CueLink
        </Typography>
        
        {/* 메뉴 버튼 스타일 통합 */}
        <Stack spacing={1} sx={{ flexGrow: 1 }}>
          {[
            { label: '홈', icon: <HomeIcon />, path: '/' },
            { label: '검색', icon: <SearchIcon />, action: () => setSearchDrawerOpen(true) },
            { label: '전체 채팅', icon: <PublicOutlinedIcon />, path: '/chat/global' },
            { label: '메시지', icon: <ChatBubbleOutlineOutlined />, action: () => setChatDrawerOpen(true), badge: true },
            { label: '프로필', icon: <PersonIcon />, path: '/profile' }
          ].map((item, index) => (
            <Button 
              key={index}
              startIcon={item.badge ? (
                <Badge variant="dot" color="error" invisible={directRooms.every(r => (r.UNREAD_COUNT || 0) === 0)}>
                  {item.icon}
                </Badge>
              ) : item.icon}
              onClick={item.action || (() => navigate(item.path))}
              sx={{ 
                justifyContent: 'flex-start', 
                color: 'text.primary', 
                py: 1.5, 
                px: 2, 
                borderRadius: 2,
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': { bgcolor: 'action.hover' } // 마우스 올렸을 때 은은한 효과
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        {/* 하단 설정 및 로그인 */}
        <Stack spacing={1} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Button 
            fullWidth 
            startIcon={theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            sx={{ justifyContent: 'flex-start', color: 'text.secondary', px: 2 }} 
            onClick={toggleTheme}
          >
            {theme.palette.mode === 'dark' ? '라이트 모드' : '다크 모드'}
          </Button>
          
          {isLoggedIn ? (
            <Button fullWidth startIcon={<LogoutIcon />} sx={{ justifyContent: 'flex-start', color: 'text.secondary', px: 2 }} onClick={handleLogout}>로그아웃</Button>
          ) : (
            <Button fullWidth startIcon={<LoginIcon />} sx={{ justifyContent: 'flex-start', color: 'primary.main', px: 2 }} onClick={() => navigate('/login')}>로그인</Button>
          )}
        </Stack>
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
                  <Badge badgeContent={room.UNREAD_COUNT || 0} color="error" sx={{ mr: 2 }} showZero={false}>
                    <Avatar src={`http://localhost:4000${room.PROFILE_IMAGE_URL}`} sx={{ width: 40, height: 40 }} />
                  </Badge>
                  <ListItemText 
                    primary={room.NICKNAME} 
                    secondary={
                      <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'text.secondary' }}>
                        <span>{room.latestMessage || "메시지가 없습니다."}</span>
                        <span>{room.lastTime ? new Date(room.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* 중앙 메인 컨텐츠 (flex: 1로 유동적 확장) */}
      <Box sx={{ flex: 1, maxWidth: '650px', borderRight: '1px solid #dbdbdb',borderColor: 'divider', minHeight: '100vh', p: 3 }}>
        <Outlet />
      </Box>

      {/* 오른쪽 사이드바 (md 이상 화면에서만 노출) */}
     {/* 오른쪽 사이드바 */}
      <Box sx={{ width: '300px', p: 3, display: { xs: 'none', lg: 'block' } }}>
        <Box sx={{ position: 'sticky', top: 20 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>회원님을 위한 추천</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', cursor: 'pointer' }}>모두 보기</Typography>
          </Box>

          <Stack spacing={2}>
            {dummySuggestions.map((user) => (
              <Box key={user.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>{user.nickname[0]}</Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{user.nickname}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>회원님을 위한 추천</Typography>
                </Box>
                <Button size="small" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>팔로우</Button>
              </Box>
            ))}
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              소개 · 도움말 · 홍보 센터 · API · 채용 정보 · 개인정보처리방침 · 약관
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>© 2026 CUE-LINK FROM META</Typography>
          </Box>
        </Box>
      </Box>

      {isLoggedIn && location.pathname !== '/write' && location.pathname !== '/chat/global' && (
        <Fab color="primary" sx={{ position: 'fixed', bottom: 30, right: 30 }} onClick={() => navigate('/write')}>
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}

export default Layout;