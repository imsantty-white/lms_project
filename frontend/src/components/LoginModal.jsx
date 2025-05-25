import React, { useState, forwardRef } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  CircularProgress, // Importamos CircularProgress para el estado de carga
  Snackbar, // Para mostrar mensajes de error/éxito
  Alert, // Para un diseño más atractivo del mensaje de Snackbar
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
  outline: 'none', // Importante para accesibilidad y evitar el borde de foco por defecto
};

// Componente MotionBox para animaciones con Framer Motion
const MotionBox = motion(Box);

// Usamos forwardRef para permitir que el componente reciba una ref si es necesario
const LoginModal = forwardRef(({ open, onClose }, ref) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Estados para los campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Estado para controlar el proceso de carga (spinner)
  const [isLoading, setIsLoading] = useState(false);
  // Estado para manejar mensajes de error/éxito del Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // 'error', 'warning', 'info', 'success'
  });

  // Manejador del envío del formulario
  const handleSubmit = async (event) => {
    event.preventDefault(); // Previene el comportamiento por defecto del formulario
    setIsLoading(true); // Activa el spinner de carga
    setSnackbar({ ...snackbar, open: false }); // Cierra cualquier snackbar previo

    try {
      const result = await login(email, password);
      if (result.success) {
        setSnackbar({ open: true, message: '¡Inicio de sesión exitoso!', severity: 'success' });
        // Retrasamos el cierre del modal y la navegación para que el usuario vea el mensaje
        setTimeout(() => {
          onClose(); // Cierra el modal
          // Redirección basada en el tipo de usuario
          switch (result.userType) {
            case 'Docente':
              navigate('/dashboard-docente');
              break;
            case 'Estudiante':
              navigate('/dashboard-estudiante');
              break;
            case 'Administrador':
              navigate('/dashboard-admin');
              break;
            default:
              navigate('/');
              break;
          }
        }, 1000); // Pequeño retraso
      } else {
        // Manejo de errores de inicio de sesión
        setSnackbar({ open: true, message: result.message || 'Credenciales inválidas. Intenta de nuevo.', severity: 'error' });
        setPassword(''); // Limpia la contraseña para que el usuario la reintroduzca
      }
    } catch (error) {
      console.error('Error durante el inicio de sesión:', error);
      setSnackbar({ open: true, message: 'Ocurrió un error inesperado. Por favor, inténtalo más tarde.', severity: 'error' });
    } finally {
      setIsLoading(false); // Desactiva el spinner de carga
    }
  };

  // Manejador para cerrar el Snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
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
              ref={ref} // Pasamos la ref al MotionBox
              sx={modalStyle}
              component="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.1 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }} // Aumentamos el margen inferior para más espacio
              >
                <Typography id="login-modal-title" variant="h5" component="h2" gutterBottom sx={{  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}> 
                  Iniciar Sesión
                </Typography>
                <IconButton onClick={onClose} aria-label="cerrar modal">
                  <CloseIcon />
                </IconButton>
              </Stack>

              <Stack spacing={2.5}> {/* Ajustamos el espaciado entre elementos */}
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined" // Usamos el diseño outlined
                  autoComplete="email" // Sugerencia de autocompletado
                   InputProps={{sx: { borderRadius: '24px',},}}
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined" // Usamos el diseño outlined
                  autoComplete="current-password" // Sugerencia de autocompletado
                   InputProps={{sx: { borderRadius: '24px',},}}
                />
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  fullWidth
                  disabled={isLoading} // Deshabilita el botón durante la carga
                  sx={{ mt: 2 }} // Margen superior para separar del último TextField
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Ingresar'}
                </Button>
              </Stack>
            </MotionBox>
          )}
        </AnimatePresence>
      </Modal>

      {/* Snackbar para mostrar mensajes al usuario */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
});

export default LoginModal;