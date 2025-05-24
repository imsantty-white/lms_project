// src/pages/TeacherLearningPathsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  Paper,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ListItemButton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

// *** Importar useAuth Y axiosInstance ***
import { useAuth, axiosInstance } from '../contexts/AuthContext'; // <-- Importa axiosInstance aquí

// *** Eliminar la importación de 'axios' si ya no la usas directamente ***
// import axios from 'axios';

// *** Eliminar la importación de API_BASE_URL si axiosInstance ya la tiene configurada ***
// import { API_BASE_URL } from '../utils/constants';

import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importa el componente modal para crear Ruta de Aprendizaje
import CreateLearningPathModal from '../pages/components/CreateLearningPathModal';


function TeacherLearningPathsPage() {
  // *** Obtén isAuthInitialized del hook useAuth ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- Añade isAuthInitialized

  const navigate = useNavigate();
  const [learningPaths, setLearningPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ESTADO PARA GRUPOS DEL DOCENTE
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [groupsLoadingError, setGroupsLoadingError] = useState(null);


  // ESTADOS PARA EL MODAL DE CREAR RUTA Y SU CONFIRMACIÓN
  const [isCreateLearningPathModalOpen, setIsCreateLearningPathModalOpen] = useState(false);
  const [isCreateLearningPathConfirmOpen, setIsCreateLearningPathConfirmOpen] = useState(false);
  const [learningPathDataToCreate, setLearningPathDataToCreate] = useState(null);
  const [isCreatingLearningPath, setIsCreatingLearningPath] = useState(false);

  // ESTADO PARA BORRAR RUTA
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [learningPathToDelete, setLearningPathToDelete] = useState(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

    // ESTADO PARA EDITAR RUTA
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [learningPathToEdit, setLearningPathToEdit] = useState(null);
  const [isEditingLearningPath, setIsEditingLearningPath] = useState(false);

  // Carga las Rutas de Aprendizaje Y los Grupos del docente al montar el componente
  useEffect(() => {
    const fetchData = async () => {
         // No necesitas la verificación de auth/rol aquí dentro, la haremos en la condición del useEffect
         // if (!isAuthenticated || user?.userType !== 'Docente') {
         //    setIsLoading(false);
         //    setError('No tienes permiso para ver esta página.');
         //    return;
         // }

      setIsLoading(true);
      setError(null);
      setGroupsLoadingError(null);

      try {
        // Cargar Rutas de Aprendizaje
        // *** Usar axiosInstance.get en lugar de axios.get ***
        // Nota: si axiosInstance ya tiene baseURL, puedes usar rutas relativas
        const pathsResponse = await axiosInstance.get('/api/learning-paths/my-creations'); // <-- Modificado
        setLearningPaths(pathsResponse.data.data);

        // Cargar Grupos del Docente
        // *** Usar axiosInstance.get en lugar de axios.get ***
        const groupsResponse = await axiosInstance.get('/api/groups/docente/me'); // <-- Modificado
        setTeacherGroups(groupsResponse.data.data);

        // Al cargar ambos con éxito, desactivar carga general
        setIsLoading(false);

      } catch (err) {
        console.error('Error fetching data:', err.response ? err.response.data : err.message);
        // Manejo de errores más granular (mantener tu lógica, ajustando los errores)
        if (err.config?.url?.includes('/my-creations')) { // Usar err.config?.url?.includes para seguridad
          const pathsErrorMessage = err.response?.data?.message || 'Error al cargar tus rutas de aprendizaje.';
          setError(pathsErrorMessage);
          toast.error('Error al cargar rutas de aprendizaje.');
        }
         // Verificar si el error es por acceso denegado al cargar grupos (ej. 401/403)
         // En este caso, el ProtectedRoute debería redirigir, pero como fallback...
         else if (err.config?.url?.includes('/groups/docente/me')) {
          const groupsErrorMessage = err.response?.data?.message || 'Error al cargar tus grupos.';
          setGroupsLoadingError(groupsErrorMessage);
          toast.error('Error al cargar grupos del docente.');
        } else {
          setError('Error al cargar datos.');
          toast.error('Error al cargar datos generales.');
        }
        setIsLoading(false);
      }
    };

    // *** CONDICIÓN CLAVE: Ejecutar el fetch solo si la Auth está inicializada Y autenticado como Docente ***
    if (isAuthInitialized && isAuthenticated && user?.userType === 'Docente') {
        fetchData();
    } else if (isAuthInitialized && !isAuthenticated) {
         // Si la inicialización terminó pero no estamos autenticados,
         // esto no debería pasar si la ruta está protegida por ProtectedRoute,
         // pero como fallback, seteamos el error y el estado de carga general.
         console.log("Auth inicializada, pero usuario no autenticado. No se cargan datos.");
         setIsLoading(false);
         setError("No estás autenticado para ver esta página."); // O un mensaje más general
         setGroupsLoadingError(null); // Limpiar error de grupos si estaba
     } else if (!isAuthInitialized) {
         // Si la Auth aún no ha terminado de inicializar, no hacemos nada aún,
         // ProtectedRoute mostrará el spinner inicial.
         console.log("Auth aún no inicializada. Esperando para cargar datos.");
         // Mantener isLoading en true (su estado inicial) para que se muestre el spinner.
         // setError/setGroupsLoadingError se mantienen en null (su estado inicial).
     }


    // *** Añadir isAuthInitialized a las dependencias ***
  }, [isAuthenticated, user, isAuthInitialized]); // <-- Añade isAuthInitialized


  // Mensaje de acceso denegado si no es docente/admin (mantener, pero la redirección la maneja ProtectedRoute)
  // Este bloque se ejecutará solo si isAuthInitialized es true y !isAuthenticated
  if (!isAuthenticated || user?.userType !== 'Docente') {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          {/* Mostrar el error específico de la página si existe, si no, el error general de auth */}
          <Typography variant="h6" color="error">{error || 'Debes ser Docente para ver esta página.'}</Typography>
        </Box>
      </Container>
    );
  }


  // --- Lógica para Modal de Crear Ruta y su Confirmación ---

  // Abre el modal de crear ruta
  const handleOpenCreateLearningPathModal = () => {
    // Deshabilita si no tiene grupos para asociar la ruta
    // Asegúrate de que teacherGroups no sea null/undefined ANTES de verificar su longitud
    if (!teacherGroups || teacherGroups.length === 0) {
      toast.warning('Debes crear al menos un grupo antes de crear una Ruta de Aprendizaje.');
      return;
    }
    if (isLoading || isCreatingLearningPath) return; // También verificar isLoading general
    setIsCreateLearningPathModalOpen(true);
  };

  // Cierra el modal de crear ruta (Maneja el reason)
  const handleCloseCreateLearningPathModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsCreateLearningPathModalOpen(false);
    setLearningPathDataToCreate(null);
  };

  // Maneja la presentación del formulario en el modal (recibe los datos del modal hijo CON group_id)
  const handleLearningPathFormSubmit = (formData) => {
    setLearningPathDataToCreate(formData);
    setIsCreateLearningPathConfirmOpen(true);
  };

  // Cierra el diálogo de confirmación previa a la creación
  const handleCloseCreateLearningPathConfirm = () => {
    setIsCreateLearningPathConfirmOpen(false);
    setLearningPathDataToCreate(null);
  };

  // Maneja la confirmación de la creación de la ruta (hace la llamada al backend)
  const handleConfirmCreateLearningPath = async () => {
    // Asegurarse de que hay datos (que ya incluyen group_id)
    if (!learningPathDataToCreate) {
      toast.error('No se pudo crear la ruta. Datos incompletos.');
      handleCloseCreateLearningPathConfirm();
      handleCloseCreateLearningPathModal();
      return;
    }

    setIsCreatingLearningPath(true);

    try {
      const dataToSend = learningPathDataToCreate;

      // *** Usar axiosInstance.post en lugar de axios.post ***
      const response = await axiosInstance.post('/api/learning-paths', dataToSend); // <-- Modificado

      const newLearningPath = response.data;
      toast.success('Ruta de Aprendizaje creada con éxito!');

      setLearningPaths(prevPaths => [...prevPaths, newLearningPath]);

      handleCloseCreateLearningPathConfirm();
      handleCloseCreateLearningPathModal();

    } catch (err) {
      console.error('Error creating learning path:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al intentar crear la ruta de aprendizaje.';
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

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setLearningPathToDelete(null);
    setDeleteConfirmationName('');
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
  
  const handleCloseEditLearningPathModal = () => {
    setIsEditModalOpen(false);
    setLearningPathToEdit(null);
  };

  const handleEditLearningPathFormSubmit = async (formData) => {
    if (!learningPathToEdit) return;
    setIsEditingLearningPath(true);
    try {
      const response = await axiosInstance.put(`/api/learning-paths/${learningPathToEdit._id}`, formData);
      let updated = response.data;

      // Si updated.group_id es un objeto, conviértelo a su _id
      if (updated.group_id && typeof updated.group_id === 'object') {
        updated.group_id = updated.group_id._id;
      }

      setLearningPaths(prev =>
        prev.map(lp => (lp._id === updated._id ? updated : lp))
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


  // Renderizar mensaje si no hay grupos
  if (!isLoading && !error && (!teacherGroups || teacherGroups.length === 0) && learningPaths.length === 0) {
    // Si no hay grupos Y no hay rutas (porque necesitas grupo para crear ruta)
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>Mis Rutas de Aprendizaje</Typography>
          {/* Botón deshabilitado si no hay grupos */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            disabled={true}
            sx={{ mb: 2 }}
          >
            Crear Ruta
          </Button>
          <Alert severity="info">
            No tienes grupos creados. Debes crear un grupo antes de poder crear Rutas de Aprendizaje.
          </Alert>
            {groupsLoadingError && <Alert severity="warning" sx={{ mt: 2 }}>Error cargando grupos: {groupsLoadingError}</Alert>}
        </Box>
      </Container>
    );
  }


  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        {/* --- Encabezado y botón Crear Ruta de Aprendizaje --- */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>Mis Rutas de Aprendizaje</Typography>
            <Typography variant="body1" color="text.secondary"> 
              Gestiona tus rutas de aprendizaje y los contenidos asignados.
            </Typography>
          </Box>
          {/* Botón para crear nueva Ruta de Aprendizaje */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenCreateLearningPathModal}
            // Deshabilita si está cargando, creando, o si no tiene grupos
            disabled={isLoading || isCreatingLearningPath || !teacherGroups || teacherGroups.length === 0}
          >
            Crear Ruta
          </Button>
        </Box>
        {/* --- Fin Encabezado --- */}


        {/* Indicador de carga */}
        {(isLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Mensajes de error */}
        {error && !isLoading && <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>}
        {/* Muestra un error de carga de grupos si ocurrió y no se pudo mostrar el mensaje principal de "no hay grupos" */}
        {groupsLoadingError && !isLoading && teacherGroups?.length === 0 && <Alert severity="warning" sx={{ mt: 2 }}>Error cargando grupos: {groupsLoadingError}</Alert>}


        {/* Mensaje si no hay rutas Y sí hay grupos (para poder crear) */}
        {!isLoading && !error && learningPaths.length === 0 && teacherGroups?.length > 0 && (
          <Alert severity="info" sx={{ mt: 4 }}>
            Aún no has creado ninguna Ruta de Aprendizaje. Haz clic en "Crear Ruta" para empezar.
          </Alert>
        )}


        {!isLoading && !error && learningPaths.length > 0 && (
          <Box sx={{ maxWidth: 'md', mx: 'auto', mt: 3 }}>
            <List sx={{ width: '100%', p: 0 }}>
              {learningPaths.map((path) => (
                <Paper key={path._id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Botón edit a la izquierda */}
                    <IconButton
                      edge="end"
                      aria-label="editar"
                      onClick={e => {
                        e.stopPropagation();
                        handleEditLearningPath(path);
                      }}
                      sx={{ ml: 2 }}
                    >
                      <EditIcon />
                    </IconButton>

                    <ListItemButton
                      onClick={() => navigate(`/teacher/learning-paths/${path._id}/manage`)}
                      sx={{ p: 2, flex: 1 }}
                    >
                      <ListItemText
                        primary={<Typography variant="h6">{path.nombre}</Typography>}
                        secondary={
                          <>
                            {/* Mostrar el nombre del grupo al que pertenece la ruta */}
                            {path.group_id && teacherGroups && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                                Grupo: {teacherGroups.find(g => g._id === path.group_id)?.nombre || 'Cargando...'}
                              </Typography>
                            )}
                            {path.descripcion && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {path.descripcion}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItemButton>

                    {/* Botón borrar a la derecha */}
                    <IconButton
                      edge="start"
                      aria-label="eliminar"
                      color="error"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenDeleteDialog(path);
                      }}
                      sx={{ mr: 2 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* Modal para Crear Ruta de Aprendizaje */}
      <CreateLearningPathModal
        open={isCreateLearningPathModalOpen}
        onClose={handleCloseCreateLearningPathModal}
        onSubmit={handleLearningPathFormSubmit}
        isCreating={isCreatingLearningPath}
        teacherGroups={teacherGroups} // <-- ¡Pasamos la lista de grupos al modal!
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
            ¿Estás seguro de que deseas crear la ruta de aprendizaje "{learningPathDataToCreate?.nombre}" para el grupo "{teacherGroups?.find(g => g._id === learningPathDataToCreate?.group_id)?.nombre || '...'}"? {/* <-- Mensaje de confirmación más detallado */}
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
          <DialogContentText>
            Para eliminar la ruta <b>{learningPathToDelete?.nombre}</b>, escribe su nombre exacto para confirmar:
          </DialogContentText>
          <input
            type="text"
            value={deleteConfirmationName}
            onChange={e => setDeleteConfirmationName(e.target.value)}
            style={{ width: '100%', marginTop: 16, padding: 8, fontSize: 16 }}
            disabled={isDeleting}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancelar</Button>
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