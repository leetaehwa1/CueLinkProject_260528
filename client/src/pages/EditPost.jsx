import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Box } from '@mui/material';
import api from '../api'; // axios 인스턴스
import { Select, MenuItem, InputLabel, FormControl } from '@mui/material';


function EditPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '' });
    const [categories, setCategories] = useState([]);
  // 1. 기존 데이터 로드 (Repository에서 findById 후 DTO 변환 과정과 유사)
  useEffect(() => {
    api.get(`/posts/${postId}`)
      .then(res => {
        const { title, content, categoryId } = res.data.data;
        // categoryId를 제대로 가져오고 있는지 확인!
        setFormData({ title, content, categoryId });
      })
      .catch(err => console.error('데이터 로드 실패', err));
  }, [postId]);
  useEffect(() => {
    // 상대경로 말고 절대경로로 명시
    api.get('/posts/categories') 
        .then(res => setCategories(res.data.data))
        .catch(err => console.error("카테고리 로드 에러:", err));
    }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🚀 전송 데이터:", formData);
    try {
      // 2. 수정 요청 (Controller.updatePost 호출)
      await api.put(`/posts/${postId}`, formData);
      alert('수정 완료!');
      navigate(`/posts/${postId}`); // 수정 후 상세 페이지로 이동
    } catch (err) {
      console.error('수정 실패', err);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <form onSubmit={handleSubmit}>
      {/* // 3. UI 렌더링 (Select 컴포넌트) */}
<FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel>카테고리</InputLabel>
  <Select
    value={formData.categoryId || ''}
    label="카테고리"
    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
  >
    {categories && categories.map((cat) => (
      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
    ))}
  </Select>
</FormControl>
        <TextField fullWidth label="제목" value={formData.title} 
                   onChange={(e) => setFormData({...formData, title: e.target.value})} sx={{ mb: 2 }} />
        <TextField fullWidth label="내용" multiline rows={6} value={formData.content} 
                   onChange={(e) => setFormData({...formData, content: e.target.value})} sx={{ mb: 2 }} />
        <Button type="submit" variant="contained">수정 완료</Button>
      </form>
    </Container>
  );
}
export default EditPost;