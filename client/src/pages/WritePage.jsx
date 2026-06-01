import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Box, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import api from '../api';

function WritePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', categoryId: 1 });
  const [file, setFile] = useState(null); // 파일 상태 추가
  const [categories, setCategories] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. FormData 객체 생성
    const data = new FormData();
    data.append('categoryId', formData.categoryId);
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('isPromotion', 'N');
    if (file) {
      data.append('image', file); // 파일이 있을 때만 추가
    }

    try {
      // 2. 전송 (중요: JSON이 아니라 data를 전송해야 합니다!)
      await api.post('/posts', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      alert('등록 완료!');
      navigate('/');
    } catch (err) {
      console.error('등록 실패', err);
      alert('게시글 등록에 실패했습니다.');
    }
  };

  useEffect(() => {
    api.get('/posts/categories').then(res => setCategories(res.data.data));
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>새 글 작성</Typography>
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>카테고리</InputLabel>
          <Select
            value={formData.categoryId}
            label="카테고리"
            onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField fullWidth label="제목" onChange={(e) => setFormData({...formData, title: e.target.value})} sx={{ mb: 2 }} />
        <TextField fullWidth label="내용" multiline rows={6} onChange={(e) => setFormData({...formData, content: e.target.value})} sx={{ mb: 2 }} />

        {/* 파일 선택 버튼 */}
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" component="label">
            사진 첨부
            <input type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
          </Button>
          <Typography variant="caption" sx={{ ml: 2 }}>
            {file ? file.name : '선택된 파일 없음'}
          </Typography>
        </Box>

        <Button type="submit" variant="contained" fullWidth>등록하기</Button>
      </form>
    </Container>
  );
}

export default WritePage;