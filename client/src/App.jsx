import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import Header from './components/Header';
import EditPost from './pages/EditPost';
import WritePage from './pages/WritePage';

function App() {
  
  return (
    <BrowserRouter>
    <Header />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/posts/:postId/edit" element={<EditPost />} />
        <Route path="/write" element={<WritePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;