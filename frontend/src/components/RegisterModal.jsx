// src/components/RegisterModal.jsx
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
  // Divider, // Puedes quitar los dividers si el espaciado del Stack es suficiente
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationModal from './ConfirmationModal'; // Asegúrate de que la ruta sea correcta
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

// Estilos del modal (sin cambios)
const modalStyle = {
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  boxShadow: 8,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto',
  outline: 'none',
};

const MotionBox = motion(Box);

const RegisterModal = forwardRef(({ open, onClose }, ref) => {
  const { register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('Estudiante');

  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);

  // Estado para el modal de confirmación y los datos pendientes
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    showCancelButton: true,
    cancelText: 'Cancelar' // Asumiendo que tu ConfirmationModal puede tener un texto para cancelar
  });
  const [registrationDataToSubmit, setRegistrationDataToSubmit] = useState(null);

  // Función que realmente ejecuta el registro
  const performRegistration = async (data) => {
    if (!data) {
      toast.error("Error interno: No hay datos para el registro.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await register(data); // register es de useAuth()

      if (result.success) {
        toast.success(result.message || (data.tipo_usuario === 'Docente' 
          ? 'Solicitud de registro de Docente enviada para aprobación.' 
          : '¡Registro exitoso!')
        );
        
        // Limpiar campos del formulario
        setNombre('');
        setApellidos('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // setUserType('Estudiante'); // Opcional: resetear tipo de usuario

        setTimeout(() => {
          onClose(); // Cierra el modal principal de registro
        }, 1500); // Dar tiempo para ver el toast
      } else {
        toast.error(result.message || 'Error al registrar el usuario.');
      }
    } catch (error) {
      console.error("Error en performRegistration:", error);
      toast.error("Ocurrió un error inesperado durante el registro.");
    } finally {
      setIsLoading(false);
      setRegistrationDataToSubmit(null); // Limpiar datos pendientes
    }
  };

  // Manejador del envío del formulario principal
  const handleSubmit = async (event) => {
    event.preventDefault();
    setPasswordMatchError(false);

    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    const currentData = { nombre, apellidos, email, password, tipo_usuario: userType };

    if (userType === 'Docente') {
      setRegistrationDataToSubmit(currentData); // Guardar datos para usarlos después de la confirmación
      setConfirmModalProps({
        title: 'Confirmación de Registro de Docente',
        message: 'Las cuentas para "Docente" requieren una aprobación administrativa antes de ser activadas. Al confirmar, tu solicitud será enviada para revisión. ¿Deseas continuar?',
        onConfirm: () => {
          setIsConfirmModalOpen(false); // Cerrar modal de confirmación
          if (registrationDataToSubmit) {
            performRegistration(registrationDataToSubmit); // Proceder con el registro
          }
        },
        confirmText: 'Sí, continuar',
        showCancelButton: true,
        cancelText: 'Cancelar',
      });
      setIsConfirmModalOpen(true);
    } else { // Para 'Estudiante' u otros tipos de registro directo
      await performRegistration(currentData);
    }
  };

  // Manejador para cerrar el modal de confirmación (si el usuario cancela o cierra)
  const handleCloseConfirmationModal = () => {
    setIsConfirmModalOpen(false);
    setRegistrationDataToSubmit(null); // Limpiar datos pendientes si se cancela la confirmación
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        aria-labelledby="register-modal-title"
        aria-describedby="register-modal-description"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              transition={{ duration: 0.1 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <Typography id="register-modal-title" variant="h5" component="h2" gutterBottom sx={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}>
                  Crear Cuenta
                </Typography>
                <IconButton onClick={onClose} aria-label="cerrar modal de registro">
                  <CloseIcon />
                </IconButton>
              </Stack>

              <Stack spacing={2}>
                <FormControl fullWidth required disabled={isLoading} variant="outlined" size="small">
                  <InputLabel id="user-type-label">¿Qué eres?</InputLabel>
                  <Select
                    labelId="user-type-label"
                    id="user-type-select"
                    label="¿Qué eres?"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    sx={{borderRadius: '24px'}}
                  >
                    <MenuItem value="Estudiante">Estudiante</MenuItem>
                    <MenuItem value="Docente">Docente</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="Nombre(s)" fullWidth required value={nombre} onChange={(e) => setNombre(e.target.value)}
                  disabled={isLoading} variant="outlined" autoComplete="given-name" size="small" InputProps={{sx: { borderRadius: '24px'}}}
                />
                <TextField
                  label="Apellidos" fullWidth required value={apellidos} onChange={(e) => setApellidos(e.target.value)}
                  disabled={isLoading} variant="outlined" autoComplete="family-name" size="small" InputProps={{sx: { borderRadius: '24px'}}}
                />
                <TextField
                  label="Email" type="email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading} variant="outlined" autoComplete="email" size="small" InputProps={{sx: { borderRadius: '24px'}}}
                />
                <TextField
                  label="Contraseña" type="password" size="small" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading} variant="outlined" autoComplete="new-password" InputProps={{sx: { borderRadius: '24px'}}}
                />
                <TextField
                  label="Confirmar Contraseña" type="password" size="small" fullWidth required value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} variant="outlined"
                  error={passwordMatchError} helperText={passwordMatchError ? 'Las contraseñas no coinciden' : ''}
                  autoComplete="new-password" InputProps={{sx: { borderRadius: '24px'}}}
                />
                
                <Button
                  variant="contained" color="primary" type="submit" fullWidth disabled={isLoading}
                  sx={{ mt: 2, borderRadius: '24px', py: 1.5 }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Crear Cuenta'}
                </Button>
              </Stack>
            </MotionBox>
          )}
        </AnimatePresence>
      </Modal>

      <ConfirmationModal
        open={isConfirmModalOpen}
        onClose={handleCloseConfirmationModal} // Se encarga de cerrar y limpiar datos pendientes
        onConfirm={confirmModalProps.onConfirm} // Ejecuta la acción de confirmación (registrar al docente)
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        confirmButtonText={confirmModalProps.confirmText}
        showCancelButton={confirmModalProps.showCancelButton} // Asegúrate que tu ConfirmationModal use esta prop
        cancelButtonText={confirmModalProps.cancelText || "Cancelar"} // Y esta, si la soporta
      />
    </>
  );
});

export default RegisterModal;