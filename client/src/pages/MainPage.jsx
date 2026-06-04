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

  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
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

  // 2. 실시간 검색 useEffect
    useEffect(() => {
      // 검색어가 없으면 결과 초기화
      if (!keyword.trim()) {
        setSearchResults([]);
        return;
      }

      // 0.5초(500ms) 동안 입력이 없을 때만 서버 호출
      const handler = setTimeout(async () => {
        try {
          const res = await api.get(`/users/search?keyword=${keyword}`);
          setSearchResults(res.data.users); // 서버에서 검색된 사용자 목록 반환
        } catch (err) {
          console.error("검색 실패", err);
        }
      }, 500);

      return () => clearTimeout(handler); // 이전 타이머 삭제
    }, [keyword]);

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

  // 2. fetchMainFeed 수정 (검색 파라미터 추가)
  const fetchMainFeed = async (pageNum, isReset = false) => {
    try {
      const currentUserId = localStorage.getItem('userId');
      // keyword 파라미터 추가
      const params = { 
          page: pageNum, 
          limit: 5, 
          userId: currentUserId, 
          ...(selectedCategory !== 0 && { categoryId: selectedCategory }),
          ...(keyword && { keyword: keyword }) // 검색어 포함
      };
      const response = await api.get('/posts', { params });
      const newPosts = response.data.data.posts;
      setPosts(prev => isReset ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 5);
      newPosts.forEach(p => fetchComments(p.postId));
    } catch (error) { console.error(error); }
  };

  // 3. 검색 실행 함수
  const handleSearch = () => {
      setPage(1);
      fetchMainFeed(1, true);
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
  
  const ReadMore = ({ text, maxLength = 60 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) return null;
    if (text.length <= maxLength) return <Typography variant="body2">{text}</Typography>;

    return (
      <Box>
        <Typography variant="body2" sx={{ color: '#444', whiteSpace: 'pre-wrap' }}>
          {isExpanded ? text : `${text.substring(0, maxLength)}...`}
          <Button 
            size="small" 
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{ ml: 0.5, p: 0, textTransform: 'none', fontWeight: 'bold' }}
          >
            {isExpanded ? '간략히' : '더보기'}
          </Button>
        </Typography>
      </Box>
    );
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
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <Card key={`${post.postId}-${index}`} sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #dbdbdb', p: 1.5 }}>
                {/* ... 기존 카드 내부 내용 그대로 유지 ... */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.userId}`)}>
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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <IconButton onClick={() => handleLike(post.postId)} color={post.isLiked === 1 ? "error" : "default"}>
                    {post.isLiked === 1 ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <Typography variant="body2">{post.likeCount}명이 좋아합니다</Typography>
                  <Button size="small" onClick={() => handleOpenDetail(post)}>댓글 {comments[post.postId]?.length || 0}개 보기</Button>
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{post.title}</Typography>
                  <ReadMore text={post.content} maxLength={50} /> 
                </Box>

                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  {dayjs(post.createdAt).format('YYYY.MM.DD')}
                </Typography>
              </Card>
            ))
          ) : (
            // 게시글이 없을 때 보여줄 빈 화면
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, p: 3, color: 'text.secondary' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>게시물이 없습니다.</Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>첫 번째 게시글의 주인공이 되어보세요!</Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/write')}
                sx={{ borderRadius: 2 }}
              >
                글 작성하러 가기
              </Button>
            </Box>
          )}
          
          {/* 무한스크롤 감지용 div */}
          <Box ref={ref} sx={{ height: '20px', mt: 2 }} /> 
        </Stack>

        {/* 상세 보기 모달 */}
        <Dialog open={isDetailOpen} onClose={() => setIsDetailOpen(false)} maxWidth="md" fullWidth>
          {selectedPost && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, maxHeight: '70vh' }}>
              <CardMedia component="img" image={`http://localhost:4000${selectedPost.imageUrl}`} sx={{ flex: 1, objectFit: 'contain', bgcolor: '#000' }} />
              <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6">{selectedPost.nickname}</Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    mt: 1, 
                    mb: 2, 
                    wordBreak: 'break-all', // <--- 이 속성이 핵심입니다!
                    whiteSpace: 'pre-wrap'  // <--- 엔터(줄바꿈)가 유지되도록 추가
                  }}
                >
                  {selectedPost.content}
                </Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', borderTop: '1px solid #eee', pt: 2 }}>
                  {comments[selectedPost.postId]?.map(c => (
                    <Typography 
                      key={c.commentId} 
                      variant="body2" 
                      sx={{ mb: 1, wordBreak: 'break-all' }} // 댓글에도 동일하게 적용
                    >
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