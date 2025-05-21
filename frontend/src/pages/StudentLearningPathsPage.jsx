// src/pages/StudentLearningPathsPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';

import WorkIcon from '@mui/icons-material/Work';

// *** Importar useAuth (ahora incluyendo isAuthInitialized) Y axiosInstance ***
import { useAuth, axiosInstance } from '../context/AuthContext'; // <-- Modificado

// *** Eliminar la importación de axios si ya no la usas directamente ***
// import axios from 'axios';

// *** Eliminar la importación de API_BASE_URL si axiosInstance ya la tiene configurada ***
// import { API_BASE_URL } from '../utils/constants';

import { toast } from 'react-toastify';

function StudentLearningPathsPage() {
  // *** Usa tu contexto de autenticación para obtener el usuario, si está autenticado, y si la autenticación está inicializada ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- Modificado

  const navigate = useNavigate();

  // Estados para la lista de rutas, carga y error
  const [learningPaths, setLearningPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Estado de carga general (incluye espera por auth y fetch)
  const [fetchError, setFetchError] = useState(null); // Estado para errores o acceso denegado


  // Efecto para cargar las rutas de aprendizaje asignadas al estudiante
  useEffect(() => {
    // Solo cargar si la autenticación está inicializada
    if (isAuthInitialized) { // <-- Añadir check isAuthInitialized
      // Después de que auth inicializa, verificamos si el usuario tiene permiso
      if (isAuthenticated && user?.userType === 'Estudiante') { // <-- Asegurar check de rol
        const fetchLearningPaths = async () => {
          setIsLoading(true); // Activar carga al inicio del fetch
          setFetchError(null);
          setLearningPaths([]); // Limpiar rutas previas

          try {
            // *** LLAMADA GET AL BACKEND USANDO axiosInstance ***
            // Asume que axiosInstance ya tiene configurada la URL base
            const response = await axiosInstance.get('/api/learning-paths/my-assigned'); // <-- Modificado

            // Asume que el backend devuelve el array de rutas directamente (response.data) o en un campo 'data' (response.data.data)
            // Si tu backend devuelve { data: [...] }, usa response.data.data. Si devuelve [...], usa response.data
             // Basado en tu código original, parece que esperas response.data.data. Si no es así, ajusta.
            setLearningPaths(response.data.data || []); // Ajustar según la respuesta real del backend
            setFetchError(null); // Asegurarse de que no haya error si la carga es exitosa

          } catch (err) {
            console.error('Error fetching student learning paths:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar tus rutas de aprendizaje asignadas.';
            setFetchError(errorMessage);
            toast.error(errorMessage);
          } finally {
            setIsLoading(false); // Desactivar carga al finalizar (éxito o error)
          }
        };

        fetchLearningPaths(); // Ejecutar fetch si la autenticación es válida y el rol es correcto

      } else {
        // Si auth inicializa pero no hay usuario autenticado o no es estudiante
        setFetchError('Debes iniciar sesión como estudiante para ver esta página.'); // Mensaje de acceso denegado
        setIsLoading(false); // Desactiva carga
      }
    }
    // Si isAuthInitialized es false, el componente permanece en estado de carga inicial
  }, [isAuthInitialized, isAuthenticated, user]); // Dependencias: Ejecutar cuando auth inicialice o el usuario/estado de auth cambie


  // Función para navegar a la vista detallada de una ruta específica
  const handleViewLearningPath = (pathId) => {
    // Navega a la ruta donde se mostrará la estructura completa de la ruta
    navigate(`/student/learning-paths/${pathId}/view`);
  };


  // --- Renderizado de la Página ---

  // Mostrar estado de carga (mientras auth inicializa o mientras se hace el fetch)
  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Cargando tus rutas de aprendizaje...</Typography>
        </Box>
      </Container>
    );
  }

  // Mostrar error de carga o acceso denegado después de cargar
  if (fetchError) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="error">{fetchError}</Alert>
        </Box>
      </Container>
    );
  }

  // Mostrar la lista de rutas asignadas
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Mis Rutas de Aprendizaje Asignadas</Typography>

        {/* Mensaje si no hay rutas asignadas */}
        {learningPaths.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No tienes rutas de aprendizaje asignadas en este momento.
          </Typography>
        ) : (
          <Paper elevation={2}>
            <List>
              {learningPaths.map((path, index) => (
                <React.Fragment key={path._id}>
                  <ListItemButton onClick={() => handleViewLearningPath(path._id)}>
                    <ListItemIcon>
                      <WorkIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="h6">{path.nombre}</Typography>}
                      // Muestra el grupo si lo populaste en el backend
                      secondary={path.group_id?.nombre ? `Grupo: ${path.group_id.nombre}` : 'Sin grupo especificado'}
                    />
                  </ListItemButton>
                  {index < learningPaths.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}

      </Box>
    </Container>
  );
}

export default StudentLearningPathsPage;