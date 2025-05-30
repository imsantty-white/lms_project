// src/components/RegisterModal.jsx
import React, { useState, forwardRef, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

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
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('Estudiante');

  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [telefonoError, setTelefonoError] = useState('');


  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    showCancelButton: true,
    cancelText: 'Cancelar'
  });
  // registrationDataToSubmit se mantiene por si el usuario cancela el modal de confirmación
  // y necesitamos saber qué datos limpiar o alguna otra lógica.
  const [_registrationDataToSubmit, setRegistrationDataToSubmit] = useState(null);


  useEffect(() => {
    if (userType !== 'Docente') {
      setTelefono('');
      setTelefonoError('');
    }
  }, [userType]);

  const clearFormFields = () => {
    setNombre('');
    setApellidos('');
    setEmail('');
    setTelefono('');
    setTelefonoError('');
    setPassword('');
    setConfirmPassword('');
  };

  const performRegistration = async (data) => {
    if (!data) {
      toast.error("Error interno: No hay datos para el registro.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await register(data); 

      if (result.success) {
        toast.success(result.message || (data.tipo_usuario === 'Docente' 
          ? 'Solicitud de registro de Docente enviada para aprobación.' 
          : '¡Registro exitoso!')
        );
        
        clearFormFields();

        setTimeout(() => {
          onClose(); 
        }, 1500); 
      } else {
        toast.error(result.message || 'Error al registrar el usuario.');
      }
    } catch (error) {
      console.error("Error en performRegistration:", error);
      toast.error("Ocurrió un error inesperado durante el registro.");
    } finally {
      setIsLoading(false);
      // Limpiar registrationDataToSubmit aquí también es buena idea después de un intento de envío
      setRegistrationDataToSubmit(null); 
    }
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    setPasswordMatchError(false);
    setTelefonoError('');

    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    if (userType === 'Docente') {
      const telefonoTrimmed = telefono.trim();
      if (!telefonoTrimmed) {
        setTelefonoError('El teléfono es obligatorio para docentes.');
        toast.error('El teléfono es obligatorio para docentes.');
        return;
      }
      const colombianPhoneRegex = /^(30[0-5]|31\d|32[0-4]|35[01])\d{7}$/;
      if (!colombianPhoneRegex.test(telefonoTrimmed)) {
        setTelefonoError('El teléfono debe ser un número colombiano válido de 10 dígitos (ej: 3001234567).');
        toast.error('El teléfono debe ser un número colombiano válido de 10 dígitos (ej: 3001234567, 3151234567, etc.).');
        return;
      }
    }

    // --- CREAR EL OBJETO DE DATOS UNA VEZ ---
    const dataToSubmit = {
      nombre,
      apellidos,
      email,
      password,
      tipo_usuario: userType,
      ...(userType === 'Docente' && { telefono: telefono.trim() })
    };
    // --------------------------------------

    if (userType === 'Docente') {
      // Guardar en el estado por si el usuario cancela el modal de confirmación
      // y necesitas alguna lógica con esos datos (aunque aquí solo lo limpiamos)
      setRegistrationDataToSubmit(dataToSubmit); 
      
      setConfirmModalProps({
        title: 'Confirmación de Registro de Docente',
        message: 'Las cuentas para "Docente" requieren una aprobación administrativa antes de ser activadas. Al confirmar, tu solicitud será enviada para revisión. ¿Deseas continuar?',
        // --- CORRECCIÓN AQUÍ ---
        onConfirm: () => { // Esta es la función que se pasará al prop del ConfirmationModal
          setIsConfirmModalOpen(false); 
          performRegistration(dataToSubmit); // <--- Usar dataToSubmit capturada en este closure
        },
        // ----------------------
        confirmText: 'Sí, continuar',
        showCancelButton: true,
        cancelText: 'Cancelar',
      });
      setIsConfirmModalOpen(true);
    } else { 
      await performRegistration(dataToSubmit); // Usar dataToSubmit también aquí
    }
  };

  const handleCloseConfirmationModal = () => {
    setIsConfirmModalOpen(false);
    setRegistrationDataToSubmit(null); 
  };

  const handleMainModalClose = () => {
    clearFormFields(); 
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleMainModalClose}
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
                <IconButton onClick={handleMainModalClose} aria-label="cerrar modal de registro">
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

                {userType === 'Docente' && (
                  <TextField
                    label="Teléfono (10 dígitos, ej: 3001234567)"
                    type="tel"
                    fullWidth
                    required
                    value={telefono}
                    onChange={(e) => {
                      setTelefono(e.target.value);
                      if (telefonoError) setTelefonoError('');
                    }}
                    disabled={isLoading}
                    variant="outlined"
                    autoComplete="tel"
                    size="small"
                    InputProps={{sx: { borderRadius: '24px'}}}
                    error={!!telefonoError}
                    helperText={telefonoError}
                    inputProps={{ maxLength: 10 }}
                  />
                )}

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
        onClose={handleCloseConfirmationModal} 
        onConfirm={confirmModalProps.onConfirm} 
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        confirmButtonText={confirmModalProps.confirmText}
        showCancelButton={confirmModalProps.showCancelButton} 
        cancelButtonText={confirmModalProps.cancelText || "Cancelar"} 
      />
    </>
  );
});

export default RegisterModal;