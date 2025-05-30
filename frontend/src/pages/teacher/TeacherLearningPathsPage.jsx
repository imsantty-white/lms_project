// src/pages/TeacherLearningPathsPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
    Container,
    Box,
    Typography,
    Alert,
    Card,
    CardContent,
    Stack,
    Skeleton,
    Avatar,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    TextField,
    Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Iconos de Material-UI
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import RouteIcon from '@mui/icons-material/Route';


// Importar useAuth y axiosInstance
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importa los componentes reutilizables
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import CreateLearningPathModal from '../components/CreateLearningPathModal';


// Componente de Loading mejorado (Esqueletos) para Rutas de Aprendizaje
const LearningPathsSkeleton = () => (
    <Box sx={{ mt: 4 }}>
        {[1, 2, 3].map((item) => (
            <Card key={item} sx={{ mb: 3, p: 2 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Skeleton variant="circular" width={56} height={56} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: '70%' }} />
                            <Skeleton variant="text" sx={{ fontSize: '1rem', width: '90%', mt: 1 }} />
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Skeleton variant="rounded" width={40} height={28} />
                                <Skeleton variant="rounded" width={40} height={28} />
                                <Skeleton variant="rounded" width={40} height={28} />
                            </Stack>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        ))}
    </Box>
);

// Componente de tarjeta de Ruta de Aprendizaje para docentes
const LearningPathCard = ({ path, index, onEdit, onDelete, onNavigate }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -4 }} // Efecto de elevación al pasar el mouse
        >
            <Card
                sx={{
                    mb: 3,
                    position: 'relative',
                    overflow: 'visible',
                    transition: 'all 0.3s ease-in-out',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: (theme) => `0 8px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
                    }
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={3} alignItems="flex-start">
                        {/* Avatar de la ruta de aprendizaje */}
                        <Avatar
                            sx={{
                                width: 56,
                                height: 56,
                                bgcolor: 'primary.main',
                                fontSize: '1.5rem'
                            }}
                        >
                            <RouteIcon />
                        </Avatar>

                        {/* Información de la ruta */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    mb: 0.5,
                                    color: 'text.primary',
                                    cursor: 'pointer', // Indica que el texto es clickeable
                                    '&:hover': {
                                        color: 'primary.dark'
                                    }
                                }}
                                onClick={() => onNavigate(path._id)} // Navegar al hacer clic en el nombre
                            >
                                {path.nombre}
                            </Typography>

                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Grupo: {path.group_name || 'No asignado'}
                                </Typography>
                            </Stack>

                            {path.descripcion && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {path.descripcion}
                                </Typography>
                            )}

                        </Box>

                        {/* Botones de acción */}
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Tooltip title="Editar">
                            <IconButton
                              aria-label="editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(path);
                              }}
                              size="small"
                              sx={(theme) => ({
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                              })}
                            >
                              <EditIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              aria-label="eliminar"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(path);
                              }}
                              size="small"
                              sx={(theme) => ({
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
                              })}
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </motion.div>
    );
};


function TeacherLearningPathsPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();
    const navigate = useNavigate();

    const [learningPaths, setLearningPaths] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const [teacherGroups, setTeacherGroups] = useState([]);
    const [groupsLoadingError, setGroupsLoadingError] = useState(null);

    const [isCreateLearningPathModalOpen, setIsCreateLearningPathModalOpen] = useState(false);
    const [isCreateLearningPathConfirmOpen, setIsCreateLearningPathConfirmOpen] = useState(false);
    const [learningPathDataToCreate, setLearningPathDataToCreate] = useState(null);
    const [isCreatingLearningPath, setIsCreatingLearningPath] = useState(false);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [learningPathToDelete, setLearningPathToDelete] = useState(null);
    const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [learningPathToEdit, setLearningPathToEdit] = useState(null);
    const [isEditingLearningPath, setIsEditingLearningPath] = useState(false);

    const hasShownInitialToast = useRef(false);

    // Carga las Rutas de Aprendizaje Y los Grupos del docente al montar el componente
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setFetchError(null);
            setGroupsLoadingError(null);
            setLearningPaths([]); // Limpiar rutas previas

            try {
                // Cargar Rutas de Aprendizaje
                const pathsResponse = await axiosInstance.get('/api/learning-paths/my-creations');
                const fetchedPaths = pathsResponse.data.data || [];

                // Cargar Grupos del Docente
                const groupsResponse = await axiosInstance.get('/api/groups/docente/me');
                const fetchedGroups = groupsResponse.data.data || [];

                // Asignar nombres de grupo a las rutas de aprendizaje para mostrar en la UI
                const pathsWithGroupNames = fetchedPaths.map(path => {
                    const group = fetchedGroups.find(g => g._id === path.group_id);
                    return {
                        ...path,
                        group_name: group ? group.nombre : 'Grupo Desconocido'
                    };
                });

                setLearningPaths(pathsWithGroupNames);
                setTeacherGroups(fetchedGroups);

                // Mostrar toast solo una vez por carga exitosa
                if (!hasShownInitialToast.current) {
                    if (pathsWithGroupNames.length > 0) {
                        toast.success('Tus rutas de aprendizaje cargadas con éxito.');
                    } else if (fetchedGroups.length === 0) {
                         toast.info('No tienes grupos creados. Crea un grupo para empezar a gestionar rutas.');
                    } else {
                        toast.info('Aún no has creado ninguna ruta de aprendizaje.');
                    }
                    hasShownInitialToast.current = true;
                }

            } catch (err) {
                console.error('Error fetching data:', err.response ? err.response.data : err.message);
                let errorMessage = 'Error al cargar los datos.';

                if (err.config?.url?.includes('/my-creations')) {
                    errorMessage = err.response?.data?.message || 'Error al cargar tus rutas de aprendizaje.';
                    setFetchError(errorMessage);
                    toast.error('Error al cargar rutas de aprendizaje.');
                } else if (err.config?.url?.includes('/groups/docente/me')) {
                    errorMessage = err.response?.data?.message || 'Error al cargar tus grupos.';
                    setGroupsLoadingError(errorMessage);
                    toast.error('Error al cargar grupos del docente.');
                } else {
                    setFetchError(errorMessage);
                    toast.error('Error al cargar datos generales.');
                }
                hasShownInitialToast.current = false; // Resetear si hay error
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthInitialized && isAuthenticated && user?.userType === 'Docente') {
            fetchData();
        } else if (isAuthInitialized && (!isAuthenticated || user?.userType !== 'Docente')) {
            setIsLoading(false);
            setFetchError("No tienes permiso para ver esta página.");
            setGroupsLoadingError(null);
        }
    }, [isAuthenticated, user, isAuthInitialized]);


    // Manejador para navegar a la página de gestión de la ruta
    const handleNavigateToManage = (pathId) => {
        navigate(`/teacher/learning-paths/${pathId}/manage`);
    };

    // --- Lógica para Modal de Crear Ruta y su Confirmación ---
    const handleOpenCreateLearningPathModal = () => {
        if (!teacherGroups || teacherGroups.length === 0) {
            toast.warning('Debes crear al menos un grupo antes de poder crear una Ruta de Aprendizaje.');
            return;
        }
        if (isLoading || isCreatingLearningPath) return;
        setIsCreateLearningPathModalOpen(true);
    };

    const handleCloseCreateLearningPathModal = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsCreateLearningPathModalOpen(false);
        setLearningPathDataToCreate(null);
    };

    const handleLearningPathFormSubmit = (formData) => {
        setLearningPathDataToCreate(formData);
        setIsCreateLearningPathConfirmOpen(true);
    };

    const handleCloseCreateLearningPathConfirm = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsCreateLearningPathConfirmOpen(false);
        setLearningPathDataToCreate(null);
    };

    const handleConfirmCreateLearningPath = async () => {
        if (!learningPathDataToCreate) {
            toast.error('No se pudo crear la ruta. Datos incompletos.');
            handleCloseCreateLearningPathConfirm();
            handleCloseCreateLearningPathModal();
            return;
        }

        setIsCreatingLearningPath(true);

        try {
            const dataToSend = learningPathDataToCreate;
            const response = await axiosInstance.post('/api/learning-paths', dataToSend);
            const newLearningPath = response.data;

            const groupName = teacherGroups.find(g => g._id === newLearningPath.group_id)?.nombre || 'Grupo Desconocido';
            setLearningPaths(prevPaths => [...prevPaths, { ...newLearningPath, group_name: groupName }]);

            toast.success('Ruta de Aprendizaje creada con éxito!');
            handleCloseCreateLearningPathConfirm();
            handleCloseCreateLearningPathModal();

        } catch (err) {
            console.error('Error creating learning path:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al intentar crear la ruta de aprendizaje.';
            toast.error(errorMessage);
        } finally {
            setIsCreatingLearningPath(false);
        }
    };
    // --- FIN Lógica ---

    // --- Lógica para eliminar Ruta de Aprendizaje ---
    const handleOpenDeleteDialog = (path) => {
        setLearningPathToDelete(path);
        setDeleteConfirmationName('');
        setIsDeleteDialogOpen(true);
    };

    // MODIFICADO: Ahora limpia learningPathToDelete y deleteConfirmationName con un retraso
    const handleCloseDeleteDialog = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsDeleteDialogOpen(false);
        // Retrasar la limpieza de los estados para permitir la animación de salida del diálogo
        // Esto evita que el contenido se desmonte abruptamente.
        setTimeout(() => {
            setLearningPathToDelete(null);
            setDeleteConfirmationName('');
        }, 300); // 300ms es un buen valor, ajusta si las transiciones de MUI son más lentas/rápidas
    };

    const handleConfirmDeleteLearningPath = async () => {
        if (!learningPathToDelete) return;
        setIsDeleting(true);
        try {
            await axiosInstance.delete(`/api/learning-paths/${learningPathToDelete._id}`, {
                data: { nombreConfirmacion: deleteConfirmationName }
            });
            toast.success('Ruta eliminada exitosamente');
            setLearningPaths(prev => prev.filter(lp => lp._id !== learningPathToDelete._id));
            handleCloseDeleteDialog();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al eliminar la ruta');
        } finally {
            setIsDeleting(false);
        }
    };
    // --- FIN Lógica ---

    // --- Lógica para editar Ruta de Aprendizaje ---
    const handleEditLearningPath = (path) => {
        setLearningPathToEdit(path);
        setIsEditModalOpen(true);
    };

    const handleCloseEditLearningPathModal = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsEditModalOpen(false);
        // Retrasar la limpieza de los estados para permitir la animación de salida del diálogo
        setTimeout(() => {
            setLearningPathToEdit(null);
        }, 300); // Mismo retraso que el de eliminación
    };

    const handleEditLearningPathFormSubmit = async (formData) => {
        if (!learningPathToEdit) return;
        setIsEditingLearningPath(true);
        try {
            const response = await axiosInstance.put(`/api/learning-paths/${learningPathToEdit._id}`, formData);
            let updated = response.data;

            const group = teacherGroups.find(g => g._id === (updated.group_id._id || updated.group_id));
            const groupName = group ? group.nombre : 'Grupo Desconocido';

            setLearningPaths(prev =>
                prev.map(lp => (lp._id === updated._id ? { ...updated, group_name: groupName } : lp))
            );
            toast.success('Ruta actualizada exitosamente');
            handleCloseEditLearningPathModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al actualizar la ruta');
        } finally {
            setIsEditingLearningPath(false);
        }
    };
    // --- FIN Lógica ---


    // Renderizar mensajes de acceso denegado o carga si la autenticación aún no está lista o el rol es incorrecto
    if (!isAuthInitialized) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2, mb: 3 }} />
                        <LearningPathsSkeleton />
                    </motion.div>
                </Box>
            </Container>
        );
    }

    if (!isAuthenticated || user?.userType !== 'Docente') {
        return (
            <Container maxWidth="lg">
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <PageHeader title="Acceso Denegado" />
                    <Alert severity="error" sx={{ mt: 3, mx: 'auto', maxWidth: 400 }}>
                        No tienes permiso para ver esta página. Por favor, inicia sesión como docente.
                    </Alert>
                </Box>
            </Container>
        );
    }


    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 4,
                        flexWrap: 'wrap',
                        gap: 2
                    }}>
                        <Box>
                            <PageHeader title="Mis Rutas de Aprendizaje" />
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{
                                    mt: 1,
                                    maxWidth: 600,
                                    fontSize: '1.1rem'
                                }}
                            >
                                Crea y gestiona las rutas de aprendizaje que asignas a tus grupos.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={handleOpenCreateLearningPathModal}
                            disabled={isLoading || isCreatingLearningPath || !teacherGroups || teacherGroups.length === 0}
                            sx={{
                                minWidth: 150,
                                px: 3,
                                py: 1.2,
                                borderRadius: 2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                '&:hover': {
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                                }
                            }}
                        >
                            Crear Ruta
                        </Button>
                    </Box>
                </motion.div>

                <Box sx={{ mt: 4 }}>
                    <AnimatePresence mode="wait">
                        {isLoading && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <LearningPathsSkeleton />
                            </motion.div>
                        )}

                        {fetchError && !isLoading && (
                            <motion.div
                                key="fetchError"
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
                                    {fetchError}
                                </Alert>
                            </motion.div>
                        )}

                        {!isLoading && !fetchError && teacherGroups?.length === 0 && (
                            <motion.div
                                key="noGroups"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                            >
                                <EmptyState
                                    message="No tienes grupos creados. Debes crear al menos un grupo antes de poder crear Rutas de Aprendizaje."
                                    icon={GroupIcon}
                                    containerProps={{
                                        sx: {
                                            mt: 6,
                                            py: 6,
                                            borderRadius: 3,
                                            backgroundColor: (theme) => alpha(theme.palette.info.main, 0.05),
                                            border: '1px dashed',
                                            borderColor: (theme) => alpha(theme.palette.info.main, 0.2)
                                        }
                                    }}
                                />
                                {groupsLoadingError && <Alert severity="warning" sx={{ mt: 2 }}>Error cargando grupos: {groupsLoadingError}</Alert>}
                            </motion.div>
                        )}

                        {!isLoading && !fetchError && learningPaths.length === 0 && teacherGroups?.length > 0 && (
                            <motion.div
                                key="emptyPaths"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                            >
                                <EmptyState
                                    message="Aún no has creado ninguna Ruta de Aprendizaje. Haz clic en 'Crear Ruta' para empezar."
                                    icon={RouteIcon}
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

                        {!isLoading && !fetchError && learningPaths.length > 0 && (
                            <motion.div
                                key="learningPathsList"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Box sx={{ mt: 4 }}>
                                    {learningPaths.map((path, index) => (
                                        <LearningPathCard
                                            key={path._id}
                                            path={path}
                                            index={index}
                                            onEdit={handleEditLearningPath}
                                            onDelete={handleOpenDeleteDialog}
                                            onNavigate={handleNavigateToManage}
                                        />
                                    ))}
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
            </Box>

            {/* Modal para Crear Ruta de Aprendizaje */}
            <CreateLearningPathModal
                open={isCreateLearningPathModalOpen}
                onClose={handleCloseCreateLearningPathModal}
                onSubmit={handleLearningPathFormSubmit}
                isCreating={isCreatingLearningPath}
                teacherGroups={teacherGroups}
            />
            {/* Modal para Editar Ruta de Aprendizaje */}
            <CreateLearningPathModal
                open={isEditModalOpen}
                onClose={handleCloseEditLearningPathModal}
                onSubmit={handleEditLearningPathFormSubmit}
                isCreating={isEditingLearningPath}
                teacherGroups={teacherGroups}
                initialData={learningPathToEdit}
            />

            {/* Diálogo de Confirmación PREVIA a la Creación de Ruta */}
            <Dialog
                open={isCreateLearningPathConfirmOpen}
                onClose={handleCloseCreateLearningPathConfirm}
                aria-labelledby="create-learning-path-confirm-title"
                aria-describedby="create-learning-path-confirm-description"
            >
                <DialogTitle id="create-learning-path-confirm-title">{"Confirmar Creación de Ruta"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="create-learning-path-confirm-description">
                        ¿Estás seguro de que deseas crear la ruta de aprendizaje "<b>{learningPathDataToCreate?.nombre}</b>" para el grupo "<b>{teacherGroups?.find(g => g._id === learningPathDataToCreate?.group_id)?.nombre || '...'}</b>"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateLearningPathConfirm} disabled={isCreatingLearningPath}>Cancelar</Button>
                    <Button onClick={handleConfirmCreateLearningPath} color="primary" disabled={isCreatingLearningPath} autoFocus>
                        {isCreatingLearningPath ? 'Creando...' : 'Confirmar Creación'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo de Confirmación para Eliminar Ruta de Aprendizaje */}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="delete-learning-path-dialog-title"
            >
                <DialogTitle id="delete-learning-path-dialog-title">
                    Eliminar Ruta de Aprendizaje
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}> {/* Añadir margen inferior al texto */}
                        Para eliminar la ruta <b>{learningPathToDelete?.nombre}</b>, escribe su nombre exacto para confirmar:
                    </DialogContentText>
                    {/* MODIFICADO: Reemplazar <input> por <TextField> */}
                    <TextField
                        fullWidth // Ocupar todo el ancho disponible
                        variant="outlined" // Estilo de borde
                        color='secondary'
                        label="Nombre de la ruta" // Etiqueta flotante
                        value={deleteConfirmationName}
                        onChange={e => setDeleteConfirmationName(e.target.value)}
                        disabled={isDeleting}
                        autoFocus
                        margin="dense" // Margen más compacto
                        error={deleteConfirmationName !== learningPathToDelete?.nombre && deleteConfirmationName !== ''} // Mostrar error si no coincide
                        helperText={deleteConfirmationName !== learningPathToDelete?.nombre && deleteConfirmationName !== '' ? 'El nombre no coincide' : ''} // Texto de ayuda del error
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}color='secondary'>Cancelar</Button>
                    <Button
                        onClick={handleConfirmDeleteLearningPath}
                        color="error"
                        disabled={
                            isDeleting ||
                            !deleteConfirmationName ||
                            deleteConfirmationName !== learningPathToDelete?.nombre
                        }
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default TeacherLearningPathsPage;