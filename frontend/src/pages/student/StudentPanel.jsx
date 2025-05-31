// src/pages/PanelEstudiante.jsx

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
  Link as MuiLink,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
// import { toast } from 'react-toastify'; // Puedes quitarlo si ya no se usa para errores de anuncios/actividades
import { motion, AnimatePresence } from 'framer-motion';

// Iconos
import CampaignIcon from '@mui/icons-material/Campaign';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import IconButton from '@mui/material/IconButton';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import EventBusyIcon from '@mui/icons-material/EventBusy'; 
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditNoteIcon from '@mui/icons-material/EditNote'; // Icono para el Alert de perfil incompleto

function StudentPanel() {
  const { user, isAuthInitialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [profileActuallyComplete, setProfileActuallyComplete] = useState(true); // Estado para la completitud del perfil
  const [systemAnnouncements, setSystemAnnouncements] = useState([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [pendingActivities, setPendingActivities] = useState([]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    if (!isAuthenticated || user?.tipo_usuario !== 'Estudiante') {
      setFetchError('Acceso denegado. Debes iniciar sesión como estudiante para ver este panel.');
      setIsLoading(false);
      return;
    }

    const dataPromises = [];

    // Promesa para obtener el estado de completitud del perfil
    dataPromises.push(
      axiosInstance.get('/api/profile/completion-status') // <-- TU ENDPOINT AQUÍ
        .then(response => {
          if (response.data && typeof response.data.isComplete === 'boolean') {
            setProfileActuallyComplete(response.data.isComplete);
          } else {
            setProfileActuallyComplete(false); 
            console.warn("Respuesta inesperada del endpoint de completitud de perfil:", response.data);
          }
        })
        .catch(error => {
          console.error("Error al verificar estado del perfil:", error.response?.data || error.message);
          setProfileActuallyComplete(false); // Asumir incompleto en caso de error
        })
    );
      
    // Promesa para obtener anuncios del sistema
    dataPromises.push(
      axiosInstance.get('/api/announcements/panel?limit=5')
        .then(response => {
          if (response.data && response.data.success) {
            setSystemAnnouncements(response.data.data || []);
          } else { 
            setSystemAnnouncements([]); 
          }
        })
        .catch(announcementError => {
          console.error("Error al cargar anuncios:", announcementError.response?.data || announcementError.message);
          setSystemAnnouncements([]);
        })
    );

    // Promesa para obtener actividades pendientes
    dataPromises.push(
      axiosInstance.get('/api/activities/my-pendings?limit=3') 
        .then(response => {
          if (response.data && response.data.success) {
            setPendingActivities(response.data.data || []);
          } else { 
            setPendingActivities([]); 
          }
        })
        .catch(error => {
          console.error("Error al cargar act. pendientes:", error.response?.data || error.message);
          setPendingActivities([]);
        })
    );

    try {
      await Promise.all(dataPromises);
    } catch (err) {
      console.error("Error general al cargar datos del panel del estudiante:", err);
      // El error específico ya se maneja en los catch individuales,
      // pero puedes poner un error general si alguna promesa falla sin ser atrapada.
      if (!fetchError) { // Solo si no hay un error más específico ya establecido
          setFetchError('Error al cargar la información del panel.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]); // user como dependencia para que fetch_data se actualice si el usuario cambia

  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      fetchData();
    } else if (isAuthInitialized && !isAuthenticated) {
        setIsLoading(false);
        setFetchError("Por favor, inicia sesión para ver tu panel.");
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
  
  // getWeatherMuiIcon ya no es necesaria

  if (!isAuthInitialized || isLoading) {
    return ( 
        <Container><Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /><Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Cargando tu panel...</Typography></Box></Container>
    );
  }

  // Mostrar error principal solo si hubo un error de fetch general y no hay otros datos que mostrar
  if (fetchError && systemAnnouncements.length === 0 && pendingActivities.length === 0) {
      return ( 
          <Container><Box sx={{ mt: 4, textAlign: 'center' }}><Alert severity="error">{fetchError}</Alert></Box></Container>
      );
  }

  const currentAnnouncement = systemAnnouncements[currentAnnouncementIndex];

  return (
    <Container maxWidth="md"> 
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {getGreeting()}, {user?.nombre || 'Estudiante'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bienvenido de nuevo a tu espacio de aprendizaje.
        </Typography>

        {/* MENSAJE DE PERFIL INCOMPLETO (USA ALERT) */}
        {!isLoading && !profileActuallyComplete && ( 
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }} 
            icon={<EditNoteIcon fontSize="inherit" />}
            action={
              <Button color="warning" size="small" variant="outlined" onClick={() => navigate('/profile')}>
                Ver Perfil
              </Button>
            }
          >
            <Typography fontWeight="medium">¡Tu perfil está casi listo!</Typography>
            <Typography variant="body2">
                Algunos datos importantes de tu perfil podrían estar pendientes. Ayúdanos a conocerte mejor.
            </Typography>
          </Alert>
        )}
        {/* FIN MENSAJE PERFIL INCOMPLETO */}

        <Stack spacing={3}>
          {/* SECCIÓN DE CLIMA ELIMINADA */}
          {/* SECCIÓN "ACTIVIDADES PENDIENTES" */}
          <Paper elevation={3} sx={{ p: 2.5 }}>
            <Typography variant="h6" component="h2" gutterBottom sx={{fontSize: '1.1rem', display: 'flex', alignItems: 'center'}}>
              <AssignmentTurnedInIcon color="warning" sx={{mr: 1, fontSize: '1.25rem'}} />
              Actividades Pendientes
            </Typography>
            {pendingActivities.length > 0 ? (
              <List dense sx={{p:0, maxHeight: 200, overflow: 'auto' }}>
                {pendingActivities.map((activity, index) => (
                  <React.Fragment key={activity._id}>
                    <ListItem 
                        button 
                        component={RouterLink} 
                        to={activity.link || '/student/learning-paths'}
                        sx={{ '&:hover': { bgcolor: 'action.hover', borderRadius: 1 } }}
                    >
                      <ListItemIcon sx={{minWidth: 36, mr: 1}}>
                        <EventBusyIcon color={activity.dueDate && new Date(activity.dueDate) < new Date() ? "error" : "warning"} />
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <>
                            <Typography component="span" variant="caption" display="block" color="text.secondary" sx={{lineHeight: 1.2}}>
                              Ruta: {activity.learningPathName}
                            </Typography>
                            <Typography component="span" variant="caption" display="block" color="text.secondary" sx={{lineHeight: 1.2}}>
                            {activity.dueDate ? 
                              `Vence: ${new Date(activity.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour:'2-digit', minute:'2-digit' })}`
                              : 'Sin fecha límite'}
                            </Typography>
                          </>
                        }
                        primaryTypographyProps={{fontWeight:'medium', fontSize:'0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}
                        secondaryTypographyProps={{fontSize:'0.75rem'}}
                      />
                       <Tooltip title="Ver actividad en Ruta">
                         <OpenInNewIcon fontSize="small" color="action" sx={{ml:1, opacity: 0.6}}/>
                       </Tooltip>
                    </ListItem>
                    {index < pendingActivities.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{mt:1}}>
                ¡Estás al día! No tienes actividades pendientes por ahora.
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button size="small" color='text.primary' variant="contained" onClick={() => navigate('/student/learning-paths')}>
                Ver Rutas
              </Button>
              <Button size="small" color='text.primary' variant="contained" onClick={() => navigate('/student/progress')}>
                Ver Progreso
              </Button>
            </Box>
          </Paper>
          {/* FIN SECCIÓN "ACTIVIDADES PENDIENTES" */}

          {/* SECCIÓN DE ANUNCIOS DEL SISTEMA (ROTATIVA) */}
          {systemAnnouncements.length > 0 && (
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
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      style={{ width: '100%', textAlign: 'center' }}
                    >
                      <Box>
                        <Typography variant="subtitle1" component="h3" gutterBottom sx={{fontWeight: 'medium', fontSize: '0.95rem'}}>
                          {currentAnnouncement.title || "Anuncio del Sistema"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph sx={{mb: 0.5, whiteSpace: 'pre-line', fontSize:'0.8rem', maxHeight: '60px', overflowY: 'auto'}}>
                          {currentAnnouncement.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" display="block" sx={{fontSize: '0.65rem'}}>
                          {`Publicado: ${new Date(currentAnnouncement.createdAt).toLocaleDateString('es-CO', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}`}
                        </Typography>
                        {currentAnnouncement.link && (
                          <MuiLink 
                              component={RouterLink} 
                              to={currentAnnouncement.link} 
                              variant="caption"
                              sx={{ mt: 0.5, display: 'inline-block', fontWeight:'bold', fontSize: '0.7rem' }}
                              target="_blank"
                              rel="noopener noreferrer"
                          >
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
                  <IconButton onClick={handlePrevAnnouncement} size="small" aria-label="Anuncio anterior" sx={{p:0.3}}>
                    <NavigateBeforeIcon fontSize="small"/>
                  </IconButton>
                  {systemAnnouncements.map((_, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentAnnouncementIndex(index)}
                      sx={{
                        width: currentAnnouncementIndex === index ? 7 : 5,
                        height: currentAnnouncementIndex === index ? 7 : 5,
                        borderRadius: '50%',
                        bgcolor: index === currentAnnouncementIndex ? 'secondary.light' : 'action.disabled',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                  <IconButton onClick={handleNextAnnouncement} size="small" aria-label="Siguiente anuncio" sx={{p:0.3}}>
                    <NavigateNextIcon fontSize="small"/>
                  </IconButton>
                </Stack>
              )}
            </Paper>
          )}
          {/* FIN SECCIÓN DE ANUNCIOS */}

          

        </Stack>
      </Box>
    </Container>
  );
}

export default StudentPanel;