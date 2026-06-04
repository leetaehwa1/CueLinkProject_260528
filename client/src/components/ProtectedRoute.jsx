import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
  const token = localStorage.getItem('token');
  
  // 토큰이 없으면 로그인 페이지로 이동
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;