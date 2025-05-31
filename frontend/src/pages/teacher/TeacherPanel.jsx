// src/pages/TeacherPanel.jsx
// Plantilla no funcional

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  CircularProgress,
  Stack,
  Card, CardContent, CardActions,
  Link as MuiLink // Renombrar para evitar conflicto con Link de react-router-dom
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth, axiosInstance } from '../../contexts/AuthContext'; // Asumo que axiosInstance también está aquí

// Iconos de Material-UI (asegúrate de tenerlos instalados: npm install @mui/icons-material)
import SchoolIcon from '@mui/icons-material/School'; // Icono para cursos
import AssignmentIcon from '@mui/icons-material/Assignment'; // Icono para tareas/revisiones
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; // Icono para el banco de contenido

function TeacherPanel() {
  const { user, isAuthInitialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0); // Nuevo estado: tareas pendientes de revisión
  const [myCourses, setMyCourses] = useState([]); // Nuevo estado: cursos/grupos del docente

  // Función para obtener el saludo según la hora del día
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  useEffect(() => {
    if (isAuthInitialized) {
      if (!isAuthenticated || user?.userType !== 'Docente') {
        setFetchError('Acceso denegado. Debes iniciar sesión como docente para ver este panel.');
        setIsLoading(false);
        return;
      }

      const fetchData = async () => {
        try {
          // --- Lógica para verificar el perfil ---
          // Simulación:
          if (user && !user.fullName) {
            setProfileComplete(false);
          } else {
            setProfileComplete(true);
          }
          // --- Fin Lógica para verificar el perfil ---

          // --- Lógica para obtener el clima (placeholder) ---
          await new Promise(resolve => setTimeout(resolve, 500));
          setWeatherInfo({
            city: 'Tolú, Colombia',
            temperature: '28°C',
            description: 'Soleado con nubes',
            icon: 'sunny'
          });
          // --- Fin Lógica para obtener el clima ---

          // --- Lógica para obtener datos específicos del docente ---
          // Aquí harías llamadas a tu backend para obtener:
          // 1. Número de asignaciones pendientes de revisión.
          //    Ej: const reviewsResponse = await axiosInstance.get('/api/docente/pending-reviews-count');
          //    setPendingReviewsCount(reviewsResponse.data.count);
          setPendingReviewsCount(7); // Simulación

          // 2. Cursos o grupos que imparte.
          //    Ej: const coursesResponse = await axiosInstance.get('/api/docente/my-courses');
          //    setMyCourses(coursesResponse.data.courses);
          setMyCourses([ // Simulación
            { id: 'c1', name: 'Programación Avanzada', students: 30 },
            { id: 'c2', name: 'Bases de Datos I', students: 25 },
            { id: 'c3', name: 'Desarrollo Web Frontend', students: 20 },
          ]);
          // --- Fin Lógica para obtener datos específicos del docente ---

        } catch (err) {
          console.error("Error al cargar datos del panel del docente:", err);
          setFetchError('Error al cargar la información del panel.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [isAuthInitialized, isAuthenticated, user]);

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            Cargando panel del docente...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="error">{fetchError}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Saludo Personalizado */}
        <Typography variant="h4" component="h1" gutterBottom>
          {getGreeting()}, {user?.fullName || user?.username || 'Docente'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bienvenido de nuevo a tu Sistema de Gestión de Aprendizaje.
        </Typography>

        {/* Aviso de Perfil Incompleto */}
        {!profileComplete && (
          <Alert severity="warning" sx={{ mb: 4 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/profile')}>
                Completar Perfil
              </Button>
            }
          >
            Tu perfil está incompleto. Por favor, tómate un momento para rellenar tus datos.
          </Alert>
        )}

        <Stack spacing={4}>
          {/* Tarjeta de Clima */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              {weatherInfo?.icon === 'sunny' ? <WbSunnyIcon sx={{ fontSize: 40, color: 'orange' }} /> : <CloudIcon sx={{ fontSize: 40, color: 'gray' }} />}
              <Box>
                <Typography variant="h5" component="h2">
                  El clima en {weatherInfo?.city || 'tu ubicación'}:
                </Typography>
                <Typography variant="body1">
                  {weatherInfo?.temperature || 'Cargando...'} - {weatherInfo?.description || 'N/A'}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Datos del clima actual.
            </Typography>
          </Paper>

          {/* Estadísticas Clave para el Docente */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-around">
            <Paper elevation={3} sx={{ p: 3, flexGrow: 1, textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {pendingReviewsCount}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Actividades que asignaste
              </Typography>
              <MuiLink component="button" variant="body2" onClick={() => navigate('/teacher/assignments')} sx={{ mt: 1 }}>
                Ver Actividades
              </MuiLink>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, flexGrow: 1, textAlign: 'center' }}>
              <LibraryBooksIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {myCourses.length}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Grupos Creados
              </Typography>
              <MuiLink component="button" variant="body2" onClick={() => navigate('/teacher/groups/')} sx={{ mt: 1 }}>
                Ir a tus Grupos
              </MuiLink>
            </Paper>
          </Stack>

          {/* Listado de Cursos/Grupos (Más detallado que un simple contador) */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Mis Cursos
            </Typography>
            {myCourses.length > 0 ? (
              <Stack spacing={1}>
                {myCourses.map(course => (
                  <Card key={course.id} variant="outlined">
                    <CardContent>
                      <Typography variant="h6">{course.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estudiantes inscritos: {course.students}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => console.log(`Ver detalles del curso ${course.id}`)}>
                        Ver Detalles
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tienes cursos asignados actualmente.
              </Typography>
            )}
          </Paper>

          {/* Sección de Anuncios Generales (si aplica) */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Anuncios del Sistema
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ¡Bienvenido a la nueva sección de anuncios! Mantente al tanto de las últimas novedades y actualizaciones importantes del sistema.
            </Typography>
            {/* Aquí iría un bucle sobre anuncios reales como en el PanelEstudiante */}
          </Paper>

        </Stack>
      </Box>
    </Container>
  );
}

export default TeacherPanel;