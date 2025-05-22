import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Header({ onToggleSidebar, sidebarOpen, mode, onToggleMode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: mode === 'dark' ? '#fff' : '#222',
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
}

export default Header;