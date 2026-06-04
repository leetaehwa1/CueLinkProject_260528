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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 비회원도 볼 수 있는 페이지 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 2. 로그인한 사람만 볼 수 있는 페이지들 */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<MainPage />} />
            <Route path="/posts/:postId/edit" element={<EditPost />} />
            <Route path="/write" element={<WritePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/chat/global" element={<GlobalChatPage />} />
            <Route path="/chat/:roomId" element={<ChatPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;