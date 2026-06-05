import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import EditPost from './pages/EditPost';
import WritePage from './pages/WritePage';
import Layout from './components/Layout';
import ProfilePage from './pages/ProfilePage';
import GlobalChatPage from './pages/GlobalChatPage';
import ProtectedRoute from './components/ProtectedRoute'; // 보호 컴포넌트 추가
import ChatPage from './pages/ChatPage';
import ProfileEditPage from './pages/ProfileEditPage';
import React, { useState, useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; // 기본 배경색 등을 자동으로 다크 모드에 맞춰줌

function App() {
  const [mode, setMode] = useState('light'); // 'light' | 'dark'
  // 테마 설정 변경 시에만 다시 계산되도록 메모이제이션
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      background: {
        default: mode === 'light' ? '#ffffff' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1E1E1E',
      },
      primary: { main: '#FFD700' }, // 포인트 컬러
    },
  }), [mode]);
  return (
   <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* 1. 비회원 페이지 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* 2. 회원 페이지 */}
          <Route element={<ProtectedRoute />}>
            {/* 레이아웃을 하나만 선언하고 toggleTheme을 전달합니다 */}
            <Route element={<Layout toggleTheme={() => setMode(prev => prev === 'light' ? 'dark' : 'light')} />}>
              <Route path="/" element={<MainPage />} />
              <Route path="/posts/:postId/edit" element={<EditPost />} />
              <Route path="/write" element={<WritePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/chat/global" element={<GlobalChatPage />} />
              <Route path="/chat/:roomId" element={<ChatPage />} />
              <Route path="/profileEdit/:userId" element={<ProfileEditPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;