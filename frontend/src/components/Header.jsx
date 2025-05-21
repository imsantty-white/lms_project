import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom'; // Importa Link y useNavigate
import { useAuth } from '../context/AuthContext'; // Importa el hook useAuth

function Header() {
  // Usa el hook useAuth para obtener el estado de autenticación y la función logout
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate(); // Para redirigir después del logout

  const handleLogout = () => {
    logout(); // Llama a la función logout del contexto
    navigate('/'); // Redirige a la página de inicio después de cerrar sesión
  };

  return (
    <AppBar position="fixed"> {/* position="static" mantiene el flujo normal del documento */}
      <Toolbar>
        {/* Título o logo que podría ser un enlace a la página de inicio */}
        <Typography
          variant="h6"
          component={Link} // Hace que el Typography funcione como un enlace
          to="/" // Enlaza a la ruta raíz (página de inicio)
          sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }} // Estilos para que parezca un enlace pero se vea como título
        >
          LMS | Sistema de Gestión de Aprendizaje
        </Typography>

        <Box>
          {/* Mostramos la info del usuario y el botón de logout solo si está autenticado */}
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ mr: 2 }}> {/* margin right */}
                Hola, {user ? user.nombre || user.email : 'Usuario'} {/* Muestra el nombre si existe, si no el email, si no 'Usuario' */}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </Box>
          ) : (
            // Opcional: Si no está autenticado, mostrar botones de Login/Registro aquí si quieres,
            // aunque ya los tenemos en la landing con modales. Por simplicidad, no los incluimos aquí por ahora.
            null
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;