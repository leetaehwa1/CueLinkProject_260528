import React, { useState } from 'react';
import { Container, Card, CardContent, TextField, Button, Box, Stack, Typography,Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SocialLogin from '../components/SocialLogin'; // 방금 만든 컴포넌트 추가!
import api from '../api';
import * as Icons from '@mui/icons-material';

function LoginPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ userId: '', password: '', nickname: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value });

  // 1. 인증 요청
  const handleSendVerificationCode = async () => {
    try {
      const response = await api.post('/auth/send-code', { email: authForm.userId });
      if (response.data.success) { setIsCodeSent(true); alert('인증번호 발송!'); }
    } catch (e) { alert('발송 실패'); }
  };

  // 2. 인증 확인
  const handleVerifyCode = async () => {
    try {
      const response = await api.post('/auth/verify-code', { email: authForm.userId, code: verificationCode });
      if (response.data.success) { setIsEmailVerified(true); alert('이메일 인증 완료!'); }
    } catch (e) { alert('인증번호 불일치'); }
  };

  // 3. 최종 가입
  const handleRegister = async () => {
    if (!isEmailVerified) return alert('이메일 인증을 먼저 해주세요!');
    try {
      await api.post('/auth/register', { email: authForm.userId, password: authForm.password, nickname: authForm.nickname });
      alert('회원가입 성공! 로그인해주세요.');
      setIsLoginMode(true); // 가입 후 로그인 모드로 전환
    } catch (e) { alert('가입 실패'); }
  };

  const handleLogin = async () => {
    try {
      const response = await api.post('/auth/login', { email: authForm.userId, password: authForm.password });
      
      if (response.data.success) {
        const { accessToken, user } = response.data.data; // 서버의 responseData 구조에 맞춤
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('userId', user.userId); // [수정] user 객체 안의 userId
        localStorage.setItem('nickname', user.nickname); // [추가] 닉네임 저장
        localStorage.setItem('profileImage', user.profileImage);
        
        console.log("저장된 userId:", user.userId); // 확인용
        console.log(response.data.data);
        window.location.href = '/';
      }
    } catch (e) { 
      console.error(e);
      alert('로그인 실패'); 
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card sx={{ p: 3 }}>
        <Typography variant="h5" align="center" sx={{ mb: 2 }}>{isLoginMode ? '로그인' : '회원가입'}</Typography>
        
        {/* 이메일 입력 */}
        <Box display="flex" gap={1} alignItems="center">
          <TextField fullWidth label="이메일" name="userId" value={authForm.userId} onChange={handleInputChange} disabled={!isLoginMode && isEmailVerified} />
          {!isLoginMode && !isEmailVerified && <Button variant="outlined" onClick={handleSendVerificationCode}>인증요청</Button>}
        </Box>

        {/* 인증번호 입력 */}
        {!isLoginMode && isCodeSent && !isEmailVerified && (
          <Box display="flex" gap={1} mt={1}>
            <TextField fullWidth label="인증번호" onChange={(e) => setVerificationCode(e.target.value)} />
            <Button variant="contained" color="success" onClick={handleVerifyCode}>확인</Button>
          </Box>
        )}

        <TextField fullWidth margin="normal" label="비밀번호" name="password" type="password" value={authForm.password} onChange={handleInputChange} />
        {!isLoginMode && <TextField fullWidth margin="normal" label="닉네임" name="nickname" value={authForm.nickname} onChange={handleInputChange} />}

        <Button fullWidth variant="contained" size="large" sx={{ mt: 2 }} onClick={isLoginMode ? handleLogin : handleRegister}>
          {isLoginMode ? '로그인' : '가입 완료'}
        </Button>

        <Button fullWidth sx={{ mt: 1 }} onClick={() => setIsLoginMode(!isLoginMode)}>
          {isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </Button>
        
        <Divider sx={{ my: 2 }}>또는</Divider>
        <Typography align="center" variant="body2" sx={{ color: 'text.secondary' }}>
          다른 계정으로 로그인
        </Typography>
        
        {/* 소셜 로그인 컴포넌트 삽입 */}
        <SocialLogin />
      </Card>
    </Container>
  );
}
export default LoginPage;