// src/pages/StudentGroupsPage.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Card,
  CardContent,
  Chip,
  Avatar,
  Stack,
  Fade,
  Skeleton,
  Button, // Added Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh'; // Added RefreshIcon
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import ArchiveIcon from '@mui/icons-material/Archive';

import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Reusable Components
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

// Componente de Loading mejorado
const GroupsSkeleton = () => (
  <Box sx={{ mt: 4 }}>
    {[1, 2, 3].map((item) => (
      <Card key={item} sx={{ mb: 3, p: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Skeleton variant="circular" width={56} height={56} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: '60%' }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', width: '80%', mt: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Skeleton variant="rounded" width={120} height={24} />
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Componente de tarjeta de grupo mejorado
const GroupCard = ({ group, index }) => {
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Pendiente':
        return { 
          text: 'Pendiente de aprobación', 
          color: 'warning', 
          icon: <PendingIcon sx={{ fontSize: 16 }} />,
          bgColor: (theme) => alpha(theme.palette.warning.main, 0.1)
        };
      case 'Aprobado':
        return { 
          text: 'Miembro activo', 
          color: 'success', 
          icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
          bgColor: (theme) => alpha(theme.palette.success.main, 0.1)
        };
      case 'Rechazado':
        return { 
          text: 'Solicitud rechazada', 
          color: 'error', 
          icon: <CancelIcon sx={{ fontSize: 16 }} />,
          bgColor: (theme) => alpha(theme.palette.error.main, 0.1)
        };
      default:
        return { 
          text: 'Estado desconocido', 
          color: 'default', 
          icon: null,
          bgColor: (theme) => alpha(theme.palette.grey[500], 0.1)
        };
    }
  };

  const statusInfo = getStatusDisplay(group.student_status);
  const isArchived = group.activo === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        sx={{ 
          mb: 3,
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s ease-in-out',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: isArchived ? 
            (theme) => alpha(theme.palette.grey[500], 0.05) : 
            'background.paper',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: (theme) => `0 8px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
          }
        }}
      >
        {isArchived && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1
            }}
          >
            <Chip
              icon={<ArchiveIcon sx={{ fontSize: 16 }} />}
              label="Archivado"
              size="small"
              color="default"
              variant="outlined"
            />
          </Box>
        )}
        
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={3} alignItems="flex-start">
            {/* Avatar del grupo */}
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                fontSize: '1.5rem'
              }}
            >
              <GroupsIcon />
            </Avatar>

            {/* Información del grupo */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  mb: 1,
                  color: isArchived ? 'text.secondary' : 'text.primary'
                }}
              >
                {group.nombre}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Docente:</strong> {group.docente ? 
                    `${group.docente.nombre} ${group.docente.apellidos}`.trim() : 
                    'Desconocido'
                  }
                </Typography>
              </Stack>

              {/* Estado de membresía */}
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

function StudentGroupsPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasShownSuccessToast = useRef(false);

  const fetchStudentGroups = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setError(null);
    if (!isManualRefresh) {
        setGroups([]);
        hasShownSuccessToast.current = false;
    }

    try {
        const response = await axiosInstance.get('/api/groups/my-memberships');
        setGroups(response.data);

        if (isManualRefresh) {
            toast.success('Lista de grupos actualizada.');
        } else if (!hasShownSuccessToast.current) {
            if (response.data.length > 0) {
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
        if(!isManualRefresh) hasShownSuccessToast.current = false;
    } finally {
        setIsLoading(false);
    }
  }, [axiosInstance]);

  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && user?.userType === 'Estudiante') {
        fetchStudentGroups();
      } else if (isAuthInitialized) {
        setError('No tienes permiso para ver esta página.');
        setIsLoading(false);
      }
    }
  }, [isAuthInitialized, isAuthenticated, user, fetchStudentGroups]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header con animación */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <PageHeader title="Mis Grupos" sx={{ mb: { xs: 2, sm: 0 }, textAlign: { xs: 'center', sm: 'left' } }} />
            <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                    toast.info('Recargando mis grupos...');
                    fetchStudentGroups(true);
                }}
                disabled={isLoading}
                sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
            >
                Refrescar
            </Button>
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
              Aquí puedes ver todos los grupos donde ya eres parte y a los que pronto puedes unirte.
            </Typography>
          </Box>
        </motion.div>

        {/* Contenido principal */}
        <Box sx={{ mt: 4 }}>
          <AnimatePresence mode="wait">
            {/* Loading */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GroupsSkeleton />
              </motion.div>
            )}

            {/* Error */}
            {error && !isLoading && (
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
                  {error}
                </Alert>
              </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && !error && groups.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <EmptyState 
                  message="Aún no perteneces a ningún grupo. ¡Únete a uno usando el código de tu docente!"
                  icon={GroupsIcon}
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

            {/* Groups List */}
            {!isLoading && !error && groups.length > 0 && (
              <motion.div
                key="groups"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ mt: 4 }}>
                  {/* Estadísticas rápidas */}
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
                              {groups.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              {groups.length === 1 ? 'Grupo' : 'Grupos'}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                              {groups.filter(g => g.student_status === 'Aprobado').length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              Activos
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                              {groups.filter(g => g.student_status === 'Pendiente').length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              Pendientes
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Lista de grupos */}
                  <Box>
                    {groups.map((group, index) => (
                      <GroupCard 
                        key={group._id} 
                        group={group} 
                        index={index}
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

export default StudentGroupsPage;