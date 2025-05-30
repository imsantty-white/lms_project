// src/components/LoginModal.jsx
import React, { useState, forwardRef } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Estilos del modal
const modalStyle = {
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  boxShadow: 8,
  p: 4,
  borderRadius: 4,
  outline: 'none',
};

// Componente MotionBox
const MotionBox = motion(Box);

const LoginModal = forwardRef(({ open, onClose }, ref) => {
  const { login } = useAuth(); // La función login del contexto ya muestra toasts
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Ya no se necesita el estado 'snackbar' local

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password); // login() ya muestra toast.success o toast.error

      if (result.success) {
        // El toast de éxito ya fue mostrado por AuthContext.login()
        // Esperamos un poco para que el usuario vea el toast antes de cerrar/redirigir
        setTimeout(() => {
          onClose();
          switch (result.userType) {
            case 'Docente':
              navigate('/teacher/panel');
              break;
            case 'Estudiante':
              navigate('/student/panel');
              break;
            case 'Administrador':
              // Asegúrate que esta ruta exista o ajústala a la correcta, ej: '/admin/dashboard'
              navigate('/admin/dashboard'); 
              break;
            default:
              navigate('/');
              break;
          }
        }, 1000); // Pequeño retraso para ver el toast de éxito
      } else {
        // El toast de error ya fue mostrado por AuthContext.login()
        // Solo limpiamos la contraseña si el login falló
        setPassword('');
      }
    } catch (error) {
      // Este catch es por si la promesa de login() misma es rechazada (poco probable si login() ya maneja sus errores)
      // AuthContext.login() ya debería haber mostrado un toast.error.
      console.error('Error inesperado durante el proceso de inicio de sesión en LoginModal:', error);
      // Podrías mostrar un toast genérico aquí si es un error no capturado por login()
      // import { toast } from 'react-toastify'; // Necesitarías importarlo si lo usas aquí
      // toast.error('Ocurrió un error inesperado.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  // Ya no se necesita handleCloseSnackbar

  return (
    // El Fragment <> </> ya no es necesario si solo devolvemos el Modal
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="login-modal-title"
      aria-describedby="login-modal-description"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence>
        {open && (
          <MotionBox
            ref={ref}
            sx={modalStyle}
            component="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }} // Duración más corta para la animación del modal
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography id="login-modal-title" variant="h5" component="h2" gutterBottom sx={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}>
                Iniciar Sesión
              </Typography>
              <IconButton onClick={onClose} aria-label="cerrar modal">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                autoComplete="email"
                InputProps={{sx: { borderRadius: '24px',}}}
              />
              <TextField
                label="Contraseña"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="outlined"
                autoComplete="current-password"
                InputProps={{sx: { borderRadius: '24px',}}}
              />
              <Button
                variant="contained"
                color="primary"
                type="submit"
                fullWidth
                disabled={isLoading}
                sx={{ mt: 2, borderRadius: '24px', py: 1.5 /* Padding vertical */ }} // Ajuste de estilo para el botón
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Ingresar'}
              </Button>
            </Stack>
          </MotionBox>
        )}
      </AnimatePresence>
    </Modal>
    // El Snackbar y Alert han sido eliminados de aquí
  );
});

export default LoginModal;