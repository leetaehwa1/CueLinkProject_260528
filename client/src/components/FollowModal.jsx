import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography } from '@mui/material';
import api from '../api';

function FollowModal({ open, onClose, userId, type }) { // type: 'followers' or 'following'
  const [list, setList] = useState([]);

  useEffect(() => {
    if (open) {
      api.get(`/follows/${userId}/${type}`).then(res => setList(res.data.list));
    }
  }, [open, userId, type]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{type === 'followers' ? '팔로워' : '팔로잉'}</DialogTitle>
      <List sx={{ pt: 0 }}>
        {list.map((user) => (
          <ListItem key={user.USER_ID}>
            <ListItemAvatar>
              <Avatar src={user.PROFILE_IMAGE_URL} />
            </ListItemAvatar>
            <ListItemText primary={user.NICKNAME} />
          </ListItem>
        ))}
      </List>
    </Dialog>
  );
}
export default FollowModal;