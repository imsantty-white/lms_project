import React, { useEffect, useState } from 'react';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import {
  Container, Box, Typography, LinearProgress, Paper, List, ListItem, ListItemText, Chip, Divider, CircularProgress, Alert, Snackbar
} from '@mui/material';

function StudentProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false); // State for Snackbar

  // Traducción de estados para el progreso de la ruta y estado de actividades
  const STATUS_TRANSLATIONS = {
    // Para path_status desde el backend
    'completado': 'completed',
    'en progreso': 'in progress',
    'no iniciado': 'not started',
    // Para estados de actividades/asignaciones (existentes)
    open: 'Abierto',
    closed: 'Cerrado',
    draft: 'Borrador',
    // Para estados de entrega (existentes)
    pending: 'Pendiente', // Usado para actividad.lastSubmission no existente
    submitted: 'Entregado', // Usado para actividad.lastSubmission.estado_envio
    graded: 'Calificado', // Usado para actividad.lastSubmission.estado_envio
    // Nuevos estados para la interfaz de actividades (si es necesario, o usar los de arriba)
    'pendiente de entrega': 'Pendiente de entrega',
    'pendiente de calificar': 'Pendiente de calificar'
  };
  
  const translateStatus = (statusKey) => {
    if (!statusKey) return 'Desconocido';
    const lowerStatusKey = statusKey.toLowerCase();
    return STATUS_TRANSLATIONS[lowerStatusKey] || 
           statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
  };

  // 1. Cargar rutas de aprendizaje asignadas al estudiante
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingPaths(true);
      axiosInstance.get('/api/learning-paths/my-assigned')
        .then(res => {
          // res.data.data es el array de rutas
          const paths = Array.isArray(res.data.data) ? res.data.data : [];
          setLearningPaths(paths);
        })
        .catch(() => setLearningPaths([]))
        .finally(() => setLoadingPaths(false));
    }
  }, [isAuthenticated]);

  // 2. Cuando el estudiante selecciona una ruta, cargar progreso y actividades
  useEffect(() => {
    if (selectedPath) {
      setLoading(true);
      setProgress(null); 
      setActivities([]);
      setSnackbarOpen(false); // Close snackbar when new path is selected or data is being fetched
      
      Promise.all([
        axiosInstance.get(`/api/progress/my/${selectedPath._id}`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/activities/student`)
      ]).then(([progressRes, activitiesRes]) => {
        const newProgressData = progressRes.data;
        setProgress(newProgressData); 
        setActivities(activitiesRes.data.activities || []); 

        if (newProgressData && newProgressData.path_status === 'No Iniciado') {
          setSnackbarOpen(true);
        } else {
          setSnackbarOpen(false); 
        }
      }).catch(error => {
        console.error('Error loading progress or activities:', error);
        setProgress(null); 
        setActivities([]);
        setSnackbarOpen(false); // Ensure snackbar is closed on error
        // Opcional: mostrar mensaje de error
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [selectedPath]);

  // Mostrar loading solo si la autenticación no ha sido inicializada
  if (!isAuthInitialized) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  // Si no está autenticado, mostrar mensaje o redirigir
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning">
          Debes iniciar sesión para ver tu progreso.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>Mi Progreso</Typography>
      
      {/* Selector de ruta de aprendizaje */}
      <Box sx={{ mb: 3 }}>
        {loadingPaths ? (
          <CircularProgress size={24} />
        ) : (
          learningPaths.map(lp => (
            <Chip
              key={lp._id}
              label={lp.nombre}
              color={selectedPath?._id === lp._id ? 'primary' : 'default'}
              onClick={() => setSelectedPath(lp)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))
        )}
      </Box>

      {/* Mostrar loading solo cuando se está cargando el progreso de una ruta específica */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Mostrar progreso solo si hay una ruta seleccionada y no está cargando */}
      {selectedPath && !loading && progress && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Progreso en la Ruta: {translateStatus(progress.path_status)}
          </Typography>
          
          {progress.total_activities > 0 ? (
            <>
              <LinearProgress
                variant="determinate"
                value={(progress.graded_activities / progress.total_activities) * 100}
                sx={{ height: 10, borderRadius: 5, my: 2 }}
              />
              <Typography>
                {progress.graded_activities} de {progress.total_activities} actividades calificadas
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
              {progress.path_status === 'Completado' 
                ? 'Completado (sin actividades asignadas)' 
                : 'No hay actividades asignadas en esta ruta para medir el progreso.'}
            </Typography>
          )}
        </Paper>
      )}

      {/* Mostrar actividades solo si hay una ruta seleccionada y no está cargando */}
      {selectedPath && !loading && (
         <Paper sx={{ p: 3, mt: 3 }}> {/* Añadido margen superior para separar de la sección de progreso */}
          <Typography variant="h6" gutterBottom>Detalle de Actividades</Typography>
          {activities && activities.length > 0 ? ( // Comprobar que activities existe y tiene items
            <List>
              {activities.map(act => (
                <React.Fragment key={act.activity_id?._id || act._id}> {/* Usar activity_id._id si está poblado, sino act._id */}
                  <ListItem>
                    <ListItemText
                      primary={act.activity_id?.title || 'Título no disponible'} // Acceder al título desde activity_id poblado
                      secondary={
                        <>
                          <Typography variant="body2">
                            Estado de la asignación: {translateStatus(act.status)} 
                          </Typography>
                          <Typography variant="body2">
                            Tu calificación: {act.lastSubmission?.calificacion !== undefined && act.lastSubmission?.calificacion !== null
                              ? act.lastSubmission.calificacion
                              : 'N/A'} 
                          </Typography>
                           <Typography variant="body2">
                            Estado de tu entrega: {act.lastSubmission 
                                ? translateStatus(act.lastSubmission.estado_envio)
                                : translateStatus('pendiente de entrega')
                            }
                          </Typography>
                        </>
                      }
                    />
                     <Chip
                        label={
                            !act.lastSubmission
                            ? translateStatus('pendiente de entrega') // Usar translateStatus
                            : translateStatus(act.lastSubmission.estado_envio) // Usar translateStatus
                        }
                        color={
                            !act.lastSubmission
                            ? 'default'
                            : act.lastSubmission.estado_envio === 'Calificado'
                                ? 'success'
                                : act.lastSubmission.estado_envio === 'Enviado'
                                    ? 'warning'
                                    : 'default' // Para 'Pendiente' u otros
                        }
                        />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No hay actividades disponibles o asignadas para esta ruta.
            </Typography>
          )}
        </Paper>
      )}

      {/* Mensaje cuando no hay ruta seleccionada */}
      {!selectedPath && !loadingPaths && learningPaths.length > 0 && (
        <Alert severity="info">
          Selecciona una ruta de aprendizaje para ver tu progreso.
        </Alert>
      )}

      {/* Mensaje cuando no hay rutas asignadas */}
      {!loadingPaths && learningPaths.length === 0 && (
        <Alert severity="info">
          No tienes rutas de aprendizaje asignadas.
        </Alert>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ width: '100%' }}>
          Esta ruta de aprendizaje aún no ha sido iniciada. ¡Es hora de empezar!
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default StudentProgressPage;