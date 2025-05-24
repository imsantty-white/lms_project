import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom'; // Import useLocation
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import {
  Container, Box, Typography, LinearProgress, Paper, List, ListItem, ListItemText, Chip, Divider, CircularProgress, Alert, Grid
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

function StudentProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const location = useLocation(); // Get location object

  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false); // For loading progress/activities of selected path
  const [loadingPaths, setLoadingPaths] = useState(true); // Initially true for loading paths list

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

  useEffect(() => {
    if (isAuthenticated && isAuthInitialized) { // Ensure auth is initialized before fetching
      setLoadingPaths(true);
      axiosInstance.get('/api/learning-paths/my-assigned')
        .then(res => {
          const paths = Array.isArray(res.data.data) ? res.data.data : [];
          setLearningPaths(paths);

          // Check for pathId in URL and pre-select
          const queryParams = new URLSearchParams(location.search);
          const pathIdFromUrl = queryParams.get('pathId');
          
          if (pathIdFromUrl && paths.length > 0) {
            const pathFromUrl = paths.find(p => p._id === pathIdFromUrl);
            if (pathFromUrl) {
              setSelectedPath(pathFromUrl);
            } else {
              console.warn(`Learning path with ID "${pathIdFromUrl}" from URL not found in user's assigned paths.`);
            }
          }
        })
        .catch(() => {
          setLearningPaths([]);
          // Optionally set an error state here for learning paths loading
        })
        .finally(() => setLoadingPaths(false));
    } else if (isAuthInitialized && !isAuthenticated) {
      setLoadingPaths(false); // Not authenticated, stop loading
      setLearningPaths([]);
    }
  }, [isAuthenticated, isAuthInitialized, location.search]); // location.search ensures re-check if URL query changes

  useEffect(() => {
    if (selectedPath?._id) { // Ensure selectedPath and its _id exists
      setLoading(true);
      setProgress(null);
      setActivities([]);
      Promise.all([
        axiosInstance.get(`/api/progress/my/${selectedPath._id}`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/activities/student`)
      ]).then(([progressRes, activitiesRes]) => {
        setProgress(progressRes.data.progress);
        const activitiesWithDates = (activitiesRes.data.activities || []).map(act => ({
          ...act,
          submissionDate: act.lastSubmission?.fecha_envio ? new Date(act.lastSubmission.fecha_envio).toLocaleDateString() : 'N/A'
        }));
        setActivities(activitiesWithDates);
      }).catch(error => {
        console.error(`Error loading progress and activities for path ${selectedPath._id}:`, error);
        // Optionally set an error state for this specific load
      }).finally(() => {
        setLoading(false);
      });
    } else {
      // No path selected, or selectedPath is invalid, clear data and stop loading
      setProgress(null);
      setActivities([]);
      setLoading(false);
    }
  }, [selectedPath?._id]); // Depend on selectedPath._id to re-trigger if the ID changes

  if (!isAuthInitialized) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{mt: 2}}>
        <Alert severity="warning">
          Debes iniciar sesión para ver tu progreso.
        </Alert>
      </Container>
    );
  }

  const COLORS = ['#0088FE', '#FFBB28']; 

  const themeProgressData = selectedPath && progress ? [
    { name: 'Completados', value: progress.completed_themes?.length || 0 },
    { name: 'Pendientes', value: (progress.total_themes || 0) - (progress.completed_themes?.length || 0) },
  ] : [];

  const gradedActivities = activities
    .filter(act => act.lastSubmission?.estado_envio === 'Calificado' && act.lastSubmission?.calificacion !== undefined)
    .map(act => ({
      name: act.title.substring(0, 15) + (act.title.length > 15 ? '...' : ''),
      score: act.lastSubmission.calificacion,
      date: act.submissionDate, 
    }))
    .sort((a, b) => {
        // Handle 'N/A' dates by pushing them to the end or beginning
        if (a.date === 'N/A' && b.date === 'N/A') return 0;
        if (a.date === 'N/A') return 1; // Push 'N/A' to the end
        if (b.date === 'N/A') return -1; // Keep valid dates before 'N/A'
        return new Date(a.date) - new Date(b.date);
    });


  return (
    <Container maxWidth="lg"> 
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3, mt: 2 }}>
        Mi Progreso Detallado
      </Typography>

      {/* Learning Path Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
        {loadingPaths ? (
          <CircularProgress size={24} />
        ) : learningPaths.length > 0 ? (
          learningPaths.map(lp => (
            <Chip
              key={lp._id}
              label={lp.nombre}
              color={selectedPath?._id === lp._id ? 'primary' : 'default'}
              onClick={() => setSelectedPath(lp)}
              sx={{ cursor: 'pointer' }}
            />
          ))
        ) : (
          !loadingPaths && <Alert severity="info">No tienes rutas de aprendizaje asignadas.</Alert>
        )}
      </Box>

      {/* Loading state for selected path data */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
          <Typography sx={{ml: 2}}>Cargando detalles del progreso...</Typography>
        </Box>
      )}

      {/* Message if no path is selected and not loading paths */}
      {!selectedPath && !loadingPaths && learningPaths.length > 0 && (
        <Alert severity="info" sx={{ mt: 2, textAlign: 'center' }}>
          Selecciona una ruta de aprendizaje para ver tu progreso detallado.
        </Alert>
      )}
      
      {/* Detailed Progress View for Selected Path */}
      {selectedPath && !loading && (
        <>
          <Typography variant="h5" component="h2" sx={{ textAlign: 'center', mb: 2 }}>
            Progreso en: {selectedPath.nombre}
          </Typography>
          
          {progress ? (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom align="center">Progreso General de Temas</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progress.total_themes > 0 ? ((progress.completed_themes?.length || 0) / progress.total_themes * 100) : 0}
                    sx={{ height: 10, borderRadius: 5, my: 1 }}
                  />
                  <Typography align="center" variant="body2" color="text.secondary">
                    {(progress.completed_themes?.length || 0)} de {progress.total_themes || 0} temas completados
                  </Typography>
                  {(progress.total_themes || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={themeProgressData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {themeProgressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography align="center" sx={{ mt: 2 }}>No hay temas para mostrar en esta ruta.</Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom align="center">Actividades Recientes (Primeras 5)</Typography>
                  {activities.length > 0 ? (
                    <List dense sx={{flexGrow: 1, overflow: 'auto'}}>
                      {activities.slice(0, 5).map(act => (
                        <ListItem key={act._id} disableGutters divider>
                          <ListItemText
                            primary={act.title}
                            secondary={`Estado: ${translateStatus(act.status)} - Calificación: ${act.lastSubmission?.calificacion ?? 'Pendiente'}`}
                          />
                          <Chip
                            label={
                                !act.lastSubmission
                                ? 'Pendiente'
                                : act.lastSubmission.estado_envio === 'Calificado'
                                    ? `Calificado: ${act.lastSubmission.calificacion}`
                                    : 'Por Calificar'
                            }
                            size="small"
                            color={
                                !act.lastSubmission
                                ? 'default'
                                : act.lastSubmission.estado_envio === 'Calificado'
                                    ? 'success'
                                    : 'warning'
                            }
                            />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{mt:2}}>
                      No hay actividades en esta ruta.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          ) : (
             <Alert severity="info" sx={{ my: 2 }}>No se encontraron datos de progreso para esta ruta.</Alert>
          )}
          
          {/* Full Activities List */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom align="center">Lista Completa de Actividades</Typography>
            {activities.length > 0 ? (
              <List>
                {activities.map(act => (
                  <React.Fragment key={act._id}>
                    <ListItem>
                      <ListItemText
                        primary={act.title}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">Estado: {translateStatus(act.status)}</Typography>
                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                              Calificación: {act.lastSubmission?.calificacion !== undefined
                                ? act.lastSubmission.calificacion
                                : 'Pendiente'}
                            </Typography>
                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                              Fecha de Entrega: {act.submissionDate}
                            </Typography>
                          </>
                        }
                      />
                      <Chip
                        label={
                          !act.lastSubmission
                            ? 'Pendiente de Entrega'
                            : act.lastSubmission.estado_envio === 'Calificado'
                              ? 'Calificado'
                              : 'Pendiente de Calificar'
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
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                No hay actividades disponibles para esta ruta.
              </Typography>
            )}
          </Paper>

          {/* Scores Over Time Chart */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom align="center">Puntuaciones a lo Largo del Tiempo</Typography>
            {gradedActivities.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={gradedActivities} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name"/>
                  <YAxis label={{ value: 'Puntuación', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} name="Puntuación"/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                Aún no hay actividades calificadas para mostrar la evolución de las puntuaciones.
              </Typography>
            )}
          </Paper>
          
          {/* Performance Summary Placeholder */}
          <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom align="center">Resumen de Desempeño</Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                  El resumen detallado del desempeño (fortalezas y debilidades) estará disponible pronto.
              </Typography>
          </Paper>
        </>
      )}
    </Container>
  );
}

export default StudentProgressPage;