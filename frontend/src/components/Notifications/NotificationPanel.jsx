import React from 'react';
import {
    Popover,
    List,
    ListItem,
    ListItemText,
    Typography,
    Button,
    Divider,
    Box,
    CircularProgress,
    IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ClearAllIcon from '@mui/icons-material/ClearAll';

const NotificationPanel = ({
    open,
    anchorEl,
    onClose,
    notifications = [],
    onMarkAllRead,
    onNotificationClick, // Esta función ya cierra el panel si hay navegación
    onMarkSingleNotificationRead,
    isLoading = false,
    onDeleteNotification,
    onDeleteAllNotifications,
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
                <Typography variant="h6" sx={{ p: 1 }}>Notificaciones</Typography>
                <Divider sx={{ mb: 1 }} />

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!isLoading && notifications.length === 0 && (
                    <Typography sx={{ p: 2, textAlign: 'center' }}>No tienes notificaciones.</Typography>
                )}

                {!isLoading && notifications.length > 0 && (
                    <List dense>
                        {notifications.map((notif) => (
                            <ListItem
                                key={notif._id}
                                sx={{
                                    backgroundColor: notif.isRead ? 'transparent' : 'action.hover',
                                    '&:hover': {
                                        backgroundColor: notif.isRead ? 'action.selected' : 'action.focus',
                                    },
                                    pr: 0,
                                }}
                            >
                                <ListItemText
                                    primary={notif.message}
                                    secondary={new Date(notif.createdAt).toLocaleString()}
                                    primaryTypographyProps={{ sx: { fontWeight: notif.isRead ? 'normal' : 'bold' } }}
                                    onClick={() => onNotificationClick(notif)} // Mantener esto así, ya que onNotificationClick gestiona la navegación y el cierre.
                                    sx={{ cursor: 'pointer' }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {/* Botón para marcar como leída individualmente */}
                                    {/* Si onNotificationClick ya gestiona el marcado como leída, este botón es redundante si su única función es marcar. */}
                                    {/* Si quieres que este botón SÓLO marque como leída SIN navegar, necesitarías una nueva prop, ej: onMarkSingleRead */}
                                    {!notif.isRead && (
                                        <IconButton
                                            edge="end"
                                            aria-label="mark as read"
                                            onClick={(event) => {
                                                event.stopPropagation(); // Prevenir el clic de ListItemText
                                                // Aquí deberías llamar a una función que SOLO marque como leída, SIN CERRAR el panel,
                                                // a menos que quieras que este botón también cierre el panel.
                                                // Por ahora, si onNotificationClick navega y cierra, este botón también lo hará.
                                                // Considera pasar una nueva prop: onMarkSingleNotificationRead
                                                 onMarkSingleNotificationRead(notif._id); // Esto cerrará el panel si tiene un link.
                                            }}
                                            size="small"
                                            sx={{ ml: 1 }}
                                        >
                                            <MarkEmailReadIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={(event) => {
                                            event.stopPropagation(); // Evitar que el clic en el botón active el click de la notificación
                                            onDeleteNotification(notif._id);
                                        }}
                                        size="small"
                                        sx={{ mr: 3 }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}

                {!isLoading && notifications.length > 0 && (
                    <>
                        <Divider sx={{ mt: 1, mb: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
                            <Button
                                variant="text"
                                size="small"
                                onClick={onMarkAllRead}
                                startIcon={<MarkEmailReadIcon />}
                            >
                                Marcar todo leído
                            </Button>
                            <Button
                                variant="text"
                                size="small"
                                color="error"
                                onClick={() => {
                                    onDeleteAllNotifications();
                                    // Opcional: Si quieres que el panel se cierre después de borrar todas, puedes agregar:
                                    // onClose();
                                }}
                                startIcon={<ClearAllIcon />}
                            >
                                Borrar todas
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Popover>
    );
};

export default NotificationPanel;