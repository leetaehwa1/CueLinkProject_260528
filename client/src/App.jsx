import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import Header from './components/Header';
import EditPost from './pages/EditPost';
import WritePage from './pages/WritePage';
import Layout from './components/Layout';
import ProfilePage from './pages/ProfilePage';
import GlobalChatPage from './pages/GlobalChatPage';

function App() {
  
  return (
    <BrowserRouter>
      <Routes>
        {/* 메뉴바가 필요한 페이지들만 Layout으로 감싸기 */}
        <Route element={<Layout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/posts/:postId/edit" element={<EditPost />} />
          <Route path="/write" element={<WritePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/chat/global" element={<GlobalChatPage />} />
        </Route>

        {/* 메뉴바가 필요 없는 페이지들 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;