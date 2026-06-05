import React, { useState } from 'react';
import { Box, TextField, Button, Avatar, Typography } from '@mui/material';
import api from '../api';

function ProfileEditPage() {
  const [nickname, setNickname] = useState(localStorage.getItem('nickname') || '');
  const [bio, setBio] = useState('');
  const [preview, setPreview] = useState(localStorage.getItem('profileImage') || '');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile)); // 미리보기용 URL 생성
  };

  const handleUpdate = async () => {
    const formData = new FormData();
    formData.append('nickname', nickname);
    formData.append('bio', bio);
    if (file) formData.append('profileImage', file);

    try {
      const res = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('프로필이 수정되었습니다.');
      // 로컬 스토리지 업데이트
      localStorage.setItem('nickname', nickname);
      if (res.data.profileImageUrl) localStorage.setItem('profileImage', res.data.profileImageUrl);
      window.location.reload(); // 새로고침하여 적용
    } catch (err) {
      alert('수정 실패');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Avatar src={preview} sx={{ width: 100, height: 100, mb: 2, mx: 'auto' }} />
      <Button component="label">사진 변경
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
      <TextField fullWidth label="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} sx={{ my: 2 }} />
      <TextField fullWidth label="소개글" value={bio} onChange={(e) => setBio(e.target.value)} multiline rows={3} />
      <Button fullWidth variant="contained" onClick={handleUpdate} sx={{ mt: 2 }}>저장하기</Button>
    </Box>
  );
}
export default ProfileEditPage;