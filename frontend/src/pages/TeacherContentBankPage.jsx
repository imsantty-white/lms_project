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
// EditIcon and DeleteIcon are now mainly in ContentCard
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FilePresentIcon from '@mui/icons-material/FilePresent'; // Used as default for activities
import MenuBookIcon from '@mui/icons-material/MenuBook'; // Used as default for resources
import AssignmentIcon from '@mui/icons-material/Assignment'; // Used for Cuestionario and Tab icon
import LinkIcon from '@mui/icons-material/Link';
import VideocamIcon from '@mui/icons-material/Videocam';
import QuizIcon from '@mui/icons-material/Quiz';
import DescriptionIcon from '@mui/icons-material/Description';
// motion can be removed if ContentCard handles its own animation, or kept if page-level animations are desired
import { motion } from 'framer-motion'; 

// Importar useAuth y axiosInstance
import { useAuth, axiosInstance } from '../contexts/AuthContext';

import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importar los componentes modales
import CreateResourceModal from '../pages/components/CreateResourceModal';
import EditResourceModal from '../pages/components/EditResourceModal';
import CreateActivityModal from '../pages/components/CreateActivityModal';
import EditActivityModal from './components/EditActivityModal';

// Reusable Components
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ContentCard from '../components/ContentCard';
import ConfirmationModal from '../components/ConfirmationModal'; // For delete and create confirmations

// Componente de animación para las tarjetas (no longer needed if ContentCard handles it)
// const MotionCard = motion(Card); 

// Icon mapping - can be moved to a utils file or kept here if specific to this page
const resourceIconMap = {
  'Contenido': <DescriptionIcon color="primary" />,
  'Enlace': <LinkIcon color="secondary" />,
  'Video-Enlace': <VideocamIcon color="error" />,
  'default': <MenuBookIcon color="primary" />
};

const activityIconMap = {
  'Cuestionario': <AssignmentIcon color="primary" />,
  'Quiz': <QuizIcon color="secondary" />,
  'Trabajo': <AssignmentIcon color="info" />, // Assuming 'Trabajo' is a type
  'default': <FilePresentIcon color="primary" />
};

const getResourceIcon = (type) => resourceIconMap[type] || resourceIconMap['default'];
const getActivityIcon = (type) => activityIconMap[type] || activityIconMap['default'];

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
        <EmptyState
          message="No tienes recursos creados aún. Usa el botón 'Crear Recurso' para añadir uno."
          icon={MenuBookIcon}
        />
      );
    }
    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {resources.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={item._id}>
            <ContentCard
              item={item}
              index={index}
              itemTypeLabel={item.type}
              icon={getResourceIcon(item.type)}
              title={item.title}
              description={item.description}
              detailsRenderer={renderResourceDetails}
              isAssigned={item.isAssigned}
              onEdit={() => handleOpenEditResourceModal(item._id)}
              onDelete={() => handleOpenDeleteDialog(item._id, 'resource')}
              isActionDisabled={isDeleting || isCreatingResource || isCreatingActivity}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // Renderizado de tarjetas de actividades
  const renderActivityCards = () => {
    if (activities.length === 0) {
      return (
        <EmptyState
          message="No tienes actividades creadas aún. Usa el botón 'Crear Actividad' para añadir una."
          icon={AssignmentIcon}
        />
      );
    }
    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {activities.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={item._id}>
            <ContentCard
              item={item}
              index={index}
              itemTypeLabel={item.type}
              icon={getActivityIcon(item.type)}
              title={item.title}
              description={item.description} // Activities might not have a top-level description field in the same way
              detailsRenderer={renderActivityDetails}
              isAssigned={item.isAssigned}
              onEdit={() => handleOpenEditActivityModal(item._id)}
              onDelete={() => handleOpenDeleteDialog(item._id, 'activity')}
              isActionDisabled={isDeleting || isCreatingResource || isCreatingActivity}
              headerStyleProps={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <PageHeader
          title="Mi Banco de Contenido"
          subtitle="Aquí encuentras todos los recursos y actividades que has creado."
        />
        
        {/* motion.h4 and motion.p removed for brevity, PageHeader handles titles now */}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>}

        {!isLoading && !error && resources.length === 0 && activities.length === 0 && activeTab === 0 && (
           <EmptyState
            message="Aún no tienes recursos en tu banco. Usa el botón 'Crear Recurso' para añadir contenido."
            icon={MenuBookIcon}
          />
        )}
         {!isLoading && !error && resources.length === 0 && activities.length === 0 && activeTab === 1 && (
           <EmptyState
            message="Aún no tienes actividades en tu banco. Usa el botón 'Crear Actividad' para añadir contenido."
            icon={AssignmentIcon}
          />
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
      <ConfirmationModal
        open={deleteItemDetails.open}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que deseas eliminar este ${deleteItemDetails.type === 'resource' ? 'recurso' : 'actividad'}? Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        // disabledConfirm={isDeleting || isCreatingResource || isCreatingActivity} // GenericFormModal handles this via isSubmitting
        // disabledCancel={isDeleting || isCreatingResource || isCreatingActivity}
      />
      {/* Note: ConfirmationModal doesn't have a direct 'isSubmitting' prop for its own buttons, 
          but the passed onConfirm (handleConfirmDelete) sets isDeleting, which can disable buttons if needed.
          The GenericFormModal has better isSubmitting handling for its primary action.
          For simple confirmations, this is fine. For actions that trigger isDeleting,
          we rely on the handlers to manage button states if ConfirmationModal itself doesn't.
      */}


      {/* Modal para Crear Recurso */}
      <CreateResourceModal
        open={isCreateResourceModalOpen}
        onClose={handleCloseCreateResourceModal}
        onSubmit={handleResourceFormSubmit}
        isCreating={isCreatingResource}
      />

      {/* Diálogo de Confirmación PREVIA a la Creación de Recurso */}
      <ConfirmationModal
        open={isCreateResourceConfirmOpen}
        onClose={handleCloseCreateResourceConfirm}
        onConfirm={handleConfirmCreateResource}
        title="Confirmar Creación de Recurso"
        message="¿Estás seguro de que deseas crear este recurso con la información proporcionada?"
        confirmText={isCreatingResource ? 'Creando...' : 'Confirmar Creación'}
        cancelText="Cancelar"
        // disabledConfirm={isCreatingResource}
      />


      {/* Modal para Crear Actividad */}
      <CreateActivityModal
        open={isCreateActivityModalOpen}
        onClose={handleCloseCreateActivityModal}
        onSubmit={handleActivityFormSubmit}
        isCreating={isCreatingActivity}
      />
      {/* --- FIN NUEVO: Modal para Crear Actividad --- */}

      {/* --- NUEVO: Diálogo de Confirmación PREVIA a la Creación de Actividad --- */}
      <ConfirmationModal
        open={isCreateActivityConfirmOpen}
        onClose={handleCloseCreateActivityConfirm}
        onConfirm={handleConfirmCreateActivity}
        title="Confirmar Creación de Actividad"
        message="¿Estás seguro de que deseas crear esta actividad con la información proporcionada?"
        confirmText={isCreatingActivity ? 'Creando...' : 'Confirmar Creación'}
        cancelText="Cancelar"
        // disabledConfirm={isCreatingActivity}
      />
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