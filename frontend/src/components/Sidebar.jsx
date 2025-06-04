import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../contexts/AuthContext';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Iconos
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
// import PersonIcon from '@mui/icons-material/Person'; // No usado directamente en navConfig
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import RouteIcon from '@mui/icons-material/Route';
import ViewListIcon from '@mui/icons-material/ViewList';
import RuleIcon from '@mui/icons-material/Rule';
import SupervisedUserCircleSharpIcon from '@mui/icons-material/SupervisedUserCircleSharp';
import AnnouncementRoundedIcon from '@mui/icons-material/AnnouncementRounded';
import LogoutIcon from '@mui/icons-material/Logout';

// Nuevos iconos para Admin
import NotificationsIcon from '@mui/icons-material/Notifications'; // o CampaignIcon
import AssessmentIcon from '@mui/icons-material/Assessment'; // o SummarizeIcon
import ContactMailIcon from '@mui/icons-material/ContactMail'; // o ForumIcon

import { toast } from 'react-toastify'; // Import toast for notifications

const drawerWidth = 280;

const Sidebar = React.memo(({ width = drawerWidth, open = true, onClose }) => {
  const { isAuthenticated, user, logout } = useAuth(); // Destructure logout from useAuth
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const theme = useTheme();

  if (!isAuthenticated) {
    return null;
  }

  // Configuration for navigation based on user type
  const navConfig = {
    Estudiante: {
      sections: [
        {
          title: 'Principal',
          items: [
            { text: 'Inicio', icon: <DashboardIcon />, path: '/student/panel' },
            { text: 'Mi Progreso', icon: <DonutLargeIcon />, path: '/student/progress' },
          ]
        },
        {
          title: 'Aprendizaje',
          items: [
            { text: 'Rutas de Aprendizaje', icon: <RouteIcon />, path: '/student/learning-paths' },
          ]
        },
        {
          title: 'Colaboración',
          items: [
            { text: 'Mis Grupos', icon: <GroupIcon />, path: '/student/groups' },
            { text: 'Unirse a Grupo', icon: <GroupAddIcon />, path: '/join-group' },
          ]
        }
      ]
    },
    Docente: {
      sections: [
        {
          title: 'Principal',
          items: [
            { text: 'Inicio', icon: <DashboardIcon />, path: '/teacher/panel' },
            { text: 'Mis Grupos', icon: <GroupsIcon />, path: '/teacher/groups/' },
          ]
        },
        {
          title: 'Contenido',
          items: [
            { text: 'Rutas de Aprendizaje', icon: <RouteIcon />, path: '/teacher/learning-paths' },
            { text: 'Banco de Contenido', icon: <ViewListIcon />, path: '/content-bank' },
          ]
        },
        {
          title: 'Evaluación',
          items: [
            { text: 'Calificar Actividades', icon: <RuleIcon />, path: '/teacher/assignments' },
          ]
        }
      ]
    },
    Administrador: {
      sections: [
        {
          title: 'Panel de Control',
          items: [
            { text: 'Panel de Administración', icon: <DashboardIcon />, path: '/admin/dashboard' }, // Actualizado
          ]
        },
        {
          title: 'Gestión',
          items: [
            { text: 'Usuarios', icon: <SupervisedUserCircleSharpIcon />, path: '/admin/user-management' },
            { text: 'Grupos', icon: <GroupsIcon />, path: '/admin/groups' },
            { text: 'Reportes, Quejas y Reclamos', icon: <AssessmentIcon />, path: '/admin/report-management' },
            { text: 'Mensajes de Soporte', icon: <ContactMailIcon />, path: '/admin/contact-messages' },
            { text: 'Planes de Suscripción', icon: <SettingsIcon />, path: '/admin/plans' },
          ]
        },
        {
          title: 'Sistema',
          items: [
            { text: 'Crear Anuncios', icon: <NotificationsIcon />, path: '/admin/announcements' },
            { text: 'Enviar Notificaciones', icon: <AnnouncementRoundedIcon />, path: '/admin/system-notifications' },
            
          ]
        }
      ]
    }
  };

  const currentConfig = navConfig[user?.userType];

  if (!currentConfig) {
    console.warn(`No hay navegación definida para: ${user?.userType}`);
    return null;
  }

  // Function to determine if a link is active
  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Logout handler
  const handleLogout = () => {
    try {
      logout(); // Call the logout function from AuthContext
      navigate('/'); // Redirect to home page
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Ocurrió un error al cerrar sesión.'); // Optional: show an error message
    }
  };

  // User Profile Component
  const UserProfile = () => (
    <Box
      component={Link}
      to="/profile"
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        p: 2,
        borderRadius: 2,
        mx: 2,
        mb: 1.5,
        mt: 1,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.06)} 100%)`,
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
            color: theme.palette.primary.contrastText,
          }}
        >
          {`${(user?.nombre?.[0] || '')}${(user?.apellidos?.[0] || '')}`.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              mb: 0.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.7rem',
              lineHeight: 1.2,
            }}
          >
            {`${user?.nombre || ''} ${user?.apellidos || ''}`.trim() || 'Usuario'}
          </Typography>
          <Chip
            label={user?.userType}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.secondary.light, 0.15),
              color: theme.palette.secondary.main,
              fontWeight: 600,
              fontSize: '0.6rem',
              height: 20,
              '& .MuiChip-label': {
                px: 1,
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  // Navigation Section Component
  const NavigationSection = ({ section, index }) => (
    <Box key={section.title} sx={{ mb: 2 }}>
      <Typography
        variant="overline"
        sx={{
          px: 3,
          py: 0.5,
          display: 'block',
          fontWeight: 700,
          fontSize: '0.7rem',
          color: theme.palette.text.secondary,
          letterSpacing: '0.08em',
        }}
      >
        {section.title}
      </Typography>
      <List sx={{ px: 2 }}>
        {section.items.map((item) => {
          const isActive = isActivePath(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  borderRadius: 1.5,
                  py: 1,
                  px: 1.5,
                  minHeight: 40,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(isActive && {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '0 3px 3px 0',
                    }
                  }),
                  '&:hover': {
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, 0.16)
                      : alpha(theme.palette.text.primary, 0.04),
                    transform: 'translateX(3px)',
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? theme.palette.primary.main : 'inherit',
                    transition: 'color 0.3s ease',
                    '& svg': {
                      fontSize: '1.2rem',
                    }
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.85rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: width,
        flexShrink: 0,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        [`& .MuiDrawer-paper`]: {
          width: open ? width : 0,
          boxSizing: 'border-box',
          marginTop: '64px',
          height: 'calc(100% - 64px)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          borderRight: open ? `1px solid ${alpha(theme.palette.divider, 0.12)}` : 'none',
          backgroundColor: theme.palette.background.paper,
          backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 100%)`,
        },
      }}
    >
      <Box
        sx={{
          opacity: open ? 1 : 0,
          transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
          pointerEvents: open ? 'auto' : 'none',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with close button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.text.main, ml: 2 }}>
            Menú
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              backgroundColor: alpha(theme.palette.text.primary, 0.04),
              '&:hover': {
                backgroundColor: alpha(theme.palette.text.primary, 0.08),
                transform: 'rotate(180deg)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* User profile */}
        <UserProfile />

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
          {currentConfig.sections.map((section, index) => (
            <NavigationSection key={section.title} section={section} index={index} />
          ))}
        </Box>

        {/* Footer with logout */}
        <Box sx={{
          p: 2,
          borderTop: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
        }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout} // Call the handleLogout function
              sx={{
                borderRadius: 1.5,
                py: 1,
                px: 1.5,
                minHeight: 40,
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                  transform: 'translateX(2px)',
                }
              }}
            >
              <ListItemIcon sx={{
                minWidth: 36,
                color: theme.palette.error.main,
                '& svg': {
                  fontSize: '1.2rem',
                }
              }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="Cerrar Sesión"
                primaryTypographyProps={{
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  color: theme.palette.error.main,
                }}
              />
            </ListItemButton>
          </ListItem>
        </Box>
      </Box>
    </Drawer>
  );
});

export default Sidebar;