// src/pages/PanelEstudiante.jsx

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
import { useAuth, axiosInstance } from '../contexts/AuthContext'; // Asumo que axiosInstance también está aquí

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import WbSunnyIcon from '@mui/icons-material/WbSunny'; // Icono para el clima
import CloudIcon from '@mui/icons-material/Cloud'; // Otro icono para el clima

function StudentPanel() {
  const { user, isAuthInitialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [profileComplete, setProfileComplete] = useState(true); // Estado para el aviso de perfil
  const [weatherInfo, setWeatherInfo] = useState(null); // Estado para la información del clima

  // Función para obtener el saludo según la hora del día
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  useEffect(() => {
    // Esperar a que la autenticación inicialice
    if (isAuthInitialized) {
      if (!isAuthenticated || user?.userType !== 'Estudiante') {
        // Redirigir o mostrar error si no es estudiante autenticado
        setFetchError('Acceso denegado. Debes iniciar sesión como estudiante para ver este panel.');
        setIsLoading(false);
        return;
      }

      // --- Lógica para verificar el perfil (simplificada como ejemplo) ---
      // Aquí deberías tener una lógica real para verificar si el perfil está completo.
      // Esto podría implicar:
      // 1. Un campo 'isProfileComplete' en tu modelo de usuario en el backend.
      // 2. O verificar la existencia de campos clave como 'nombre_completo', 'fecha_nacimiento', etc.
      //    Si tu 'user' del AuthContext ya trae estos datos, puedes chequearlos aquí.
      // Por ahora, lo simulamos:
      const checkProfileCompletion = async () => {
        try {
          // Si tu backend tiene un endpoint para obtener el perfil completo del usuario, úsalo aquí.
          // const response = await axiosInstance.get('/api/users/profile');
          // const userData = response.data;
          // const isComplete = userData.nombre_completo && userData.fecha_nacimiento && userData.direccion;
          // setProfileComplete(isComplete);

          // Simulamos que el perfil está incompleto si el nombre de usuario es 'juan_sin_apellido'
          if (user && !user.fullName) { // Asumiendo que 'fullName' es un campo importante
            setProfileComplete(false);
          } else {
            setProfileComplete(true);
          }

        } catch (err) {
          console.error("Error al verificar el perfil:", err);
          // Si hay un error al cargar el perfil, asumimos que no está completo para pedirle al usuario que lo revise.
          setProfileComplete(false);
        }
      };

      checkProfileCompletion();
      // --- Fin Lógica para verificar el perfil ---


      // --- Lógica para obtener el clima (placeholder) ---
      // Esto es un placeholder. Para una implementación real, necesitarías:
      // 1. Registrarte en una API de clima (ej. OpenWeatherMap) para obtener una API Key.
      // 2. Decidir cómo obtener la ubicación del usuario (geolocalización del navegador, ciudad guardada en perfil, etc.).
      // 3. Hacer una solicitud HTTP a la API de clima.
      const fetchWeather = async () => {
        // Simulación:
        await new Promise(resolve => setTimeout(resolve, 500)); // Simula una carga de red
        setWeatherInfo({
          city: 'Tolú, Colombia', // Puedes hacer esto dinámico
          temperature: '28°C',
          description: 'Soleado con nubes',
          icon: 'sunny' // O un código de icono de la API
        });
      };
      fetchWeather();
      // --- Fin Lógica para obtener el clima ---

      setIsLoading(false);
    }
  }, [isAuthInitialized, isAuthenticated, user]); // Dependencias: recargar si el estado de auth cambia

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            Cargando panel...
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
          {getGreeting()}, {user?.fullName || user?.username || 'Estudiante'}!
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

          {/* Sección de Noticias/Anuncios Generales (Placeholder) */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Anuncios del Sistema
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ¡Bienvenido a la nueva sección de anuncios! Mantente al tanto de las últimas novedades y actualizaciones importantes del sistema.
            </Typography>
            <Box sx={{ mt: 2 }}>
              {/* Aquí iría un bucle sobre anuncios reales */}
              <Card variant="outlined" sx={{ mb: 1 }}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    Mantenimiento Programado
                  </Typography>
                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    10 de Junio, 2025 - 00:00 a 02:00 (GMT-5)
                  </Typography>
                  <Typography variant="body2">
                    Nuestro sistema estará en mantenimiento para mejoras de rendimiento. Agradecemos su comprensión.
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" component="div">
                    ¡Nuevas funcionalidades disponibles!
                  </Typography>
                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    20 de Mayo, 2025
                  </Typography>
                  <Typography variant="body2">
                    Hemos lanzado nuevas características en el módulo de rutas de aprendizaje. ¡Explóralas!
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Paper>

          {/* Pequeño Resumen de Actividad Académica (Opcional, sutil) */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Tu Actividad Reciente
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Tienes **3 actividades pendientes** con fechas límite próximas.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{mt: 1}}>
              Has completado el **75%** de tus rutas de aprendizaje asignadas.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <MuiLink component="button" color="secondary" variant="body2" onClick={() => navigate('/student/learning-paths')} sx={{mr: 2}}>
                Ir a Mis Rutas de Aprendizaje
              </MuiLink>
              <MuiLink component="button" color="secondary" variant="body2" onClick={() => navigate('/student/progress')}>
                Ver Mi Progreso
              </MuiLink>
            </Box>
          </Paper>

        </Stack>
      </Box>
    </Container>
  );
}

export default StudentPanel;