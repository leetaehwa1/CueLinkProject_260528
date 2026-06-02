import React, { useState, useEffect } from 'react';
import { Container, Box, Avatar, Typography, Button, Dialog, CardMedia, List, ListItem, ListItemText, TextField, IconButton } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import api from '../api';
import FollowButton from '../components/FollowButton';
import FollowModal from '../components/FollowModal';
import { useParams } from 'react-router-dom'; // 1. 상단에 임포트 확인

function ProfilePage() {
  const { userId: urlUserId } = useParams(); // URL 파라미터
  const currentUserId = parseInt(localStorage.getItem('userId'), 10);
  const targetId = urlUserId ? parseInt(urlUserId, 10) : currentUserId;
  const [user, setUser] = useState({userId :null, nickname: '', followers: 0, following: 0, profileImage: '' });
  const [myPosts, setMyPosts] = useState([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false); // 좋아요 상태
  const [likeCount, setLikeCount] = useState(0); // 좋아요 수
  const [isFollowing, setIsFollowing] = useState(false);
  // ProfilePage.jsx 내부
  const [modalConfig, setModalConfig] = useState({ open: false, type: 'followers' });
  // 조회할 유저 ID 결정 (URL에 있으면 타인, 없으면 본인)
  
  


  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // 1. 유저 정보 조회
        const userRes = await api.get(`/users/${targetId}`);
        setUser(userRes.data.data);
        // --- 여기를 확인하세요! ---
    
        // 2. 게시글 조회
        const postRes = await api.get(`/posts/user/${targetId}`);
        setMyPosts(postRes.data.posts || []);
      } catch (err) {
        console.error("프로필 데이터 로드 실패:", err);
      }
    };

    fetchProfileData();
  }, [targetId]); // targetId가 바뀔 때마다 실행
  

  // 포스트 클릭 시 데이터 로드
    const handlePostClick = async (post) => {
    setSelectedPost(post);
    setIsDetailOpen(true);
    try {
        // 1. 병렬 호출
        const [commentRes, likeRes] = await Promise.all([
        api.get(`/posts/${post.postId}/comments`),
        api.get(`/posts/${post.postId}/likes`)
        ]);

        setComments(commentRes.data.comments || []);
        
        // 2. 키값 안전하게 가져오기 (대문자/소문자 대응)
        const count = likeRes.data.likeCount ?? likeRes.data.CNT ?? 0;
        setIsLiked(!!likeRes.data.isLiked);
        setLikeCount(Number(count));
        
    } catch (err) {
        console.error("데이터 로드 실패:", err);
        // 하나라도 실패하면 alert 띄우지 말고 로그만 남기거나 에러 처리
    }
    };

  const handleCommentSubmit = async (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const content = e.target.value;
      try {
        await api.post(`/posts/${selectedPost.postId}/comments`, { content });
        const res = await api.get(`/posts/${selectedPost.postId}/comments`);
        setComments(res.data.comments);
        e.target.value = '';
      } catch (err) { alert("댓글 작성 실패"); }
    }
  };

    const toggleLike = async () => {
        try {
            // 1. 서버에 좋아요 토글 요청
            await api.post(`/posts/${selectedPost.postId}/like`);
            
            // 2. 상태값 반전 (빨간불/회색불 토글)
            setIsLiked(!isLiked);
            
            // 3. 개수 갱신 (더하기/빼기)
            setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        } catch (err) { 
            console.error(err);
            alert("좋아요 처리 실패"); 
        }
    };

    const handleFollow = async (followingId) => {
      try {
        const res = await api.post(`/follows/${followingId}`);
        // res.data.followed 가 true면 팔로우 성공, false면 언팔로우 성공
        alert(res.data.followed ? "팔로우 성공" : "언팔로우 성공");
        // 여기에 팔로우 상태 상태값 갱신 로직 추가
      } catch (err) {
        alert("처리 실패");
      }
    };

    useEffect(() => {
      if (targetId === currentUserId) return; // 본인이면 조회 안 함
      // targetId가 없거나 숫자가 아니면 실행하지 않음
      if (!targetId || isNaN(targetId)) return;
      
      const checkFollowStatus = async () => {
        try {
          const res = await api.get(`/follows/status/${targetId}`);
          setIsFollowing(res.data.isFollowing);
        } catch (err) {
          console.error("팔로우 상태 확인 실패");
        }
      };
      checkFollowStatus();
    }, [targetId, currentUserId]);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 6, mb: 6 }}>
        <Avatar sx={{ width: 120, height: 120 }} src={user.profileImage ? `http://localhost:4000${user.profileImage}` : ''} />
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>{user.nickname}</Typography>
          
          <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
            <Typography>게시물 <b>{myPosts.length}</b></Typography>
            
            {/* 1. 팔로워/팔로잉 숫자 클릭 시 모달 오픈 */}
            <Typography sx={{ cursor: 'pointer' }} onClick={() => setModalConfig({ open: true, type: 'followers' })}>
              팔로워 <b>{user.followers}</b>
            </Typography>
            <Typography sx={{ cursor: 'pointer' }} onClick={() => setModalConfig({ open: true, type: 'following' })}>
              팔로잉 <b>{user.following}</b>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* 본인 프로필일 때만 프로필 편집 표시 */}
            {targetId === currentUserId ? (
              <Button variant="outlined" size="small">프로필 편집</Button>
            ) : (
              <FollowButton targetUserId={targetId} isInitialFollowing={isFollowing} />
            )}
          </Box>
        </Box>
      </Box>

      {/* 3. 팔로우 모달 컴포넌트 배치 */}
      <FollowModal 
        open={modalConfig.open} 
        type={modalConfig.type} 
        userId={user.userId} 
        onClose={() => setModalConfig({ ...modalConfig, open: false })} 
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
        {myPosts.map((post) => (
          <Box key={post.postId} sx={{ width: '100%', pt: '100%', position: 'relative', cursor: 'pointer' }} onClick={() => handlePostClick(post)}>
            <CardMedia component="img" image={`http://localhost:4000${post.imageUrl}`} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        ))}
      </Box>

      <Dialog open={isDetailOpen} onClose={() => setIsDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedPost && (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '500px' }}>
            <Box sx={{ flex: 1, bgcolor: 'black', display: 'flex', alignItems: 'center' }}>
              <CardMedia component="img" image={`http://localhost:4000${selectedPost.imageUrl}`} sx={{ maxHeight: '100%', objectFit: 'contain' }} />
            </Box>
            <Box sx={{ width: { md: '350px' }, display: 'flex', flexDirection: 'column', p: 2 }}>
              <Typography variant="h6">{selectedPost.title}</Typography>
              
              {/* 좋아요 버튼 영역 */}
              <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                <IconButton onClick={toggleLike} color={isLiked ? "error" : "default"}>
                  {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                <Typography variant="body2">{likeCount}명이 좋아합니다</Typography>
              </Box>

              <List sx={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #eee' }}>
                {comments.map((c) => (
                  <ListItem key={c.commentId} disableGutters>
                    <ListItemText primary={<b>{c.nickname}</b>} secondary={c.content} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                ))}
              </List>
              <TextField fullWidth placeholder="댓글 달기..." size="small" onKeyPress={handleCommentSubmit} />
            </Box>
          </Box>
        )}
      </Dialog>
      
    </Container>
  );
}

export default ProfilePage;