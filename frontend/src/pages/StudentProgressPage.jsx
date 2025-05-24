import React, { useEffect, useState } from 'react';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import {
  Container, Box, Typography, LinearProgress, Paper, List, ListItem, ListItemText, Chip, Divider, CircularProgress, Alert, Grid
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

function StudentProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(false);

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
    if (isAuthenticated) {
      setLoadingPaths(true);
      axiosInstance.get('/api/learning-paths/my-assigned')
        .then(res => {
          const paths = Array.isArray(res.data.data) ? res.data.data : [];
          setLearningPaths(paths);
        })
        .catch(() => setLearningPaths([]))
        .finally(() => setLoadingPaths(false));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedPath) {
      setLoading(true);
      setProgress(null);
      setActivities([]);
      Promise.all([
        axiosInstance.get(`/api/progress/my/${selectedPath._id}`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/activities/student`)
      ]).then(([progressRes, activitiesRes]) => {
        setProgress(progressRes.data.progress);
        // Ensure activities have submission dates for charting
        const activitiesWithDates = activitiesRes.data.activities.map(act => ({
          ...act,
          submissionDate: act.lastSubmission?.fecha_envio ? new Date(act.lastSubmission.fecha_envio).toLocaleDateString() : 'N/A'
        }));
        setActivities(activitiesWithDates);
      }).catch(error => {
        console.error('Error loading progress and activities:', error);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [selectedPath]);

  if (!isAuthInitialized) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

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

  const COLORS = ['#0088FE', '#FFBB28']; // Blue for completed, Orange for pending

  const themeProgressData = selectedPath && progress ? [
    { name: 'Completados', value: progress.completed_themes.length },
    { name: 'Pendientes', value: progress.total_themes - progress.completed_themes.length },
  ] : [];

  const gradedActivities = activities
    .filter(act => act.lastSubmission?.estado_envio === 'Calificado' && act.lastSubmission?.calificacion !== undefined)
    .map(act => ({
      name: act.title.substring(0, 15) + (act.title.length > 15 ? '...' : ''), // Shorten name for chart
      score: act.lastSubmission.calificacion,
      date: act.submissionDate, 
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date if possible


  return (
    <Container maxWidth="lg"> {/* Changed to lg for more space */}
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>Mi Progreso</Typography>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
        {loadingPaths ? (
          <CircularProgress size={24} />
        ) : (
          learningPaths.map(lp => (
            <Chip
              key={lp._id}
              label={lp.nombre}
              color={selectedPath?._id === lp._id ? 'primary' : 'default'}
              onClick={() => setSelectedPath(lp)}
              sx={{ cursor: 'pointer' }}
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
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">Progreso General de Temas</Typography>
              <LinearProgress
                variant="determinate"
                value={progress.total_themes > 0 ? (progress.completed_themes.length / progress.total_themes * 100) : 0}
                sx={{ height: 10, borderRadius: 5, my: 1 }}
              />
              <Typography align="center" variant="body2" color="text.secondary">
                {progress.completed_themes.length} de {progress.total_themes} temas completados
              </Typography>
              {progress.total_themes > 0 ? (
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
                <Typography align="center" sx={{ mt: 2 }}>No hay temas para mostrar.</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">Actividades Recientes</Typography>
              {activities.length > 0 ? (
                <List dense>
                  {activities.slice(0, 5).map(act => ( // Show first 5 activities as a preview
                    <ListItem key={act._id} disableGutters>
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
                <Typography variant="body2" color="text.secondary" align="center">
                  No hay actividades en esta ruta.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {selectedPath && !loading && (
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
      )}

      {selectedPath && !loading && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom align="center">Puntuaciones a lo Largo del Tiempo</Typography>
          {gradedActivities.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gradedActivities} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name"
                  // tickFormatter={(tick) => tick.substring(0,15) + (tick.length > 15 ? "..." : "")}
                  // label={{ value: "Actividad", position: "insideBottomRight", offset:0}}
                 />
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
      )}

      {selectedPath && !loading && (
         <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom align="center">Resumen de Desempeño</Typography>
            <Typography variant="body2" color="text.secondary" align="center">
                El resumen detallado del desempeño (fortalezas y debilidades) estará disponible pronto.
            </Typography>
        </Paper>
      )}


      {!selectedPath && !loadingPaths && learningPaths.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Selecciona una ruta de aprendizaje para ver tu progreso.
        </Alert>
      )}

      {!loadingPaths && learningPaths.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No tienes rutas de aprendizaje asignadas.
        </Alert>
      )}
    </Container>
  );
}

export default StudentProgressPage;