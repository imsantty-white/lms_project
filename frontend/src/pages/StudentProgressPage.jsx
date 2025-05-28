import React, { useEffect, useState } from 'react';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import {
  Container, Box, Typography, LinearProgress, Paper, List, ListItem, ListItemText, Chip, Divider, CircularProgress, Alert, Snackbar
} from '@mui/material';

function StudentProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [learningPaths, setLearningPaths] = useState([]);
  // selectedPath ahora podría almacenar un objeto más completo si es necesario,
  // pero lo esencial es que debe contener el _id de la ruta y el group_id asociado.
  const [selectedPath, setSelectedPath] = useState(null); 
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Traducción de estados
  const STATUS_TRANSLATIONS = {
    'completado': 'Completado',
    'en progreso': 'En Progreso',
    'no iniciado': 'No Iniciada',
    open: 'Abierto',
    closed: 'Cerrado',
    draft: 'Borrador',
    submitted: 'Entregado',
    graded: 'Calificado',
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
      // Asumo que tu endpoint /api/learning-paths/my-assigned
      // ahora devuelve el group_id asociado a cada ruta de aprendizaje que el estudiante tiene asignada.
      // Si un estudiante tiene la misma ruta asignada en múltiples grupos,
      // este endpoint debería devolver entradas separadas para cada combinación ruta-grupo.
      axiosInstance.get('/api/learning-paths/my-assigned')
      
        .then(res => {
          console.log("Rutas asignadas recibidas:", res.data.data);
          const paths = Array.isArray(res.data.data) ? res.data.data : [];
          setLearningPaths(paths);
          // Si solo hay una ruta, seleccionarla automáticamente
          if (paths.length > 0 && !selectedPath) {
              setSelectedPath(paths[0]);
          }
        })
        .catch(error => {
            console.error("Error cargando rutas de aprendizaje asignadas:", error);
            setLearningPaths([]);
        })
        .finally(() => setLoadingPaths(false));
    }
  }, [isAuthenticated]);

  // 2. Cuando el estudiante selecciona una ruta (que incluye el group_id), cargar progreso y actividades
  useEffect(() => {
    // Asegúrate de que selectedPath tenga learningPathId y groupId
    if (selectedPath && selectedPath._id && selectedPath.group_id) {
      setLoading(true);
      setProgress(null);
      setActivities([]);
      setSnackbarOpen(false);

      // --- CAMBIO CLAVE AQUÍ: Pasar groupId al endpoint de progreso ---
      // El endpoint de progreso ahora es /api/progress/:learningPathId/:groupId/student
      Promise.all([
        axiosInstance.get(`/api/progress/${selectedPath._id}/${selectedPath.group_id}/student`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/activities/student`) // Este endpoint podría necesitar un groupId también si las actividades son específicas de grupo
      ]).then(([progressRes, activitiesRes]) => {
        console.log("Progreso recibido:", progressRes.data);
        console.log("Actividades recibidas:", activitiesRes.data.activities);
        // --- CAMBIO CLAVE AQUÍ: Manejar la respuesta del backend para el progreso ---
        // El backend ahora devuelve { progress, calculated_data }
        const { progress: dbProgress, calculated_data: latestCalculatedData } = progressRes.data;

        // Utilizamos los datos calculados más recientes para la visualización del progreso
        // y el documento 'progress' de la DB si necesitamos sus detalles (como completed_themes)
        setProgress({
            ...dbProgress, // Los datos de la DB
            ...latestCalculatedData // Sobreescribimos con los datos calculados más recientes
        }); 

        setActivities(activitiesRes.data.activities || []);

        if (latestCalculatedData && latestCalculatedData.path_status === 'No Iniciado') {
          setSnackbarOpen(true);
        } else {
          setSnackbarOpen(false);
        }
      }).catch(error => {
        console.error('Error loading progress or activities:', error.response?.data || error.message);
        setProgress(null);
        setActivities([]);
        setSnackbarOpen(false);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [selectedPath]); // Asegúrate de que se re-ejecute cuando selectedPath cambia

  if (!isAuthInitialized) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

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
          // Asegúrate de que `lp` contenga tanto `_id` como `group_id` de la ruta asignada
          learningPaths.map(lp => (
            <Chip
              key={`${lp._id}-${lp.group_id}`} // Clave única por ruta-grupo
              label={`${lp.nombre} (Grupo: ${lp.group_name || lp.group_id})`} // Mostrar nombre del grupo si lo tienes
              color={selectedPath?._id === lp._id && selectedPath?.group_id === lp.group_id ? 'primary' : 'default'}
              onClick={() => setSelectedPath(lp)} // lp ya debería ser el objeto completo con _id y group_id
              sx={{ mr: 1, mb: 1 }}
            />
          ))
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {selectedPath && !loading && progress && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Progreso en la Ruta: {translateStatus(progress.path_status)}
          </Typography>
          
          {progress.total_activities > 0 ? (
            <>
              <LinearProgress
                variant="determinate"
                // Asegúrate de que graded_activities y total_activities provengan de 'calculated_data'
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

      {selectedPath && !loading && (
          <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Detalle de Actividades</Typography>
          {activities && activities.length > 0 ? (
            <List>
              {activities.map(act => (
                <React.Fragment key={act.assignment_id || act._id}> {/* Usar assignment_id como clave si está disponible */}
                  <ListItem>
                    <ListItemText
                      primary={act.activity_id?.title || 'Título no disponible'}
                      secondary={
                        <>
                          <Typography variant="body2">
                            Estado de la asignación: {translateStatus(act.status)}
                          </Typography>
                          <Typography variant="body2">
                            Tu calificación: {act.lastSubmission?.calificacion !== undefined && act.lastSubmission?.calificacion !== null
                              ? act.lastSubmission.calificacion
                              : 'Sin calificar'}
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
                            ? translateStatus('pendiente de entrega')
                            : translateStatus(act.lastSubmission.estado_envio)
                        }
                        color={
                            !act.lastSubmission
                            ? 'default'
                            : act.lastSubmission.estado_envio === 'Calificado'
                                ? 'success'
                                : act.lastSubmission.estado_envio === 'Enviado'
                                    ? 'warning'
                                    : 'default'
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

      {!selectedPath && !loadingPaths && learningPaths.length > 0 && (
        <Alert severity="info">
          Selecciona una ruta de aprendizaje para ver tu progreso.
        </Alert>
      )}

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