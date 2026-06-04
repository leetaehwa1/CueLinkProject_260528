import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Box, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import api from '../api';

function WritePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', categoryId: 1 });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isImageSelected, setIsImageSelected] = useState(false);

  useEffect(() => {
    api.get('/posts/categories').then(res => setCategories(res.data.data));
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setIsImageSelected(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert('사진을 먼저 선택해주세요!');
      return;
    }

    const data = new FormData();
    data.append('categoryId', formData.categoryId);
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('isPromotion', 'N');
    data.append('image', file);

    try {
      await api.post('/posts', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('등록 완료!');
      navigate('/');
    } catch (err) {
      console.error('등록 실패', err);
      alert('게시글 등록에 실패했습니다.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        {isImageSelected ? '새 게시물 작성' : '사진 선택'}
      </Typography>

      {!isImageSelected ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', border: '2px dashed #ccc', borderRadius: 2 }}>
          <Button variant="contained" component="label" size="large">
            사진 선택하기
            <input type="file" hidden accept="image/*" onChange={handleFileChange} />
          </Button>
        </Box>
      ) : (
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <img src={previewUrl} alt="preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
            <Button variant="text" onClick={() => setIsImageSelected(false)}>사진 변경</Button>
          </Box>

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

          <TextField 
            fullWidth label="제목" sx={{ mb: 2 }} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
          />
          <TextField 
            fullWidth label="내용" multiline rows={6} sx={{ mb: 3 }} 
            onChange={(e) => setFormData({...formData, content: e.target.value})} 
          />

          <Button type="submit" variant="contained" fullWidth size="large">
            등록하기
          </Button>
        </form>
      )}
    </Container>
  );
}

export default WritePage;