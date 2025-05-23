import React, { useEffect, useState } from 'react';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import {
  Container, Box, Typography, LinearProgress, Paper, List, ListItem, ListItemText, Chip, Divider, CircularProgress, Alert
} from '@mui/material';

function StudentProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false); // Cambiar a false inicialmente
  const [loadingPaths, setLoadingPaths] = useState(false); // Para la carga de rutas

  // Traducción optimizada de estados
  const STATUS_TRANSLATIONS = {
    open: 'Abierto',
    closed: 'Cerrado',
    draft: 'Borrador',
    pending: 'Pendiente',
    submitted: 'Entregado',
    graded: 'Calificado',
    completed: 'Completado',
    in_progress: 'En progreso',
    not_started: 'No iniciado'
  };

  const translateStatus = (status) => {
    if (!status) return 'Desconocido';
    return STATUS_TRANSLATIONS[status.toLowerCase()] || 
           status.charAt(0).toUpperCase() + status.slice(1);
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
      setProgress(null); // Limpiar datos anteriores
      setActivities([]);
      
      Promise.all([
        axiosInstance.get(`/api/progress/my/${selectedPath._id}`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/activities/student`) 
      ]).then(([progressRes, activitiesRes]) => {
        setProgress(progressRes.data.progress);
        setActivities(activitiesRes.data.activities);
      }).catch(error => {
        console.error('Error loading progress and activities:', error);
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
          <Typography variant="h6">Progreso en la Ruta</Typography>
          <LinearProgress
            variant="determinate"
            value={progress.completed_themes.length / progress.total_themes * 100}
            sx={{ height: 10, borderRadius: 5, my: 2 }}
          />
          <Typography>
            {progress.completed_themes.length} de {progress.total_themes} temas completados
          </Typography>
        </Paper>
      )}

      {/* Mostrar actividades solo si hay una ruta seleccionada y no está cargando */}
      {selectedPath && !loading && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Actividades</Typography>
          {activities.length > 0 ? (
            <List>
              {activities.map(act => (
                <React.Fragment key={act._id}>
                  <ListItem>
                    <ListItemText
                      primary={act.title}
                      secondary={
                        <>
                          <Typography variant="body2">Estado: {translateStatus(act.status)}</Typography>
                          <Typography variant="body2">
                            Calificación: {act.lastSubmission?.calificacion !== undefined
                              ? act.lastSubmission.calificacion
                              : 'Pendiente'}
                          </Typography>
                        </>
                      }
                    />
                    <Chip
                        label={
                            !act.lastSubmission
                            ? 'Pendiente de entrega'
                            : act.lastSubmission.estado_envio === 'Calificado'
                                ? 'Calificado'
                                : 'Pendiente de calificar'
                        }
                        color={
                            !act.lastSubmission
                            ? 'default'
                            : act.lastSubmission.estado_envio === 'Calificado'
                                ? 'success'
                                : 'warning'
                        }
                        />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No hay actividades disponibles para esta ruta.
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
    </Container>
  );
}

export default StudentProgressPage;