// src/pages/TeacherContentBankPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
  Divider,
  Button,
  Stack,
  Grid,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  CardContent,
  CardActions,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LinkIcon from '@mui/icons-material/Link';
import VideocamIcon from '@mui/icons-material/Videocam';
import QuizIcon from '@mui/icons-material/Quiz';
import DescriptionIcon from '@mui/icons-material/Description';
import { motion } from 'framer-motion';

// Importar useAuth y axiosInstance
import { useAuth, axiosInstance } from '../context/AuthContext';

import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importar los componentes modales
import CreateResourceModal from '../pages/components/CreateResourceModal';
import EditResourceModal from '../pages/components/EditResourceModal';
import CreateActivityModal from '../pages/components/CreateActivityModal';
import EditActivityModal from './components/EditActivityModal';

// Componente de animación para las tarjetas
const MotionCard = motion(Card);

// Función para determinar el icono según el tipo de recurso
const getResourceIcon = (type) => {
  switch (type) {
    case 'Contenido':
      return <DescriptionIcon color="primary" />;
    case 'Enlace':
      return <LinkIcon color="secondary" />;
    case 'Video-Enlace':
      return <VideocamIcon color="error" />;
    default:
      return <MenuBookIcon color="primary" />;
  }
};

// Función para determinar el icono según el tipo de actividad
const getActivityIcon = (type) => {
  switch (type) {
    case 'Cuestionario':
      return <AssignmentIcon color="primary" />;
    case 'Quiz':
      return <QuizIcon color="secondary" />;
    default:
      return <FilePresentIcon color="primary" />;
  }
};

// Función auxiliar para renderizar detalles específicos del recurso
const renderResourceDetails = (item) => {
  if (item.type === 'Contenido' && item.content_body) {
    return (
      <Typography component="span" variant="caption" color="text.secondary" sx={{
        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%'
      }}>
        Contenido: {item.content_body.substring(0, 80)}...
      </Typography>
    );
  }
  if (item.type === 'Enlace' && item.link_url) {
    return (
      <Typography component="span" variant="caption" color="text.secondary" sx={{
        display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
      }}>
        URL:{' '}
        <a href={item.link_url} target="_blank" rel="noopener noreferrer">
          {item.link_url.length > 40 ? `${item.link_url.substring(0, 40)}...` : item.link_url}
        </a>
      </Typography>
    );
  }
  if (item.type === 'Video-Enlace' && item.video_url) {
    return (
      <Typography component="span" variant="caption" color="text.secondary" sx={{
        display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
      }}>
        Video URL:{' '}
        <a href={item.video_url} target="_blank" rel="noopener noreferrer">
          {item.video_url.length > 40 ? `${item.video_url.substring(0, 40)}...` : item.video_url}
        </a>
      </Typography>
    );
  }
  return null;
};

// Función auxiliar para renderizar detalles específicos de la actividad
const renderActivityDetails = (item) => {
  if (item.type === 'Cuestionario' && Array.isArray(item.cuestionario_questions)) {
    return (
      <Typography component="span" variant="body2" color="text.secondary">
        {item.cuestionario_questions.length} pregunta{item.cuestionario_questions.length !== 1 ? 's' : ''}
      </Typography>
    );
  }
  if (item.type === 'Quiz' && Array.isArray(item.quiz_questions)) {
    return (
      <Typography component="span" variant="body2" color="text.secondary">
        {item.quiz_questions.length} pregunta{item.quiz_questions.length !== 1 ? 's' : ''} de quiz
      </Typography>
    );
  }
  return item.description && (
    <Typography variant="body2" color="text.primary" sx={{
      display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
    }}>
      {item.description}
    </Typography>
  );
};

function TeacherContentBankPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const _navigate = useNavigate();
  
  const [resources, setResources] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Estado para diálogo de eliminación
  const [deleteItemDetails, setDeleteItemDetails] = useState({
    open: false,
    id: null,
    type: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para modales de recursos
  const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] = useState(false);
  const [isCreateResourceConfirmOpen, setIsCreateResourceConfirmOpen] = useState(false);
  const [resourceDataToCreate, setResourceDataToCreate] = useState(null);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isEditResourceModalOpen, setIsEditResourceModalOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState(null);

  // Estados para modales de actividades
  const [isCreateActivityModalOpen, setIsCreateActivityModalOpen] = useState(false);
  const [isCreateActivityConfirmOpen, setIsCreateActivityConfirmOpen] = useState(false);
  const [activityDataToCreate, setActivityDataToCreate] = useState(null);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);

  // Cambiar entre pestañas
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Carga el banco de contenido del docente al montar el componente
  useEffect(() => {
    const fetchContentBank = async () => {
      try {
        const response = await axiosInstance.get('/api/content/my-bank');
        const { resources, activities } = response.data;
        setResources(resources.map(r => ({ ...r, isAssigned: r.isAssigned || false }))); // Asegura que isAssigned siempre exista
        setActivities(activities.map(a => ({ ...a, isAssigned: a.isAssigned || false }))); // Asegura que isAssigned siempre exista
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching content bank:', err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.message || 'Error al cargar tu banco de contenido.';
        setError(errorMessage);
        setIsLoading(false);
        toast.error('Error al cargar tu banco de contenido.');
      }
    };

    if (isAuthInitialized && isAuthenticated && (user?.userType === 'Docente' || user?.userType === 'Administrador')) {
      fetchContentBank();
    } else if (isAuthInitialized && !isAuthenticated) {
      console.log("Auth inicializada, pero usuario no autenticado. No se carga banco de contenido.");
      setIsLoading(false);
      setError("No estás autenticado para ver esta página.");
    } else if (!isAuthInitialized) {
      console.log("Auth aún no inicializada. Esperando para cargar banco de contenido.");
    }
  }, [isAuthenticated, user, isAuthInitialized]);

  // Lógica para Diálogo de Eliminación
  const handleOpenDeleteDialog = (id, type) => {
    if (isCreatingResource || isCreatingActivity || isDeleting) return;
    setDeleteItemDetails({ open: true, id, type });
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteItemDetails({ open: false, id: null, type: null });
  };
  
  const handleConfirmDelete = async () => {
    if (!deleteItemDetails.id || !deleteItemDetails.type) {
      toast.error('No se especificó el item a eliminar.');
      handleCloseDeleteDialog();
      return;
    }

    setIsDeleting(true);
    const { id, type } = deleteItemDetails;

    try {
      const endpoint = type === 'resource' ? `/api/content/resources/${id}` : `/api/content/activities/${id}`;
      const response = await axiosInstance.delete(endpoint);

      const responseMessage = response.data.message || `${type === 'resource' ? 'Recurso' : 'Actividad'} eliminado con éxito.`;
      toast.success(responseMessage);

      if (type === 'resource') {
        setResources(prevResources => prevResources.filter(resource => resource._id !== id));
      } else if (type === 'activity') {
        setActivities(prevActivities => prevActivities.filter(activity => activity._id !== id));
      }
    } catch (err) {
      console.error(`Error deleting ${type}:`, err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : `Error al intentar eliminar el ${type === 'resource' ? 'recurso' : 'actividad'}.`;
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      handleCloseDeleteDialog();
    }
  };

  // Lógica para Modal de Crear Recurso
  const handleOpenCreateResourceModal = () => {
    if (isDeleting || isCreatingActivity) return;
    setIsCreateResourceModalOpen(true);
  };

  const handleCloseCreateResourceModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsCreateResourceModalOpen(false);
    setResourceDataToCreate(null);
  };

  const handleResourceFormSubmit = (formData) => {
    setResourceDataToCreate(formData);
    setIsCreateResourceConfirmOpen(true);
  };

  const handleCloseCreateResourceConfirm = () => {
    setIsCreateResourceConfirmOpen(false);
    setResourceDataToCreate(null);
  };

  const handleConfirmCreateResource = async () => {
    if (!resourceDataToCreate) return;

    setIsCreatingResource(true);

    try {
      const response = await axiosInstance.post('/api/content/resources', resourceDataToCreate);
      const newResource = response.data;
      toast.success('Recurso creado con éxito!');
      setResources(prevResources => [...prevResources, newResource]);
      handleCloseCreateResourceConfirm();
      handleCloseCreateResourceModal();
    } catch (err) {
      console.error('Error creating resource:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al intentar crear el recurso.';
      toast.error(errorMessage);
    } finally {
      setIsCreatingResource(false);
    }
  };

  // Lógica para Modal de Crear Actividad
  const handleOpenCreateActivityModal = () => {
    if (isDeleting || isCreatingResource) return;
    setIsCreateActivityModalOpen(true);
  };

  const handleCloseCreateActivityModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsCreateActivityModalOpen(false);
    setActivityDataToCreate(null);
  };

  const handleActivityFormSubmit = (formData) => {
    setActivityDataToCreate(formData);
    setIsCreateActivityConfirmOpen(true);
  };

  const handleCloseCreateActivityConfirm = () => {
    setIsCreateActivityConfirmOpen(false);
    setActivityDataToCreate(null);
  };

  const handleConfirmCreateActivity = async () => {
    if (!activityDataToCreate) return;

    setIsCreatingActivity(true);

    try {
      const response = await axiosInstance.post('/api/content/activities', activityDataToCreate);
      const newActivity = response.data;
      toast.success('Actividad creada con éxito!');
      setActivities(prevActivities => [...prevActivities, newActivity]);
      handleCloseCreateActivityConfirm();
      handleCloseCreateActivityModal();
    } catch (err) {
      console.error('Error creating activity:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al intentar crear la actividad.';
      toast.error(errorMessage);
    } finally {
      setIsCreatingActivity(false);
    }
  };

  // Lógica para Modal de Editar Recurso
  const handleOpenEditResourceModal = (resourceId) => {
    if (isDeleting || isCreatingResource || isCreatingActivity) return;
    setEditingResourceId(resourceId);
    setIsEditResourceModalOpen(true);
  };

  const handleCloseEditResourceModal = (event, reason) => { // <-- Acepta event y reason
      if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return; // No cerrar si la razón es click fuera o escape
      }
      setIsEditResourceModalOpen(false);
      setEditingResourceId(null);
  };

  const handleResourceUpdateSuccess = (updatedResourceData) => {
    setResources(prevResources =>
      prevResources.map(resource =>
        resource._id === updatedResourceData._id ? updatedResourceData : resource
      )
    );
  };

  // Lógica para Modal de Editar Actividad
  const handleOpenEditActivityModal = (activityId) => {
    if (isDeleting || isCreatingResource || isCreatingActivity) return;
    setEditingActivityId(activityId);
    setIsEditActivityModalOpen(true);
  };

  const handleCloseEditActivityModal = (event, reason) => { // <-- Acepta event y reason
      if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return; // No cerrar si la razón es click fuera o escape
      }
      setIsEditActivityModalOpen(false);
      setEditingActivityId(null);
  };

  const handleActivityUpdateSuccess = (updatedActivityData) => {
    setActivities(prevActivities =>
      prevActivities.map(item =>
        item._id === updatedActivityData._id ? updatedActivityData : item
      )
    );
  };

  // Configuraciones de animación
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  // Renderizado de tarjetas de recursos
  const renderResourceCards = () => {
    if (resources.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 3 }}>
          <Alert severity="info" sx={{ width: '100%' }}>
            No tienes recursos creados aún. Usa el botón "Crear Recurso" para añadir uno.
          </Alert>
        </Box>
      );
    }

    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {resources.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={item._id}>
            <MotionCard
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <Box 
                sx={{ 
                  p: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'primary.light', 
                  color: 'primary.contrastText',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8
                }}
              >
                {getResourceIcon(item.type)}
                <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                  {item.type}
                </Typography>
              </Box>
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Typography variant="h6" noWrap sx={{ mb: 1, fontSize: '1rem', fontWeight: 'bold' }}>
                  {item.title}
                </Typography>
                <Box sx={{ height: 60, overflow: 'hidden' }}>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      mb: 0.5
                    }}>
                      {item.description}
                    </Typography>
                  )}
                  {renderResourceDetails(item)}
                </Box>
                  <Chip
                      label={item.isAssigned ? 'Asignado' : 'No Asignado'}
                      color={item.isAssigned ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleOpenEditResourceModal(item._id)}
                  disabled={isDeleting || isCreatingResource || isCreatingActivity}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => handleOpenDeleteDialog(item._id, 'resource')}
                  disabled={isDeleting || isCreatingResource || isCreatingActivity}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </MotionCard>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Renderizado de tarjetas de actividades
  const renderActivityCards = () => {
    if (activities.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 3 }}>
          <Alert severity="info" sx={{ width: '100%' }}>
            No tienes actividades creadas aún. Usa el botón "Crear Actividad" para añadir una.
          </Alert>
        </Box>
      );
    }

    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {activities.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={item._id}>
            <MotionCard
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <Box 
                sx={{ 
                  p: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'secondary.light', 
                  color: 'secondary.contrastText',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8
                }}
              >
                {getActivityIcon(item.type)}
                <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                  {item.type}
                </Typography>
              </Box>
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Typography variant="h6" noWrap sx={{ mb: 1, fontSize: '1rem', fontWeight: 'bold' }}>
                  {item.title}
                </Typography>
                <Box sx={{ height: 60, overflow: 'hidden' }}>
                  {renderActivityDetails(item)}
                </Box>
                  <Chip
                      label={item.isAssigned ? 'Asignado' : 'No Asignado'}
                      color={item.isAssigned ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleOpenEditActivityModal(item._id)}
                  disabled={isDeleting || isCreatingResource || isCreatingActivity}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => handleOpenDeleteDialog(item._id, 'activity')}
                  disabled={isDeleting || isCreatingResource || isCreatingActivity}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </MotionCard>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component={motion.h4}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          gutterBottom
        >
          Mi Banco de Contenido
        </Typography>
        
        <Typography color="text.secondary" component={motion.p}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          sx={{ mb: 3 }}
        >
          Aquí encuentras todos los recursos y actividades que has creado.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>}

        {!isLoading && !error && resources.length === 0 && activities.length === 0 && (
          <Alert severity="info" sx={{ mt: 4 }}>
            Aún no tienes contenido (recursos o actividades) en tu banco. Usa los botones de "Crear" para añadir contenido.
          </Alert>
        )}

        {!isLoading && !error && (resources.length > 0 || activities.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Paper sx={{ 
              mt: 3, 
              borderRadius: 2, 
              overflow: 'hidden',
              boxShadow: 3
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                backgroundColor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider' 
              }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{ mb: isMobile ? 2 : 0 }}
                >
                  <Tab 
                    icon={<MenuBookIcon />} 
                    iconPosition="start" 
                    label="Recursos" 
                    sx={{ fontWeight: 'bold' }} 
                  />
                  <Tab 
                    icon={<AssignmentIcon />} 
                    iconPosition="start" 
                    label="Actividades" 
                    sx={{ fontWeight: 'bold' }} 
                  />
                </Tabs>
                <Stack direction="row" spacing={2}>
                  {activeTab === 0 ? (
                    <Button
                      variant="contained"
                      startIcon={<AddCircleOutlineIcon />}
                      color="primary"
                      onClick={handleOpenCreateResourceModal}
                      disabled={isDeleting || isCreatingResource || isCreatingActivity}
                    >
                      Crear Recurso
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<AddCircleOutlineIcon />}
                      color="secondary"
                      onClick={handleOpenCreateActivityModal}
                      disabled={isDeleting || isCreatingResource || isCreatingActivity}
                    >
                      Crear Actividad
                    </Button>
                  )}
                </Stack>
              </Box>
              
              <Box sx={{ p: 2, minHeight: 400 }}>
                {activeTab === 0 ? renderResourceCards() : renderActivityCards()}
              </Box>
            </Paper>
          </motion.div>
        )}
      </Box>

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog
        open={deleteItemDetails.open}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">{"Confirmar Eliminación"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            ¿Estás seguro de que deseas eliminar este {deleteItemDetails.type === 'resource' ? 'recurso' : 'actividad'}? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting || isCreatingResource || isCreatingActivity}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={isDeleting || isCreatingResource || isCreatingActivity} autoFocus>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Crear Recurso */}
      <CreateResourceModal
        open={isCreateResourceModalOpen}
        onClose={handleCloseCreateResourceModal}
        onSubmit={handleResourceFormSubmit}
        isCreating={isCreatingResource}
      />

      {/* Diálogo de Confirmación PREVIA a la Creación de Recurso */}
      <Dialog
        open={isCreateResourceConfirmOpen}
        onClose={handleCloseCreateResourceConfirm}
        aria-labelledby="create-resource-confirm-title"
        aria-describedby="create-resource-confirm-description"
      >
        <DialogTitle id="create-resource-confirm-title">{"Confirmar Creación de Recurso"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="create-resource-confirm-description">
            ¿Estás seguro de que deseas crear este recurso con la información proporcionada?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateResourceConfirm} disabled={isCreatingResource}>Cancelar</Button>
          <Button onClick={handleConfirmCreateResource} color="primary" disabled={isCreatingResource} autoFocus>
            {isCreatingResource ? 'Creando...' : 'Confirmar Creación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Crear Actividad */}
      <CreateActivityModal
        open={isCreateActivityModalOpen}
        onClose={handleCloseCreateActivityModal}
        onSubmit={handleActivityFormSubmit}
        isCreating={isCreatingActivity}
      />
      {/* --- FIN NUEVO: Modal para Crear Actividad --- */}

      {/* --- NUEVO: Diálogo de Confirmación PREVIA a la Creación de Actividad --- */}
      <Dialog
        open={isCreateActivityConfirmOpen}
        onClose={handleCloseCreateActivityConfirm}
        aria-labelledby="create-activity-confirm-title"
        aria-describedby="create-activity-confirm-description"
      >
        <DialogTitle id="create-activity-confirm-title">{"Confirmar Creación de Actividad"}</DialogTitle> {/* Título más específico */}
        <DialogContent>
          <DialogContentText id="create-activity-confirm-description">
            ¿Estás seguro de que deseas crear esta actividad con la información proporcionada?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateActivityConfirm} disabled={isCreatingActivity}>Cancelar</Button>
          <Button onClick={handleConfirmCreateActivity} color="primary" disabled={isCreatingActivity} autoFocus>
            {isCreatingActivity ? 'Creando...' : 'Confirmar Creación'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- FIN NUEVO: Diálogo de Confirmación PREVIA a la Creación de Actividad --- */}

      {/* *** Renderizar el Modal de Edición de Recurso *** */}
        <EditResourceModal
            open={isEditResourceModalOpen}
            onClose={handleCloseEditResourceModal}
            resourceId={editingResourceId} // Pasa el ID del recurso a editar
            onUpdateSuccess={handleResourceUpdateSuccess} // Pasa la función para manejar el éxito
        />

        {/* *** Renderizar el Modal de Edición de Actividad *** */}
        <EditActivityModal
            open={isEditActivityModalOpen}
            onClose={handleCloseEditActivityModal}
            activityId={editingActivityId} // Pasa el ID de la actividad a editar
            onUpdateSuccess={handleActivityUpdateSuccess} // Pasa la función para manejar el éxito
        />


    </Container>
  );
}

export default TeacherContentBankPage;