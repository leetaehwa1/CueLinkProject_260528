import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function AuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 1. 진입 확인용 로그 (무조건 찍혀야 함)
    console.log("AuthCallback 페이지에 진입했습니다!");

    const token = searchParams.get('token');
    console.log("URL 파라미터 확인:", window.location.search);

    if (token) {
      localStorage.setItem('token', token);
      console.log("토큰 저장 완료:", token);
      window.location.href = '/'; 
    } else {
      console.error("토큰이 없습니다! 서버에서 토큰을 안 보냈거나 주소가 틀렸습니다.");
    }
  }, [searchParams]);

  return <div>로그인 처리 중... (콘솔 확인 요망)</div>;
}

export default AuthCallback;