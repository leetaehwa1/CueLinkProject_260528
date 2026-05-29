import { Box, Button } from '@mui/material';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';

function SocialLogin() {
  const handleSocialLogin = (provider) => {
    window.location.href = `http://localhost:4000/api/auth/${provider}`;
  };

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center"
      // 💡 gap={6}으로 간격을 48px 정도로 대폭 늘렸습니다.
      gap={6} 
      sx={{ mt: 4, mb: 2 }} 
    >
      {/* 카카오 버튼 */}
      <Button 
        onClick={() => handleSocialLogin('kakao')}
        sx={{ 
          bgcolor: '#FEE500', 
          borderRadius: '50%', 
          minWidth: 60, width: 60, height: 60, // 버튼 크기 유지
          p: 0,
          // 💡 좌우로 여백(margin)을 강제로 추가
          mx: 2, 
          '&:hover': { bgcolor: '#FEE500' },
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
        }}
      >
        <RiKakaoTalkFill size={34} color="#3C1E1E" />
      </Button>

      {/* 구글 버튼 */}
      <Button 
        onClick={() => handleSocialLogin('google')}
        sx={{ 
          bgcolor: '#fff', 
          border: '1px solid #ddd',
          borderRadius: '50%', 
          minWidth: 60, width: 60, height: 60,
          p: 0,
          // 💡 좌우로 여백(margin)을 강제로 추가
          mx: 2,
          '&:hover': { bgcolor: '#f9f9f9' },
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <FcGoogle size={34} />
      </Button>
    </Box>
  );
}

export default SocialLogin;