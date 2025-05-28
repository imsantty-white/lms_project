// src/components/Header.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Badge, Avatar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import NotificationPanel from './Notifications/NotificationPanel';
import { useSocket } from '../contexts/SocketContext';
import { toast } from 'react-toastify';

import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
} from '../services/notificationService';

const Header = React.memo(({ onToggleSidebar, sidebarOpen, mode, onToggleMode }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const socket = useSocket();

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    // *** AJUSTE CLAVE AQUÍ: REMOVER isLoadingNotifications de las dependencias ***
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        // La condición `if (isLoadingNotifications) return;` es importante para evitar llamadas duplicadas
        // si la función es llamada múltiples veces en rápida sucesión antes de que la primera termine.
        if (isLoadingNotifications) {
            // console.log("Fetch already in progress, skipping."); // Puedes añadir esto para depurar
            return;
        }
        setIsLoadingNotifications(true);
        try {
            const data = await getNotifications(1, 10);
            setNotifications(data.notifications || []);
            setUnreadCount(data.notifications?.filter(n => !n.isRead).length || 0);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Error al cargar notificaciones.');
        } finally {
            setIsLoadingNotifications(false);
        }
    }, [isAuthenticated]); // <-- ¡SOLO isAuthenticated AQUÍ!

    const handleLogout = () => {
        logout();
        setNotifications([]);
        setUnreadCount(0);
        navigate('/');
    };

    const handleNotificationBellClick = (event) => {
        setAnchorEl(event.currentTarget);
        setPanelOpen(true);
        fetchNotifications();
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
            toast.success('Todas las notificaciones marcadas como leídas.');
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            toast.error('Error al marcar todas las notificaciones como leídas.');
        }
    };

    const handleMarkSingleNotificationRead = async (notificationId) => {
        try {
            const notificationToUpdate = notifications.find(n => n._id === notificationId);
            if (notificationToUpdate && !notificationToUpdate.isRead) {
                const updatedNotification = await markNotificationAsRead(notificationId);
                setNotifications(prevNotifications =>
                    prevNotifications.map(n => n._id === updatedNotification._id ? updatedNotification : n)
                );
                setUnreadCount(prevCount => prevCount > 0 ? prevCount - 1 : 0);
            }
        } catch (error) {
            console.error('Error marking single notification as read:', error);
            toast.error('Error al marcar notificación como leída.');
        }
    };

    const handleNotificationClick = async (notificationToUpdate) => {
        try {
            if (!notificationToUpdate.isRead) {
                // Llama directamente a la función de marcado si solo necesitas marcar sin más lógica
                await markNotificationAsRead(notificationToUpdate._id);
                 setNotifications(prevNotifications =>
                    prevNotifications.map(n => n._id === notificationToUpdate._id ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prevCount => prevCount > 0 ? prevCount - 1 : 0);
            }

            if (notificationToUpdate.link) {
                navigate(notificationToUpdate.link);
                setPanelOpen(false); // Cierra el panel solo si hay navegación
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            toast.error('Error al procesar la notificación.');
        }
    };


    const handleDeleteNotification = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
            setNotifications(prevNotifications => {
                const deletedNotif = prevNotifications.find(notif => notif._id === notificationId);
                if (deletedNotif && !deletedNotif.isRead) {
                    setUnreadCount(prevCount => Math.max(0, prevCount - 1));
                }
                return prevNotifications.filter(notif => notif._id !== notificationId);
            });
            toast.success('Notificación eliminada.');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Error al eliminar notificación.');
        }
    };

    const handleDeleteAllNotifications = async () => {
        try {
            await deleteAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
            toast.success('Todas las notificaciones han sido eliminadas.');
        } catch (error) {
            console.error('Error deleting all notifications:', error);
            toast.error('Error al eliminar todas las notificaciones.');
        }
    };

    useEffect(() => {
        // console.log("Header useEffect (isAuthenticated, user) fired");
        if (isAuthenticated && user) {
            fetchNotifications();
        } else if (!isAuthenticated) {
            // Asegúrate de limpiar el estado si el usuario no está autenticado (ej. al desloguearse)
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [isAuthenticated, user, fetchNotifications]); // Dependencias: isAuthenticated, user, fetchNotifications

    useEffect(() => {
        if (socket) {
            // console.log('Header useEffect (socket) fired');
            const handleNewNotification = (newNotification) => {
                // console.log('New notification received via WebSocket:', newNotification);
                fetchNotifications();
            };

            socket.on('new_notification', handleNewNotification);

            return () => {
                // console.log('Socket listener cleanup');
                socket.off('new_notification', handleNewNotification);
            };
        }
    }, [socket, fetchNotifications]);


    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                background: 'rgba(255,255,255,0)',
                backdropFilter: 'blur(2px)',
                boxShadow: 'none',
                color: '#222',
                zIndex: (theme) => theme.zIndex.drawer + 1,
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
                        color: 'primary',
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

                {isAuthenticated && (
                    <>
                        <IconButton
                            color="inherit"
                            onClick={handleNotificationBellClick}
                            sx={{
                                ml: 1, mr: 2,
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
                            notifications={notifications}
                            isLoading={isLoadingNotifications}
                            onMarkAllRead={handleMarkAllRead}
                            onNotificationClick={handleNotificationClick}
                            onMarkSingleNotificationRead={handleMarkSingleNotificationRead}
                            onDeleteNotification={handleDeleteNotification}
                            onDeleteAllNotifications={handleDeleteAllNotifications}
                        />
                    </>
                )}

                {isAuthenticated && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {`${(user?.nombre?.[0] || '')}${(user?.apellidos?.[0] || '')}`.toUpperCase()}
                        </Avatar>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                color: mode === 'dark' ? '#fff' : '#222',
                                marginLeft: 1,
                            }}
                        >
                            {`${user?.nombre || ''} ${user?.apellidos || ''}`.trim() || user?.email || 'Usuario'}
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
            </Toolbar>
        </AppBar>
    );
});

export default Header;