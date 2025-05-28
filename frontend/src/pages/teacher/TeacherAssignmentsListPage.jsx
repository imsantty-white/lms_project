// src/pages/TeacherAssignmentsListPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Skeleton,
  useTheme,
  useMediaQuery,
  Avatar
} from '@mui/material';

// Iconos
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SchoolIcon from '@mui/icons-material/School';
import RouteIcon from '@mui/icons-material/Route';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TopicIcon from '@mui/icons-material/Topic';
import GroupIcon from '@mui/icons-material/Group';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Componente para el icono de tipo de actividad
const ActivityTypeIcon = ({ type }) => {
  switch (type?.toLowerCase()) {
    case 'trabajo':
      return <AssignmentIcon />;
    case 'cuestionario':
      return <AssignmentLateIcon />;
    case 'quiz':
      return <AssignmentTurnedInIcon />;
    default:
      return <AssignmentIcon />;
  }
};

// Componente para mostrar el estado (en forma de badge)
const StatusBadge = ({ count, type = 'default' }) => {
  const getColor = () => {
    if (count === 0) return 'success';
    if (type === 'pending') return count > 0 ? 'warning' : 'default';
    if (type === 'total') return count > 0 ? 'primary' : 'default';
    return 'default';
  };

  return (
    <Badge 
      badgeContent={count !== undefined ? count : '-'} 
      color={getColor()} 
      showZero
    >
      {type === 'pending' ? <AssignmentLateIcon /> : <AssignmentTurnedInIcon />}
    </Badge>
  );
};

// Componente para la jerarquía de ubicación
const LocationHierarchy = ({ assignment }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary" noWrap>
          {assignment.theme_id?.module_id?.learning_path_id?.group_id?.nombre || 'N/A'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RouteIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary" noWrap>
          {assignment.theme_id?.module_id?.learning_path_id?.nombre || 'N/A'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MenuBookIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary" noWrap>
          {assignment.theme_id?.module_id?.nombre || 'N/A'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TopicIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary" noWrap>
          {assignment.theme_id?.nombre || 'N/A'}
        </Typography>
      </Box>
    </Box>
  );
};

// Componente para una tarjeta de asignación
const AssignmentCard = React.memo(({ assignment }) => {
  const assignmentTitle = assignment.activity_id?.title || assignment.title || 'Título desconocido';
  const assignmentType = assignment.activity_id?.type || assignment.type || 'Desconocido';
  
  return (
    <Card elevation={2} sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.light' }}>
              <ActivityTypeIcon type={assignmentType} />
            </Avatar>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
              {assignmentTitle} 
            </Typography>
          </Box>
          <Chip 
            label={assignmentType} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <LocationHierarchy assignment={assignment} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Total de entregas">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusBadge count={assignment.total_students_submitted} type="total" />
              </Box>
            </Tooltip>
            <Tooltip title="Pendientes por calificar">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusBadge count={assignment.pending_grading_count} type="pending" />
              </Box>
            </Tooltip>
          </Box>
          
          <Link to={`/teacher/assignments/${assignment._id}/submissions`} style={{ textDecoration: 'none' }}>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<VisibilityIcon />}
              sx={{ borderRadius: 2 }}
            >
              Ver Entregas
            </Button>
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
});

function TeacherAssignmentsListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeacherAssignments = async () => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const response = await axiosInstance.get('/api/activities/teacher/assignments');
      console.log("Lista de asignaciones del docente/admin cargada:", response.data);
      setAssignments(response.data);
    } catch (err) {
      console.error('Error fetching teacher assignments:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al cargar la lista de asignaciones.';
      setFetchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Efecto para cargar las asignaciones del docente
  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && (user?.userType === 'Docente' || user?.userType === 'Administrador')) {
        fetchTeacherAssignments();
      } else {
        setFetchError('No tienes permiso para ver esta página.');
        setIsLoading(false);
      }
    }
  }, [isAuthInitialized, isAuthenticated, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeacherAssignments();
  };

  // Renderizado de estados de carga
  if (isLoading && !refreshing) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="500">
            Mis Actividades Asignadas
          </Typography>
          <Box sx={{ width: '100%', mt: 4 }}>
            {[1, 2, 3].map((item) => (
              <Paper key={item} sx={{ p: 3, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <Skeleton variant="text" width="80%" height={40} />
                    <Skeleton variant="text" width="40%" />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Skeleton variant="rectangular" height={80} />
                  </Grid>
                  <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Skeleton variant="rectangular" width={120} height={40} />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        </Box>
      </Container>
    );
  }

  // Mostrar error de carga o acceso denegado
  if (fetchError) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="500">
            Mis Actividades Asignadas
          </Typography>
          <Alert 
            severity="error" 
            sx={{ mt: 4 }}
            action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Reintentar
              </Button>
            }
          >
            {fetchError}
          </Alert>
        </Box>
      </Container>
    );
  }

  // Si no hay asignaciones
  if (assignments.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="500">
            Mis Actividades Asignadas
          </Typography>
          <Paper sx={{ p: 4, mt: 4, textAlign: 'center', borderRadius: 2 }}>
            <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay actividades asignadas para ti.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
              Cuando te asignen actividades para revisar, aparecerán aquí.
            </Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
              Actualizar
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  // Renderizar la lista de asignaciones
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 6, mb: 4 }}>
        {/* Header con título y acciones */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="500" mb={2}>
              Todas Las Actividades Asignadas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestiona las actividades asignadas en cada grupo y califica las entregas de tus estudiantes.
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Actualizar">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Contador de asignaciones */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mostrando {assignments.length} {assignments.length === 1 ? 'actividad asignada' : 'actividades asignadas'}
        </Typography>

        {isMobile ? (
          // Vista móvil: Tarjetas
          <Box>
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment._id} assignment={assignment} />
            ))}
          </Box>
        ) : (
          // Vista escritorio: Tabla
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nombre de Actividad</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Ubicación</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Entregas</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pendientes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow 
                      key={assignment._id}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: theme.palette.background.paper,
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                            <ActivityTypeIcon type={assignment.activity_id?.type || assignment.type} />
                          </Avatar>
                          <Typography variant="body1" fontWeight="medium">
                            {assignment.activity_id?.title || assignment.title || 'Título desconocido'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.activity_id?.type || assignment.type || 'Desconocido'} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <LocationHierarchy assignment={assignment} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Total de entregas">
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <StatusBadge count={assignment.total_students_submitted} type="total" />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Pendientes por calificar">
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <StatusBadge count={assignment.pending_grading_count} type="pending" />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Link to={`/teacher/assignments/${assignment._id}/submissions`} style={{ textDecoration: 'none' }}>
                          <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<VisibilityIcon />}
                            sx={{ borderRadius: 2 }}
                          >
                            Ver Entregas
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default TeacherAssignmentsListPage;