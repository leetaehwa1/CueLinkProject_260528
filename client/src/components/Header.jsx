import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // axios 인스턴스

function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // const checkAuth = async () => {
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     try {
  //       // 서버에 현재 유저 정보 요청
  //       const response = await api.get('/auth/profile');
  //       setUser(response.data.data); 
  //     } catch (err) {
  //       // 토큰이 만료되었거나 오류 발생 시 로그아웃 처리
  //       localStorage.removeItem('token');
  //       setUser(null);
  //     }
  //   }
  // };

  const checkAuth = async () => {
  const token = localStorage.getItem('token');
  console.log("저장된 토큰 확인:", token); // 토큰이 없으면 여기서 끝납니다.
  
  if (token) {
    try {
      const response = await api.get('/auth/profile');
      console.log("서버 응답 데이터:", response.data); // 여기서 닉네임이 오는지 확인!
      setUser(response.data.data); 
    } catch (err) {
      console.error("서버 인증 실패:", err.response?.data); // 여기서 에러 이유가 나옵니다.
      localStorage.removeItem('token');
      setUser(null);
    }
  }
};

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
    window.location.reload();
  };

  return (
    <AppBar position="static" sx={{ bgcolor: '#008080' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
          🎱 CueLink SNS
        </Typography>
        
        {user ? (
          <>
            <Typography sx={{ mr: 2 }}>{user.nickname}님</Typography>
            <Button color="inherit" onClick={handleLogout}>로그아웃</Button>
          </>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')}>로그인</Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Header;