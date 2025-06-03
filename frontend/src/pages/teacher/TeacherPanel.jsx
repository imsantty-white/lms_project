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
  Card, 
  CardContent,
  Link as MuiLink,
  Grid,
  Tooltip,
  Divider,
  Chip,
  Avatar,
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
import RateReviewIcon from '@mui/icons-material/RateReview';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

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
      axiosInstance.get('/api/docente/dashboard/stats')
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
  }, [isAuthenticated, user]);

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
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '60vh',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={48} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            Cargando tu panel...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (fetchError && systemAnnouncements.length === 0 && myGroupsSummary.length === 0 ) {
    return ( 
      <Container maxWidth="lg">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Alert 
            severity="error" 
            sx={{ 
              maxWidth: 600, 
              mx: 'auto',
              borderRadius: 2,
              '& .MuiAlert-message': { fontSize: '1.1rem' }
            }}
          >
            {fetchError}
          </Alert>
        </Box>
      </Container>
    );
  }

  const currentAnnouncement = systemAnnouncements[currentAnnouncementIndex];

  return (
    <Container maxWidth="lg"> 
      <Box sx={{ py: { xs: 3, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar 
              sx={{ 
                width: 56, 
                height: 56, 
                bgcolor: 'primary.main',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}
            >
              {user?.nombre?.charAt(0) || 'D'}
            </Avatar>
            <Box>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5
                }}
              >
                {getGreeting()}, {user?.nombre || 'Docente'}!
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ fontSize: '1.1rem' }}
              >
                Gestiona tus grupos y promueve tus conocimientos con tus estudiantes
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Profile Completion Alert */}
        {!isLoading && !profileActuallyComplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 4,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'warning.light',
                '& .MuiAlert-icon': { fontSize: 24 }
              }} 
              icon={<EditNoteIcon fontSize="inherit" />}
              action={
                <Button 
                  color="warning" 
                  size="small" 
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/profile')}
                  sx={{ fontWeight: 600 }}
                >
                  Completar Perfil
                </Button>
              }
            >
              <Typography fontWeight="600" sx={{ mb: 0.5 }}>
                ¡Tu perfil necesita atención!
              </Typography>
              <Typography variant="body2">
                Algunos datos importantes están pendientes. Completa tu información para una mejor experiencia.
              </Typography>
            </Alert>
          </motion.div>
        )}

        {/* Stats Cards Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  height: 180,
                  background: 'linear-gradient(135deg, #ff5722 0%, #ff7043 100%)',
                  color: 'white',
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 80,
                    height: 80,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    transform: 'translate(25%, -25%)'
                  }
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <RateReviewIcon sx={{ fontSize: 28, mr: 1 }} />
                    <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
                      Revisiones Pendientes
                    </Typography>
                  </Box>
                  <Typography variant="h2" fontWeight="700" sx={{ fontSize: '2.5rem' }}>
                    {dashboardStats.pendingReviewsCount}
                  </Typography>
                </Box>
                <Button 
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/teacher/assignments')}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    fontWeight: 600,
                    borderRadius: 2,
                    alignSelf: 'flex-start'
                  }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Ir a Calificar
                </Button>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3,
                  height: 180,
                  background: 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)',
                  color: 'white',
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 80,
                    height: 80,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    transform: 'translate(25%, -25%)'
                  }
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LibraryBooksIcon sx={{ fontSize: 28, mr: 1 }} />
                    <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
                      Banco de Contenido
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '0.95rem' }}>
                    Gestiona tu material educativo
                  </Typography>
                </Box>
                <Button 
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/teacher/content-bank')}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    fontWeight: 600,
                    borderRadius: 2,
                    alignSelf: 'flex-start'
                  }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Explorar
                </Button>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Groups Section */}
          <Grid item xs={12} md={8}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                height: 'fit-content'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 28, color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6" fontWeight="600">
                    Mis Grupos Activos
                  </Typography>
                </Box>
                <Chip 
                  label={`${myGroupsSummary.length} grupos`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              {myGroupsSummary.length > 0 ? (
                <Stack spacing={2}>
                  {myGroupsSummary.map((group, index) => (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card 
                        variant="outlined"
                        sx={{ 
                          borderRadius: 2,
                          transition: 'all 0.2s',
                          '&:hover': { 
                            transform: 'translateY(-2px)',
                            boxShadow: 2
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.1rem' }}>
                              {group.nombre}
                            </Typography>
                            <Chip 
                              label={group.codigo_acceso}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Estudiantes Aprobados: {group.approvedStudentCount !== undefined ? group.approvedStudentCount : 'N/A'}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/teacher/groups')}
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      Ver Todos los Grupos
                    </Button>
                  </Box>
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No tienes grupos activos en este momento
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Announcements Section */}
          <Grid item xs={12} md={4}>
            {systemAnnouncements.length > 0 && (
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  height: 'fit-content'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CampaignIcon sx={{ fontSize: 28, color: 'secondary.main', mr: 1 }} />
                  <Typography variant="h6" fontWeight="600">
                    Anuncios del Sistema
                  </Typography>
                </Box>
                
                <Box sx={{ minHeight: 250, display: 'flex', alignItems: 'center' }}>
                  <AnimatePresence mode="wait">
                    {currentAnnouncement && (
                      <motion.div
                        key={currentAnnouncementIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{ width: '100%' }}
                      >
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography 
                            variant="h6" 
                            component="h3" 
                            gutterBottom 
                            sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 2 }}
                          >
                            {currentAnnouncement.title || "Anuncio"}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            paragraph
                            sx={{ 
                              mb: 2, 
                              whiteSpace: 'pre-line', 
                              lineHeight: 1.6,
                              maxHeight: '120px', 
                              overflowY: 'auto'
                            }}
                          >
                            {currentAnnouncement.message}
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          <Typography 
                            variant="caption" 
                            color="text.disabled" 
                            display="block"
                            sx={{ mb: 1 }}
                          >
                            {`Publicado: ${new Date(currentAnnouncement.createdAt).toLocaleDateString('es-CO', {
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}`}
                          </Typography>
                          {currentAnnouncement.link && (
                            <Button
                              component={RouterLink}
                              to={currentAnnouncement.link}
                              variant="outlined"
                              size="small"
                              target="_blank"
                              rel="noopener noreferrer"
                              endIcon={<ArrowForwardIcon />}
                              sx={{ mt: 1, fontWeight: 600, borderRadius: 2 }}
                            >
                              Más Información
                            </Button>
                          )}
                        </Box>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Box>
                
                {systemAnnouncements.length > 1 && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                      <IconButton 
                        onClick={handlePrevAnnouncement} 
                        size="small"
                        sx={{ 
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <NavigateBeforeIcon fontSize="small"/>
                      </IconButton>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {systemAnnouncements.map((_, index) => (
                          <Box 
                            key={index} 
                            onClick={() => setCurrentAnnouncementIndex(index)}
                            sx={{ 
                              width: currentAnnouncementIndex === index ? 12 : 8, 
                              height: 8, 
                              borderRadius: 1,
                              bgcolor: index === currentAnnouncementIndex ? 'primary.main' : 'action.disabled', 
                              cursor: 'pointer', 
                              transition: 'all 0.3s ease',
                              '&:hover': { 
                                bgcolor: index === currentAnnouncementIndex ? 'primary.dark' : 'action.hover'
                              }
                            }}
                          />
                        ))}
                      </Box>
                      <IconButton 
                        onClick={handleNextAnnouncement} 
                        size="small"
                        sx={{ 
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <NavigateNextIcon fontSize="small"/>
                      </IconButton>
                    </Stack>
                  </Box>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default TeacherPanel;