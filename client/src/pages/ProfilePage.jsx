import React, { useState, useEffect } from 'react';
import { Container, Box, Avatar, Typography, Button, Dialog, CardMedia, List, ListItem, ListItemText, TextField, IconButton } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import api from '../api';
import FollowButton from '../components/FollowButton';
import FollowModal from '../components/FollowModal';
import { useParams, useNavigate } from 'react-router-dom'; // 1. 상단에 임포트 확인

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
  const [followerCount, setFollowerCount] = useState(0);
  // ProfilePage.jsx 내부
  const [modalConfig, setModalConfig] = useState({ open: false, type: 'followers' });
  // 조회할 유저 ID 결정 (URL에 있으면 타인, 없으면 본인)
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  
  // 메시지 버튼 클릭 핸들러 추가
  const handleMessage = async () => {
    try {
      // 1:1 채팅방 생성 또는 조회 API 호출
      const res = await api.post(`/chats/direct/${targetId}`);
      console.log(targetId)
      // 채팅 페이지로 이동 (roomId를 파라미터로 넘김)
      navigate(`/chat/${res.data.roomId}`);
    } catch (err) {
      console.error("채팅방 입장 실패:", err);
      alert("채팅방을 열 수 없습니다.");
    }
  };

  // 1. useEffect에 followerCount 초기화 추가
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userRes = await api.get(`/users/${targetId}`);
        setUser(userRes.data.data);
        setFollowerCount(userRes.data.data.followers); // <--- 팔로워 수 상태 초기화 필수!
        
        const postRes = await api.get(`/posts/user/${targetId}`);
        setMyPosts(postRes.data.posts || []);
      } catch (err) {
        console.error("프로필 데이터 로드 실패:", err);
      }
    };
    fetchProfileData();
  }, [targetId]);
  

  // 포스트 클릭 시 데이터 로드
    const handlePostClick = async (post) => {
    setSelectedPost(post);
    setIsExpanded(false); // 상세창 열 때마다 기본은 접힌 상태
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

    const handleFollow = async () => {
      // 1. 서버 통신 전, UI를 미리 업데이트 (Optimistic Update)
      const isNowFollowing = !isFollowing; // 현재 상태의 반대로 바꿀 것임
      
      // 상태 즉시 갱신
      setIsFollowing(isNowFollowing);
      setFollowerCount(prev => isNowFollowing ? prev + 1 : prev - 1);

      try {
        // 2. 서버 통신 (응답 결과에 따라 다시 한 번 정확히 동기화)
        const res = await api.post(`/follows/${targetId}`);
        
        // 서버가 알려준 실제 상태로 최종 확정 (혹시라도 서버 처리가 실패했을 경우 대비)
        setIsFollowing(res.data.followed); 
      } catch (err) {
        console.error("팔로우 처리 실패:", err);
        
        // 3. 실패 시, UI를 원래대로 롤백 (Undo)
        setIsFollowing(!isNowFollowing);
        setFollowerCount(prev => isNowFollowing ? prev - 1 : prev + 1);
        alert("처리 실패. 다시 시도해주세요.");
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
              팔로워 <b>{followerCount}</b>
            </Typography>
            <Typography sx={{ cursor: 'pointer' }} onClick={() => setModalConfig({ open: true, type: 'following' })}>
              팔로잉 <b>{user.following}</b>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {targetId === currentUserId ? (
              <Button variant="outlined" size="small">프로필 편집</Button>
            ) : (
              <>
                <Button 
                  variant={isFollowing ? "outlined" : "contained"} 
                  size="small" 
                  onClick={handleFollow} // 위에서 완성한 handleFollow 사용
                >
                  {isFollowing ? '팔로잉' : '팔로우'}
                </Button>
                
                <Button variant="outlined" size="small" onClick={handleMessage} sx={{ ml: 1 }}>
                  메시지
                </Button>
              </>
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
              
              {/* 내용 및 더보기 영역 */}
              <Box sx={{ my: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-line',
                    display: '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 3, // 펼쳐지면 제한 해제
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {selectedPost.content}
                </Typography>
                
                {/* 내용이 3줄 이상일 때만 더보기 버튼 표시 */}
                {selectedPost.content && selectedPost.content.length > 100 && ( 
                  <Button 
                    size="small" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    sx={{ p: 0, minWidth: 'auto', mt: 0.5, fontSize: '0.75rem' }}
                  >
                    {isExpanded ? '접기' : '...더보기'}
                  </Button>
                )}
              </Box>
              
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