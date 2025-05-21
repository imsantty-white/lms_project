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
  Chip
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import LayersIcon from '@mui/icons-material/Layers';
import ClassIcon from '@mui/icons-material/Class';
// Importa los iconos de contenido
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import WorkIcon from '@mui/icons-material/Work';

// Importar useAuth (ahora incluyendo isAuthInitialized) Y axiosInstance (mantener)
import { useAuth, axiosInstance } from '../context/AuthContext';

// Eliminar la importación de axios si ya no la usas directamente (ya lo tenías)
// import axios from 'axios';

// Eliminar la importación de API_BASE_URL si axiosInstance ya la tiene configurada (ya lo tenías)
// import { API_BASE_URL } from '../utils/constants';

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


function StudentViewLearningPathPage() {
  const { pathId } = useParams();
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const navigate = useNavigate();

  // Estados para la estructura de la ruta, carga y error (mantener)
  const [learningPathStructure, setLearningPathStructure] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Estados para controlar los modales de recursos (se mantienen)
  const [isLinkConfirmOpen, setIsLinkConfirmOpen] = useState(false);
  const [linkToOpen, setLinkToOpen] = useState(null);

  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);


  // Efecto para cargar la estructura de la ruta de aprendizaje (mantener)
  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && user?.userType === 'Estudiante') {
        const fetchStructure = async () => {
          if (!pathId) {
            setFetchError('ID de ruta de aprendizaje no proporcionado en la URL.');
            setIsLoading(false);
            return;
          }

          setIsLoading(true);
          setFetchError(null);

          try {
            // *** LLAMADA GET AL BACKEND USANDO axiosInstance ***
            // Asegúrate de que el backend al obtener la estructura POPULE las asignaciones
            // y que esa población incluya el campo 'status' (que debería ser por defecto).
            const response = await axiosInstance.get(`/api/learning-paths/${pathId}/structure`);
            console.log("Estructura de ruta de aprendizaje cargada:", response.data);

            setLearningPathStructure(response.data);
            setFetchError(null);

          } catch (err) {
            console.error('Error fetching learning path structure:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar la estructura de la ruta de aprendizaje.';
            setFetchError(errorMessage);
            toast.error(errorMessage);
          } finally {
            setIsLoading(false);
          }
        };

        fetchStructure();

      } else if (isAuthInitialized && (!isAuthenticated || user?.userType !== 'Estudiante')) {
        // Si auth inicializa pero no es estudiante o no está autenticado
        setFetchError('Debes iniciar sesión como estudiante para ver esta página.');
        setIsLoading(false);
      }
    }
  }, [pathId, isAuthInitialized, isAuthenticated, user]);


  // --- FUNCIÓN handleContentInteraction (AÑADIDA VERIFICACIÓN DE ESTADO) ---
  const handleContentInteraction = (assignment) => {
    // *** AÑADIR VERIFICACIÓN DE ESTADO ***
    if (assignment.status !== 'Open') {
        // Mostrar mensaje al usuario indicando que no está disponible
        toast.info(`Esta asignación no está actualmente disponible (Estado: ${assignment.status}).`);
        return; // Detener la interacción
    }
    // *** Fin Verificación de Estado ***


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

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Cargando estructura de la ruta...</Typography>
        </Box>
      </Container>
    );
  }

  // Mostrar error de carga o acceso denegado
  if (fetchError) {
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
            <Typography variant="h5" color="text.secondary" component="span" sx={{ ml: 2 }}>
              ({learningPathStructure.group_id.nombre})
            </Typography>
          )}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {learningPathStructure.descripcion || 'Sin descripción.'}
        </Typography>

        {/* Lista de Módulos */}
        <Stack spacing={2}>
          {learningPathStructure.modules.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Esta ruta no tiene módulos definidos.</Typography>
          ) : (
            learningPathStructure.modules.map((module) => (
              <Accordion key={module._id} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <ListItemIcon sx={{ minWidth: 40 }}><LayersIcon color="primary" /></ListItemIcon>
                  <Typography variant="h5">Módulo {module.orden}: {module.nombre}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{module.descripcion || 'Sin descripción.'}</Typography>

                  {/* Lista de Temas dentro del Módulo */}
                  <List dense>
                    {module.themes && module.themes.length > 0 ? ( // Corregido: theme.themes → module.themes
                      module.themes.map((themeItem, themeIndex) => (
                        <React.Fragment key={themeItem._id}>
                          {/* Estructura de tema con Grid para alinear a la izquierda y asignaciones a la derecha */}
                          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                            {/* Columna izquierda para el tema */}
                            <Box sx={{
                              flex: { xs: '1', md: '0 0 35%' },
                              pr: { xs: 0, md: 2 },
                              borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
                            }}>
                              <ListItem>
                                <ListItemIcon sx={{ minWidth: 40 }}><ClassIcon /></ListItemIcon>
                                <ListItemText
                                  primary={<Typography variant="h6" component="span">Tema {themeItem.orden}: {themeItem.nombre}</Typography>}
                                  secondary={themeItem.descripcion || 'Sin descripción.'}
                                />
                              </ListItem>
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
                                      <ListItem key={assignment._id}>
                                        <ListItemButton
                                          onClick={() => handleContentInteraction(assignment)}
                                        >
                                          {/* Icono del contenido */}
                                          <ListItemIcon sx={{ minWidth: 40 }}>{getContentIcon(assignment)}</ListItemIcon>
                                          {/* Texto principal: Título del Contenido */}
                                          <ListItemText
                                            primary={<Typography variant="subtitle1">{contentItem?.title || 'Contenido no encontrado'}</Typography>}
                                            secondary={
                                              <Box component="span">
                                                <Typography variant="body2" color="text.secondary">Tipo: {contentItem?.type || 'N/A'}</Typography>
                                                {/* Mostrar fechas si existen */}
                                                {assignment.fecha_inicio && (
                                                  <Typography variant="body2" color="text.secondary">Inicio: {format(new Date(assignment.fecha_inicio), 'dd/MM/yyyy HH:mm')}</Typography>
                                                )}
                                                {assignment.fecha_fin && (
                                                  <Typography variant="body2" color="text.secondary">Fin: {format(new Date(assignment.fecha_fin), 'dd/MM/yyyy HH:mm')}</Typography>
                                                )}
                                                {/* Mostrar detalles de actividad/recurso si aplican */}
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                                  {assignment.puntos_maximos !== undefined && (
                                                    <Chip label={`Pts: ${assignment.puntos_maximos}`} size="small" variant="outlined" />
                                                  )}
                                                  {assignment.intentos_permitidos !== undefined && (
                                                    <Chip label={`Intentos: ${assignment.intentos_permitidos}`} size="small" variant="outlined" />
                                                  )}
                                                  {assignment.tiempo_limite !== undefined && (
                                                    <Chip label={`Tiempo: ${assignment.tiempo_limite} min`} size="small" variant="outlined" />
                                                  )}
                                                  {/* Mostrar estado de la asignación */}
                                                  {assignment.status && (
                                                    <Chip
                                                      label={`Estado: ${assignment.status}`}
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
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    Este tema no tiene contenido asignado.
                                  </Typography>
                                )}
                              </List>
                            </Box>
                          </Box>

                          {themeIndex < module.themes.length - 1 && <Divider sx={{ mb: 2 }} />}
                        </React.Fragment>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">Este módulo no tiene temas definidos.</Typography>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))
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
              <Button onClick={handleCloseLinkConfirm}>Cancelar</Button>
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