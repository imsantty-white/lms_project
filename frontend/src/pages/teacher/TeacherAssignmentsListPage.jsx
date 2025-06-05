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
  Avatar,
  Switch,
  FormControlLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
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

// Helper function for status color
const getStatusColor = (status) => {
  switch (status) {
    case 'Open':
      return 'success';
    case 'Closed':
      return 'error';
    case 'Draft':
      return 'warning'; // Or 'default'
    default:
      return 'default';
  }
};

// Componente para una tarjeta de asignación
const AssignmentCard = React.memo((props) => { // Changed to props
  const { assignment, onStatusChange, isUpdatingStatus } = props; // Destructure props
  const assignmentTitle = assignment.activity_id?.title || assignment.title || 'Título desconocido';
  const assignmentType = assignment.activity_id?.type || assignment.type || 'Desconocido';
  const assignmentStatus = assignment.status || 'Desconocido';

  const handleSwitchChange = (event) => {
    const newStatus = event.target.checked ? 'Open' : 'Closed';
    // Call the passed-in handler, which should be handleOpenConfirmDialog
    onStatusChange(assignment._id, newStatus);
  };
  
  return (
    <Card elevation={2} sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
      <CardContent>
        {/* Existing content ... */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.light' }}>
              <ActivityTypeIcon type={assignmentType} />
            </Avatar>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
              {assignmentTitle} 
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip 
              label={assignmentType} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip
              label={
                assignmentStatus === 'Open' ? 'Abierta' :
                assignmentStatus === 'Closed' ? 'Cerrada' :
                assignmentStatus === 'Draft' ? 'Borrador' :
                'Desconocido'
              }
              size="small"
              color={getStatusColor(assignmentStatus)}
              variant="outlined"
            />
          </Box>
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

        {/* Switch for status change */}
        <Box sx={{ mt: 2, pt:1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Tooltip title={assignmentStatus === 'Draft' ? 'No se puede cambiar estado Borrador' : (assignmentStatus === 'Open' ? "Marcar como 'Cerrada'" : "Marcar como 'Abierta'")}>
            {/* Wrapping FormControlLabel in a span or div for Tooltip to work when disabled */}
            <span>
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentStatus === 'Open'}
                    onChange={handleSwitchChange}
                    disabled={assignmentStatus === 'Draft' || isUpdatingStatus}
                    color="primary"
                  />
                }
                label={isUpdatingStatus ? "Actualizando..." : (assignmentStatus === 'Open' ? 'Asignación Abierta' : 'Asignación Cerrada')}
                labelPlacement="start"
                sx={{ ml: 0 }} // Adjust margin if needed
              />
            </span>
          </Tooltip>
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
  const [updatingStatusFor, setUpdatingStatusFor] = useState(null); // For individual assignment loading
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAssignmentForStatusChange, setSelectedAssignmentForStatusChange] = useState(null); // Stores { id, newStatus }

  const handleOpenConfirmDialog = (assignmentId, newStatus) => {
    setSelectedAssignmentForStatusChange({ id: assignmentId, newStatus });
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    // It's good practice to clear the selected assignment info when closing
    // setSelectedAssignmentForStatusChange(null); // Or keep it if needed for text in dialog while closing
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedAssignmentForStatusChange) return;

    const { id: assignmentId, newStatus } = selectedAssignmentForStatusChange;

    setUpdatingStatusFor(assignmentId);
    // Close dialog before API call
    setConfirmDialogOpen(false);

    try {
      // Ensure using the correct endpoint as defined in backend routes
      const response = await axiosInstance.patch(`/api/activities/assignments/${assignmentId}/status`, { status: newStatus });
      setAssignments(prevAssignments =>
        prevAssignments.map(asn =>
          asn._id === assignmentId ? { ...asn, status: response.data.status } : asn // Use status from response
        )
      );
      toast.success(`Asignación ${newStatus === 'Open' ? 'abierta' : 'cerrada'} correctamente.`);
    } catch (err) {
      console.error('Error updating assignment status:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al actualizar el estado de la asignación.';
      toast.error(errorMessage);
    } finally {
      setUpdatingStatusFor(null);
      setSelectedAssignmentForStatusChange(null); // Clear selection after operation
    }
  };

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
              <IconButton onClick={handleRefresh} disabled={refreshing}
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
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                onStatusChange={handleOpenConfirmDialog} // Pass the dialog opener
                isUpdatingStatus={updatingStatusFor === assignment._id}
              />
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
                    <TableCell sx={{ fontWeight: 'bold' }}>Estado Actual</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ubicación</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Entregas</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pendientes</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Estado (Abrir/Cerrar)</TableCell>
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
                          <Typography variant="body2" >
                            {assignment.activity_id?.title || assignment.title || 'Título desconocido'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.activity_id?.type || assignment.type || 'Desconocido'} 
                          size="small" 
                          color="text.primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell> {/* New Cell for Status */}
                        <Chip
                          label={
                            assignment.status === 'Open' ? 'Abierta' :
                            assignment.status === 'Closed' ? 'Cerrada' :
                            assignment.status === 'Draft' ? 'Borrador' :
                            'Desconocido'
                          }
                          size="small"
                          color={getStatusColor(assignment.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '200px', minWidth: '200px', maxWidth: '200px' }}>
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
                      <TableCell align="center"> {/* New Cell for Switch */}
                        <Tooltip
                          title={
                            assignment.status === 'Draft'
                              ? 'Las asignaciones en Borrador no pueden abrirse o cerrarse directamente.'
                              : assignment.status === 'Open'
                                ? 'Cerrar Asignación (los estudiantes no podrán hacer más envíos)'
                                : 'Abrir Asignación (los estudiantes podrán realizar envíos)'
                          }
                        >
                          <Box> {/* Wrapper Box to allow Tooltip when Switch is disabled */}
                            <Switch
                              checked={assignment.status === 'Open'}
                              onChange={() => handleOpenConfirmDialog(assignment._id, assignment.status === 'Open' ? 'Closed' : 'Open')}
                              disabled={assignment.status === 'Draft' || updatingStatusFor === assignment._id}
                              color="primary"
                              inputProps={{ 'aria-label': `Switch status for ${assignment.activity_id?.title || assignment.title}` }}
                            />
                            {updatingStatusFor === assignment._id && <CircularProgress size={20} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-10px', marginLeft: '-10px' }} />}
                          </Box>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="confirm-status-change-dialog-title"
        aria-describedby="confirm-status-change-dialog-description"
      >
        <DialogTitle id="confirm-status-change-dialog-title">
          Confirmar Cambio de Estado
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-status-change-dialog-description">
            ¿Estás seguro de que quieres {selectedAssignmentForStatusChange?.newStatus === 'Open' ? 'ABRIR' : 'CERRAR'} esta asignación?
            {selectedAssignmentForStatusChange?.newStatus === 'Closed' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Al cerrar la asignación, los estudiantes ya no podrán realizar nuevas entregas.
                Si hay estudiantes con intentos activos, su progreso actual podría guardarse o finalizarse.
              </Typography>
            )}
              {selectedAssignmentForStatusChange?.newStatus === 'Open' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Al abrir la asignación, los estudiantes podrán comenzar a realizar entregas.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmStatusChange}
            color={selectedAssignmentForStatusChange?.newStatus === 'Open' ? "success" : "error"}
            variant="contained"
            disabled={updatingStatusFor === selectedAssignmentForStatusChange?.id} // Disable if this specific one is updating
            startIcon={updatingStatusFor === selectedAssignmentForStatusChange?.id ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {updatingStatusFor === selectedAssignmentForStatusChange?.id ? 'Actualizando...' : `Confirmar y ${selectedAssignmentForStatusChange?.newStatus === 'Open' ? 'Abrir' : 'Cerrar'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TeacherAssignmentsListPage;