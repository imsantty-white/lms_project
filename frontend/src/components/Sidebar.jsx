import React from 'react';
import { Box, Drawer, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

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
  const commonLinks = navLinks.Common || [];
  const linksToDisplay = [...currentUserLinks, ...commonLinks];

  // Si el usuario está logueado pero no tiene un userType válido definido para links, no mostrar sidebar o mostrar un mensaje
  if (currentUserLinks.length === 0 && isAuthenticated) {
      console.warn(`No hay enlaces de navegación definidos para el tipo de usuario: ${user?.userType}`);
      // Podrías renderizar un mensaje de "No hay navegación disponible para tu rol" si quieres
       return null; // No mostramos el sidebar si no hay enlaces específicos para el rol
  }


  return (
    // Drawer es un buen componente para sidebars. Aquí usamos variant="permanent" para un sidebar fijo.
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width,
        flexShrink: 0, // Previene que el contenido principal se encoja para dejar espacio
        [`& .MuiDrawer-paper`]: { // Estilos para el papel (el fondo) del drawer
          width,
          boxSizing: 'border-box', // Incluye padding y borde en el ancho total
          // position: 'relative', // Para un sidebar que no se superponga, sino que empuje el contenido (si el layout principal es flex)
          // Asegúrate de que el sidebar no tape el Header si el Header tiene una altura fija
           marginTop: '64px', // Ajusta según la altura de tu AppBar (por defecto 64px)
           height: 'calc(100% - 64px)', // Ajusta la altura para que no se superponga con el Header
           transition: 'width 0.3s',
        },
      }}
    >
      {/* Botón para cerrar el sidebar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      {/* Toolbar es útil para crear un espacio en la parte superior que coincida con la altura del AppBar */}
      {/* <Toolbar /> */} {/* Ya ajustamos el margen superior directamente */}
      <Box sx={{ overflow: 'auto' }}> {/* Permite scroll si la lista de enlaces es muy larga */}
        {/* Opcional: Información básica del usuario en el sidebar */}
         <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">{user?.nombre || 'Usuario'}</Typography>
            <Typography variant="body2" color="text.secondary">{user?.userType}</Typography>
            <Divider sx={{ mt: 2 }} />
         </Box>


        {/* Lista de enlaces de navegación */}
        <List>
          {linksToDisplay.map((link, index) => (
            // ListItemButton hace que toda el área sea clickeable
            <ListItem key={link.text} disablePadding>
              <ListItemButton component={Link} to={link.path}>
                {/* Icono del enlace */}
                <ListItemIcon>
                  {link.icon}
                </ListItemIcon>
                {/* Texto del enlace */}
                <ListItemText primary={link.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
         {/* Opcional: Añadir enlaces comunes si los tienes */}
          {/* <Divider />
           <List>
             {commonLinks.map((link, index) => (
               <ListItem key={link.text} disablePadding>
                 <ListItemButton component={Link} to={link.path}>
                   <ListItemIcon>{link.icon}</ListItemIcon>
                   <ListItemText primary={link.text} />
                 </ListItemButton>
               </ListItem>
             ))}
           </List> */}
      </Box>
    </Drawer>
  );
});

export default Sidebar;