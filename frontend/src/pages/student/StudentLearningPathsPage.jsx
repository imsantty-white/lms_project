// src/pages/StudentLearningPathsPage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Stack,
  Skeleton,
  Chip,
  Avatar,
  Button,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh'; // Added RefreshIcon
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';


const LearningPathsSkeleton = () => (
  <Box sx={{ mt: 4 }}>
    {[1, 2, 3].map((item) => (
      <Card key={item} sx={{ mb: 3, p: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Skeleton variant="circular" width={56} height={56} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: '70%' }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', width: '90%', mt: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Skeleton variant="rounded" width={150} height={28} />
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Box>
);

const LearningPathCard = ({ path, index, onClick }) => {
  // Determinar el estado y sus propiedades de visualización
  const getPathStatusDisplay = (status) => {
    switch (status) {
      case 'No Iniciado': // Cambiado de 'No Iniciada' a 'No Iniciado'
        return {
          text: 'No Iniciada', // El texto que se muestra en UI puede seguir siendo "No Iniciada"
          color: 'info',
          icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />,
          bgColor: (theme) => alpha(theme.palette.info.main, 0.1)
        };
      case 'En Progreso': // Coincide
        return {
          text: 'En Progreso',
          color: 'primary',
          icon: <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />,
          bgColor: (theme) => alpha(theme.palette.primary.main, 0.1)
        };
      case 'Completado': // Cambiado de 'Completada' a 'Completado'
        return {
          text: 'Completada Parcialmente', // El texto que se muestra en UI puede seguir siendo "Completada Parcialmente" porque realmente es que tiene actividades completadas 
          color: 'success',
          icon: <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />,
          bgColor: (theme) => alpha(theme.palette.success.main, 0.1)
        };
      default:
        return {
          text: 'Estado Desconocido',
          color: 'default',
          icon: null,
          bgColor: (theme) => alpha(theme.palette.grey[500], 0.1)
        };
    }
  };

  const statusInfo = getPathStatusDisplay(path.status || 'No Iniciado'); // Asegura un valor por defecto que coincida con el backend

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(path._id)}
      style={{ cursor: 'pointer' }}
    >
      <Card
        sx={{
          mb: 3,
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s ease-in-out',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: (theme) => `0 8px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={3} alignItems="flex-start">
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'secondary.main',
                fontSize: '1.5rem'
              }}
            >
              <WorkIcon />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: 'text.primary'
                }}
              >
                {path.nombre}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary">
                  Grupo: {path.group_name || 'No asignado a un grupo'}
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  backgroundColor: statusInfo.bgColor,
                  border: '1px solid',
                  borderColor: `${statusInfo.color}.main`
                }}
              >
                {statusInfo.icon}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: `${statusInfo.color}.main`
                  }}
                >
                  {statusInfo.text}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};


function StudentLearningPathsPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const navigate = useNavigate();

  const [learningPaths, setLearningPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const hasShownSuccessToast = useRef(false); // This toast logic might need adjustment with manual refresh

  const fetchLearningPaths = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setFetchError(null);
    if (!isManualRefresh) { // Only reset paths if not a manual refresh from existing data
        setLearningPaths([]);
        hasShownSuccessToast.current = false;
    }

    try {
        const response = await axiosInstance.get('/api/learning-paths/my-assigned');
        const paths = response.data.data || [];
        setLearningPaths(paths);

        if (isManualRefresh) {
            toast.success('Rutas de aprendizaje actualizadas.');
        } else if (!hasShownSuccessToast.current) {
            if (paths.length > 0) {
                toast.success('Tus rutas de aprendizaje cargadas con éxito.');
            } else {
                toast.info('No tienes rutas de aprendizaje asignadas en este momento.');
            }
            hasShownSuccessToast.current = true;
        }

    } catch (err) {
        console.error('Error fetching student learning paths:', err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.message || 'Error al cargar tus rutas de aprendizaje asignadas.';
        setFetchError(errorMessage);
        toast.error('Error al cargar rutas de aprendizaje.');
        if (!isManualRefresh) { // Ensure toast ref is reset if initial load fails
             hasShownSuccessToast.current = false;
        }
    } finally {
        setIsLoading(false);
    }
  }, [axiosInstance]); // Assuming axiosInstance is stable or provided by AuthContext correctly

  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && user?.userType === 'Estudiante') {
        fetchLearningPaths();
      } else if (isAuthInitialized) { // Check if initialized but not authenticated/student
        setFetchError('Debes iniciar sesión como estudiante para ver esta página.');
        setIsLoading(false);
      }
    }
  }, [isAuthInitialized, isAuthenticated, user, fetchLearningPaths]);


  const handleViewLearningPath = (pathId) => {
    navigate(`/student/learning-paths/${pathId}/view`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <PageHeader title="Mis Rutas de Aprendizaje" sx={{ mb: { xs: 2, sm: 0 } }} />
            <Tooltip title="Recargar" arrow placement="top">
                                <Button
                                variant="contained"
                                onClick={() => {
                                    toast.info('Recargando rutas...');
                                    fetchLearningPaths(true);
                                }}
                                disabled={isLoading}
                                sx={{ 
                                    minWidth: 'auto',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: 'primary.main',
                                    '&:hover': {
                                        backgroundColor: 'primary.light',
                                        transform: 'scale(1.05)',
                                    },
                                    '&:active': {
                                    transform: 'scale(0.95)',
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                    boxShadow: '0 4px 12px rgba(210, 25, 50, 0.3)',
                                }}
                                >
                                <RefreshIcon />
                                </Button>
                            </Tooltip>
          </Box>
          <Box sx={{ textAlign: 'center', mb: 4, mt: 2 }}>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mt: 2,
                maxWidth: 600,
                mx: 'auto',
                fontSize: '1.1rem'
              }}
            >
              Aquí puedes ver todas las rutas de aprendizaje que te han sido asignadas. Haz clic en una ruta para ver su contenido.
            </Typography>
          </Box>
        </motion.div>

        <Box sx={{ mt: 4 }}>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <LearningPathsSkeleton />
              </motion.div>
            )}

            {fetchError && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Alert
                  severity="error"
                  sx={{
                    mt: 3,
                    borderRadius: 2,
                    '& .MuiAlert-message': {
                      fontSize: '1rem'
                    }
                  }}
                >
                  {fetchError}
                </Alert>
              </motion.div>
            )}

            {!isLoading && !fetchError && learningPaths.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <EmptyState
                  message="No tienes rutas de aprendizaje asignadas en este momento."
                  icon={WorkIcon}
                  containerProps={{
                    sx: {
                      mt: 6,
                      py: 6,
                      borderRadius: 3,
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.02),
                      border: '1px dashed',
                      borderColor: (theme) => alpha(theme.palette.primary.main, 0.2)
                    }
                  }}
                />
              </motion.div>
            )}

            {!isLoading && !fetchError && learningPaths.length > 0 && (
              <motion.div
                key="learningPaths"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ mt: 4 }}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card sx={{ mb: 4, background: 'linear-gradient(135deg,rgb(28, 77, 56) 0%,rgb(8, 53, 49) 100%)' }}>
                      <CardContent sx={{ py: 3 }}>
                        <Stack direction="row" spacing={4} justifyContent="center" alignItems="center">
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                              {learningPaths.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              {learningPaths.length === 1 ? 'Ruta' : 'Rutas'}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                              {/* Filtrar por el estado del backend 'Completado' */}
                              {learningPaths.filter(p => p.status === 'Completado').length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              Completadas
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                              {/* Filtrar por el estado del backend 'En Progreso' */}
                              {learningPaths.filter(p => p.status === 'En Progreso').length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              En Progreso
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <Box>
                    {learningPaths.map((path, index) => (
                      <LearningPathCard
                        key={path._id}
                        path={path}
                        index={index}
                        onClick={handleViewLearningPath}
                      />
                    ))}
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Container>
  );
}

export default StudentLearningPathsPage;