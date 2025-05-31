// src/components/Header.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Importar useRef
import { AppBar, Toolbar, Typography, IconButton, Box, Badge, Avatar, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const socket = useSocket();
    const theme = useTheme();
    const location = useLocation();

    const isHomePage = location.pathname === '/';

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false); // Estado para la UI (spinner, etc.)
    const [panelOpen, setPanelOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    // Ref para controlar si una carga de notificaciones ya está en progreso
    const isLoadingGuard = useRef(false);

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        // Usar el ref para la guarda de reentrada
        if (isLoadingGuard.current) {
            return;
        }

        isLoadingGuard.current = true; // Bloquear nuevas llamadas
        setIsLoadingNotifications(true); // Activar indicador de carga para la UI

        try {
            const data = await getNotifications(1, 10);
            setNotifications(data.notifications || []);
            setUnreadCount(data.notifications?.filter(n => !n.isRead).length || 0);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            // Considera si este toast es necesario aquí, especialmente si hay reintentos o se llama en segundo plano
            // toast.error('Error al cargar notificaciones.');
        } finally {
            setIsLoadingNotifications(false); // Desactivar indicador de carga para la UI
            isLoadingGuard.current = false; // Liberar el bloqueo
        }
    }, [isAuthenticated]); // fetchNotifications solo debe redefinirse si cambia isAuthenticated

    const handleNotificationBellClick = (event) => {
        setAnchorEl(event.currentTarget);
        setPanelOpen(true);
        fetchNotifications(); // Cargar notificaciones al abrir el panel
    };

    const handleNotificationPanelClose = () => {
        setPanelOpen(false);
        setAnchorEl(null);
    };
    
    // ... (tus otros manejadores: handleMarkAllRead, handleMarkSingleNotificationRead, etc. sin cambios) ...
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
                await markNotificationAsRead(notificationToUpdate._id);
                setNotifications(prevNotifications =>
                    prevNotifications.map(n => n._id === notificationToUpdate._id ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prevCount => prevCount > 0 ? prevCount - 1 : 0);
            }
            if (notificationToUpdate.link) {
                navigate(notificationToUpdate.link);
                setPanelOpen(false);
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
        if (isAuthenticated && user) {
            fetchNotifications(); // Carga inicial al autenticar o cambiar de usuario
        } else if (!isAuthenticated) {
            // Limpiar notificaciones si el usuario cierra sesión
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [isAuthenticated, user, fetchNotifications]);

    useEffect(() => {
        if (socket && isAuthenticated) { // Asegurarse de que el socket solo escuche si está autenticado
            const handleNewNotification = (newNotification) => {
                // Podrías añadir la nueva notificación directamente al estado para una UI más reactiva
                // o simplemente re-hacer fetch para obtener la lista actualizada.
                // console.log('New notification received via socket:', newNotification);
                // toast.info(`Nueva notificación: ${newNotification.message}`);
                fetchNotifications(); 
            };
            socket.on('new_notification', handleNewNotification);
            return () => {
                socket.off('new_notification', handleNewNotification);
            };
        }
    }, [socket, isAuthenticated, fetchNotifications]);


    return (
        <AppBar
            position="fixed" 
            elevation={0}
            sx={{
                background: isHomePage
                    ? 'transparent'
                    : alpha(theme.palette.background.paper, 0.85),
                backdropFilter: isHomePage
                    ? 'none'
                    : 'blur(8px)',
                boxShadow: isHomePage
                    ? 'none'
                    : `0 1px 0 ${alpha(theme.palette.divider, 0.08)}`,
                color: isHomePage ? theme.palette.text.primary : theme.palette.text.primary,
                zIndex: (theme) => theme.zIndex.drawer + 1,
                transition: 'background 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out, color 0.3s ease-in-out',
            }}
        >
            {/* ... El resto de tu Toolbar y elementos del Header sin cambios ... */}
            <Toolbar sx={{ minHeight: 56, px: 2, display: 'flex', justifyContent: 'space-between' }}>
                {onToggleSidebar && isAuthenticated && (
                    <IconButton
                        color="inherit" 
                        edge="start"
                        onClick={onToggleSidebar}
                        sx={{
                            mr: 2,
                            display: { xs: 'inline-flex', sm: 'inline-flex' },
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <Typography
                    variant="h6"
                    component="span"
                    //to={isAuthenticated ? "/profile" : "/"} 
                    sx={{
                        textDecoration: 'none',
                        color: isHomePage ? 'text.primary' : (theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main'),
                        fontWeight: 700,
                        letterSpacing: 1,
                        fontSize: { xs: 18, sm: 20 },
                        flexGrow: 1,
                        textShadow: isHomePage ? '1px 1px 3px rgba(0,0,0,0.4)' : 'none', 
                        transition: 'color 0.2s',
                        '&:hover': {
                            color: isHomePage ? alpha(theme.palette.text.secondary, 0.85) : theme.palette.secondary.main,
                        },
                    }}
                >
                    LMS
                </Typography>

                {isAuthenticated && (
                    <>
                        <IconButton
                            color="inherit" 
                            onClick={handleNotificationBellClick}
                            sx={{ ml: 1, mr: {xs: 0, sm: 1} }}
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
                            isLoading={isLoadingNotifications} // Pasas el estado de carga
                            onMarkAllRead={handleMarkAllRead}
                            onNotificationClick={handleNotificationClick}
                            onMarkSingleNotificationRead={handleMarkSingleNotificationRead}
                            onDeleteNotification={handleDeleteNotification}
                            onDeleteAllNotifications={handleDeleteAllNotifications}
                        />
                    </>
                )}

                {isAuthenticated && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: {xs: 0, sm: 1} }}>
                        <Avatar sx={{
                            width: 36, height: 36,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            fontSize: '0.9rem', fontWeight: 600,
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
                            color: theme.palette.primary.contrastText,
                        }}>
                            {`${(user?.nombre?.[0] || '')}${(user?.apellidos?.[0] || '')}`.toUpperCase() || 'U'}
                        </Avatar>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                color: 'inherit', 
                                marginLeft: 1,
                                display: { xs: 'none', md: 'block' } 
                            }}
                        >
                            {`${user?.nombre || ''} ${user?.apellidos || ''}`.trim() || user?.email || 'Usuario'}
                        </Typography>
                    </Box>
                )}

                <IconButton
                    color="inherit" 
                    onClick={onToggleMode}
                    sx={{ ml: 1 }}
                >
                    {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
            </Toolbar>
        </AppBar>
    );
});

export default Header;