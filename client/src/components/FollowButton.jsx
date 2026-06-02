import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import api from '../api';

function FollowButton({ targetUserId, isInitialFollowing }) {
  const [isFollowing, setIsFollowing] = useState(isInitialFollowing);

  const toggleFollow = async () => {
    try {
      const res = await api.post(`/follows/${targetUserId}`);
      setIsFollowing(res.data.followed); // 서버 응답에 따라 상태 변경
    } catch (err) {
      alert("팔로우 처리 실패");
    }
  };

  return (
    <Button 
      variant={isFollowing ? "outlined" : "contained"} 
      onClick={toggleFollow}
      size="small"
    >
      {isFollowing ? "팔로잉" : "팔로우"}
    </Button>
  );
}
export default FollowButton;