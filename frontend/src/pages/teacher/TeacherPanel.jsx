// src/pages/TeacherPanel.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  CircularProgress,
  Stack,
  Card, CardContent, // Card se sigue usando para listar los grupos
  Link as MuiLink,
  Grid,
  Tooltip,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// Iconos
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CampaignIcon from '@mui/icons-material/Campaign';
import EditNoteIcon from '@mui/icons-material/EditNote';
import IconButton from '@mui/material/IconButton';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
// import GroupAddIcon from '@mui/icons-material/GroupAdd'; // <--- ELIMINADO SI NO SE USA EN OTRO LADO
import RateReviewIcon from '@mui/icons-material/RateReview';


function TeacherPanel() {
  const { user, isAuthInitialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [profileActuallyComplete, setProfileActuallyComplete] = useState(true);
  
  const [systemAnnouncements, setSystemAnnouncements] = useState([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  const [dashboardStats, setDashboardStats] = useState({
    pendingReviewsCount: 0,
    activeGroupsCount: 0,
  });
  const [myGroupsSummary, setMyGroupsSummary] = useState([]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    if (!isAuthenticated || user?.tipo_usuario !== 'Docente') {
      setFetchError('Acceso denegado. Debes iniciar sesión como docente para ver este panel.');
      setIsLoading(false);
      return;
    }

    const dataPromises = [];

    dataPromises.push(
      axiosInstance.get('/api/profile/completion-status')
        .then(response => {
          if (response.data && typeof response.data.isComplete === 'boolean') {
            setProfileActuallyComplete(response.data.isComplete);
          } else {
            setProfileActuallyComplete(false);
          }
        })
        .catch(error => {
          console.error("Error al verificar estado del perfil:", error.response?.data || error.message);
          setProfileActuallyComplete(false);
        })
    );
      
    dataPromises.push(
      axiosInstance.get('/api/announcements/panel?limit=5')
        .then(response => {
          if (response.data && response.data.success) {
            setSystemAnnouncements(response.data.data || []);
          } else { setSystemAnnouncements([]); }
        })
        .catch(announcementError => {
          console.error("Error al cargar anuncios:", announcementError.response?.data || announcementError.message);
          setSystemAnnouncements([]);
        })
    );

    dataPromises.push(
      axiosInstance.get('/api/docente/dashboard/stats') // Endpoint para estadísticas
        .then(response => {
          if (response.data && response.data.success) {
            setDashboardStats({
              pendingReviewsCount: response.data.data.pendingReviewsCount || 0,
              activeGroupsCount: response.data.data.activeGroupsCount || 0,
            });
          }
        })
        .catch(error => {
          console.error("Error al cargar estadísticas del docente:", error.response?.data || error.message);
        })
    );

    dataPromises.push(
      axiosInstance.get('/api/groups/docente/me?status=active&limit=3&page=1')
        .then(response => {
          if (response.data && response.data.success) {
            setMyGroupsSummary(response.data.data || []);
          }
        })
        .catch(error => {
          console.error("Error al cargar resumen de grupos del docente:", error.response?.data || error.message);
        })
    );

    try {
      await Promise.all(dataPromises);
    } catch (err) {
      console.error("Error general al cargar datos del panel del docente:", err);
      if (!fetchError) {
          setFetchError('Error al cargar la información del panel.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]); // Dependencias actualizadas

  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      fetchData();
    } else if (isAuthInitialized && !isAuthenticated) {
        setIsLoading(false);
        setFetchError("Por favor, inicia sesión como docente para ver tu panel.");
    }
  }, [isAuthInitialized, isAuthenticated, fetchData]);

  useEffect(() => {
    if (systemAnnouncements.length > 1) {
      const intervalId = setInterval(() => {
        setCurrentAnnouncementIndex(prevIndex => (prevIndex + 1) % systemAnnouncements.length);
      }, 8000); 
      return () => clearInterval(intervalId);
    }
  }, [systemAnnouncements]);

  const handleNextAnnouncement = () => {
    if (systemAnnouncements.length > 0) {
      setCurrentAnnouncementIndex(prevIndex => (prevIndex + 1) % systemAnnouncements.length);
    }
  };

  const handlePrevAnnouncement = () => {
     if (systemAnnouncements.length > 0) {
      setCurrentAnnouncementIndex(prevIndex => (prevIndex - 1 + systemAnnouncements.length) % systemAnnouncements.length);
    }
  };

  if (!isAuthInitialized || isLoading) {
    return ( 
        <Container><Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /><Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Cargando tu panel...</Typography></Box></Container>
    );
  }
  if (fetchError && systemAnnouncements.length === 0 && myGroupsSummary.length === 0 ) {
      return ( 
          <Container><Box sx={{ mt: 4, textAlign: 'center' }}><Alert severity="error">{fetchError}</Alert></Box></Container>
      );
  }

  const currentAnnouncement = systemAnnouncements[currentAnnouncementIndex];

  return (
    <Container maxWidth="md"> 
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {getGreeting()}, {user?.nombre || 'Docente'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Aquí puedes gestionar tus cursos, actividades y comunicarte con tus estudiantes.
        </Typography>

        {!isLoading && !profileActuallyComplete && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }} 
            icon={<EditNoteIcon fontSize="inherit" />}
            action={
              <Button color="warning" size="small" variant="outlined" onClick={() => navigate('/profile')}>
                Ver Perfil
              </Button>
            }
          >
            <Typography fontWeight="medium">¡Tu perfil está casi listo!</Typography>
            <Typography variant="body2">
                Algunos datos importantes de tu perfil podrían estar pendientes (ej. CC).
            </Typography>
          </Alert>
        )}

        <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={6} md={5}>
                <Stack spacing={3}>
                    <Paper elevation={3} sx={{ p: 2.5, textAlign: 'center' }}>
                        <RateReviewIcon sx={{ fontSize: 36, color: 'red', mb: 0.5 }} />
                        <Typography variant="h5" component="div" fontWeight="bold">
                            {dashboardStats.pendingReviewsCount}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{mb:1}}>
                            Revisiones Pendientes
                        </Typography>
                        <Button size="small" variant="outlined" color="secondary" onClick={() => navigate('/teacher/assignments')}>
                            Ir a Calificar
                        </Button>
                    </Paper>
                    
                    <Paper elevation={3} sx={{ p: 2.5, textAlign: 'center' }}>
                        <LibraryBooksIcon sx={{ fontSize: 36, color: 'blue', mb: 0.5 }} />
                        <Typography variant="body1" color="text.secondary" sx={{mb:1}}>
                            Gestiona tu material
                        </Typography>
                        <Button size="small" variant="outlined" color="secondary" onClick={() => navigate('/teacher/content-bank')}>
                            Banco de Contenido
                        </Button>
                    </Paper>
                </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={5}>
                <Stack spacing={3}>
                    <Paper elevation={3} sx={{ p: 2.5, textAlign: 'center'}}>
                        <Typography variant="h6" component="h2" gutterBottom sx={{fontSize: '1.1rem'}}>
                            Mis Grupos Activos (Vista Previa)
                        </Typography>
                        {myGroupsSummary.length > 0 ? (
                        <Stack spacing={1.5}>
                            {myGroupsSummary.map(group => (
                            <Card key={group._id} variant="outlined">
                                <CardContent sx={{pb: 1.5}}>
                                <Typography variant="subtitle1" fontWeight="medium">{group.nombre}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Estudiantes Aprobados: {group.approvedStudentCount !== undefined ? group.approvedStudentCount : 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    Código de Acceso: {group.codigo_acceso}
                                </Typography>
                                </CardContent>
                            </Card>
                            ))}
                             <Box sx={{ mt: 2, textAlign: 'right' }}>
                                <MuiLink 
                                    component="button" 
                                    variant="body2" 
                                    color='text.secondary'
                                    onClick={() => navigate('/teacher/groups')} 
                                    sx={{ fontWeight: 'medium' }}
                                >
                                    Gestionar mis grupos
                                </MuiLink>
                            </Box>
                        </Stack>
                        ) : (
                        <Typography variant="body2" color="text.secondary" sx={{mt:1}}>
                            No has creado grupos activos o no se pudieron cargar.
                        </Typography>
                        )}
                        {/* BOTÓN "CREAR NUEVO GRUPO" ELIMINADO DE AQUÍ */}
                    </Paper>
                </Stack>
            </Grid>
        </Grid>

        {systemAnnouncements.length > 0 && (
            <Box sx={{ mt: 4 }}>
                <Paper elevation={3} sx={{ p: 2.5, overflow: 'hidden', position: 'relative' }}>
                   <Typography variant="h6" component="h2" gutterBottom sx={{display: 'flex', alignItems: 'center', mb: 1.5, fontSize: '1.1rem'}}>
                        <CampaignIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        Anuncios del Sistema
                    </Typography>
                    <Box sx={{ minHeight: {xs: 120, sm: 90}, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AnimatePresence mode="wait">
                        {currentAnnouncement && (
                            <motion.div
                            key={currentAnnouncementIndex}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }} style={{ width: '100%', textAlign: 'center' }}
                            >
                            <Box>
                                <Typography variant="subtitle1" component="h3" gutterBottom sx={{fontWeight: 'medium', fontSize: '0.95rem'}}>
                                {currentAnnouncement.title || "Anuncio"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph sx={{mb: 0.5, whiteSpace: 'pre-line', fontSize:'0.8rem', maxHeight: '60px', overflowY: 'auto'}}>
                                {currentAnnouncement.message}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" display="block" sx={{fontSize: '0.65rem'}}>
                                {`Publicado: ${new Date(currentAnnouncement.createdAt).toLocaleDateString('es-CO', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}`}
                                </Typography>
                                {currentAnnouncement.link && (
                                <MuiLink component={RouterLink} to={currentAnnouncement.link} variant="caption" sx={{ mt: 0.5, display: 'inline-block', fontWeight:'bold', fontSize: '0.7rem' }} target="_blank" rel="noopener noreferrer">
                                    Más Información
                                </MuiLink>
                                )}
                            </Box>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </Box>
                    {systemAnnouncements.length > 1 && (
                        <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5} sx={{ mt: 1, mb: -1.5 }}>
                        <IconButton onClick={handlePrevAnnouncement} size="small"><NavigateBeforeIcon fontSize="small"/></IconButton>
                        {systemAnnouncements.map((_, index) => (
                            <Box key={index} onClick={() => setCurrentAnnouncementIndex(index)}
                            sx={{ width: currentAnnouncementIndex === index ? 7:5, height: currentAnnouncementIndex === index ? 7:5, borderRadius:'50%', bgcolor: index === currentAnnouncementIndex ? 'secondary.light':'action.disabled', cursor:'pointer', transition:'all 0.2s'}}
                            />
                        ))}
                        <IconButton onClick={handleNextAnnouncement} size="small"><NavigateNextIcon fontSize="small"/></IconButton>
                        </Stack>
                    )}
                </Paper>
            </Box>
        )}
      </Box>
    </Container>
  );
}

export default TeacherPanel;