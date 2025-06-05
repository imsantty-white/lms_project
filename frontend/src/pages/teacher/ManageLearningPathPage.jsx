// src/pages/ManageLearningPathPage.jsx
import React, { useCallback, useEffect, useState, useReducer } from 'react';
import { useParams } from 'react-router-dom';
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
  Divider,
  Skeleton,
  Tooltip 
  // Importa componentes adicionales si los necesitas (ej: para el modal de asignación)
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { motion } from 'framer-motion'; 
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// EditIcon, DeleteIcon, CheckCircleOutlineIcon, DescriptionIcon, LinkIcon, PlayCircleOutlinedIcon, AssignmentIcon, QuizIcon, QuestionAnswerIcon, WorkIcon are now primarily used in sub-components
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
// format is now primarily used in AssignmentItem

// *** Importar useAuth Y axiosInstance ***
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importa los componentes modales (revisa tus rutas)
import CreateModuleModal from '../components/CreateModuleModal';
import CreateThemeModal from '../components/CreateThemeModal';
// import EditModuleModal from '../components/EditModuleModal'; // Removed
import EditThemeModal from '../components/EditThemeModal';
import AddContentAssignmentModal from '../components/AddContentAssignmentModal';
import EditContentAssignmentModal from '../components/EditContentAssignmentModal';

// Import new sub-components
import ModuleItem from '../components/ModuleItem';
// ThemeItem and AssignmentItem will be used by ModuleItem



// --- BEGIN Reducer and Initial State for Module Modals ---
const initialModuleModalState = {
  isCreateModuleModalOpen: false,
  isEditModuleModalOpen: false,
  isDeleteModuleConfirmOpen: false,
  moduleToEdit: null, // Stores the module data for editing
  moduleIdToDelete: null, // Stores the ID of the module to delete
  isCreatingModule: false,
  isUpdatingModule: false,
  isDeletingModule: false,
  // moduleDataToCreate is handled by its own useState because it's set by form submission
};

function moduleModalReducer(state, action) {
  switch (action.type) {
    case 'OPEN_CREATE_MODULE_MODAL':
      return { ...state, isCreateModuleModalOpen: true };
    case 'CLOSE_CREATE_MODULE_MODAL':
      return { ...state, isCreateModuleModalOpen: false }; // moduleDataToCreate reset is handled in the handler
    case 'OPEN_EDIT_MODULE_MODAL':
      // Now opens CreateModuleModal in edit mode
      return { ...state, isCreateModuleModalOpen: true, moduleToEdit: action.payload };
    case 'CLOSE_EDIT_MODULE_MODAL':
      // Now closes CreateModuleModal and clears moduleToEdit
      return { ...state, isCreateModuleModalOpen: false, moduleToEdit: null };
    case 'OPEN_DELETE_MODULE_CONFIRM':
      return { ...state, isDeleteModuleConfirmOpen: true, moduleIdToDelete: action.payload };
    case 'CLOSE_DELETE_MODULE_CONFIRM':
      return { ...state, isDeleteModuleConfirmOpen: false, moduleIdToDelete: null };
    case 'SET_MODULE_ACTION_LOADING':
      return { ...state, [action.payload.actionType]: action.payload.isLoading };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}
// --- END Reducer and Initial State for Module Modals ---


function ManageLearningPathPage() {
  const { pathId } = useParams();
  // *** Obtén isAuthInitialized del hook useAuth ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- Añade isAuthInitialized
  const navigate = useNavigate();
  const theme = useTheme(); // Get theme object

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
  // Module Modal States managed by useReducer
  const [moduleModalState, dispatchModuleModal] = useReducer(moduleModalReducer, initialModuleModalState);

  // State for the confirmation dialog of module creation (can be refactored later if needed)
  const [isCreateModuleConfirmOpen, setIsCreateModuleConfirmOpen] = useState(false);
  const [moduleDataToCreate, setModuleDataToCreate] = useState(null);
  // isCreatingModule is now in moduleModalState.isCreatingModule

  const [isCreateThemeModalOpen, setIsCreateThemeModalOpen] = useState(false);
  const [isCreateThemeConfirmOpen, setIsCreateThemeConfirmOpen] = useState(false);
  const [themeDataToCreate, setThemeDataToCreate] = useState(null);
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [selectedModuleIdForTheme, setSelectedModuleIdForTheme] = useState(null);

  const [isAddContentAssignmentModalOpen, setIsAddContentAssignmentModalOpen] = useState(false);
  const [selectedThemeIdForAssignment, setSelectedThemeIdForAssignment] = useState(null);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  const [isNavigateToContentCreationConfirmOpen, setIsNavigateToContentCreationConfirmOpen] = useState(false);

  // isDeleteModuleConfirmOpen, moduleIdToDelete, isDeletingModule are in moduleModalState

  const [isDeleteThemeConfirmOpen, setIsDeleteThemeConfirmOpen] = useState(false);
  const [themeIdToDelete, setThemeIdToDelete] = useState(null);
  const [isDeletingTheme, setIsDeletingTheme] = useState(false);

  const [isDeleteAssignmentConfirmOpen, setIsDeleteAssignmentConfirmOpen] = useState(false);
  const [assignmentIdToDelete, setAssignmentIdToDelete] = useState(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);

  // isEditModuleModalOpen, moduleDataToEdit, isUpdatingModule are in moduleModalState

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
      const { assignmentId, newStatus, assignmentName, themeName } = pendingStatusChange;
      setOpenConfirmStatusDialog(false);

      if (!assignmentId || !newStatus) {
          toast.error("Datos incompletos para cambiar el estado.");
          setPendingStatusChange({ assignmentId: null, newStatus: '', assignmentName: '', themeName: '' });
          return;
      }

      setUpdatingAssignmentStatus(assignmentId);

      // Actualización optimista
      setLearningPath(prevPath => {
          const newPath = JSON.parse(JSON.stringify(prevPath));
          let updated = false;
          
          newPath.modules?.forEach(module => {
              module.themes?.forEach(theme => {
                  const assignment = theme.assignments?.find(a => a._id === assignmentId);
                  if (assignment) {
                      assignment.status = newStatus;
                      updated = true;
                  }
              });
          });
          
          return updated ? newPath : prevPath;
      });

      try {
          await axiosInstance.put(`/api/learning-paths/assignments/${assignmentId}/status`, { status: newStatus });
          const newStatusLabel = ASSIGNMENT_STATUS_OPTIONS.find(o => o.value === newStatus)?.label || newStatus;
          toast.success(`Estado actualizado a "${newStatusLabel}"!`);
      } catch (error) {
          console.error('Error al cambiar estado:', error);
          const errorMessage = error.response?.data?.message || 'Error al cambiar el estado.';
          toast.error(`Error: ${errorMessage}`);
          
          // Revertir actualización optimista
          setLearningPath(prevPath => {
              const newPath = JSON.parse(JSON.stringify(prevPath));
              newPath.modules?.forEach(module => {
                  module.themes?.forEach(theme => {
                      const assignment = theme.assignments?.find(a => a._id === assignmentId);
                      if (assignment) {
                          assignment.status = pendingStatusChange.originalStatus;
                      }
                  });
              });
              return newPath;
          });
      } finally {
          setUpdatingAssignmentStatus(null);
          setPendingStatusChange({ assignmentId: null, newStatus: '', assignmentName: '', themeName: '' });
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
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4">
            <Skeleton width="60%" />
          </Typography>
          
          <Skeleton variant="rectangular" width="100%" height={118} sx={{ mt: 2, mb: 3 }} />
          
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            <Skeleton width="40%" />
          </Typography>
          
          <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 1 }} />
          
          {/* Skeletons for action buttons at the bottom */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Skeleton variant="rounded" width={150} height={36} />
          </Stack>
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
  const isAnyOperationInProgress = isLoading || moduleModalState.isCreatingModule || isCreatingTheme || isCreatingAssignment || moduleModalState.isDeletingModule || isDeletingTheme || isDeletingAssignment || moduleModalState.isUpdatingModule || isUpdatingTheme || isUpdatingAssignment;


  // Lógica Crear Módulo
  const handleOpenCreateModuleModal = () => { if (isAnyOperationInProgress) return; dispatchModuleModal({ type: 'OPEN_CREATE_MODULE_MODAL' }); };
  const handleCloseCreateModuleModal = (event, reason) => { if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) { return; } dispatchModuleModal({ type: 'CLOSE_CREATE_MODULE_MODAL' }); setModuleDataToCreate(null); };
  const handleModuleFormSubmit = (formData) => { setModuleDataToCreate(formData); setIsCreateModuleConfirmOpen(true); }; // Confirmation step remains separate for now
  const handleCloseCreateModuleConfirm = () => { setIsCreateModuleConfirmOpen(false); setModuleDataToCreate(null); };
  const handleConfirmCreateModule = async () => {
    if (!moduleDataToCreate || !pathId) {
      toast.error('No se pudo crear el módulo. Datos incompletos.');
      handleCloseCreateModuleConfirm();
      dispatchModuleModal({ type: 'CLOSE_CREATE_MODULE_MODAL' });
      return;
    }

    dispatchModuleModal({ type: 'SET_MODULE_ACTION_LOADING', payload: { actionType: 'isCreatingModule', isLoading: true } });
    handleCloseCreateModuleConfirm();

    const tempId = `temp-${Date.now()}`;
    const optimisticModule = {
      _id: tempId,
      nombre: moduleDataToCreate.nombre,
      descripcion: moduleDataToCreate.descripcion,
      orden: (learningPath.modules?.length || 0) + 1,
      themes: [],
      isOptimistic: true,
    };

    // Actualización optimista
    setLearningPath(prevPath => ({
      ...prevPath,
      modules: [...(prevPath.modules || []), optimisticModule]
    }));
    
    dispatchModuleModal({ type: 'CLOSE_CREATE_MODULE_MODAL' });

    try {
      const response = await axiosInstance.post(`/api/learning-paths/${pathId}/modules`, moduleDataToCreate);
      const actualModule = response.data;

      // Actualizar con datos reales
      setLearningPath(prevPath => ({
        ...prevPath,
        modules: prevPath.modules.map(m => 
          m._id === tempId ? actualModule : m
        ).sort((a, b) => a.orden - b.orden)
      }));

      toast.success(`Módulo "${actualModule.nombre}" creado con éxito!`);
    } catch (err) {
      console.error('Error creating module:', err);
      const errorMessage = err.response?.data?.message || 'Error al intentar crear el módulo.';
      toast.error(`Error al crear módulo "${moduleDataToCreate.nombre}": ${errorMessage}`);

      // Revertir actualización optimista
      setLearningPath(prevPath => ({
        ...prevPath,
        modules: prevPath.modules.filter(m => m._id !== tempId)
      }));
    } finally {
      dispatchModuleModal({ type: 'SET_MODULE_ACTION_LOADING', payload: { actionType: 'isCreatingModule', isLoading: false } });
      setModuleDataToCreate(null);
    }
  };


  // Lógica Crear Tema
  const handleOpenCreateThemeModal = (moduleId) => { if (isAnyOperationInProgress) return; setSelectedModuleIdForTheme(moduleId); setIsCreateThemeModalOpen(true); };
  const handleCloseCreateThemeModal = (event, reason) => { if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) { return; } setIsCreateThemeModalOpen(false); setThemeDataToCreate(null); setSelectedModuleIdForTheme(null); };
  const handleThemeFormSubmit = (formData) => { setThemeDataToCreate(formData); setIsCreateThemeConfirmOpen(true); };
  const handleCloseCreateThemeConfirm = () => { setIsCreateThemeConfirmOpen(false); setThemeDataToCreate(null); };
  const handleConfirmCreateTheme = async () => {
    if (!themeDataToCreate || !selectedModuleIdForTheme) {
      toast.error('No se pudo crear el tema. Datos incompletos.');
      handleCloseCreateThemeConfirm();
      handleCloseCreateThemeModal();
      return;
    }

    setIsCreatingTheme(true);
    const tempId = `temp-${Date.now()}`;
    
    // Actualización optimista
    setLearningPath(prevPath => {
      const newPath = JSON.parse(JSON.stringify(prevPath));
      const module = newPath.modules?.find(m => m._id === selectedModuleIdForTheme);
      if (module) {
        module.themes = [...(module.themes || []), {
          _id: tempId,
          nombre: themeDataToCreate.nombre,
          descripcion: themeDataToCreate.descripcion,
          orden: (module.themes?.length || 0) + 1,
          assignments: [],
          isOptimistic: true
        }];
      }
      return newPath;
    });

    handleCloseCreateThemeConfirm();
    handleCloseCreateThemeModal();

    try {
      const response = await axiosInstance.post(
        `/api/learning-paths/modules/${selectedModuleIdForTheme}/themes`,
        themeDataToCreate
      );
      const createdTheme = response.data;

      // Actualizar con datos reales
      setLearningPath(prevPath => {
        const newPath = JSON.parse(JSON.stringify(prevPath));
        const module = newPath.modules?.find(m => m._id === selectedModuleIdForTheme);
        if (module) {
          module.themes = module.themes.map(t => 
            t._id === tempId ? createdTheme : t
          ).sort((a, b) => a.orden - b.orden);
        }
        return newPath;
      });

      toast.success(`Tema "${createdTheme.nombre}" creado con éxito!`);
    } catch (err) {
      console.error('Error creating theme:', err);
      const errorMessage = err.response?.data?.message || 'Error al intentar crear el tema.';
      toast.error(`Error al crear tema "${themeDataToCreate.nombre}": ${errorMessage}`);

      // Revertir actualización optimista
      setLearningPath(prevPath => {
        const newPath = JSON.parse(JSON.stringify(prevPath));
        const module = newPath.modules?.find(m => m._id === selectedModuleIdForTheme);
        if (module) {
          module.themes = module.themes.filter(t => t._id !== tempId);
        }
        return newPath;
      });
    } finally {
      setIsCreatingTheme(false);
    }
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
      const newAssignment = response.data;
      const assignmentTitle = newAssignment.activity_id?.title || newAssignment.resource_id?.title || 'Contenido sin título';
      toast.success(`Contenido "${assignmentTitle}" asignado a "${selectedThemeNameForAdd}"!`);
      await fetchLearningPathStructure(); // Recargar la estructura para ver el nuevo contenido
      handleCloseAddContentAssignmentModal(); // Cierra el modal si todo fue bien
    } catch (err) {
         console.error('Error creating assignment:', err.response ? err.response.data : err.message);
         const assignmentTitleAttempt = assignmentData.activity_id?.title || assignmentData.resource_id?.title || 'este contenido';
         const errorMessage = err.response?.data?.message || 'Error al intentar asignar el contenido.';
         toast.error(`Error al asignar "${assignmentTitleAttempt}" al tema "${selectedThemeNameForAdd}": ${errorMessage}`);
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
  const handleOpenDeleteModuleConfirm = (moduleId) => { if (isAnyOperationInProgress) return; dispatchModuleModal({ type: 'OPEN_DELETE_MODULE_CONFIRM', payload: moduleId }); };
  const handleCloseDeleteModuleConfirm = () => { dispatchModuleModal({ type: 'CLOSE_DELETE_MODULE_CONFIRM' }); };
  const handleDeleteModule = async () => {
    const moduleId = moduleModalState.moduleIdToDelete;
    if (!moduleId) { toast.error('No se especificó el módulo a eliminar.'); dispatchModuleModal({ type: 'CLOSE_DELETE_MODULE_CONFIRM' }); return; }
    
    const moduleToDelete = learningPath.modules.find(m => m._id === moduleId);
    const moduleName = moduleToDelete ? moduleToDelete.nombre : 'este módulo';

    dispatchModuleModal({ type: 'SET_MODULE_ACTION_LOADING', payload: { actionType: 'isDeletingModule', isLoading: true } });
    try {
      await axiosInstance.delete(`/api/learning-paths/modules/${moduleId}`);
      toast.success(`Módulo "${moduleName}" eliminado con éxito!`);
      await fetchLearningPathStructure(); // Recargar la estructura
      dispatchModuleModal({ type: 'CLOSE_DELETE_MODULE_CONFIRM' });
    } catch (err) { 
      console.error('Error deleting module:', err.response ? err.response.data : err.message); 
      const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : `Error al intentar eliminar el módulo "${moduleName}".`; 
      toast.error(errorMessage); 
    } finally { 
      dispatchModuleModal({ type: 'SET_MODULE_ACTION_LOADING', payload: { actionType: 'isDeletingModule', isLoading: false } });
    }
  };

  // --- Lógica para Eliminar Tema ---
  const handleOpenDeleteThemeConfirm = (themeId) => { if (isAnyOperationInProgress) return; setThemeIdToDelete(themeId); setIsDeleteThemeConfirmOpen(true); };
  const handleCloseDeleteThemeConfirm = () => { setIsDeleteThemeConfirmOpen(false); setThemeIdToDelete(null); };
  const handleDeleteTheme = async () => {
    if (!themeIdToDelete) {
      toast.error('No se especificó el tema a eliminar.');
      handleCloseDeleteThemeConfirm();
      return;
    }

    let originalTheme = null;
    let parentModuleId = null;
    let originalThemeIndex = -1;

    // Find the theme and its context for potential rollback
    learningPath.modules.forEach(module => {
      const themeIndex = module.themes.findIndex(t => t._id === themeIdToDelete);
      if (themeIndex !== -1) {
        // Use deep clone for originalTheme to prevent issues if it's modified elsewhere before rollback
        originalTheme = JSON.parse(JSON.stringify(module.themes[themeIndex]));
        parentModuleId = module._id;
        originalThemeIndex = themeIndex;
      }
    });

    if (!originalTheme) {
      toast.error("Error: Tema no encontrado localmente para eliminación optimista.");
      setIsDeletingTheme(false); // Ensure loading state is reset
      handleCloseDeleteThemeConfirm();
      return;
    }

    // Optimistic UI Update
    setLearningPath(prevLearningPath => {
      const newLearningPath = JSON.parse(JSON.stringify(prevLearningPath));
      const module = newLearningPath.modules.find(m => m._id === parentModuleId);
      if (module) {
        module.themes = module.themes.filter(t => t._id !== themeIdToDelete);
      }
      return newLearningPath;
    });

    handleCloseDeleteThemeConfirm(); // Close modal immediately
    setIsDeletingTheme(true); // Set loading state for API call

    try {
      await axiosInstance.delete(`/api/learning-paths/themes/${themeIdToDelete}`);
      toast.success(`Tema "${originalTheme.nombre}" eliminado con éxito!`);
      // fetchLearningPathStructure(); // Not needed if optimistic update is reliable
    } catch (err) {
      console.error('Error deleting theme:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || `Error al intentar eliminar el tema "${originalTheme.nombre}".`;
      toast.error(errorMessage);

      // Rollback UI Update on error
      if (originalTheme && parentModuleId !== null && originalThemeIndex !== -1) {
        setLearningPath(prevLearningPath => {
          const newLearningPath = JSON.parse(JSON.stringify(prevLearningPath));
          const module = newLearningPath.modules.find(m => m._id === parentModuleId);
          if (module) {
            // Re-insert the theme at its original position or at the end
            module.themes.splice(originalThemeIndex, 0, originalTheme);
            // Optionally re-sort if order is critical and splice isn't enough
            // module.themes.sort((a, b) => a.orden - b.orden); 
          }
          return newLearningPath;
        });
      } else {
        // If rollback data is missing, force a full refresh to correct state
        toast.info("Se recomienda recargar la página para asegurar la consistencia de los datos.");
        // Optionally, trigger fetchLearningPathStructure() here as a last resort if rollback failed badly
        // await fetchLearningPathStructure(); 
      }
    } finally {
      setIsDeletingTheme(false);
    }
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
      
      // For specific toast, find assignment details before deleting
      let assignmentTitle = 'esta asignación';
      let parentThemeName = '';
      if (learningPath && learningPath.modules) {
        for (const module of learningPath.modules) {
          if (module.themes) {
            for (const theme of module.themes) {
              const assignment = theme.assignments.find(a => a._id === assignmentIdToDelete);
              if (assignment) {
                assignmentTitle = assignment.activity_id?.title || assignment.resource_id?.title || 'esta asignación';
                parentThemeName = theme.nombre;
                break;
              }
            }
          }
          if (parentThemeName) break;
        }
      }

      await axiosInstance.delete(`/api/learning-paths/assignments/${assignmentIdToDelete}`);
      toast.success(`Asignación "${assignmentTitle}" eliminada del tema "${parentThemeName}"!`);
      await fetchLearningPathStructure(); // Recargar la estructura
      handleCloseDeleteAssignmentConfirm();
    } catch (err) { 
        const assignmentTitle = 'esta asignación'; // Fallback title
        console.error('Error deleting assignment:', err.response ? err.response.data : err.message); 
        const errorMessage = err.response && err.response.data && err.response.data.message ? err.response.data.message : `Error al intentar eliminar "${assignmentTitle}".`; 
        toast.error(errorMessage); 
    } finally { setIsDeletingAssignment(false); }
  };

  // --- Lógica para Editar Módulo ---
  const handleOpenEditModuleModal = (moduleData) => { if (isAnyOperationInProgress) return; dispatchModuleModal({ type: 'OPEN_EDIT_MODULE_MODAL', payload: moduleData }); };
  const handleCloseEditModuleModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
        return;
    }
    // This dispatch will now close the CreateModuleModal (used for editing) and clear moduleToEdit
    dispatchModuleModal({ type: 'CLOSE_EDIT_MODULE_MODAL' });
  };

  const handleUpdateModuleFormSubmit = async (updatedData) => {
    // updatedData comes from CreateModuleModal and includes _id
    if (!updatedData?._id) {
        toast.error('No se pudo actualizar el módulo. ID no proporcionado.');
        // Ensure modal closes correctly even if there's an early exit.
        // CLOSE_EDIT_MODULE_MODAL will clear moduleToEdit and close the CreateModuleModal.
        dispatchModuleModal({ type: 'CLOSE_EDIT_MODULE_MODAL' });
        return;
    }

    dispatchModuleModal({ type: 'SET_MODULE_ACTION_LOADING', payload: { actionType: 'isUpdatingModule', isLoading: true } });

    const previousLearningPathState = learningPath ? JSON.parse(JSON.stringify(learningPath)) : null; // Deep clone for rollback

    // Refined Optimistic update
    setLearningPath(prevPath => {
        if (!prevPath) return null;
        return {
            ...prevPath,
            modules: prevPath.modules.map(m => {
                if (m._id === updatedData._id) {
                    return {
                        ...m, // Preserve existing module properties (like themes)
                        nombre: updatedData.nombre,
                        descripcion: updatedData.descripcion,
                        isOptimistic: true // Mark as optimistic
                    };
                }
                return m;
            })
        };
    });

    try {
        const { _id, ...dataToUpdate } = updatedData; //nombre, descripcion
        const response = await axiosInstance.put(`/api/learning-paths/modules/${_id}`, dataToUpdate);
        const actualUpdatedModuleFromServer = response.data; // Backend returns the updated module (may not have themes)

        // Update module with server data (which might lack themes, but name/desc are fresh)
        // Then fetch full structure to ensure everything is consistent.
        setLearningPath(prevPath => {
            if (!prevPath) return null;
            return {
                ...prevPath,
                modules: prevPath.modules.map(m =>
                    m._id === actualUpdatedModuleFromServer._id
                    ? { ...m, ...actualUpdatedModuleFromServer, isOptimistic: false } // Merge with existing 'm' to retain themes if server doesn't send them, remove optimistic flag
                    : m
                )
            };
        });

        toast.success(`Módulo "${actualUpdatedModuleFromServer.nombre}" actualizado con éxito!`);
        await fetchLearningPathStructure(); // Fetch full structure to get all details (like themes)

        dispatchModuleModal({ type: 'CLOSE_EDIT_MODULE_MODAL' });
    } catch (err) {
        console.error('Error updating module:', err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.message || `Error al intentar actualizar el módulo "${updatedData.nombre}".`;
        toast.error(errorMessage);
        // Rollback optimistic update using the deep cloned state
        if (previousLearningPathState) {
            setLearningPath(previousLearningPathState);
        }
    } finally {
        dispatchModuleModal({ type: 'SET_MODULE_ACTION_LOADING', payload: { actionType: 'isUpdatingModule', isLoading: false } });
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
    if (!updatedData?._id) {
        toast.error('No se pudo actualizar el tema. ID no proporcionado.');
        handleCloseEditThemeModal(); // Ensure modal closes
        return;
    }

    setIsUpdatingTheme(true);
    const previousLearningPathState = learningPath ? JSON.parse(JSON.stringify(learningPath)) : null; // Deep clone for rollback

    // Optimistic update
    setLearningPath(prevPath => {
        if (!prevPath) return null;
        return {
            ...prevPath,
            modules: prevPath.modules.map(module => ({
                ...module,
                themes: module.themes.map(theme => {
                    if (theme._id === updatedData._id) {
                        return {
                            ...theme, // Spread existing theme to keep its assignments
                            nombre: updatedData.nombre,
                            descripcion: updatedData.descripcion,
                            isOptimistic: true // Mark as optimistic
                        };
                    }
                    return theme;
                })
            }))
        };
    });

    try {
      const { _id, ...dataToUpdate } = updatedData; // nombre, descripcion
      const response = await axiosInstance.put(`/api/learning-paths/themes/${_id}`, dataToUpdate);
      const updatedThemeFromServer = response.data; // Contains updated theme, likely without assignments

      // Update with server data, then fetch full structure
      setLearningPath(prevPath => {
        if (!prevPath) return null;
        return {
            ...prevPath,
            modules: prevPath.modules.map(module => ({
                ...module,
                themes: module.themes.map(theme => {
                    if (theme._id === updatedThemeFromServer._id) {
                        return {
                            ...theme, // Preserve assignments from optimistic/previous state
                            ...updatedThemeFromServer, // Apply server updates (name, desc, order)
                            isOptimistic: false // Remove flag
                        };
                    }
                    return theme;
                })
            }))
        };
      });

      toast.success(`Tema "${updatedThemeFromServer.nombre}" actualizado con éxito!`);
      await fetchLearningPathStructure(); // Recargar la estructura completa
      handleCloseEditThemeModal(); // Cerrar modal en éxito
    } catch (err) {
         console.error('Error updating theme:', err.response ? err.response.data : err.message);
         const errorMessage = err.response?.data?.message || `Error al intentar actualizar el tema "${updatedData.nombre}".`;
         toast.error(errorMessage);
         // Rollback
         if (previousLearningPathState) {
            setLearningPath(previousLearningPathState);
         }
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
    const assignmentTitle = updatedAssignmentData.activity_id?.title || updatedAssignmentData.resource_id?.title || 'La asignación';
    toast.success(`"${assignmentTitle}" actualizada correctamente!`);
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
        <Box >
          <Alert severity="warning">Ruta de aprendizaje no encontrada.</Alert>
          <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Volver</Button>
        </Box>
      </Container>
    );
  }


  // --- Renderizar la estructura de la Ruta de Aprendizaje ---
  return (
    <Container maxWidth="lg" sx={{ py: 3, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}> {/* Added lg, py, background, minHeight */}
      <Box sx={{ mt: 2, mb: 4 }}> {/* Adjusted top margin */}
        {/* Título y Datos de la Ruta */}
        
          <Box
              sx={{
                boxShadow: 2,
                borderRadius: 3,
                bgcolor: 'background.paper',
                p: 3,
                maxWidth: 600,
                mx: 'auto',
                // border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ mb: 1, display: 'block', letterSpacing: 1 }}
              >
                Ruta de Aprendizaje
              </Typography>
              
              <Typography
                variant="h5"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 3, color: 'primary.light',textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
              >
                {learningPath.nombre}
              </Typography>
              
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, lineHeight: 1.6 }}
              >
                {learningPath.descripcion ||
                  "Esta ruta de aprendizaje no tiene una descripción detallada."}
              </Typography>
              
              <Stack spacing={2}>
                {learningPath.group_id?.nombre && (
                  <Chip
                    label={`Grupo: ${learningPath.group_id.nombre}`}
                    variant="filled"
                    color="text.primary"
                    size="medium"
                    sx={{ alignSelf: 'flex-start' }}
                  />
                )}
                
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mt: 2 }}
                >
                  {learningPath.fecha_inicio && (
                    <Chip
                      label={`Inicio: ${new Date(learningPath.fecha_inicio).toLocaleDateString()}`}
                      variant="outlined"
                      size="small"
                      color="success"
                    />
                  )}
                  {learningPath.fecha_fin && (
                    <Chip
                      label={`Fin: ${new Date(learningPath.fecha_fin).toLocaleDateString()}`}
                      variant="outlined"
                      size="small"
                      color="warning"
                    />
                  )}
                </Stack>
              </Stack>
            </Box>

        {/* --- Renderizar Módulos --- */}
        <Box display="flex" flexDirection="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0, mb: 2 }}> {/* Adjusted mb */}
          <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}> {/* Adjusted mb */}
            Estructura de la Ruta:
          </Typography>
          
          {/* Botón de Acción General (Añadir Módulo) */}
          <Tooltip title="Crear Nuevo Módulo">
            <motion.div whileHover={{ scale: 1.03 }} style={{ display: 'inline-block' }}>
              <Button
                variant="contained" // Changed variant
                color="primary" // Changed color
                startIcon={<AddCircleOutlinedIcon />}
                onClick={handleOpenCreateModuleModal}
                disabled={isAnyOperationInProgress}
              >
                Nuevo Módulo
              </Button>
            </motion.div>
          </Tooltip>
        </Box>

        {learningPath.modules && learningPath.modules.length > 0 ? (
          <List sx={{ width: '100%', p: 0, alignItems: 'center', margin: '0 auto' }}>
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


        {/* --- Modales y Diálogos --- */}

        {/* Unified Modal for Creating and Editing Modules */}
        <CreateModuleModal
            open={moduleModalState.isCreateModuleModalOpen}
            onClose={moduleModalState.moduleToEdit ? handleCloseEditModuleModal : handleCloseCreateModuleModal}
            onSubmit={moduleModalState.moduleToEdit ? handleUpdateModuleFormSubmit : handleModuleFormSubmit}
            isCreating={moduleModalState.moduleToEdit ? moduleModalState.isUpdatingModule : moduleModalState.isCreatingModule}
            moduleToEdit={moduleModalState.moduleToEdit}
        />
        {/* Diálogo de Confirmación Módulo Creación (still uses useState for now, only for actual creation) */}
        {!moduleModalState.moduleToEdit && isCreateModuleConfirmOpen && ( // Only show confirm dialog if not in edit mode
            <Dialog open={isCreateModuleConfirmOpen} onClose={handleCloseCreateModuleConfirm} aria-labelledby="create-module-confirm-title" aria-describedby="create-module-confirm-description"> <DialogTitle id="create-module-confirm-title">{"Confirmar Creación de Módulo"}</DialogTitle> <DialogContent> <DialogContentText id="create-module-confirm-description"> ¿Estás seguro de que deseas crear el módulo "{moduleDataToCreate?.nombre}" en esta ruta? </DialogContentText> </DialogContent> <DialogActions> <Button onClick={handleCloseCreateModuleConfirm} disabled={moduleModalState.isCreatingModule}>Cancelar</Button> <Button onClick={handleConfirmCreateModule} color="primary" disabled={moduleModalState.isCreatingModule} autoFocus> {moduleModalState.isCreatingModule ? 'Creando...' : 'Confirmar Creación'} </Button> </DialogActions> </Dialog>
        )}


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
          open={moduleModalState.isDeleteModuleConfirmOpen}
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
          <Button onClick={handleCloseDeleteModuleConfirm} disabled={isAnyOperationInProgress || moduleModalState.isDeletingModule}>Cancelar</Button>
          <Button onClick={handleDeleteModule} color="error" disabled={isAnyOperationInProgress || moduleModalState.isDeletingModule} autoFocus>
            {moduleModalState.isDeletingModule ? 'Eliminando...' : 'Confirmar Eliminación'}
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


      {/* EditModuleModal is no longer used */}

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