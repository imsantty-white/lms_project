import React from 'react';
import { Box, Drawer, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Avatar from '@mui/material/Avatar';

// Importa algunos iconos de ejemplo (puedes añadir más según necesites)
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PersonIcon from '@mui/icons-material/Person';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import RouteIcon from '@mui/icons-material/Route';

// Define el ancho del sidebar (debe coincidir con el usado en App.jsx)
const drawerWidth = 240;

const Sidebar = React.memo(({ width = drawerWidth, open = true, onClose }) => {
  // Obtiene el estado de autenticación y la información del usuario
  const { isAuthenticated, user } = useAuth();

  // Si el usuario no está autenticado, no mostramos el sidebar
  if (!isAuthenticated) {
    return null; // No renderiza nada si no hay usuario logueado
  }

  // Define las opciones de navegación para cada rol
  const navLinks = {
    Estudiante: [
      { text: 'Dashboard Estudiante', icon: <DashboardIcon />, path: '/dashboard-estudiante' },
      { text: 'Mis Grupos', icon: <GroupsIcon />, path: '/student/groups' },
      { text: 'Mis Rutas de Aprendizaje', icon: <RouteIcon />, path: '/student/learning-paths' },
      { text: 'Unirse a un Grupo', icon: <GroupAddIcon />, path: '/join-group' },
      { text: 'Mi Progreso', icon: <DonutLargeIcon />, path: '/student/progress' },
    ],
    Docente: [
      { text: 'Dashboard Docente', icon: <DashboardIcon />, path: '/dashboard-docente' },
      { text: 'Mis Grupos', icon: <GroupIcon />, path: '/teacher/groups/' },
      { text: 'Actividades Asignadas', icon: <LibraryBooksIcon />, path: '/teacher/assignments' },
      { text: 'Banco de Contenido', icon: <AssignmentIcon />, path: '/content-bank' },
      { text: 'Gestionar Rutas de Aprendizaje', icon: <RouteIcon />, path: '/teacher/learning-paths' },
    ],
    Administrador: [
      { text: 'Dashboard Admin', icon: <DashboardIcon />, path: '/dashboard-admin' },
      { text: 'Gestión de Usuarios', icon: <PersonIcon />, path: '/admin/user-management' },
      { text: 'Gestión de Grupos', icon: <GroupsIcon />, path: '/gestion-grupos-admin' },
      { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion-admin' },
    ],
    Common: [
      { text: 'Mi Perfil', icon: <PersonIcon />, path: '/profile' },
    ]
  };

  // Obtiene los enlaces correspondientes al rol del usuario actual
  // Si el rol del usuario no coincide con ninguna lista, mostramos un array vacío
  const currentUserLinks = navLinks[user?.userType] || [];
  // const commonLinks = navLinks.Common || [];
  // const linksToDisplay = [...currentUserLinks, ...commonLinks];
  const linksToDisplay = [...currentUserLinks];

  // Si el usuario está logueado pero no tiene un userType válido definido para links, no mostrar sidebar o mostrar un mensaje
  if (currentUserLinks.length === 0 && isAuthenticated) {
      console.warn(`No hay enlaces de navegación definidos para el tipo de usuario: ${user?.userType}`);
      // Podrías renderizar un mensaje de "No hay navegación disponible para tu rol" si quieres
       return null; // No mostramos el sidebar si no hay enlaces específicos para el rol
  }


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
          borderRight: open ? undefined : 'none',
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
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={onClose}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        <Box sx={{ overflow: 'auto' }}>
          {/* Bloque de usuario: ahora clickeable y con avatar */}
          <Box
            sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }}
            component={Link}
            to="/profile"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
              {`${(user?.nombre?.[0] || '')}${(user?.apellidos?.[0] || '')}`.toUpperCase()}
            </Avatar>
            <Typography variant="h6">
              {`${user?.nombre || ''} ${user?.apellidos || ''}`.trim() || 'Usuario'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.userType}
            </Typography>
            <Divider sx={{ mt: 2 }} />
          </Box>
          {/* Lista de enlaces de navegación */}
          <List>
            {linksToDisplay.map((link, index) => (
              <ListItem key={link.text} disablePadding>
                <ListItemButton component={Link} to={link.path}>
                  <ListItemIcon>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText primary={link.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
});

export default Sidebar;