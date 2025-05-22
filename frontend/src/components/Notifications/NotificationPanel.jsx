import React from 'react';
import { Popover, List, ListItem, ListItemText, Typography, Button, Divider, Box, CircularProgress } from '@mui/material'; // Added CircularProgress

// Dummy notifications are no longer primary, passed via props
const NotificationPanel = ({
  open,
  anchorEl,
  onClose,
  notifications = [], // Default to empty array
  onMarkAllRead,
  onNotificationClick,
  isLoading = false, // New prop for loading state
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ width: 360, p: 1 }}>
        <Typography variant="h6" sx={{ p: 1 }}>Notifications</Typography>
        <Divider sx={{ mb: 1 }} />

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && notifications.length === 0 && (
          <Typography sx={{ p: 2, textAlign: 'center' }}>No new notifications</Typography>
        )}

        {!isLoading && notifications.length > 0 && (
          <List dense>
            {notifications.map((notif) => (
              <ListItem
                key={notif._id}
                button
                onClick={() => onNotificationClick(notif)}
                sx={{ 
                  backgroundColor: notif.isRead ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: notif.isRead ? 'action.selected' : 'action.focus',
                  }
                }}
              >
                <ListItemText 
                  primary={notif.message} 
                  secondary={new Date(notif.createdAt).toLocaleString()} 
                  primaryTypographyProps={{ sx: { fontWeight: notif.isRead ? 'normal' : 'bold' } }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {!isLoading && notifications.length > 0 && (
          <>
            <Divider sx={{ mt: 1, mb: 1 }} />
            <Button fullWidth variant="text" size="small" onClick={onMarkAllRead}>
              Mark all as read
            </Button>
          </>
        )}
      </Box>
    </Popover>
  );
};
export default NotificationPanel;
