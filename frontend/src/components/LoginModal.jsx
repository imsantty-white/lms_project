import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const modalStyle = {
  // Eliminamos la posición absoluta para usar el contenedor flex del Modal
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  //border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
};

const MotionBox = motion(Box);

function LoginModal({ open, onClose }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      onClose();
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
    } else {
      setPassword('');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="login-modal-title"
      aria-describedby="login-modal-description"
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
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography id="login-modal-title" variant="h6" component="h2">
                Iniciar Sesión
              </Typography>
              <IconButton onClick={onClose} aria-label="cerrar">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Contraseña"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                type="submit"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </Stack>
          </MotionBox>
        )}
      </AnimatePresence>
    </Modal>
  );
}

export default LoginModal;
