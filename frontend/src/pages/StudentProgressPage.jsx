import React, { useEffect, useState } from 'react';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import {
  Container, Box, Typography, LinearProgress, Paper, List, ListItem, ListItemText, Chip, Divider, CircularProgress, Alert
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock'; // Importar LockIcon

function StudentProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedPathStructure, setSelectedPathStructure] = useState(null); // Nuevo estado para la estructura
  const [loading, setLoading] = useState(false); 
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false); // Nuevo estado de carga

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

  // 2. Cuando el estudiante selecciona una ruta, cargar progreso, actividades y estructura
  useEffect(() => {
    if (selectedPath) {
      setLoading(true);
      setLoadingStructure(true); // Iniciar carga de estructura
      setProgress(null); 
      setActivities([]);
      setSelectedPathStructure(null); // Limpiar estructura anterior
      
      Promise.all([
        axiosInstance.get(`/api/progress/my/${selectedPath._id}`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/activities/student`),
        axiosInstance.get(`/api/learning-paths/${selectedPath._id}/structure`) // Nueva llamada
      ]).then(([progressRes, activitiesRes, structureRes]) => {
        setProgress(progressRes.data.progress || null); // Asegurar que progress sea null si no viene
        setActivities(activitiesRes.data.activities || []);
        setSelectedPathStructure(structureRes.data || null); // Guardar estructura
      }).catch(error => {
        console.error('Error loading progress, activities, or structure:', error);
        // Opcional: mostrar mensaje de error unificado o específico
        if (error.response && error.response.config.url.includes('/structure')) {
          setSelectedPathStructure(null); // Asegurar que la estructura quede null en error
        }
      }).finally(() => {
        setLoading(false);
        setLoadingStructure(false); // Finalizar carga de estructura
      });
    }
  }, [selectedPath]);

  const getModuleStatus = (moduleId, moduleThemes) => {
    if (!progress) return 'No Iniciado'; // Si no hay progreso, todo está no iniciado

    const completedModule = progress.completed_modules?.find(m => m.module_id === moduleId && m.status === 'Completado');
    if (completedModule) {
      return 'Completado';
    }

    if (progress.completed_themes && moduleThemes) {
      const moduleThemeIds = moduleThemes.map(t => t._id);
      const hasCompletedThemeInModule = progress.completed_themes.some(ct => moduleThemeIds.includes(ct.theme_id) && ct.status === 'Completado');
      const hasSeenThemeInModule = progress.completed_themes.some(ct => moduleThemeIds.includes(ct.theme_id)); // Visto o Completado

      if (hasCompletedThemeInModule || hasSeenThemeInModule) { // Considerar 'En Progreso' si un tema está visto o completado
        return 'En Progreso';
      }
    }
    return 'No Iniciado';
  };
  
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

      {/* Mostrar loading solo cuando se está cargando el progreso o estructura de una ruta específica */}
      {(loading || loadingStructure) && selectedPath && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Mostrar contenido de la ruta seleccionada solo si no está cargando y hay datos */}
      {selectedPath && !loading && !loadingStructure && (
        <>
          {/* Estado General de la Ruta y Progreso de Módulos */}
          {progress && selectedPathStructure && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ mr: 1 }}>
                  Progreso en la Ruta: {selectedPath.nombre}
                </Typography>
                <Chip
                  label={translateStatus(progress.path_status || 'No Iniciado')}
                  color={progress.path_status === 'Completado' ? 'success' : progress.path_status === 'En Progreso' ? 'warning' : 'default'}
                />
                {progress.path_status === 'Completado' && (
                  <LockIcon color="action" sx={{ ml: 1 }} />
                )}
              </Box>

              <LinearProgress
                variant="determinate"
                value={
                  (selectedPathStructure.modules?.length > 0 && progress.completed_modules?.length > 0)
                    ? (progress.completed_modules.filter(m => m.status === 'Completado').length / selectedPathStructure.modules.length) * 100
                    : 0
                }
                sx={{ height: 10, borderRadius: 5, my: 2 }}
              />
              <Typography>
                {(progress.completed_modules?.filter(m => m.status === 'Completado').length || 0)} de {selectedPathStructure.modules?.length || 0} módulos completados
              </Typography>
            </Paper>
          )}

          {/* Detalle de Progreso por Módulo */}
          {selectedPathStructure && progress && selectedPathStructure.modules && selectedPathStructure.modules.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Progreso por Módulo</Typography>
              <List>
                {selectedPathStructure.modules.map((module) => (
                  <React.Fragment key={module._id}>
                    <ListItem>
                      <ListItemText primary={module.nombre} />
                      <Chip
                        label={translateStatus(getModuleStatus(module._id, module.themes))}
                        color={
                          getModuleStatus(module._id, module.themes) === 'Completado' ? 'success' :
                          getModuleStatus(module._id, module.themes) === 'En Progreso' ? 'warning' : 'default'
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
           {/* Si no hay módulos en la estructura pero hay ruta */}
           {selectedPathStructure && (!selectedPathStructure.modules || selectedPathStructure.modules.length === 0) && progress && (
             <Alert severity="info" sx={{ mb: 2}}>Esta ruta de aprendizaje no tiene módulos definidos aún.</Alert>
           )}


          {/* Mostrar actividades solo si hay una ruta seleccionada y no está cargando */}
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
        </>
      )}
      
      {/* Mensaje cuando no hay ruta seleccionada y no se está cargando la lista de rutas */}
      {!selectedPath && !loadingPaths && learningPaths.length > 0 && !loading && !loadingStructure && (
        <Alert severity="info">
          Selecciona una ruta de aprendizaje para ver tu progreso.
        </Alert>
      )}

      {/* Mensaje cuando no hay rutas asignadas y no se está cargando la lista de rutas */}
      {!loadingPaths && learningPaths.length === 0 && !loading && (
        <Alert severity="info">
          No tienes rutas de aprendizaje asignadas.
        </Alert>
      )}
    </Container>
  );
}

export default StudentProgressPage;