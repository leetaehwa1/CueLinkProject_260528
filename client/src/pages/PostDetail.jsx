import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api';
import { Container, Typography, Divider, Box } from '@mui/material'; // Typography, Divider 추가

function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    api.get(`/posts/${id}`).then(res => {
      setPost(res.data.data); 
    });
  }, [id]);

  if (!post) return <div>로딩 중...</div>;

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      {/* 제목: 행간(lineHeight)을 적절히 조절하여 겹침 방지 */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ lineHeight: 1.2, fontWeight: 'bold' }}>
        {post.title}
      </Typography>

      {/* 작성자 및 조회수 */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        작성자: {post.nickname} | 조회수: {post.viewCount}
      </Typography>
      
      <Divider sx={{ my: 2 }} />

      {/* 본문: 여유 공간 확보 */}
      <Box sx={{ mt: 3, fontSize: '1.1rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {post.content}
      </Box>
    </Container>
  );
}

export default PostDetail;