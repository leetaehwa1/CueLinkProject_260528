import React from 'react';
import { Box, Stack, Button, Fab } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout'; // 로그아웃 아이콘 추가
import AddIcon from '@mui/icons-material/Add';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // 모든 로컬 스토리지 정보 삭제
    localStorage.clear();
    // 로그인 페이지로 이동
    navigate('/login');
    // 페이지 새로고침으로 전역 상태 초기화
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      {/* 1. 좌측 메뉴 */}
      <Box sx={{ width: '250px', borderRight: '1px solid #dbdbdb', height: '100vh', position: 'fixed', pt: 3, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ paddingLeft: '20px', cursor: 'pointer' }} onClick={() => navigate('/')}>CueLink</h2>
        
        <Stack spacing={2} sx={{ px: 2, flexGrow: 1 }}>
          <Button startIcon={<HomeIcon />} sx={{ justifyContent: 'flex-start', color: 'black' }} onClick={() => navigate('/')}>홈</Button>
          <Button startIcon={<SearchIcon />} sx={{ justifyContent: 'flex-start', color: 'black' }}>검색</Button>

          {/* 전체 채팅방 버튼 추가 */}
          <Button 
            startIcon={<ChatBubbleOutlineOutlined />} 
            sx={{ justifyContent: 'flex-start', color: 'black' }} 
            onClick={() => navigate('/chat/global')}
          >
            전체 채팅
          </Button>

          <Button 
            startIcon={<PersonIcon />} 
            sx={{ justifyContent: 'flex-start', color: 'black' }} 
            onClick={() => navigate('/profile')}
          >
            프로필
          </Button>
        </Stack>

        {/* 로그아웃 버튼 추가 영역 */}
        <Box sx={{ px: 2, mb: 3 }}>
          <Button 
            startIcon={<LogoutIcon />} 
            sx={{ justifyContent: 'flex-start', color: 'gray' }} 
            onClick={handleLogout}
          >
            로그아웃
          </Button>
        </Box>
      </Box>

      {/* 2. 중앙 컨텐츠 */}
      <Box sx={{ ml: '250px', width: '600px', p: 3 }}>
        <Outlet />
      </Box>

      {/* 3. 게시글 작성 버튼 */}
      {location.pathname !== '/write' && location.pathname !== '/chat/global' && (
        <Fab 
          color="primary" 
          aria-label="add" 
          sx={{ position: 'fixed', bottom: 30, right: 30 }}
          onClick={() => navigate('/write')}
        >
          <AddIcon />
        </Fab>
      )}

      {/* 4. 우측 추천 */}
      <Box sx={{ width: '300px', p: 3 }}>
      </Box>
    </Box>
  );
}

export default Layout;