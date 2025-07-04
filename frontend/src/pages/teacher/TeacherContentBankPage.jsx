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
    Tooltip,
    useTheme,
    useMediaQuery
} from '@mui/material';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LinkIcon from '@mui/icons-material/Link';
import VideocamIcon from '@mui/icons-material/Videocam';
import QuizIcon from '@mui/icons-material/Quiz';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoIcon from '@mui/icons-material/Info'; // For usage display
import { motion } from 'framer-motion';

import { useAuth, axiosInstance } from '../../contexts/AuthContext'; // useAuth already imported

import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import CreateResourceModal from '../components/CreateResourceModal';
import EditResourceModal from '../components/EditResourceModal';
import CreateActivityModal from '../components/CreateActivityModal';
import EditActivityModal from '../components/EditActivityModal';

import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import ContentCard from '../../components/ContentCard';
import ConfirmationModal from '../../components/ConfirmationModal';

// Icon mapping (kept the same)
const resourceIconMap = {
    'Contenido': <DescriptionIcon color="text.primary" />,
    'Enlace': <LinkIcon color="text.primary" />,
    'Video-Enlace': <VideocamIcon color="text.primary" />,
    'default': <MenuBookIcon color="primary" />
};

const activityIconMap = {
    'Cuestionario': <AssignmentIcon color="text.primary" />,
    'Quiz': <QuizIcon color="text.primary" />,
    'Trabajo': <AssignmentIcon color="text.primary" />,
    'default': <FilePresentIcon color="primary" />
};

const getResourceIcon = (type) => resourceIconMap[type] || resourceIconMap['default'];
const getActivityIcon = (type) => activityIconMap[type] || activityIconMap['default'];

// renderResourceDetails (kept the same)
const renderResourceDetails = (item) => {
    if (item.type === 'Contenido' && item.content_body) {
        return (
            <Typography component="span" variant="caption" color="text.secondary" sx={{
                display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%'
            }}>
                Contenido: {item.content_body.substring(0, 40)}...
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

// renderActivityDetails (kept the same)
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
        <Typography variant="body2" color="text.secondary" sx={{
            display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
        }}>
            {item.description}
        </Typography>
    );
};

function TeacherContentBankPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user, isAuthenticated, isAuthInitialized, fetchAndUpdateUser } = useAuth();
    const _navigate = useNavigate();

    const [resources, setResources] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    // --- BEGIN Plan Limit States ---
    const [canCreateResource, setCanCreateResource] = useState(true);
    const [resourceLimitMessage, setResourceLimitMessage] = useState('');
    const [canCreateActivity, setCanCreateActivity] = useState(true);
    const [activityLimitMessage, setActivityLimitMessage] = useState('');
    // --- END Plan Limit States ---

    const [deleteItemDetails, setDeleteItemDetails] = useState({
        open: false,
        id: null,
        type: null,
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] = useState(false);
    const [isCreateResourceConfirmOpen, setIsCreateResourceConfirmOpen] = useState(false);
    const [resourceDataToCreate, setResourceDataToCreate] = useState(null);
    const [isCreatingResource, setIsCreatingResource] = useState(false);
    const [isEditResourceModalOpen, setIsEditResourceModalOpen] = useState(false);
    const [editingResourceId, setEditingResourceId] = useState(null);

    const [isCreateActivityModalOpen, setIsCreateActivityModalOpen] = useState(false);
    const [isCreateActivityConfirmOpen, setIsCreateActivityConfirmOpen] = useState(false);
    const [activityDataToCreate, setActivityDataToCreate] = useState(null);
    const [isCreatingActivity, setIsCreatingActivity] = useState(false);
    const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    useEffect(() => {
        const fetchContentBank = async () => {
            try {
                const response = await axiosInstance.get('/api/content/my-bank');
                const { resources, activities } = response.data;
                setResources(resources.map(r => ({ ...r, isAssigned: r.isAssigned || false })));
                setActivities(activities.map(a => ({ ...a, isAssigned: a.isAssigned || false })));
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

            // --- BEGIN Plan Limit Check (for Docente only) ---
            if (user?.userType === 'Docente' && user.plan && user.plan.limits && user.usage) {
                const { maxResources, maxActivities } = user.plan.limits;
                const { resourcesGenerated, activitiesGenerated } = user.usage;

                if (resourcesGenerated >= maxResources) {
                    setCanCreateResource(false);
                    setResourceLimitMessage(`Límite de ${maxResources} recursos alcanzado.`);
                } else {
                    setCanCreateResource(true);
                    setResourceLimitMessage(`Recursos: ${resourcesGenerated}/${maxResources}`);
                }

                if (activitiesGenerated >= maxActivities) {
                    setCanCreateActivity(false);
                    setActivityLimitMessage(`Límite de ${maxActivities} actividades alcanzado.`);
                } else {
                    setCanCreateActivity(true);
                    setActivityLimitMessage(`Actividades: ${activitiesGenerated}/${maxActivities}`);
                }
            } else if (user?.userType === 'Administrador') {
                // Admins have no limits
                setCanCreateResource(true);
                setResourceLimitMessage('');
                setCanCreateActivity(true);
                setActivityLimitMessage('');
            }
            // --- END Plan Limit Check ---

        } else if (isAuthInitialized && !isAuthenticated) {
            // ...
        }
    }, [isAuthenticated, user, isAuthInitialized]); // Added user to dependency array

    // Función para actualizar límites
    const updateLimits = async () => {
        const updatedUser = await fetchAndUpdateUser();
        if (updatedUser?.userType === 'Docente' && updatedUser?.plan && updatedUser?.plan.limits && updatedUser?.usage) {
            const { maxResources, maxActivities } = updatedUser.plan.limits;
            const { resourcesGenerated, activitiesGenerated } = updatedUser.usage;

            if (resourcesGenerated >= maxResources) {
                setCanCreateResource(false);
                setResourceLimitMessage(`Límite de ${maxResources} recursos alcanzado.`);
            } else {
                setCanCreateResource(true);
                setResourceLimitMessage(`Recursos: ${resourcesGenerated}/${maxResources}`);
            }

            if (activitiesGenerated >= maxActivities) {
                setCanCreateActivity(false);
                setActivityLimitMessage(`Límite de ${maxActivities} actividades alcanzado.`);
            } else {
                setCanCreateActivity(true);
                setActivityLimitMessage(`Actividades: ${activitiesGenerated}/${maxActivities}`);
            }
        }
    };

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
        try {
            const endpoint = deleteItemDetails.type === 'resource' 
                ? `/api/content/resources/${deleteItemDetails.id}`
                : `/api/content/activities/${deleteItemDetails.id}`;
            
            await axiosInstance.delete(endpoint);

            if (deleteItemDetails.type === 'resource') {
                setResources(prev => prev.filter(r => r._id !== deleteItemDetails.id));
            } else {
                setActivities(prev => prev.filter(a => a._id !== deleteItemDetails.id));
            }

            // Actualizar límites después de eliminar
            await updateLimits();

            toast.success(`${deleteItemDetails.type === 'resource' ? 'Recurso' : 'Actividad'} eliminado con éxito.`);
            handleCloseDeleteDialog();
        } catch (error) {
            console.error('Error al eliminar:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al eliminar el elemento.';
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

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
            const response = await axiosInstance.post('/api/content/resources/create', resourceDataToCreate);
            
            // Asegurarnos de que tenemos una respuesta válida
            if (!response.data) {
                throw new Error('No se recibieron datos del servidor');
            }

            // La respuesta puede venir directamente en data o en data.data
            const newResource = response.data.data || response.data;
            
            if (!newResource || !newResource._id) {
                throw new Error('Los datos del recurso recibidos no son válidos');
            }

            setResources(prev => [...prev, { ...newResource, isAssigned: false }]);
            
            // Actualizar límites después de crear
            await updateLimits();
            
            toast.success('Recurso creado con éxito.');
            setIsCreateResourceConfirmOpen(false);
            setIsCreateResourceModalOpen(false);
            setResourceDataToCreate(null);
            
        } catch (error) {
            console.error('Error al crear el recurso:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al crear el recurso.';
            toast.error(errorMessage);
        } finally {
            setIsCreatingResource(false);
        }
    };

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
            const response = await axiosInstance.post('/api/content/activities/create', activityDataToCreate);
            
            // Asegurarnos de que tenemos una respuesta válida
            if (!response.data) {
                throw new Error('No se recibieron datos del servidor');
            }

            // La respuesta puede venir directamente en data o en data.data
            const newActivity = response.data.data || response.data;
            
            if (!newActivity || !newActivity._id) {
                throw new Error('Los datos de la actividad recibidos no son válidos');
            }

            setActivities(prev => [...prev, { ...newActivity, isAssigned: false }]);
            
            // Actualizar límites después de crear
            await updateLimits();
            
            toast.success('Actividad creada con éxito.');
            setIsCreateActivityConfirmOpen(false);
            setIsCreateActivityModalOpen(false);
            setActivityDataToCreate(null);
            
        } catch (error) {
            console.error('Error al crear la actividad:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al crear la actividad.';
            toast.error(errorMessage);
        } finally {
            setIsCreatingActivity(false);
        }
    };

    const handleOpenEditResourceModal = (resourceId) => {
        if (isDeleting || isCreatingResource || isCreatingActivity) return;
        setEditingResourceId(resourceId);
        setIsEditResourceModalOpen(true);
    };

    const handleCloseEditResourceModal = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsEditResourceModalOpen(false);
        setEditingResourceId(null);
    };

    const handleResourceUpdateSuccess = async (updatedResourceData) => {
        // Actualizar el recurso en el estado local
        setResources(prev => prev.map(r => 
            r._id === updatedResourceData._id ? { ...updatedResourceData, isAssigned: r.isAssigned } : r
        ));
        
        // Recargar todo el banco de contenido
        try {
            const response = await axiosInstance.get('/api/content/my-bank');
            const { resources, activities } = response.data;
            setResources(resources.map(r => ({ ...r, isAssigned: r.isAssigned || false })));
            setActivities(activities.map(a => ({ ...a, isAssigned: a.isAssigned || false })));
        } catch (err) {
            console.error('Error recargando el banco de contenido:', err);
        }

        setIsEditResourceModalOpen(false);
        setEditingResourceId(null);
        toast.success('Recurso actualizado con éxito.');
    };

    const handleOpenEditActivityModal = (activityId) => {
        if (isDeleting || isCreatingResource || isCreatingActivity) return;
        setEditingActivityId(activityId);
        setIsEditActivityModalOpen(true);
    };

    const handleCloseEditActivityModal = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsEditActivityModalOpen(false);
        setEditingActivityId(null);
    };

    const handleActivityUpdateSuccess = async (updatedActivityData) => {
        // Actualizar la actividad en el estado local
        setActivities(prev => prev.map(a => 
            a._id === updatedActivityData._id ? { ...updatedActivityData, isAssigned: a.isAssigned } : a
        ));
        
        // Recargar todo el banco de contenido
        try {
            const response = await axiosInstance.get('/api/content/my-bank');
            const { resources, activities } = response.data;
            setResources(resources.map(r => ({ ...r, isAssigned: r.isAssigned || false })));
            setActivities(activities.map(a => ({ ...a, isAssigned: a.isAssigned || false })));
        } catch (err) {
            console.error('Error recargando el banco de contenido:', err);
        }

        setIsEditActivityModalOpen(false);
        setEditingActivityId(null);
        toast.success('Actividad actualizada con éxito.');
    };

    // Card variants (kept the same)
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
                            headerStyleProps={{ bgcolor: 'primary.main', color: 'white' }}
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
                            //description={item.description}
                            detailsRenderer={renderActivityDetails}
                            isAssigned={item.isAssigned}
                            onEdit={() => handleOpenEditActivityModal(item._id)}
                            onDelete={() => handleOpenDeleteDialog(item._id, 'activity')}
                            isActionDisabled={isDeleting || isCreatingResource || isCreatingActivity}
                            headerStyleProps={{ bgcolor: 'secondary.main', color: 'white' }}
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

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>}

                {/* MODIFICACIÓN CLAVE: Esta sección siempre se renderiza (si no hay carga/error) */}
                {/* Los EmptyState específicos de cada tipo de contenido se manejan dentro de renderResourceCards/renderActivityCards */}
                {!isLoading && !error && (
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
                                    indicatorColor={activeTab === 1 ? 'secondary' : 'primary'} 
                                    sx={{ mb: isMobile ? 2 : 0 }}
                                    >
                                    <Tab
                                        icon={<MenuBookIcon />}
                                        iconPosition="start"
                                        label="Recursos"
                                        sx={{
                                        fontWeight: 'bold',
                                        color: activeTab === 0 ? 'secondary.main' : 'text.secondary', // Cambia color cuando está activo
                                        }}
                                    />
                                    <Tab
                                        icon={<AssignmentIcon />}
                                        iconPosition="start"
                                        label="Actividades"
                                        sx={{
                                        fontWeight: 'bold',
                                        color: activeTab === 1 ? 'secondary.main' : 'text.secondary', // Color secundario cuando está activo
                                        '&.Mui-selected': { color: 'secondary.main' }, // Aplica el color cuando la pestaña está seleccionada
                                        }}
                                    />
                                    </Tabs>
                                {/* BOTONES DE CREACIÓN SIEMPRE VISIBLES AQUÍ */}
                                <Stack direction="row" spacing={2}>
                                  {/* --- BEGIN Tooltip and Disable for Create Resource --- */}
                                  <Tooltip title={!canCreateResource && user?.userType === 'Docente' ? resourceLimitMessage : "Crear Nuevo Recurso"}>
                                    <span>
                                      <Button
                                        variant="contained"
                                        startIcon={<AddCircleOutlinedIcon />}
                                        color="primary"
                                        onClick={handleOpenCreateResourceModal}
                                        disabled={isDeleting || isCreatingResource || isCreatingActivity || (user?.userType === 'Docente' && !canCreateResource)}
                                        sx={{ color: 'white' }} // Usando sx
                                      >
                                        Crear Recurso
                                      </Button>
                                    </span>
                                  </Tooltip>
                                  {/* --- END Tooltip and Disable for Create Resource --- */}

                                  {/* --- BEGIN Tooltip and Disable for Create Activity --- */}
                                  <Tooltip title={!canCreateActivity && user?.userType === 'Docente' ? activityLimitMessage : "Crear Nueva Actividad"}>
                                    <span>
                                      <Button
                                        variant="contained"
                                        startIcon={<AddCircleOutlinedIcon />}
                                        color="secondary"
                                        onClick={handleOpenCreateActivityModal}
                                        disabled={isDeleting || isCreatingResource || isCreatingActivity || (user?.userType === 'Docente' && !canCreateActivity)}
                                        sx={{ color: 'white' }} // Usando sx
                                        >
                                        Crear Actividad
                                        </Button>
                                    </span>
                                  </Tooltip>
                                  {/* --- END Tooltip and Disable for Create Activity --- */}
                                </Stack>
                            </Box>
                            {/* --- BEGIN Display Usage/Limits --- */}
                            {user?.userType === 'Docente' && (
                              <Box sx={{p: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
                                {resourceLimitMessage && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: canCreateResource ? 'text.secondary' : 'warning.main' }}>
                                    <InfoIcon fontSize="inherit" />
                                    <Typography variant="caption" sx={{ fontWeight: 'medium' }}>{resourceLimitMessage}</Typography>
                                  </Box>
                                )}
                                {activityLimitMessage && (
                                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: canCreateActivity ? 'text.secondary' : 'warning.main' }}>
                                    <InfoIcon fontSize="inherit" />
                                    <Typography variant="caption" sx={{ fontWeight: 'medium' }}>{activityLimitMessage}</Typography>
                                  </Box>
                                )}
                              </Box>
                            )}
                            {/* --- END Display Usage/Limits --- */}


                            <Box sx={{ p: 2, minHeight: 400 }}>
                                {activeTab === 0 ? renderResourceCards() : renderActivityCards()}
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </Box>

            {/* Modales (mantener igual) */}
            <ConfirmationModal
                open={deleteItemDetails.open}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que deseas eliminar este ${deleteItemDetails.type === 'resource' ? 'recurso' : 'actividad'}? Esta acción no se puede deshacer.`}
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                cancelText="Cancelar"
            />

            <CreateResourceModal
                open={isCreateResourceModalOpen}
                onClose={handleCloseCreateResourceModal}
                onSubmit={handleResourceFormSubmit}
                isCreating={isCreatingResource}
            />

            <ConfirmationModal
                open={isCreateResourceConfirmOpen}
                onClose={handleCloseCreateResourceConfirm}
                onConfirm={handleConfirmCreateResource}
                title="Confirmar Creación de Recurso"
                message="¿Estás seguro de que deseas crear este recurso con la información proporcionada?"
                confirmText={isCreatingResource ? 'Creando...' : 'Confirmar Creación'}
                cancelText="Cancelar"
            />

            <CreateActivityModal
                open={isCreateActivityModalOpen}
                onClose={handleCloseCreateActivityModal}
                onSubmit={handleActivityFormSubmit}
                isCreating={isCreatingActivity}
            />

            <ConfirmationModal
                open={isCreateActivityConfirmOpen}
                onClose={handleCloseCreateActivityConfirm}
                onConfirm={handleConfirmCreateActivity}
                title="Confirmar Creación de Actividad"
                message="¿Estás seguro de que deseas crear esta actividad con la información proporcionada?"
                confirmText={isCreatingActivity ? 'Creando...' : 'Confirmar Creación'}
                cancelText="Cancelar"
            />

            <EditResourceModal
                open={isEditResourceModalOpen}
                onClose={handleCloseEditResourceModal}
                resourceId={editingResourceId}
                onUpdateSuccess={handleResourceUpdateSuccess}
            />

            <EditActivityModal
                open={isEditActivityModalOpen}
                onClose={handleCloseEditActivityModal}
                activityId={editingActivityId}
                onUpdateSuccess={handleActivityUpdateSuccess}
            />
        </Container>
    );
}

export default TeacherContentBankPage;