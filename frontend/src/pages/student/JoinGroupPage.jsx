// src/pages/JoinGroupPage.jsx

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Stack, 
  CircularProgress,
  Paper,
  Grid,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// Asegúrate de instalar framer-motion con: npm install framer-motion
import { motion, AnimatePresence } from 'framer-motion';
// Importaciones de iconos
import SchoolIcon from '@mui/icons-material/School';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Componente Paper animado con framer-motion
const MotionPaper = motion(Paper);
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);

function JoinGroupPage() {
  const { user, isAuthInitialized } = useAuth();
  const navigate = useNavigate();
  const [groupCode, setGroupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [_isAnimationComplete, setIsAnimationComplete] = useState(false);
  
  // Acceder al tema y media queries para diseño responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Animaciones para los elementos
  const _containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.7,
        ease: "easeOut"
      }
    }
  };

  const _itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 100, 
        damping: 12 
      }
    }
  };

  useEffect(() => {
    if (isAuthInitialized) {
      setIsAuthLoading(false);
    }
    
    // Configurar un timeout para asegurar que la animación funcione correctamente
    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isAuthInitialized, user, navigate]);

  const handleJoinGroup = async () => {
    if (!user || user.userType !== 'Estudiante') {
      toast.error('Debes ser estudiante para unirte a un grupo.');
      return;
    }

    if (!groupCode) {
      toast.warning('Por favor, ingresa un código de grupo.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosInstance.post('/api/groups/join-request', { codigo_acceso: groupCode });
      const { message } = response.data;

      toast.success(message || 'Solicitud para unirse al grupo enviada correctamente.');
      setGroupCode('');
      
    } catch (error) {
      console.error('Error al unirse al grupo:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.message || 'Error al intentar unirse al grupo. Verifica el código.';

      // Mensaje personalizado para membresía existente
      if (errorMessage.includes('solicitud o membresía para este grupo')) {
        toast.info('Ya tienes una solicitud o membresía para este grupo. No puedes enviar otra hasta que sea eliminada.');
      } else if (errorMessage.includes('Grupo no encontrado')) {
        toast.error('El código de grupo ingresado no es válido. Verifica con tu docente.');
      } else if (errorMessage.includes('Solo los estudiantes pueden solicitar')) {
        toast.error('Solo los estudiantes pueden unirse a grupos.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <Container maxWidth="md" sx={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          sx={{ textAlign: 'center' }}
        >
          <CircularProgress size={60} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>Verificando credenciales...</Typography>
        </MotionBox>
      </Container>
    );
  }

  return (
    <AnimatePresence>
      <Container maxWidth="md" sx={{ py: 1, minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.6,
            ease: "easeOut"
          }}
          elevation={8}
          sx={{ 
            width: '100%',
            overflow: 'hidden',
            borderRadius: 3,
            // Usa los colores del theme para fondo
            backgroundImage: 'none',
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Grid container>
            {/* Panel decorativo lateral para pantallas más grandes */}
            {!isMobile && (
              <Grid item xs={12} md={4} 
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  p: 4
                }}
              >
                <MotionBox
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <SchoolIcon sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h4" gutterBottom fontWeight="bold">
                    ¿Qué esperas para unirte?
                  </Typography>
                  <Typography variant="body1">
                    Colabora con tus compañeros y mejora tu rendimiento académico.
                  </Typography>
                </MotionBox>
              </Grid>
            )}
          
          {/* Contenido principal */}
          <Grid item xs={12} md={8} sx={{ p: { xs: 3, md: 5 }, bgcolor: theme.palette.background.paper }}>
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <GroupAddIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight="bold">
                Unirse a un Grupo
              </Typography>
            </MotionBox>

            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {user?.userType === 'Estudiante' ? (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Ingresa el código proporcionado por tu docente para unirte al grupo de estudio. 
                  Una vez aceptada tu solicitud, podrás acceder a todo el contenido compartido.
                </Typography>
              ) : (
                <Typography variant="body1" color="error" sx={{ mb: 4 }}>
                  Esta funcionalidad está disponible únicamente para estudiantes.
                </Typography>
              )}
            </MotionBox>

            {user?.userType === 'Estudiante' && (
              <>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 0.6, 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0px 10px 30px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  sx={{ mb: 4 }}
                >
                  <Paper elevation={3} sx={{ 
                    p: 3, 
                    borderRadius: 2, 
                    bgcolor: theme.palette.background.default // Fondo acorde al modo
                  }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Código de Acceso:
                    </Typography>
                    <TextField
                      label="Ingresa el código del grupo"
                      variant="outlined"
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value)}
                      fullWidth
                      disabled={isLoading}
                      placeholder="Ej: ABC123"
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleJoinGroup}
                      disabled={!groupCode || isLoading}
                      endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <GroupAddIcon />}
                      fullWidth
                      size="large"
                      sx={{ 
                        py: 1.5,
                        fontWeight: 'bold'
                      }}
                    >
                      {isLoading ? 'Enviando solicitud...' : 'Unirse al Grupo'}
                    </Button>
                  </Paper>
                </MotionBox>
                
                <MotionBox
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <HelpOutlineIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    ¿No tienes un código? Solicita a tu profesor que te comparta el código del grupo.
                  </Typography>
                </MotionBox>
              </>
            )}
          </Grid>
        </Grid>
      </MotionPaper>
    </Container>
    </AnimatePresence>
  );
}

export default JoinGroupPage;