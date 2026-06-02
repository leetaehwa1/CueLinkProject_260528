import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Card, Box, Stack, Fab, Tabs, Tab, 
  Avatar, CardMedia, Button, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, FormControl, InputLabel, IconButton
} from '@mui/material';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useInView } from 'react-intersection-observer';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

function MainPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([{ id: 0, name: '전체' }]);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [isLoggedIn] = useState(!!localStorage.getItem('token'));
  
  const [comments, setComments] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  
  // 상세 모달 상태
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  
  const currentUserId = parseInt(localStorage.getItem('userId') || '0', 10);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ postId: null, title: '', content: '', categoryId: 0 });
  const [editImage, setEditImage] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(''); 

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const { ref, inView } = useInView();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = async (postId) => {
    try {
      const res = await api.get(`/posts/${postId}/comments`);
      setComments(prev => ({ ...prev, [postId]: res.data.comments }));
    } catch (err) { console.error("댓글 로드 실패", err); }
  };

  const handleOpenDetail = (post) => {
    setSelectedPost(post);
    fetchComments(post.postId);
    setIsDetailOpen(true);
  };

  const handleAddComment = async (postId) => {
    const content = commentTexts[postId];
    if (!content?.trim()) return;
    try {
      await api.post(`/posts/${postId}/comments`, { content });
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
    } catch (err) { alert('댓글 작성 실패'); }
  };

  const handleMenuOpen = (event, postId) => {
    setAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };

  const handleEditOpen = (post) => {
    setEditForm({ postId: post.postId, title: post.title, content: post.content, categoryId: post.categoryId || 0 });
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
      if (editImage) formData.append('image', editImage);
      await api.put(`/posts/${editForm.postId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('수정 완료!');
      setIsEditOpen(false);
      fetchMainFeed(1, true);
    } catch (err) { alert('수정 실패'); }
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

  const fetchMainFeed = async (pageNum, isReset = false) => {
    try {
      const currentUserId = localStorage.getItem('userId');
      const params = { page: pageNum, limit: 5, userId: currentUserId, ...(selectedCategory !== 0 && { categoryId: selectedCategory }) };
      const response = await api.get('/posts', { params });
      const newPosts = response.data.data.posts;
      setPosts(prev => isReset ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 5);
      newPosts.forEach(p => fetchComments(p.postId));
    } catch (error) { console.error(error); }
  };

  const handleLike = async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      setPosts(prev => prev.map(post => {
        if (post.postId === postId) {
          const isCurrentlyLiked = post.isLiked === 1;
          return { ...post, isLiked: isCurrentlyLiked ? 0 : 1, likeCount: isCurrentlyLiked ? post.likeCount - 1 : post.likeCount + 1 };
        }
        return post;
      }));
    } catch (err) { alert('좋아요 처리 실패'); }
  };

  useEffect(() => {
    api.get('/posts/categories').then(res => setCategories([{ id: 0, name: '전체' }, ...res.data.data]));
  }, []);

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

                {/* 이 부분에 cursor: pointer와 onClick 추가 */}
                <Box 
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                  onClick={() => navigate(`/profile/${post.userId}`)}
                >
                  <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.8rem' }}>
                    {post.nickname?.[0]}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {post.nickname}
                  </Typography>
                </Box>

                {Number(post.userId) === currentUserId && (
                  <Button onClick={(e) => handleMenuOpen(e, post.postId)} sx={{ minWidth: 'auto' }}>
                    <MoreVertIcon />
                  </Button>
                )}
              </Box>

              {post.imageUrl && (
                <CardMedia component="img" image={`http://localhost:4000${post.imageUrl}`} sx={{ width: '100%', borderRadius: 2, mb: 1 }} />
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconButton onClick={() => handleLike(post.postId)} color={post.isLiked === 1 ? "error" : "default"}>
                  {post.isLiked === 1 ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                <Typography variant="body2">{post.likeCount}명이 좋아합니다</Typography>
                <Button size="small" onClick={() => handleOpenDetail(post)}>댓글 {comments[post.postId]?.length || 0}개 보기</Button>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{post.title}</Typography>
                <Typography variant="body2" sx={{ color: '#444' }}>{post.content}</Typography>
              </Box>

              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                {dayjs(post.createdAt).format('YYYY.MM.DD')}
              </Typography>
            </Card>
          ))}
          {/* 무한스크롤 감지용 div 추가 */}
          <Box ref={ref} sx={{ height: '20px', mt: 2 }} /> 
        </Stack>

        {/* 상세 보기 모달 */}
        <Dialog open={isDetailOpen} onClose={() => setIsDetailOpen(false)} maxWidth="md" fullWidth>
          {selectedPost && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, maxHeight: '70vh' }}>
              <CardMedia component="img" image={`http://localhost:4000${selectedPost.imageUrl}`} sx={{ flex: 1, objectFit: 'contain', bgcolor: '#000' }} />
              <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6">{selectedPost.nickname}</Typography>
                <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>{selectedPost.content}</Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', borderTop: '1px solid #eee', pt: 2 }}>
                  {comments[selectedPost.postId]?.map(c => (
                    <Typography key={c.commentId} variant="body2" sx={{ mb: 1 }}>
                      <strong>{c.nickname}</strong> {c.content}
                    </Typography>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', mt: 1 }}>
                  <TextField size="small" placeholder="댓글 달기..." fullWidth variant="standard" 
                    value={commentTexts[selectedPost.postId] || ''} 
                    onChange={(e) => setCommentTexts({...commentTexts, [selectedPost.postId]: e.target.value})} 
                  />
                  <Button onClick={() => handleAddComment(selectedPost.postId)}>게시</Button>
                </Box>
              </Box>
            </Box>
          )}
        </Dialog>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => { const postToEdit = posts.find(p => p.postId === selectedPostId); if (postToEdit) handleEditOpen(postToEdit); }}>수정</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>삭제</MenuItem>
        </Menu>

        <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>게시물 수정</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              {previewUrl && <img src={previewUrl} alt="미리보기" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
              <Button variant="outlined" component="label" fullWidth>사진 변경
                <input type="file" hidden accept="image/*" onChange={(e) => { const file = e.target.files[0]; setEditImage(file); setPreviewUrl(URL.createObjectURL(file)); }} />
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
      </Container>
    </Box>
  );
}

export default MainPage;