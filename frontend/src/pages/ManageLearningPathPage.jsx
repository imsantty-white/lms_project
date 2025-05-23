// src/pages/ManageLearningPathPage.jsx
import React, {useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// Componentes de Material UI
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  FormControl, 
  InputLabel,
  Chip,
  Divider
  // Importa componentes adicionales si los necesitas (ej: para el modal de asignación)
} from '@mui/material';

// Iconos de Material UI
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// EditIcon, DeleteIcon, CheckCircleOutlineIcon, DescriptionIcon, LinkIcon, PlayCircleOutlinedIcon, AssignmentIcon, QuizIcon, QuestionAnswerIcon, WorkIcon are now primarily used in sub-components
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
// format is now primarily used in AssignmentItem

// *** Importar useAuth Y axiosInstance ***
import { useAuth, axiosInstance } from '../contexts/AuthContext';


import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importa los componentes modales (revisa tus rutas)
import CreateModuleModal from '../pages/components/CreateModuleModal';
import CreateThemeModal from '../pages/components/CreateThemeModal';
import EditModuleModal from '../pages/components/EditModuleModal';
import EditThemeModal from '../pages/components/EditThemeModal';
import AddContentAssignmentModal from '../pages/components/AddContentAssignmentModal';
import EditContentAssignmentModal from '../pages/components/EditContentAssignmentModal';

// Import new sub-components
import ModuleItem from '../pages/components/ModuleItem';
// ThemeItem and AssignmentItem will be used by ModuleItem


function ManageLearningPathPage() {
  const { pathId } = useParams();
  // *** Obtén isAuthInitialized del hook useAuth ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- Añade isAuthInitialized
  const navigate = useNavigate();

  const [learningPath, setLearningPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para controlar qué Accordion de módulo está expandido (mantener)
  const [expandedModule, setExpandedModule] = useState(false);
  const handleModuleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedModule(isExpanded ? panel : false);
  };

  // Estado para controlar qué Accordion de tema está expandido (mantener)
  const [expandedTheme, setExpandedTheme] = useState({});
  const handleThemeAccordionChange = (themeId) => (event, isExpanded) => {
    setExpandedTheme(prev => ({ ...prev, [themeId]: isExpanded }));
  };


  // --- ESTADOS PARA MODALES Y OPERACIONES (mantener) ---
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);
  const [isCreateModuleConfirmOpen, setIsCreateModuleConfirmOpen] = useState(false);
  const [moduleDataToCreate, setModuleDataToCreate] = useState(null);
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  const [isCreateThemeModalOpen, setIsCreateThemeModalOpen] = useState(false);
  const [isCreateThemeConfirmOpen, setIsCreateThemeConfirmOpen] = useState(false);
  const [themeDataToCreate, setThemeDataToCreate] = useState(null);
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [selectedModuleIdForTheme, setSelectedModuleIdForTheme] = useState(null);

  const [isAddContentAssignmentModalOpen, setIsAddContentAssignmentModalOpen] = useState(false);
  const [selectedThemeIdForAssignment, setSelectedThemeIdForAssignment] = useState(null);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  const [isNavigateToContentCreationConfirmOpen, setIsNavigateToContentCreationConfirmOpen] = useState(false);

  const [isDeleteModuleConfirmOpen, setIsDeleteModuleConfirmOpen] = useState(false);
  const [moduleIdToDelete, setModuleIdToDelete] = useState(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  const [isDeleteThemeConfirmOpen, setIsDeleteThemeConfirmOpen] = useState(false);
  const [themeIdToDelete, setThemeIdToDelete] = useState(null);
  const [isDeletingTheme, setIsDeletingTheme] = useState(false);

  const [isDeleteAssignmentConfirmOpen, setIsDeleteAssignmentConfirmOpen] = useState(false);
  const [assignmentIdToDelete, setAssignmentIdToDelete] = useState(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);

  const [isEditModuleModalOpen, setIsEditModuleModalOpen] = useState(false);
  const [moduleDataToEdit, setModuleDataToEdit] = useState(null);
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);

  const [isEditThemeModalOpen, setIsEditThemeModalOpen] = useState(false);
  const [themeDataToEdit, setThemeDataToEdit] = useState(null);
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [isUpdatingAssignment, _setIsUpdatingAssignment] = useState(false);

  const [selectedThemeNameForAdd, setSelectedThemeNameForAdd] = useState(''); // Nuevo estado para añadir
  const [selectedThemeNameForEdit, setSelectedThemeNameForEdit] = useState(''); // Nuevo estado para editar  
  // --- FIN ESTADOS PARA MODALES Y OPERACIONES ---

  // Añadir estado para manejar la carga individual al actualizar un estado de asignación
  const [updatingAssignmentStatus, setUpdatingAssignmentStatus] = useState(null); // Guardará el _id de la asignación que se está actualizando
  const [openConfirmStatusDialog, setOpenConfirmStatusDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState({
      assignmentId: null,
      newStatus: '',
      assignmentName: '', // Para mostrar el nombre de la asignación en el diálogo
      themeName: ''      // Para mostrar el nombre del tema en el diálogo
  });

  // Define las opciones de estado permitidas (debe coincidir con el backend)
  const ASSIGNMENT_STATUS_OPTIONS = [
    { value: 'Draft', label: 'Borrador' },
    { value: 'Open', label: 'Abierto' },
    { value: 'Closed', label: 'Cerrado' },
  ];

  // *** FUNCIÓN PARA CAMBIAR EL ESTADO (EL ESTADO DE UN CONTENIDO/ASIGNACION)***
  const handleStatusChange = (assignmentId, newStatus, assignmentName, themeName) => {
      // Almacena los detalles del cambio pendiente
      setPendingStatusChange({ assignmentId, newStatus, assignmentName, themeName });
      // Abre el diálogo de confirmación
      setOpenConfirmStatusDialog(true);
  };

  // --- NUEVA FUNCIÓN PARA EJECUTAR EL CAMBIO DE ESTADO ---
  const executeStatusChange = async () => {
      const { assignmentId, newStatus, _assignmentName, _themeName } = pendingStatusChange;

      // Cierra el diálogo de confirmación inmediatamente
      setOpenConfirmStatusDialog(false);

      // Si por alguna razón los datos no están, salir
      if (!assignmentId || !newStatus) {
          toast.error("Datos incompletos para cambiar el estado.");
          setPendingStatusChange({ assignmentId: null, newStatus: '', assignmentName: '', themeName: '' });
          return;
      }

      console.log(`Confirmado: Intentando cambiar estado de asignación ${assignmentId} a ${newStatus}`);
      setUpdatingAssignmentStatus(assignmentId); // Muestra el spinner de carga

      try {
          // *** LLAMADA AXIOS AL BACKEND ***
          const response = await axiosInstance.put(`/api/learning-paths/assignments/${assignmentId}/status`, { status: newStatus });
          console.log('Estado actualizado en backend:', response.data);

          // *** Lógica para actualizar el estado localmente tras el éxito ***
          setLearningPath(prevLearningPath => {
              const newLearningPath = structuredClone ? structuredClone(prevLearningPath) : JSON.parse(JSON.stringify(prevLearningPath));
              if (newLearningPath && newLearningPath.modules) {
                  newLearningPath.modules.forEach(module => {
                      if (module.themes) {
                          module.themes.forEach(themeItem => {
                              if (themeItem.assignments) {
                                  const assignmentIndex = themeItem.assignments.findIndex(a => a._id === assignmentId);
                                  if (assignmentIndex !== -1) {
                                      themeItem.assignments[assignmentIndex].status = newStatus;
                                  }
                              }
                          });
                      }
                  });
              }
              return newLearningPath;
          });

          // Encuentra el label legible del nuevo estado para el toast
          const _newStatusLabel = ASSIGNMENT_STATUS_OPTIONS.find(o => o.value === newStatus)?.label || newStatus;
          //toast.success(`Estado de "<span class="math-inline">\{assignmentName\}" actualizado a "</span>{newStatusLabel}"`);

      } catch (error) {
          console.error('Error al cambiar estado de asignación:', error.response?.data || error.message);
          const errorMessage = error.response?.data?.message || 'Error al cambiar el estado.';
          toast.error(errorMessage);
      } finally {
          setUpdatingAssignmentStatus(null); // Oculta el spinner de carga
          setPendingStatusChange({ assignmentId: null, newStatus: '', assignmentName: '', themeName: '' }); // Resetear el estado pendiente
      }
  };
  // --- FUNCIÓN PARA CANCELAR EL CAMBIO DE ESTADO ---
  const handleCancelStatusChange = () => {
      setOpenConfirmStatusDialog(false);
      setPendingStatusChange({ assignmentId: null, newStatus: '', assignmentName: '', themeName: '' }); // Resetear el estado pendiente
  };

  // Carga la estructura completa de la Ruta de Aprendizaje
  // *** Esta función es llamada por el useEffect y por otras operaciones de CRUD para recargar ***
  // Envolvemos la función en useCallback para mantener la referencia estable.
  const fetchLearningPathStructure = useCallback(async () => {
    if (!pathId) {
      setIsLoading(false);
      setError('ID de ruta de aprendizaje no proporcionado.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // *** Usar axiosInstance.get en lugar de axios.get ***
      const response = await axiosInstance.get(`/api/learning-paths/${pathId}/structure`);
      setLearningPath(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error(
        'Error fetching learning path structure:',
        err.response ? err.response.data : err.message
      );
      const errorMessage =
        err.response &&
        err.response.data &&
        err.response.data.message
          ? err.response.data.message
          : 'Error al cargar la estructura de la ruta de aprendizaje.';
      setError(errorMessage);
      setIsLoading(false);
      toast.error('Error al cargar la ruta de aprendizaje.');
    }
  }, [pathId]); // Agrega aquí todas las dependencias internas de la función

  // useEffect principal que se encarga de llamar a fetchLearningPathStructure.
  useEffect(() => {
    if (
      isAuthInitialized &&
      isAuthenticated &&
      (user?.userType === 'Docente' || user?.userType === 'Administrador') &&
      pathId
    ) {
      fetchLearningPathStructure();
    } else if (isAuthInitialized && !isAuthenticated) {
      console.log(
        "Auth inicializada, pero usuario no autenticado. No se carga estructura de ruta."
      );
      setIsLoading(false);
      setError("No estás autenticado para ver esta página.");
    } else if (!isAuthInitialized) {
      console.log("Auth aún no inicializada. Esperando para cargar estructura de ruta.");
    }
  }, [isAuthenticated, user, pathId, isAuthInitialized, fetchLearningPathStructure]); // <-- Añade isAuthInitialized


  // Mensaje de acceso denegado / error / no encontrado / cargando (mantener)
  // Este bloque se ejecutará solo si isAuthInitialized es true y !isAuthenticated O si hay un error después de la carga
  if (!isAuthenticated || (user?.userType !== 'Docente' && user?.userType !== 'Administrador')) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error || 'Debes ser Docente o Administrador para ver esta página.'}</Typography>
        </Box>
      </Container>
    );
  }
    // Renderizado de carga, error, no encontrado (mantener)
  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Volver</Button>
        </Box>
      </Container>
    );
  }

  if (!learningPath) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="warning">Ruta de aprendizaje no encontrada.</Alert>
          <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Volver</Button>
        </Box>
      </Container>
    );
  }


  // --- Lógica para Modales y Operaciones (actualiza disabled para todos) ---
  // Combina todos los estados de operación para un disabled global (mantener)
  const isAnyOperationInProgress = isLoading || isCreatingModule || isCreatingTheme || isCreatingAssignment || isDeletingModule || isDeletingTheme || isDeletingAssignment || isUpdatingModule || isUpdatingTheme || isUpdatingAssignment;


  // Lógica Crear Módulo
  const handleOpenCreateModuleModal = () => { if (isAnyOperationInProgress) return; setIsCreateModuleModalOpen(true); };
  const handleCloseCreateModuleModal = (event, reason) => { if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) { return; } setIsCreateModuleModalOpen(false); setModuleDataToCreate(null); };
  const handleModuleFormSubmit = (formData) => { setModuleDataToCreate(formData); setIsCreateModuleConfirmOpen(true); };
  const handleCloseCreateModuleConfirm = () => { setIsCreateModuleConfirmOpen(false); setModuleDataToCreate(null); };
  const handleConfirmCreateModule = async () => {
    if (!moduleDataToCreate || !pathId) { toast.error('No se pudo crear el módulo. Datos incompletos.'); handleCloseCreateModuleConfirm(); handleCloseCreateModuleModal(); return; }
    setIsCreatingModule(true); try {
      // *** Usar axiosInstance.post en lugar de axios.post ***
      const _response = await axiosInstance.post(`/api/learning-paths/${pathId}/modules`, moduleDataToCreate); // <-- Modificado
      toast.success('Módulo creado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseCreateModuleConfirm(); handleCloseCreateModuleModal();
    } catch (err) { console.error('Error creating module:', err.response ? err.response.data : err.message); const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : 'Error al intentar crear el módulo.'; toast.error(errorMessage); } finally { setIsCreatingModule(false); }
  };


  // Lógica Crear Tema
  const handleOpenCreateThemeModal = (moduleId) => { if (isAnyOperationInProgress) return; setSelectedModuleIdForTheme(moduleId); setIsCreateThemeModalOpen(true); };
  const handleCloseCreateThemeModal = (event, reason) => { if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) { return; } setIsCreateThemeModalOpen(false); setThemeDataToCreate(null); setSelectedModuleIdForTheme(null); };
  const handleThemeFormSubmit = (formData) => { setThemeDataToCreate(formData); setIsCreateThemeConfirmOpen(true); };
  const handleCloseCreateThemeConfirm = () => { setIsCreateThemeConfirmOpen(false); setThemeDataToCreate(null); };
  const handleConfirmCreateTheme = async () => {
    if (!themeDataToCreate || !selectedModuleIdForTheme) { toast.error('No se pudo crear el tema. Datos incompletos.'); handleCloseCreateThemeConfirm(); handleCloseCreateThemeModal(); return; }
    setIsCreatingTheme(true); try {
      // *** Usar axiosInstance.post en lugar de axios.post ***
      const _response = await axiosInstance.post(`/api/learning-paths/modules/${selectedModuleIdForTheme}/themes`, themeDataToCreate); // <-- Modificado
      toast.success('Tema creado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseCreateThemeConfirm(); handleCloseCreateThemeModal();
    } catch (err) { console.error('Error creating theme:', err.response ? err.response.data : err.message); const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : 'Error al intentar crear el tema.'; toast.error(errorMessage); } finally { setIsCreatingTheme(false); }
  };


  // --- Lógica para Modal de Añadir Asignación de Contenido ---
  const handleOpenAddContentAssignmentModal = (themeId, themeName) => { if (isAnyOperationInProgress) return; setSelectedThemeIdForAssignment(themeId); setSelectedThemeNameForAdd(themeName); setIsAddContentAssignmentModalOpen(true); };
  const handleCloseAddContentAssignmentModal = (event, reason) => { if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) { return; } setIsAddContentAssignmentModalOpen(false); setSelectedThemeIdForAssignment(null); };
  const handleAssignmentFormSubmit = (assignmentData) => { handleConfirmCreateAssignment(assignmentData); /* Modal is closed inside handleConfirmCreateAssignment */ }; // Llama a confirmación y cierra modal si es exitoso
  const handleConfirmCreateAssignment = async (assignmentData) => {
    if (!assignmentData || !selectedThemeIdForAssignment) { toast.error('No se pudo crear la asignación. Datos incompletos.'); handleCloseAddContentAssignmentModal(); return; } // Cierra si hay error de datos
    setIsCreatingAssignment(true); try {
      // *** Usar axiosInstance.post en lugar de axios.post ***
      const response = await axiosInstance.post(`/api/learning-paths/themes/${selectedThemeIdForAssignment}/assign-content`, assignmentData); // <-- Modificado
      const _newAssignment = response.data;
      toast.success('Contenido asignado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura para ver el nuevo contenido
      handleCloseAddContentAssignmentModal(); // Cierra el modal si todo fue bien
    } catch (err) {
         console.error('Error creating assignment:', err.response ? err.response.data : err.message);
         const errorMessage = err.response?.data?.message || 'Error al intentar asignar el contenido.';
         toast.error(errorMessage);
         // No cerramos el modal aquí en caso de error para que el usuario vea el mensaje y pueda reintentar o cancelar
     } finally {
         setIsCreatingAssignment(false);
     }
  };


  // --- Lógica para la Confirmación de Navegación (Crear Contenido Nuevo) --- (mantener)
  const handleOpenNavigateToContentCreationConfirm = () => { setIsNavigateToContentCreationConfirmOpen(true); };
  const handleCloseNavigateToContentCreationConfirm = () => { setIsNavigateToContentCreationConfirmOpen(false); };
  const handleConfirmNavigateToContentCreation = () => {
    handleCloseNavigateToContentCreationConfirm();
    handleCloseAddContentAssignmentModal(); // Asegúrate de cerrar también el modal de asignación
    navigate('/content-bank');
    toast.info('Puedes crear nuevo contenido en la página del Banco de Contenido.');
  };


  // --- Lógica para Eliminar Módulo ---
  const handleOpenDeleteModuleConfirm = (moduleId) => { if (isAnyOperationInProgress) return; setModuleIdToDelete(moduleId); setIsDeleteModuleConfirmOpen(true); };
  const handleCloseDeleteModuleConfirm = () => { setIsDeleteModuleConfirmOpen(false); setModuleIdToDelete(null); };
  const handleDeleteModule = async () => {
    if (!moduleIdToDelete) { toast.error('No se especificó el módulo a eliminar.'); handleCloseDeleteModuleConfirm(); return; }
    setIsDeletingModule(true); try {
      // *** Usar axiosInstance.delete en lugar de axios.delete ***
      await axiosInstance.delete(`/api/learning-paths/modules/${moduleIdToDelete}`); // <-- Modificado
      toast.success('Módulo eliminado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseDeleteModuleConfirm();
    } catch (err) { console.error('Error deleting module:', err.response ? err.response.data : err.message); const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : 'Error al intentar eliminar el módulo.'; toast.error(errorMessage); } finally { setIsDeletingModule(false); }
  };

  // --- Lógica para Eliminar Tema ---
  const handleOpenDeleteThemeConfirm = (themeId) => { if (isAnyOperationInProgress) return; setThemeIdToDelete(themeId); setIsDeleteThemeConfirmOpen(true); };
  const handleCloseDeleteThemeConfirm = () => { setIsDeleteThemeConfirmOpen(false); setThemeIdToDelete(null); };
  const handleDeleteTheme = async () => {
    if (!themeIdToDelete) { toast.error('No se especificó el tema a eliminar.'); handleCloseDeleteThemeConfirm(); return; }
    setIsDeletingTheme(true); try {
      // *** Usar axiosInstance.delete en lugar de axios.delete ***
      await axiosInstance.delete(`/api/learning-paths/themes/${themeIdToDelete}`); // <-- Modificado
      toast.success('Tema eliminado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseDeleteThemeConfirm();
    } catch (err) { console.error('Error deleting theme:', err.response ? err.response.data : err.message); const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : 'Error al intentar eliminar el tema.'; toast.error(errorMessage); } finally { setIsDeletingTheme(false); }
  };

  // --- Lógica para Eliminar Asignación de Contenido ---
  const handleOpenDeleteAssignmentConfirm = (assignmentId) => { if (isAnyOperationInProgress) return; setAssignmentIdToDelete(assignmentId); setIsDeleteAssignmentConfirmOpen(true); };
  const handleCloseDeleteAssignmentConfirm = () => { setIsDeleteAssignmentConfirmOpen(false); setAssignmentIdToDelete(null); };
  const handleDeleteAssignment = async () => {
    if (!assignmentIdToDelete) { toast.error('No se especificó la asignación a eliminar.'); handleCloseDeleteAssignmentConfirm(); return; }
    setIsDeletingAssignment(true); try {
      // *** Usar axiosInstance.delete en lugar de axios.delete ***
      // NOTA: Revisa la ruta DELETE en tu backend. Anteriormente modificamos la ruta para borrar assignments con /api/content-assignments/:assignmentId
      // Si esa es la ruta correcta ahora, úsala aquí. Si esta ruta '/api/learning-paths/assignments/:assignmentId' sigue siendo la que usas, mantenla.
      await axiosInstance.delete(`/api/learning-paths/assignments/${assignmentIdToDelete}`); // <-- Modificado (verifica la ruta)
      toast.success('Asignación eliminada con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseDeleteAssignmentConfirm();
    } catch (err) { console.error('Error deleting assignment:', err.response ? err.response.data : err.message); const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : 'Error al intentar eliminar la asignación.'; toast.error(errorMessage); } finally { setIsDeletingAssignment(false); }
  };

  // --- Lógica para Editar Módulo ---
  const handleOpenEditModuleModal = (moduleData) => { if (isAnyOperationInProgress) return; setModuleDataToEdit(moduleData); setIsEditModuleModalOpen(true); };
  const handleCloseEditModuleModal = (event, reason) => { // Asegúrate de aceptar 'reason'
      if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return; // No cierres el modal
      }
      setIsEditModuleModalOpen(false); // Actualiza el estado para cerrar el modal
      // ... cualquier otra limpieza de estado ...
  };
  const handleUpdateModuleFormSubmit = async (updatedData) => {
    if (!updatedData?._id) { toast.error('No se pudo actualizar el módulo. ID no proporcionado.'); handleCloseEditModuleModal(); return; } // Cerrar si no hay ID
    setIsUpdatingModule(true); try {
      // *** Usar axiosInstance.put en lugar de axios.put ***
      await axiosInstance.put(`/api/learning-paths/modules/${updatedData._id}`, updatedData); // <-- Modificado
      toast.success('Módulo actualizado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseEditModuleModal(); // Cerrar modal en éxito
    } catch (err) {
         console.error('Error updating module:', err.response ? err.response.data : err.message);
         const errorMessage = err.response?.data?.message || 'Error al intentar actualizar el módulo.';
         toast.error(errorMessage);
         // No cerramos el modal aquí en caso de error
     } finally {
         setIsUpdatingModule(false);
     }
  };

  // --- Lógica para Editar Tema ---
  const handleOpenEditThemeModal = (themeData) => { if (isAnyOperationInProgress) return; setThemeDataToEdit(themeData); setIsEditThemeModalOpen(true); };
  const handleCloseEditThemeModal = (event, reason) => { // Asegúrate de aceptar 'reason'
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
        return; // No cierres el modal
    }
    setIsEditThemeModalOpen(false); // Actualiza el estado para cerrar el modal
    // ... cualquier otra limpieza de estado ...
};
  const handleUpdateThemeFormSubmit = async (updatedData) => {
    if (!updatedData?._id) { toast.error('No se pudo actualizar el tema. ID no proporcionado.'); handleCloseEditThemeModal(); return; } // Cerrar si no hay ID
    setIsUpdatingTheme(true); try {
      // *** Usar axiosInstance.put en lugar de axios.put ***
      await axiosInstance.put(`/api/learning-paths/themes/${updatedData._id}`, updatedData); // <-- Modificado
      toast.success('Tema actualizado con éxito!');
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseEditThemeModal(); // Cerrar modal en éxito
    } catch (err) {
         console.error('Error updating theme:', err.response ? err.response.data : err.message);
         const errorMessage = err.response?.data?.message || 'Error al intentar actualizar el tema.';
         toast.error(errorMessage);
         // No cerramos el modal aquí en caso de error
     } finally {
         setIsUpdatingTheme(false);
     }
  };

  // --- Lógica para Modal de Edición de Asignación de Contenido ---

  // Abre el modal de edición de asignación pasando solo el ID (mantener)
  const handleOpenEditAssignmentModal = (assignmentId, themeName) => {
    if (isAnyOperationInProgress) return;
    setEditingAssignmentId(assignmentId);
    setSelectedThemeNameForEdit(themeName);
    setIsEditAssignmentModalOpen(true);
  };

  // Cierra el modal de edición de asignación (mantener)
  const handleCloseEditAssignmentModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsEditAssignmentModalOpen(false);
    setEditingAssignmentId(null);
  };

  // Función que se llama CUANDO el modal EditContentAssignmentModal TERMINA de actualizar con éxito
  // El modal hijo (EditContentAssignmentModal) debe usar axiosInstance INTERNAMENTE para hacer la llamada PUT
  // y luego llamar a esta función padre al tener éxito.
  const handleAssignmentUpdateSuccess = (updatedAssignmentData) => {
    console.log("Asignación actualizada exitosamente (desde el padre):", updatedAssignmentData);
    toast.success('Asignación actualizada correctamente!');
    // Recargar toda la estructura de la ruta para ver los cambios
    fetchLearningPathStructure(); // Llama a la función que usa axiosInstance.get
    handleCloseEditAssignmentModal(); // Cierra el modal
  };

  // --- FIN Lógica Edición Asignación ---


  // Mensaje de acceso denegado / error / no encontrado / cargando (se mantiene igual)
  if (!isAuthenticated || (user?.userType !== 'Docente' && user?.userType !== 'Administrador')) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error || 'Debes ser Docente o Administrador para ver esta página.'}</Typography>
        </Box>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Volver</Button>
        </Box>
      </Container>
    );
  }

  if (!learningPath) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="warning">Ruta de aprendizaje no encontrada.</Alert>
          <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Volver</Button>
        </Box>
      </Container>
    );
  }


  // --- Renderizar la estructura de la Ruta de Aprendizaje ---
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        {/* Título y Datos de la Ruta */}
        <Typography variant="h4" gutterBottom>
          {learningPath.nombre}
        </Typography>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Información de la Ruta
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {learningPath.descripcion}
          </Typography>

          {learningPath.group_id?.nombre && (
            <Typography variant="body1">
              Grupo: {learningPath.group_id.nombre}
            </Typography>
          )}

          {learningPath.fecha_inicio && (
            <Typography variant="body1" color="text.secondary">
              Inicio: {new Date(learningPath.fecha_inicio).toLocaleDateString()}
            </Typography>
          )}

          {learningPath.fecha_fin && (
            <Typography variant="body1" color="text.secondary">
              Fin: {new Date(learningPath.fecha_fin).toLocaleDateString()}
            </Typography>
          )}
        </Paper>

        {/* --- Renderizar Módulos --- */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Estructura de la Ruta:</Typography>

        {learningPath.modules && learningPath.modules.length > 0 ? (
          <List sx={{ width: '100%', p: 0 }}>
            {learningPath.modules.map((module, moduleIndex) => (
              <ModuleItem
                key={module._id}
                module={module}
                moduleIndex={moduleIndex}
                expanded={expandedModule === `module-${module._id}`}
                onAccordionChange={handleModuleAccordionChange(`module-${module._id}`)}
                onEditModule={handleOpenEditModuleModal}
                onDeleteModule={handleOpenDeleteModuleConfirm}
                onCreateTheme={handleOpenCreateThemeModal}
                // Props for ThemeItem and AssignmentItem
                expandedTheme={expandedTheme}
                handleThemeAccordionChange={handleThemeAccordionChange}
                onEditTheme={handleOpenEditThemeModal}
                onDeleteTheme={handleOpenDeleteThemeConfirm}
                onAddContentAssignment={handleOpenAddContentAssignmentModal}
                onEditAssignment={handleOpenEditAssignmentModal}
                onDeleteAssignment={handleOpenDeleteAssignmentConfirm}
                onStatusChange={handleStatusChange}
                ASSIGNMENT_STATUS_OPTIONS={ASSIGNMENT_STATUS_OPTIONS}
                updatingAssignmentStatus={updatingAssignmentStatus}
                isAnyOperationInProgress={isAnyOperationInProgress}
              />
            ))}
          </List>
        ) : (
          <Alert severity="info"> Esta ruta de aprendizaje aún no tiene módulos. </Alert>
        )}


        {/* Botones de Acción General (Añadir Módulo, etc.) - actualiza disabled para todos */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="contained" startIcon={<AddCircleOutlinedIcon />} onClick={handleOpenCreateModuleModal} disabled={isAnyOperationInProgress}> Añadir Módulo </Button>
        </Stack>


        {/* --- Modales y Diálogos --- */}

        {/* Modal para Crear Módulo */}
        <CreateModuleModal open={isCreateModuleModalOpen} onClose={handleCloseCreateModuleModal} onSubmit={handleModuleFormSubmit} isCreating={isCreatingModule} />
        {/* Diálogo de Confirmación Módulo */}
        <Dialog open={isCreateModuleConfirmOpen} onClose={handleCloseCreateModuleConfirm} aria-labelledby="create-module-confirm-title" aria-describedby="create-module-confirm-description"> <DialogTitle id="create-module-confirm-title">{"Confirmar Creación de Módulo"}</DialogTitle> <DialogContent> <DialogContentText id="create-module-confirm-description"> ¿Estás seguro de que deseas crear el módulo "{moduleDataToCreate?.nombre}" en esta ruta? </DialogContentText> </DialogContent> <DialogActions> <Button onClick={handleCloseCreateModuleConfirm} disabled={isCreatingModule}>Cancelar</Button> <Button onClick={handleConfirmCreateModule} color="primary" disabled={isCreatingModule} autoFocus> {isCreatingModule ? 'Creando...' : 'Confirmar Creación'} </Button> </DialogActions> </Dialog>


        {/* Modal para Crear Tema */}
        <CreateThemeModal open={isCreateThemeModalOpen} onClose={handleCloseCreateThemeModal} onSubmit={handleThemeFormSubmit} isCreating={isCreatingTheme} />
        {/* Diálogo de Confirmación Tema */}
        <Dialog open={isCreateThemeConfirmOpen} onClose={handleCloseCreateThemeConfirm} aria-labelledby="create-theme-confirm-title" aria-describedby="create-theme-confirm-description"> <DialogTitle id="create-theme-confirm-title">{"Confirmar Creación de Tema"}</DialogTitle> <DialogContent> <DialogContentText id="create-theme-confirm-description"> ¿Estás seguro de que deseas crear el tema "{themeDataToCreate?.nombre}" en este módulo? </DialogContentText> </DialogContent> <DialogActions> <Button onClick={handleCloseCreateThemeConfirm} disabled={isCreatingTheme}>Cancelar</Button> <Button onClick={handleConfirmCreateTheme} color="primary" disabled={isCreatingTheme} autoFocus> {isCreatingTheme ? 'Creando...' : 'Confirmar Creación'} </Button> </DialogActions> </Dialog>

        {/* Modal para Añadir Asignación de Contenido */}
        <AddContentAssignmentModal
          open={isAddContentAssignmentModalOpen}
          onClose={handleCloseAddContentAssignmentModal}
          onSubmitAssignment={handleAssignmentFormSubmit}
          onRequestCreateNewContent={handleOpenNavigateToContentCreationConfirm}
          themeName={selectedThemeNameForAdd}
          isAssigning={isCreatingAssignment}
        />

        {/* Diálogo de Confirmación Navegación */}
        <Dialog open={isNavigateToContentCreationConfirmOpen} onClose={handleCloseNavigateToContentCreationConfirm} aria-labelledby="navigate-confirm-title" aria-describedby="navigate-confirm-description"> <DialogTitle id="navigate-confirm-title">{"¿Crear Contenido Nuevo?"}</DialogTitle> <DialogContent> <DialogContentText id="navigate-confirm-description"> Para crear contenido nuevo, debemos ir a la página del Banco de Contenido. ¿Quieres continuar? Perderás el estado actual de este modal de asignación. </DialogContentText> </DialogContent> <DialogActions> <Button onClick={handleCloseNavigateToContentCreationConfirm} disabled={isAnyOperationInProgress}>Cancelar</Button> <Button onClick={handleConfirmNavigateToContentCreation} color="primary" autoFocus disabled={isAnyOperationInProgress}> Sí, ir al Banco </Button> </DialogActions> </Dialog>

        {/* Diálogo de Confirmación para Eliminar Módulo */}
        <Dialog
          open={isDeleteModuleConfirmOpen}
          onClose={handleCloseDeleteModuleConfirm}
          aria-labelledby="delete-module-confirm-title"
          aria-describedby="delete-module-confirm-description"
        >
          <DialogTitle id="delete-module-confirm-title">{"Confirmar Eliminación de Módulo"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-module-confirm-description">
              ¿Estás seguro de que deseas eliminar este módulo?
              **Esta acción también eliminará todos los temas y el contenido asignado dentro de este módulo.**
            </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModuleConfirm} disabled={isAnyOperationInProgress}>Cancelar</Button>
          <Button onClick={handleDeleteModule} color="error" disabled={isAnyOperationInProgress} autoFocus>
            {isDeletingModule ? 'Eliminando...' : 'Confirmar Eliminación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación para Eliminar Tema */}
        <Dialog
          open={isDeleteThemeConfirmOpen}
          onClose={handleCloseDeleteThemeConfirm}
          aria-labelledby="delete-theme-confirm-title"
          aria-describedby="delete-theme-confirm-description"
        >
          <DialogTitle id="delete-theme-confirm-title">{"Confirmar Eliminación de Tema"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-theme-confirm-description">
              ¿Estás seguro de que deseas eliminar este tema?
              **Esta acción también eliminará todo el contenido asignado dentro de este tema.**
            </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteThemeConfirm} disabled={isAnyOperationInProgress}>Cancelar</Button>
          <Button onClick={handleDeleteTheme} color="error" disabled={isAnyOperationInProgress} autoFocus>
            {isDeletingTheme ? 'Eliminando...' : 'Confirmar Eliminación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación para Eliminar Asignación */}
        <Dialog
          open={isDeleteAssignmentConfirmOpen}
          onClose={handleCloseDeleteAssignmentConfirm}
          aria-labelledby="delete-assignment-confirm-title"
          aria-describedby="delete-assignment-confirm-description"
        >
          <DialogTitle id="delete-assignment-confirm-title">{"Confirmar Eliminación de Asignación"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-assignment-confirm-description">
              ¿Estás seguro de que deseas eliminar esta asignación?
              **Esta acción solo eliminará el enlace a este contenido en este tema, no borrará el contenido de tu banco.**
            </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteAssignmentConfirm} disabled={isAnyOperationInProgress}>Cancelar</Button>
          <Button onClick={handleDeleteAssignment} color="error" disabled={isAnyOperationInProgress} autoFocus>
            {isDeletingAssignment ? 'Eliminando...' : 'Confirmar Eliminación'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Diálogo de Confirmación para Cambio de Estado */}
      <Dialog
          open={openConfirmStatusDialog}
          onClose={handleCancelStatusChange}
          aria-labelledby="confirm-status-change-dialog-title"
          aria-describedby="confirm-status-change-dialog-description"
      >
          <DialogTitle id="confirm-status-change-dialog-title">{"Confirmar Cambio de Estado"}</DialogTitle>
          <DialogContent>
              <DialogContentText id="confirm-status-change-dialog-description">
                  ¿Estás seguro de que deseas cambiar el estado de la asignación "
                  <strong>{pendingStatusChange.assignmentName}</strong>" (del tema "
                  <strong>{pendingStatusChange.themeName}</strong>") a "
                  <strong>{ASSIGNMENT_STATUS_OPTIONS.find(o => o.value === pendingStatusChange.newStatus)?.label || pendingStatusChange.newStatus}</strong>"?
                  Esta acción afectará la visibilidad y disponibilidad de la asignación para los estudiantes.
              </DialogContentText>
          </DialogContent>
          <DialogActions>
              <Button onClick={handleCancelStatusChange} color="secondary">
                  Cancelar
              </Button>
              <Button onClick={executeStatusChange} color="primary" autoFocus>
                  Confirmar
              </Button>
          </DialogActions>
      </Dialog>


      {/* Modal para Editar Módulo */}
      <EditModuleModal
        open={isEditModuleModalOpen}
        onClose={handleCloseEditModuleModal}
        onSubmit={handleUpdateModuleFormSubmit}
        initialData={moduleDataToEdit}
        isSaving={isUpdatingModule}
      />

      {/* Modal para Editar Tema */}
      <EditThemeModal
        open={isEditThemeModalOpen}
        onClose={handleCloseEditThemeModal}
        onSubmit={handleUpdateThemeFormSubmit}
        initialData={themeDataToEdit}
        isSaving={isUpdatingTheme}
      />

      {/* --- NUEVO: Modal para Editar Asignación de Contenido --- */}
      <EditContentAssignmentModal
        open={isEditAssignmentModalOpen} // <-- Controlado por el estado
        onClose={handleCloseEditAssignmentModal} // <-- Función para cerrar
        assignmentId={editingAssignmentId} // <-- *** LE PASAS EL ID ***
        themeName={selectedThemeNameForEdit}
        onUpdateSuccess={handleAssignmentUpdateSuccess} // <-- *** LE PASAS LA FUNCIÓN DE ÉXITO ***
        // isUpdating={isUpdatingAssignment} // No necesitas pasar esto si el modal se encarga de su propio estado de guardado
      />


    </Box>
  </Container>
  );
}

export default ManageLearningPathPage;