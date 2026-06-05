import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Card, Box, Stack, Fab, Tabs, Tab, 
  Avatar, CardMedia, Button, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, FormControl, InputLabel, IconButton
} from '@mui/material';
import api from '../api';
import { useNavigate } from 'react-router-dom';

import { useInView } from 'react-intersection-observer';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
// 상단 import 부분에 추가
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko'; // 한국어 설정
dayjs.extend(relativeTime);
dayjs.locale('ko');

function MainPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([{ id: 0, name: '전체' }]);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [isLoggedIn] = useState(!!localStorage.getItem('token'));
  
  const [comments, setComments] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [parentCommentId, setParentCommentId] = useState(null);

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
  const getImageUrl = (path) => {
    if (!path) return ''; 
    const timestamp = new Date().getTime(); // 캐시 방지용
    return `http://localhost:4000${path}?t=${timestamp}`;
  };
  

  // 시간 변환 함수
  const formatRelativeTime = (date) => {
    return dayjs().to(dayjs(date)); // "n시간 전" 형태 반환
  };

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
    // 이 부분이 핵심입니다. 
    // 기존 데이터에 덮어씌워져서 화면이 리렌더링되어야 합니다.
    setComments(prev => ({ ...prev, [postId]: res.data.comments }));
  } catch (err) { 
    console.error("댓글 로드 실패", err); 
  }
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
    await api.post(`/posts/${postId}/comments`, { 
      content, 
      parentCommentId: parentCommentId // 위에서 기억한 ID 전송
    });
    setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    setParentCommentId(null); // 답글 모드 해제
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
//   const handleCommentLike = async (commentId, postId) => {
//   try {
//     // 1. 서버에 좋아요 요청 전송
//     await api.post(`/posts/comments/${commentId}/like`);
    
//     // 2. 댓글 목록 다시 불러오기 (가장 확실한 방법)
//     fetchComments(postId);
//   } catch (err) {
//     console.error("댓글 좋아요 실패", err);
//     alert('좋아요 처리 중 오류가 발생했습니다.');
//   }
// };

const handleCommentLike = async (commentId, postId) => {
  try {
    // 서버에 좋아요 요청 (응답으로 최신 상태를 받아옴)
    const response = await api.post(`/posts/comments/${commentId}/like`);
    
    // 서버가 응답한 결과(isLiked)를 바탕으로 현재 상태를 업데이트
    setComments(prev => ({
      ...prev,
      [postId]: prev[postId].map(c => 
        c.commentId === commentId 
          ? { 
              ...c, 
              isLiked: response.data.isLiked, // 서버 응답 기반으로 확실하게 설정
              likeCount: response.data.isLiked ? c.likeCount + 1 : Math.max(0, c.likeCount - 1)
            }
          : c
      )
    }));
  } catch (err) {
    console.error("좋아요 처리 실패", err);
    alert('좋아요 처리 중 오류가 발생했습니다.');
  }
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Tabs 
            value={selectedCategory} 
            onChange={(e, newValue) => setSelectedCategory(newValue)} 
            variant="scrollable" 
            scrollButtons="auto"
            TabIndicatorProps={{ sx: { height: 3, borderRadius: 2 } }} // 인디케이터 두껍고 둥글게
          >
            {categories.map((cat) => (
              <Tab 
                key={cat.id} 
                label={cat.name} 
                value={cat.id} 
                sx={{ fontWeight: 'bold', fontSize: '1rem', px: 3 }} // 폰트 강조
              />
            ))}
          </Tabs>
        </Box>

        <Stack gap={2}>
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <Card key={`${post.postId}-${index}`} sx={{ 
                  borderRadius: 4, // 좀 더 둥글게
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)', // 은은한 그림자
                  border: 'none', // 테두리 제거
                  p: 2, 
                  mb: 3, // 카드 사이 간격 확보
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' } // 마우스 올리면 살짝 떠오르는 효과
                }}>
                {/* ... 기존 카드 내부 내용 그대로 유지 ... */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.userId}`)}>
                   <Avatar 
                    src={post.imageUrl ? getImageUrl(post.imageUrl) : ''} 
                    sx={{ width: 32, height: 32, mr: 1, fontSize: '0.8rem' }}
                  >
                    {!post.imageUrl && post.nickname?.[0]}
                  </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{post.nickname}</Typography>
                  </Box>
                  {Number(post.userId) === currentUserId && (
                    <Button onClick={(e) => handleMenuOpen(e, post.postId)} sx={{ minWidth: 'auto' }}><MoreVertIcon /></Button>
                  )}
                </Box>

                {post.imageUrl && (
                  <CardMedia component="img" image={getImageUrl(post.imageUrl)} sx={{ width: '100%', borderRadius: 2, mb: 1 }} />
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
        <Dialog open={isDetailOpen} onClose={() => setIsDetailOpen(false)} maxWidth="lg" fullWidth>
          {selectedPost && (
            // 전체 컨테이너 높이 고정 및 가로 제한
            <Box sx={{ display: 'flex', height: '600px', overflow: 'hidden' }}>
              
              {/* 1. 왼쪽 이미지 영역: flex: 1.5로 비중을 높이고 minWidth: 0으로 가로 스크롤 방지 */}
              <Box sx={{ flex: 1.5, bgcolor: '#000', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <img 
                  src={getImageUrl(selectedPost.imageUrl)} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </Box>

              {/* 2. 오른쪽 정보 영역: flex: 1로 고정 */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'white', minWidth: '300px' }}>
                
                {/* 게시글 작성자 및 내용 */}
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                  <Typography fontWeight="bold">{selectedPost.nickname}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{selectedPost.content}</Typography>
                </Box>
                {/* 댓글 리스트 영역 */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                  {comments[selectedPost.postId]?.map(c => (
                <Box key={c.commentId} sx={{ mb: 2, ml: c.parentCommentId ? 4 : 0 }}>
                  {/* 1. 닉네임과 댓글 내용 나란히 배치 */}
                  <Typography variant="body2">
                    <strong style={{ marginRight: '8px' }}>{c.nickname}</strong>
                    {c.content}
                  </Typography>

                  {/* 2. 좋아요 개수, 하트 아이콘, 답글달기 나란히 배치 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                    {/* 좋아요 개수 */}
                    <Typography variant="caption" color="text.secondary">
                      좋아요 {c.likeCount}개
                    </Typography>

                    {/* 하트 아이콘 (isLiked 상태에 따라 색상 변경) */}
                    <IconButton 
                      size="small" 
                      onClick={() => handleCommentLike(c.commentId, selectedPost.postId)}
                      sx={{ p: 0 }}
                    >
                      {c.isLiked ? (
                        <FavoriteIcon sx={{ fontSize: '16px', color: 'red' }} />
                      ) : (
                        <FavoriteBorderIcon sx={{ fontSize: '16px' }} />
                      )}
                    </IconButton>

                    {/* 답글달기 */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(c.createdAt)}
                      </Typography>
                      {!c.parentCommentId && (
                        <Button 
                          size="small" 
                          sx={{ fontSize: '0.7rem', p: 0, color: 'text.secondary', fontWeight: 'bold' }}
                          onClick={() => {
                            setParentCommentId(c.commentId);
                            setCommentTexts({...commentTexts, [selectedPost.postId]: `@${c.nickname} `});
                            }}
                            >
                            답글 달기
                        </Button>
                      )}
                      </Box>
                  </Box>
                </Box>
              ))}
                </Box>

                {/* 댓글 입력창 (하단 고정) */}
                <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="댓글 달기..." 
                    value={commentTexts[selectedPost.postId] || ''} 
                    onChange={(e) => setCommentTexts({...commentTexts, [selectedPost.postId]: e.target.value})} 
                  />
                  <Button variant="contained" onClick={() => handleAddComment(selectedPost.postId)}>
                    게시
                  </Button>
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