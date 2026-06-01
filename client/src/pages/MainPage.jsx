import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Card, Box, Stack, Fab, Tabs, Tab, 
  Avatar, CardMedia, Button, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, FormControl, InputLabel
} from '@mui/material';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useInView } from 'react-intersection-observer';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';

function MainPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([{ id: 0, name: '전체' }]);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [isLoggedIn] = useState(!!localStorage.getItem('token'));
  
  const currentUserId = parseInt(localStorage.getItem('userId') || '0', 10);

  // 수정 모달 상태
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ postId: null, title: '', content: '', categoryId: 0 });
  const [editImage, setEditImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(''); 

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const { ref, inView } = useInView();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const handleMenuOpen = (event, postId) => {
    setAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };

  const handleEditOpen = (post) => {
    setEditForm({ 
      postId: post.postId,
      title: post.title, 
      content: post.content, 
      categoryId: post.categoryId || 0 
    });
    setPreviewUrl(post.imageUrl ? `http://localhost:4000${post.imageUrl}` : '');
    setEditImage(null);
    setIsEditOpen(true);
    handleMenuClose();
  };

  const handleEditSave = async () => {
  try {
    const formData = new FormData();
    formData.append('categoryId', editForm.categoryId);
    formData.append('title', editForm.title);
    formData.append('content', editForm.content);
    if (editImage) {
      formData.append('image', editImage);
    }

    // [중요] formData만 보내고, 헤더 설정만 config 자리에 넣으세요.
    await api.put(`/posts/${editForm.postId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    alert('수정 완료!');
    setIsEditOpen(false);
    fetchMainFeed(1, true); // 데이터 새로고침
  } catch (err) { 
    console.error(err);
    alert('수정 실패'); 
  }
};

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await api.delete(`/posts/${selectedPostId}`);
        setPosts(posts.filter(p => p.postId !== selectedPostId));
        handleMenuClose();
      } catch (err) { alert('삭제 실패'); }
    }
  };

  useEffect(() => {
    api.get('/posts/categories')
      .then(res => setCategories([{ id: 0, name: '전체' }, ...res.data.data]))
      .catch(err => console.error(err));
  }, []);

  const fetchMainFeed = async (pageNum, isReset = false) => {
    try {
      const params = { page: pageNum, limit: 5, ...(selectedCategory !== 0 && { categoryId: selectedCategory }) };
      const response = await api.get('/posts', { params });
      const newPosts = response.data.data.posts;
      setPosts(prev => isReset ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 5);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { setPage(1); fetchMainFeed(1, true); }, [selectedCategory]);
  useEffect(() => { if (page > 1 && hasMore) fetchMainFeed(page, false); }, [page]);
  useEffect(() => { if (inView && hasMore) setPage(prev => prev + 1); }, [inView, hasMore]);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#fafafa', minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="xs" sx={{ mt: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, bgcolor: 'white', borderRadius: 2 }}>
          <Tabs value={selectedCategory} onChange={(e, newValue) => setSelectedCategory(newValue)} variant="scrollable" scrollButtons="auto">
            {categories.map((cat) => <Tab key={cat.id} label={cat.name} value={cat.id} />)}
          </Tabs>
        </Box>

        <Stack gap={2}>
          {posts.map((post, index) => (
            <Card key={`${post.postId}-${index}`} sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #dbdbdb', p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.8rem' }}>{post.nickname?.[0]}</Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{post.nickname}</Typography>
                </Box>
                {Number(post.userId) === currentUserId && (
                  <Button onClick={(e) => handleMenuOpen(e, post.postId)} sx={{ minWidth: 'auto' }}><MoreVertIcon /></Button>
                )}
              </Box>

              {post.imageUrl && (
                <CardMedia component="img" image={`http://localhost:4000${post.imageUrl}`} sx={{ width: '100%', borderRadius: 2, mb: 1 }} />
              )}

              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button size="small" variant="outlined">좋아요</Button>
                <Button size="small" variant="outlined">댓글</Button>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{post.title}</Typography>
                <Typography variant="body2" sx={{ color: '#444' }}>{post.content}</Typography>
              </Box>
              
              <Typography variant="caption" color="text.secondary">{dayjs(post.createdAt).format('MM.DD')} • 조회 {post.viewCount}</Typography>
            </Card>
          ))}
        </Stack>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => {
            const postToEdit = posts.find(p => p.postId === selectedPostId);
            if (postToEdit) handleEditOpen(postToEdit);
          }}>수정</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>삭제</MenuItem>
        </Menu>

        <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>게시물 수정</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              {previewUrl && <img src={previewUrl} alt="미리보기" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
              <Button variant="outlined" component="label" fullWidth>사진 변경
                <input type="file" hidden accept="image/*" onChange={(e) => {
                 const file = e.target.files[0];
  console.log("선택된 파일:", file); // 여기서 파일이 찍히는지 확인!
  setEditImage(file);
  setPreviewUrl(URL.createObjectURL(file));
                }} />
              </Button>
            </Box>
            
            <FormControl fullWidth margin="dense">
              <InputLabel>카테고리</InputLabel>
              <Select value={editForm.categoryId} label="카테고리" onChange={(e) => setEditForm({...editForm, categoryId: e.target.value})}>
                {categories.filter(c => c.id !== 0).map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField fullWidth margin="dense" label="제목" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
            <TextField fullWidth margin="dense" label="내용" multiline rows={4} value={editForm.content} onChange={(e) => setEditForm({...editForm, content: e.target.value})} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsEditOpen(false)}>취소</Button>
            <Button onClick={handleEditSave} variant="contained">저장</Button>
          </DialogActions>
        </Dialog>

        <Box ref={ref} sx={{ height: 20 }} />
        {isLoggedIn && (
          <Fab color="primary" sx={{ position: 'fixed', bottom: 20, right: 20 }} onClick={() => navigate('/write')}>
            <AddIcon />
          </Fab>
        )}
      </Container>
    </Box>
  );
}

export default MainPage;