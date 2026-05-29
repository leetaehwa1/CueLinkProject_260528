import React, { useState, useEffect } from 'react';
import { Container, AppBar, Toolbar, Typography, Card, CardContent, Box, Stack } from '@mui/material';
import api from '../api';
import { useNavigate } from 'react-router-dom';


function MainPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMainFeed = async () => {
    try {
      const response = await api.get('/posts', { params: { page: 1, limit: 5 } });
      if (response.data.success) setPosts(response.data.data.posts);
    } catch (error) { 
      setErrorMessage('서버와 연결할 수 없습니다.'); 
    }
  };

  useEffect(() => {
    fetchMainFeed();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh', pb: 4 }}>
      
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        {errorMessage && <Typography color="error">{errorMessage}</Typography>}
        <Stack gap={2}>
          {posts.map((post) => (
            <Card key={post.postId} sx={{ p: 1 , cursor: 'pointer'}}
            onClick={() => navigate(`/posts/${post.postId}`)}>
              <CardContent>
                <Typography variant="h6">{post.title}</Typography>
                <Typography variant="body2">작성자: {post.nickname}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

export default MainPage;