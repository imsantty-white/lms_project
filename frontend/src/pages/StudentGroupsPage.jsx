// src/pages/StudentGroupsPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemText, 
  Paper, 
  Divider,
  Chip // Importamos Chip de Material UI
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups'; // For EmptyState

import { useAuth, axiosInstance } from '../context/AuthContext';
import { toast } from 'react-toastify';

// Reusable Components
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

function StudentGroupsPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasShownSuccessToast = useRef(false);

  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && user?.userType === 'Estudiante') {
        const fetchStudentGroups = async () => {
          setIsLoading(true);
          setError(null);
          setGroups([]);
          hasShownSuccessToast.current = false;

          try {
            const response = await axiosInstance.get('/api/groups/my-memberships');
            setGroups(response.data);

            if (!hasShownSuccessToast.current) {
              if(response.data.length > 0) {
                toast.success('Tus grupos cargados con éxito.');
              } else {
                toast.info('No estás asociado a ningún grupo aún.');
              }
              hasShownSuccessToast.current = true;
            }

          } catch (err) {
            console.error('Error al obtener los grupos del estudiante:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar tus grupos.';
            setError(errorMessage);
            toast.error('Error al cargar grupos.');
            hasShownSuccessToast.current = false;
          } finally {
            setIsLoading(false);
          }
        };

        fetchStudentGroups();
      } else {
        setError('No tienes permiso para ver esta página.');
        setIsLoading(false);
      }
    }
  }, [isAuthInitialized, isAuthenticated, user]);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Pendiente':
        return { text: 'Pendiente de aprobación', color: 'warning', variant: 'outlined' };
      case 'Aprobado':
        return { text: 'Miembro activo', color: 'success', variant: 'filled' };
      case 'Rechazado':
        return { text: 'Solicitud rechazada', color: 'error', variant: 'outlined' };
      default:
        console.warn(`Estado de membresía desconocido recibido del backend: ${status}`);
        return { text: 'Estado desconocido', color: 'default', variant: 'outlined' };
    }
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <PageHeader title="Mis Grupos" />

        {/* Removed custom loading/error/empty rendering, will use EmptyState or direct rendering */}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Cargando tus grupos...</Typography>
          </Box>
        )}

        {error && !isLoading && (
          <Alert severity="error" sx={{ mt: 3, width: '100%' }}> {/* Ensure Alert can take full width if needed */}
            {error}
          </Alert>
        )}

        {!isLoading && !error && groups.length === 0 && (
           <EmptyState 
            message="Aún no perteneces a ningún grupo. ¡Únete a uno usando el código de tu docente!"
            icon={GroupsIcon} // Example icon
            containerProps={{sx: {mt: 3}}}
           />
        )}

        {!isLoading && !error && groups.length > 0 && (
          // Consider removing the alignItems: 'center' and maxWidth if the list should be wider
          <List sx={{ mt: 3, width: '100%' }}> 
            {groups.map((group) => {
              const statusInfo = getStatusDisplay(group.student_status);

              return (
                <Paper key={group._id} sx={{ mb: 2, p: 2 }}>
                  <ListItem disablePadding>
                    <ListItemText
                      primary={<Typography variant="h6">{group.nombre}</Typography>}
                      secondary={
                        <>
                          <Typography sx={{ display: 'inline' }} component="span" variant="body2" color="text.secondary">
                            Docente: {group.docente ? `${group.docente.nombre} ${group.docente.apellidos}`.trim() : 'Desconocido'}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ mt: 1 }}>
                            <Chip 
                              label={statusInfo.text}
                              color={statusInfo.color}
                              variant={statusInfo.variant}
                              size="small"
                            />
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                </Paper>
              );
            })}
          </List>
        )}
        </Box>
    </Container>
  );
}

export default StudentGroupsPage;