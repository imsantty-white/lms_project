import React, { useState } from 'react';
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
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const modalStyle = {
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  //border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
  maxHeight: '90vh',
  overflowY: 'auto'
};

// Se crea un componente motion basado en Box
const MotionBox = motion(Box);

function RegisterModal({ open, onClose }) {
  const { register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('Estudiante');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalContent, setConfirmModalContent] = useState({
    title: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const registrationData = { nombre, apellidos, email, password, userType };

    const result = await register(registrationData);

    setIsLoading(false);

    if (result.success) {
      if (result.userType === 'Docente') {
        setConfirmModalContent({
          title: 'Registro de Docente Completado',
          message:
            'Tu cuenta como Docente ha sido creada con éxito. Estará activa una vez que un administrador apruebe tu solicitud. Te notificaremos por correo electrónico.'
        });
        setIsConfirmModalOpen(true);
      } else {
        onClose();
      }
      setNombre('');
      setApellidos('');
      setEmail('');
      setPassword('');
      setUserType('Estudiante');
    }
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    onClose();
  };

  const handleConfirmAction = () => {
    handleCloseConfirmModal();
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
          justifyContent: 'center'
        }}
      >
        <AnimatePresence>
          {open && (
            <MotionBox
              sx={modalStyle}
              component="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography id="register-modal-title" variant="h6" component="h2">
                  Registrarse
                </Typography>
                <IconButton onClick={onClose} aria-label="cerrar">
                  <CloseIcon />
                </IconButton>
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Nombre(s)"
                  fullWidth
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isLoading}
                />
                <TextField
                  label="Apellidos"
                  fullWidth
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  disabled={isLoading}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <FormControl fullWidth required disabled={isLoading}>
                  <InputLabel id="user-type-label">Tipo de Usuario</InputLabel>
                  <Select
                    labelId="user-type-label"
                    id="user-type-select"
                    label="Tipo de Usuario"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                  >
                    <MenuItem value="Estudiante">Estudiante</MenuItem>
                    <MenuItem value="Docente">Docente</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Creando Cuenta...' : 'Crear Cuenta'}
                </Button>
              </Stack>
            </MotionBox>
          )}
        </AnimatePresence>
      </Modal>

      <ConfirmationModal
        open={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmAction}
        title={confirmModalContent.title}
        message={confirmModalContent.message}
      />
    </>
  );
}

export default RegisterModal;
