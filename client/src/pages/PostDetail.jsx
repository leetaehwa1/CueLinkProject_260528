import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Divider, Box, Button, Paper, Chip, Stack } from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import dayjs from 'dayjs';
import api from '../api';

function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setMyUserId(decoded.userId);
    }

    api.get(`/posts/${postId}`).then(res => {
      setPost(res.data.data);
      const viewed = JSON.parse(localStorage.getItem('viewedPosts') || '[]');
      if (!viewed.includes(postId)) {
        api.post(`/posts/${postId}/view`);
        localStorage.setItem('viewedPosts', JSON.stringify([...viewed, postId]));
      }
    });
  }, [postId]);

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await api.delete(`/posts/${postId}`);
        navigate('/');
      } catch (err) { alert('삭제에 실패했습니다.'); }
    }
  };

  if (!post) return <Container maxWidth="sm" sx={{ mt: 4 }}>로딩 중...</Container>;

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        
        {/* 헤더 섹션 */}
        <Box sx={{ mb: 3 }}>
          <Chip label={post.categoryName} color="primary" size="small" sx={{ mb: 1.5 }} />
          <Typography variant="h4" sx={{ fontWeight: '800', mb: 2 }}>
            {post.title}
          </Typography>
          
          {/* 메타데이터 테이블 형태(Grid) */}
          <Stack direction="row" spacing={3} sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            <Box><strong>작성자:</strong> {post.nickname}</Box>
            <Box><strong>조회수:</strong> {post.viewCount}</Box>
            <Box><strong>작성일:</strong> {dayjs(post.createdAt).format('YYYY.MM.DD HH:mm')}</Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* 본문 섹션 */}
        <Box sx={{ minHeight: '300px', fontSize: '1.1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {post.content}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* 하단 제어 섹션 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="outlined" onClick={() => navigate('/')}>목록으로</Button>
          
          {myUserId === post.userId && (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="primary" onClick={() => navigate(`/posts/${postId}/edit`)}>수정</Button>
              <Button variant="outlined" color="error" onClick={handleDelete}>삭제</Button>
            </Stack>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default PostDetail;