import React, { useState, useEffect } from 'react'; // Added useEffect
import { AppBar, Toolbar, Typography, IconButton, Box, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import NotificationPanel from './Notifications/NotificationPanel';
import { useSocket } from '../contexts/SocketContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService'; // Import new services

const Header = React.memo(({ onToggleSidebar, sidebarOpen, mode, onToggleMode }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket(); // Get socket from context

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const fetchNotifications = async () => {
    if (isLoadingNotifications || !isAuthenticated) return; // Do not fetch if not authenticated
    setIsLoadingNotifications(true);
    try {
      // Using default page 1, limit 10. Adjust if pagination in panel is added.
      const data = await getNotifications(1, 10); 
      setNotifications(data.notifications || []);
      setUnreadCount(data.notifications?.filter(n => !n.isRead).length || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Handle error display if necessary (e.g., toast notification)
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleLogout = () => {
    logout();
    setNotifications([]); // Clear notifications on logout
    setUnreadCount(0);    // Reset unread count
    navigate('/');
  };

  const handleNotificationBellClick = (event) => {
    setAnchorEl(event.currentTarget);
    setPanelOpen(true);
    fetchNotifications(); // Fetch notifications when panel is opened
  };

  const handleNotificationPanelClose = () => {
    setPanelOpen(false);
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prevNotifications =>
        prevNotifications.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      // Optionally, re-fetch or rely on the local update for immediate UI change
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Optionally show error to user
    }
  };

  const handleNotificationClick = async (notificationToUpdate) => {
    try {
      // Mark as read if it's unread
      if (!notificationToUpdate.isRead) {
        const updatedNotification = await markNotificationAsRead(notificationToUpdate._id);
        setNotifications(prevNotifications =>
          prevNotifications.map(n => n._id === updatedNotification._id ? updatedNotification : n)
        );
        setUnreadCount(prevCount => prevCount > 0 ? prevCount - 1 : 0);
      }

      // Navigate if there's a link
      if (notificationToUpdate.link) {
        navigate(notificationToUpdate.link);
      }
      setPanelOpen(false); // Close panel after click
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Optionally show error to user
    }
  };

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        console.log('New notification received via WebSocket:', newNotification);
        setNotifications(prevNotifications => [newNotification, ...prevNotifications].slice(0, 10)); // Keep list to 10
        if (!newNotification.isRead) { // Only increment if the new notification is unread
          setUnreadCount(prevCount => prevCount + 1);
        }
        // Optional: Show toast
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]);
  
  // Fetch initial unread count when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // This could be a lighter fetch for just the count, or use the full fetch
      // For simplicity, we'll rely on the fetchNotifications on panel open for now,
      // or the WebSocket update if a notification arrives.
      // A dedicated fetch for unread count on load could be:
      // const fetchUnread = async () => {
      //   try {
      //      const data = await getNotifications(1, 1); // or a dedicated count endpoint
      //      setUnreadCount(data.totalUnread); // if backend provides this
      //   } catch (error) { console.error(error); }
      // };
      // fetchUnread();
    }
  }, [isAuthenticated, user]);


  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: 'rgba(255,255,255,0)', // Fondo blanco semitransparente
        //backdropFilter: 'blur(8px)',         // Efecto de desenfoque
        boxShadow: 'none',
        color: '#222',
        zIndex: (theme) => theme.zIndex.drawer + 1, // Para que quede sobre el sidebar
      }}
    >
      <Toolbar sx={{ minHeight: 56, px: 2, display: 'flex', justifyContent: 'space-between' }}>
        {onToggleSidebar && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onToggleSidebar}
            sx={{
              mr: 2,
              display: { xs: 'inline-flex', sm: 'inline-flex' },
              color: mode === 'dark' ? '#fff' : '#222',
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: '#fff', // SIEMPRE blanco con sombra
            fontWeight: 700,
            letterSpacing: 1,
            fontSize: { xs: 18, sm: 22 },
            flexGrow: 1,
            textShadow: '2px 2px 6px rgba(0,0,0,0.35)',
            transition: 'color 0.2s',
            '&:hover': {
              color: '#ffe066',
            },
          }}
        >
          LMS - Learning Management System
        </Typography>

        {/* Botón modo día/noche */}
        <IconButton
          color="inherit"
          onClick={onToggleMode}
          sx={{
            ml: 1,
            color: mode === 'dark' ? '#fff' : '#222',
          }}
        >
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        {isAuthenticated && (
          <>
            <IconButton
              color="inherit"
              onClick={handleNotificationBellClick}
              sx={{
                ml: 1,
                color: mode === 'dark' ? '#fff' : '#222',
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
            <NotificationPanel
              open={panelOpen}
              anchorEl={anchorEl}
              onClose={handleNotificationPanelClose}
              notifications={notifications} // Pass actual notifications
              isLoading={isLoadingNotifications} // Pass loading state
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
            />
          </>
        )}

        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: mode === 'dark' ? '#fff' : '#222',
                marginLeft: 1, // Added margin for spacing from notification bell
              }}
            >
              {user?.nombre || user?.email || 'Usuario'}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              size="small"
              sx={{
                ml: 1,
                color: mode === 'dark' ? '#fff' : '#222',
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
});

export default Header;