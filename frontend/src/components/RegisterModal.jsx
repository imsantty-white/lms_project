import React, { useState, forwardRef } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress, // Para indicar carga
  Snackbar, // Para mensajes de notificación
  Alert, // Para estilos de los mensajes de notificación
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationModal from './ConfirmationModal'; // Asegúrate de que la ruta sea correcta
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Estilos del modal
const modalStyle = {
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
  maxHeight: '90vh', // Limita la altura del modal
  overflowY: 'auto', // Permite scroll si el contenido es muy largo
  outline: 'none', // Importante para accesibilidad
};

// Componente MotionBox para animaciones con Framer Motion
const MotionBox = motion(Box);

// Usamos forwardRef para permitir que el componente reciba una ref si es necesario
const RegisterModal = forwardRef(({ open, onClose }, ref) => {
  const { register } = useAuth();

  // Estados para los campos del formulario
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('Estudiante');

  // Estados de UI/manejo de errores
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false); // Booleano para el error de coincidencia
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // 'error', 'warning', 'info', 'success'
  });

  // Estados para el modal de confirmación
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalContent, setConfirmModalContent] = useState({
    title: '',
    message: '',
  });

  // Manejador del envío del formulario
  const handleSubmit = async (event) => {
    event.preventDefault();
    setPasswordMatchError(false); // Limpiar error de coincidencia previo
    setSnackbar({ ...snackbar, open: false }); // Cerrar cualquier snackbar previo

    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      setSnackbar({ open: true, message: 'Las contraseñas no coinciden.', severity: 'error' });
      return;
    }

    setIsLoading(true); // Activa el spinner de carga

    const registrationData = { nombre, apellidos, email, password, tipo_usuario: userType };

    try {
      const result = await register(registrationData);

      if (result.success) {
        // Limpiar los campos del formulario
        setNombre('');
        setApellidos('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUserType('Estudiante');

        if (result.userType === 'Docente') {
          setConfirmModalContent({
            title: 'Registro de Docente Completado',
            message:
              'Tu cuenta como Docente ha sido creada con éxito. Estará activa una vez que un administrador apruebe tu solicitud. Te notificaremos por correo electrónico.',
          });
          setIsConfirmModalOpen(true);
        } else {
          setSnackbar({ open: true, message: '¡Registro exitoso!', severity: 'success' });
          // Retrasamos el cierre del modal para que el usuario vea el mensaje
          setTimeout(() => {
            onClose(); // Cierra el modal de registro
          }, 1000);
        }
      } else {
        // Mostrar error específico del backend si está disponible
        setSnackbar({ open: true, message: result.message || 'Error al registrar usuario. Intenta de nuevo.', severity: 'error' });
      }
    } catch (error) {
      console.error('Error durante el registro:', error);
      setSnackbar({ open: true, message: 'Ocurrió un error inesperado. Por favor, inténtalo más tarde.', severity: 'error' });
    } finally {
      setIsLoading(false); // Desactiva el spinner de carga
    }
  };

  // Manejador para cerrar el modal de confirmación y el de registro
  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    onClose(); // Cierra el modal de registro después de la confirmación
  };

  // Manejador para la acción de confirmar (en este caso, solo cierra el modal de confirmación)
  const handleConfirmAction = () => {
    handleCloseConfirmModal();
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
        aria-labelledby="register-modal-title"
        aria-describedby="register-modal-description"
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
              transition={{ duration: 0.3 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }} // Aumentamos el margen inferior
              >
                <Typography id="register-modal-title" variant="h5" component="h2" gutterBottom>
                  Registrarse
                </Typography>
                <IconButton onClick={onClose} aria-label="cerrar modal de registro">
                  <CloseIcon />
                </IconButton>
              </Stack>

              <Stack spacing={2}> {/* Espaciado consistente */}
                <FormControl fullWidth required disabled={isLoading} variant="outlined">
                  <InputLabel id="user-type-label">¿ Qué eres ?</InputLabel>
                  <Select
                    labelId="user-type-label"
                    id="user-type-select"
                    label="Tipo Usuario" // El 'label' es necesario para el variant "outlined"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                  >
                    <MenuItem value="Estudiante">Estudiante</MenuItem>
                    <MenuItem value="Docente">Docente</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="Nombre(s)"
                  fullWidth
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isLoading}
                  variant="outlined" // Diseño outlined
                  autoComplete="given-name" // Sugerencia de autocompletado
                />
                <TextField
                  label="Apellidos"
                  fullWidth
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  disabled={isLoading}
                  variant="outlined"
                  autoComplete="family-name" // Sugerencia de autocompletado
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  variant="outlined"
                  autoComplete="email"
                />
                <Divider sx={{ mt: 3, borderBottom: '2px dashed ' }} />
                <TextField
                  label="Contraseña"
                  type="password"
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  variant="outlined"
                  autoComplete="new-password" // Para una nueva contraseña
                />
                <TextField
                  label="Confirmar Contraseña"
                  type="password"
                  fullWidth
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  variant="outlined"
                  error={passwordMatchError} // Activa el estado de error de Material-UI
                  helperText={passwordMatchError ? 'Las contraseñas no coinciden' : ''} // Texto de ayuda
                  autoComplete="new-password" // Para confirmar nueva contraseña
                />
                
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  fullWidth
                  disabled={isLoading} // Deshabilita el botón durante la carga
                  sx={{ mt: 2 }} // Margen superior
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Crear Cuenta'}
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

      {/* Modal de Confirmación para Docentes */}
      <ConfirmationModal
        open={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmAction} // La acción de confirmar sigue siendo cerrar
        title={confirmModalContent.title}
        message={confirmModalContent.message}
        showCancelButton={false} // No es necesario un botón de cancelar en este contexto
        confirmButtonText="Entendido" // Texto más adecuado para este tipo de confirmación
      />
    </>
  );
});

export default RegisterModal;