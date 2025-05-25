// src/pages/StudentViewLearningPathPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button,
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Paper,
  Divider,
  Chip,
  Icon
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import SchoolIcon from '@mui/icons-material/School'; // No se usa directamente, pero puede ser parte de un diseño futuro
import LayersIcon from '@mui/icons-material/Layers';
import ClassIcon from '@mui/icons-material/Class';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline'; // 'Completado'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'; // 'Visto'
import InProgressIcon from '@mui/icons-material/DonutLarge'; // 'En Progreso'
import NotStartedIcon from '@mui/icons-material/RadioButtonUnchecked'; // 'No Iniciado'
// Importa los iconos de contenido
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import WorkIcon from '@mui/icons-material/Work';

// Importar useAuth (ahora incluyendo isAuthInitialized) Y axiosInstance (mantener)
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns'; // Para formatear fechas si es necesario

// Importa tus componentes de modales de contenido/video (mantener)
import ContentModal from '../components/ContentModal';
import VideoModal from '../components/VideoModal';


// Helper para obtener el icono del contenido asociado (se mantiene)
const getContentIcon = (assignment) => {
  const content = assignment.resource_id || assignment.activity_id;
  if (!content) return <AssignmentIcon />; // Icono por defecto si no hay contenido populado

  const subType = content.type;

  if (assignment.type === 'Resource') {
    if (subType === 'Contenido') return <DescriptionIcon />;
    if (subType === 'Enlace') return <LinkIcon />;
    if (subType === 'Video-Enlace') return <PlayCircleOutlinedIcon />;
  }

  if (assignment.type === 'Activity') {
    if (subType === 'Quiz') return <QuizIcon />;
    if (subType === 'Cuestionario') return <QuestionAnswerIcon />;
    if (subType === 'Trabajo') return <WorkIcon />;
  }

  return <AssignmentIcon />;
};

// Traducción de estados de asignación
const translateAssignmentStatus = (status) => {
  if (!status) return 'Desconocido';
  switch (status.toLowerCase()) {
    case 'open': return 'Abierto';
    case 'closed': return 'Cerrado';
    case 'draft': return 'Proximamente';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};


function StudentViewLearningPathPage() {
  const { pathId } = useParams();
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const navigate = useNavigate();

  // Estados para la estructura de la ruta, carga y error (mantener)
  const [learningPathStructure, setLearningPathStructure] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Para la estructura
  const [fetchError, setFetchError] = useState(null);
  const [studentPathProgress, setStudentPathProgress] = useState(null); // Para el progreso del estudiante
  const [isLoadingProgress, setIsLoadingProgress] = useState(false); // Para la carga del progreso

  // Estados para controlar los modales de recursos (se mantienen)
  const [isLinkConfirmOpen, setIsLinkConfirmOpen] = useState(false);
  const [linkToOpen, setLinkToOpen] = useState(null);

  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);


  // Efecto para cargar la estructura de la ruta y el progreso del estudiante
  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && user?.userType === 'Estudiante') {
        const fetchData = async () => {
          if (!pathId) {
            setFetchError('ID de ruta de aprendizaje no proporcionado en la URL.');
            setIsLoading(false);
            return;
          }

          setIsLoading(true);
          setIsLoadingProgress(true); // Iniciar carga de progreso también
          setFetchError(null);

          try {
            // Fetch structure
            const structureResponse = await axiosInstance.get(`/api/learning-paths/${pathId}/structure`);
            console.log("Estructura de ruta de aprendizaje cargada:", structureResponse.data);
            setLearningPathStructure(structureResponse.data);
            setFetchError(null); // Limpiar error si la estructura carga bien

            // Fetch student progress for this path
            try {
              const progressResponse = await axiosInstance.get(`/api/progress/my/${pathId}`);
              console.log("Progreso del estudiante cargado:", progressResponse.data);
              // Asegurarse que se guarda el objeto progress, no el mensaje
              setStudentPathProgress(progressResponse.data.progress || progressResponse.data); 
            } catch (progressErr) {
              console.error('Error fetching student progress:', progressErr.response ? progressErr.response.data : progressErr.message);
              // No se considera un error fatal para la vista de estructura, pero se podría notificar
              toast.warn('No se pudo cargar tu progreso actual para esta ruta.');
              setStudentPathProgress(null); // Asegurar que el progreso sea nulo
            }

          } catch (err) {
            console.error('Error fetching learning path structure:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar la estructura de la ruta de aprendizaje.';
            setFetchError(errorMessage);
            toast.error(errorMessage);
          } finally {
            setIsLoading(false);
            setIsLoadingProgress(false); // Finalizar carga de progreso
          }
        };

        fetchData();

      } else if (isAuthInitialized && (!isAuthenticated || user?.userType !== 'Estudiante')) {
        setFetchError('Debes iniciar sesión como estudiante para ver esta página.');
        setIsLoading(false);
        setIsLoadingProgress(false);
      }
    }
  }, [pathId, isAuthInitialized, isAuthenticated, user]);

  const STATUS_TRANSLATIONS = {
    open: 'Abierto',
    closed: 'Cerrado',
    draft: 'Borrador',
    pending: 'Pendiente',
    submitted: 'Entregado',
    graded: 'Calificado',
    Completado: 'Completado', // Para progreso de temas/módulos
    'En Progreso': 'En Progreso', // Para progreso de temas/módulos
    'No Iniciado': 'No Iniciado', // Para progreso de temas/módulos
    Visto: 'Visto' // Para progreso de temas
  };
  
  const translateStatus = (statusKey) => {
    if (!statusKey) return 'Desconocido';
    return STATUS_TRANSLATIONS[statusKey] || statusKey;
  };

  const getModuleStatus = (moduleId, moduleThemes) => {
    if (!studentPathProgress) return 'No Iniciado';
    const completedModule = studentPathProgress.completed_modules?.find(m => m.module_id === moduleId && m.status === 'Completado');
    if (completedModule) return 'Completado';

    if (studentPathProgress.completed_themes && moduleThemes) {
      const moduleThemeIds = moduleThemes.map(t => t._id);
      const hasRelevantTheme = studentPathProgress.completed_themes.some(ct => moduleThemeIds.includes(ct.theme_id));
      if (hasRelevantTheme) return 'En Progreso';
    }
    return 'No Iniciado';
  };

  const getThemeStatus = (themeId) => {
    if (!studentPathProgress || !studentPathProgress.completed_themes) return 'No Iniciado';
    const themeProgress = studentPathProgress.completed_themes.find(t => t.theme_id === themeId);
    return themeProgress ? themeProgress.status : 'No Iniciado';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completado': return <CheckCircleIcon color="success" />;
      case 'En Progreso': return <InProgressIcon color="info" />;
      case 'Visto': return <VisibilityIcon color="action" />;
      case 'No Iniciado': return <NotStartedIcon color="disabled" />;
      default: return null;
    }
  };


  // --- FUNCIÓN handleContentInteraction (Actualizada) ---
  const handleContentInteraction = (assignment) => {
    if (studentPathProgress?.path_status === 'Completado') {
      toast.info('Has completado esta ruta de aprendizaje. El contenido está bloqueado.');
      return;
    }

    if (assignment.status !== 'Open') {
        toast.info(`Esta asignación no está actualmente disponible (Estado: ${translateAssignmentStatus(assignment.status)}).`);
        return; 
    }
    
    const contentItem = assignment.resource_id || assignment.activity_id;

    if (!contentItem) {
      toast.error("Detalles del contenido no disponibles.");
      console.error("Intento de interacción con asignación sin contenido populado:", assignment);
      return;
    }

    if (assignment.type === 'Resource') {
      switch (contentItem.type) {
        case 'Enlace':
          if (contentItem.link_url) {
            setLinkToOpen(contentItem.link_url);
            setIsLinkConfirmOpen(true);
          } else {
            toast.warning("Enlace no especificado para este recurso.");
          }
          break;
        case 'Video-Enlace':
          if (contentItem.video_url) {
            setCurrentVideo({ title: contentItem.title, videoUrl: contentItem.video_url });
            setIsVideoModalOpen(true);
          } else {
            toast.warning("Enlace de video no especificado para este recurso.");
          }
          break;
        case 'Contenido':
          if (contentItem.content_body) {
            setCurrentContent({ title: contentItem.title, contentBody: contentItem.content_body });
            setIsContentModalOpen(true);
          } else {
            toast.warning("Cuerpo de contenido no especificado para este recurso.");
          }
          break;
        default:
          toast.warning(`Tipo de recurso desconocido: ${contentItem.type}`);
          console.warn("Tipo de recurso desconocido:", contentItem);
      }
    } else if (assignment.type === 'Activity') {
      switch (contentItem.type) {
        case 'Quiz':
        case 'Cuestionario':
        case 'Trabajo':
            // Navegar a la página de actividad (el backend ya verifica el estado allí)
            navigate(`/student/assignments/${assignment._id}/take-activity`);
            break;
        default:
          toast.warning(`Tipo de actividad desconocido: ${contentItem.type}`);
          console.warn("Tipo de actividad desconocido:", contentItem);
          break;
      }
    } else {
      toast.warning(`Tipo de asignación desconocido: ${assignment.type}`);
      console.warn("Tipo de asignación desconocido:", assignment);
    }
  };
  // --- FIN FUNCIÓN handleContentInteraction ---

  // Resto de funciones (handleCloseLinkConfirm, handleCloseContentModal, handleCloseVideoModal) se mantienen sin cambios
  const handleConfirmOpenLink = () => {
    if (linkToOpen) {
      window.open(linkToOpen, '_blank');
      toast.success('Enlace abierto.');
    }
    handleCloseLinkConfirm();
  };

  const handleCloseLinkConfirm = (event, reason) => {
      if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return;
      }
      setIsLinkConfirmOpen(false);
      setLinkToOpen(null);
  };

  const handleCloseContentModal = () => {
      setIsContentModalOpen(false);
      setCurrentContent(null);
  };

  const handleCloseVideoModal = () => {
      setIsVideoModalOpen(false);
      setCurrentVideo(null);
  };


  // --- Renderizado de la Página (mantener) ---

  // Mostrar estado de carga (considerando ambas cargas si es estudiante)
  if (isLoading || (user?.userType === 'Estudiante' && isLoadingProgress)) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            {isLoading ? 'Cargando estructura de la ruta...' : 'Cargando tu progreso...'}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Mostrar error de carga principal o acceso denegado
  if (fetchError && !learningPathStructure) { // Solo error fatal si no hay estructura
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="error">{fetchError}</Alert>
        </Box>
      </Container>
    );
  }

  // Si learningPathStructure es null/undefined
  if (!learningPathStructure) {
      return (
        <Container>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">No se pudo cargar la ruta de aprendizaje o no existe.</Typography>
          </Box>
        </Container>
    );
  }


  // Renderizar la estructura completa de la ruta
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        {/* Título de la Ruta de Aprendizaje */}
        <Typography variant="h4" gutterBottom>
          {learningPathStructure.nombre}
          {learningPathStructure.group_id?.nombre && (
            <Typography variant="h5" color="text.secondary" component="span" sx={{ ml: 1 }}>
              ({learningPathStructure.group_id.nombre})
            </Typography>
          )}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {learningPathStructure.descripcion || 'Sin descripción.'}
        </Typography>

        {/* Alerta de Ruta Completada */}
        {user?.userType === 'Estudiante' && studentPathProgress?.path_status === 'Completado' && (
          <Alert severity="success" icon={<LockIcon fontSize="inherit" />} sx={{ mb: 2 }}>
            ¡Felicidades! Has completado esta ruta de aprendizaje. Todo el contenido está ahora bloqueado.
          </Alert>
        )}

        {/* Lista de Módulos */}
        <Stack spacing={2}>
          {learningPathStructure.modules.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Esta ruta no tiene módulos definidos.</Typography>
          ) : (
            learningPathStructure.modules.map((module) => {
              const moduleStatus = user?.userType === 'Estudiante' ? getModuleStatus(module._id, module.themes) : 'No Aplicable';
              return (
                <Accordion key={module._id} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {user?.userType === 'Estudiante' ? getStatusIcon(moduleStatus) || <LayersIcon color="primary" /> : <LayersIcon color="primary" />}
                    </ListItemIcon>
                    <Typography variant="h5" sx={{ flexGrow: 1 }}>Módulo {module.orden}: {module.nombre}</Typography>
                    {user?.userType === 'Estudiante' && (
                      <Chip label={translateStatus(moduleStatus)} size="small" />
                    )}
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{module.descripcion || 'Sin descripción.'}</Typography>

                    {/* Lista de Temas dentro del Módulo */}
                    <List dense>
                      {module.themes && module.themes.length > 0 ? (
                        module.themes.map((themeItem, themeIndex) => {
                          const themeStatus = user?.userType === 'Estudiante' ? getThemeStatus(themeItem._id) : 'No Aplicable';
                          return (
                            <React.Fragment key={themeItem._id}>
                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                                {/* Columna izquierda para el tema */}
                                <Box sx={{
                                  flex: { xs: '1', md: '0 0 35%' }, // Ajustar para dar más espacio si es necesario
                                  pr: { xs: 0, md: 2 },
                                  borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
                                  display: 'flex', // Para alinear icono y texto
                                  alignItems: 'center', // Alinear verticalmente
                                }}>
                                  <ListItemIcon sx={{ minWidth: 30, mr: 0.5 }}> {/* Reducir margen del icono */}
                                     {user?.userType === 'Estudiante' ? getStatusIcon(themeStatus) || <ClassIcon /> : <ClassIcon />}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={<Typography variant="h6" component="span">Tema {themeItem.orden}: {themeItem.nombre}</Typography>}
                                    secondary={
                                      <>
                                        {themeItem.descripcion || 'Sin descripción.'}
                                        {user?.userType === 'Estudiante' && (
                                          <Chip label={translateStatus(themeStatus)} size="small" sx={{ ml: 1, mt: 0.5 }} />
                                        )}
                                      </>
                                    }
                                  />
                                </Box>

                                {/* Columna derecha para las asignaciones */}
                            <Box sx={{
                              flex: { xs: '1', md: '0 0 65%' },
                              pl: { xs: 0, md: 2 },
                              mt: { xs: 2, md: 0 }
                            }}>
                              {/* Lista de Asignaciones de Contenido dentro del Tema */}
                              <List dense>
                                {themeItem.assignments && themeItem.assignments.length > 0 ? (
                                  themeItem.assignments.map((assignment, assignmentIndex) => {
                                    const contentItem = assignment.resource_id || assignment.activity_id;

                                  return (
                                    <ListItem key={assignment._id} sx={{ pl: { xs: 0, md: 1 }}}> {/* Ajustar padding para items */}
                                      <ListItemButton
                                        onClick={() => handleContentInteraction(assignment)}
                                        disabled={user?.userType === 'Estudiante' && studentPathProgress?.path_status === 'Completado'}
                                      >
                                        <ListItemIcon sx={{ minWidth: 35 }}>{getContentIcon(assignment)}</ListItemIcon>
                                        <ListItemText
                                          primary={<Typography variant="subtitle1">{contentItem?.title || 'Contenido no encontrado'}</Typography>}
                                          secondary={
                                            <Box component="span">
                                              <Typography variant="body2" color="text.secondary">Tipo: {contentItem?.type || 'N/A'}</Typography>
                                              {assignment.fecha_inicio && (
                                                <Typography variant="body2" color="text.secondary">Inicio: {format(new Date(assignment.fecha_inicio), 'dd/MM/yyyy HH:mm')}</Typography>
                                              )}
                                              {assignment.fecha_fin && (
                                                <Typography variant="body2" color="text.secondary">Fin: {format(new Date(assignment.fecha_fin), 'dd/MM/yyyy HH:mm')}</Typography>
                                              )}
                                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                                                {assignment.puntos_maximos !== undefined && (
                                                  <Chip label={`Pts: ${assignment.puntos_maximos}`} size="small" variant="outlined" />
                                                )}
                                                {assignment.intentos_permitidos !== undefined && (
                                                  <Chip label={`Intentos: ${assignment.intentos_permitidos}`} size="small" variant="outlined" />
                                                )}
                                                {assignment.tiempo_limite !== undefined && (
                                                  <Chip label={`Tiempo: ${assignment.tiempo_limite} min`} size="small" variant="outlined" />
                                                )}
                                                {assignment.status && (
                                                  <Chip
                                                    label={`${translateAssignmentStatus(assignment.status)}`}
                                                    size="small"
                                                    variant="filled"
                                                    color={assignment.status === 'Open' ? 'success' : assignment.status === 'Closed' ? 'error' : 'default'}
                                                  />
                                                )}
                                              </Stack>
                                            </Box>
                                          }
                                        />
                                      </ListItemButton>
                                    </ListItem>
                                  );
                                })
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: { xs: 0, md: 1 } }}>
                                  Este tema no tiene contenido asignado.
                                </Typography>
                              )}
                            </List>
                          </Box>
                        </Box>
                        {themeIndex < module.themes.length - 1 && <Divider sx={{ mb: 2 }} />}
                      </React.Fragment>
                      );
                    })
                    ) : (
                    <Typography variant="body2" color="text.secondary">Este módulo no tiene temas definidos.</Typography>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
              );
            })
          )}
        </Stack>

        {/* --- Modal de Confirmación para abrir Enlace (mantener) --- */}
          <Dialog
            open={isLinkConfirmOpen}
            onClose={handleCloseLinkConfirm}
            aria-labelledby="link-confirm-title"
            aria-describedby="link-confirm-description"
          >
            <DialogTitle id="link-confirm-title">{"Abrir Enlace Externo"}</DialogTitle>
            <DialogContent>
              <DialogContentText id="link-confirm-description">
                Estás a punto de abrir un enlace externo. ¿Deseas continuar?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseLinkConfirm} color='secondary'>Cancelar</Button>
              <Button onClick={handleConfirmOpenLink} variant="contained" autoFocus>
                Abrir Enlace
              </Button>
          </DialogActions>
        </Dialog>
      {/* --- Fin Modal Confirmación Enlace --- */}

         {/* --- Modales para mostrar contenido de Recursos (mantener) --- */}

        {/* Modal para Contenido de Texto/HTML */}
        <ContentModal
          open={isContentModalOpen}
          onClose={handleCloseContentModal}
          title={currentContent?.title}
          contentBody={currentContent?.contentBody}
        />

        {/* Modal para Video-Enlaces */}
        <VideoModal
          open={isVideoModalOpen}
          onClose={handleCloseVideoModal}
          title={currentVideo?.title}
          videoUrl={currentVideo?.videoUrl}
        />


      </Box>
    </Container>
  );
}

export default StudentViewLearningPathPage;