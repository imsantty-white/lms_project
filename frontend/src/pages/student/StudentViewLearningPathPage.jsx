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
    Divider,
    Chip,
    useTheme
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LayersIcon from '@mui/icons-material/Layers';
import ClassIcon from '@mui/icons-material/Class';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import WorkIcon from '@mui/icons-material/Work';

import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

import ContentModal from '../../components/ContentModal';
import VideoModal from '../../components/VideoModal';


const getContentIcon = (assignment) => {
    const content = assignment.resource_id || assignment.activity_id;
    if (!content) return <AssignmentIcon />;

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

const translateAssignmentStatus = (status) => {
    if (!status) return 'Desconocido';
    switch (status.toLowerCase()) {
        case 'open': return 'Abierto';
        case 'closed': return 'Cerrado';
        case 'draft': return 'Próximamente'; // Corrected typo
        default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
};


function StudentViewLearningPathPage() {
    const { pathId } = useParams();
    const { user, isAuthenticated, isAuthInitialized } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();

    const [learningPathStructure, setLearningPathStructure] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const [isLinkConfirmOpen, setIsLinkConfirmOpen] = useState(false);
    const [linkToOpen, setLinkToOpen] = useState(null);

    // NUEVOS ESTADOS para el diálogo de confirmación de actividad
    const [isActivityConfirmOpen, setIsActivityConfirmOpen] = useState(false);
    const [activityToConfirm, setActivityToConfirm] = useState(null); // Almacena la asignación completa


    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [currentContent, setCurrentContent] = useState(null);

    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [currentVideo, setCurrentVideo] = useState(null);


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
                        const response = await axiosInstance.get(`/api/learning-paths/${pathId}/structure`);
                        console.log("Estructura de ruta de aprendizaje cargada:", response.data);

                        setLearningPathStructure(response.data);
                        setFetchError(null);

                    } catch (err) {
                        console.error('Error fetching learning path structure:', err.response ? err.response.data : err.message);
                        const errorMessage = err.response?.data?.message || 'Error al cargar la estructura de la ruta de aprendizaje.';
                        toast.error(errorMessage);
                    } finally {
                        setIsLoading(false);
                    }
                };

                fetchStructure();

            } else if (isAuthInitialized && (!isAuthenticated || user?.userType !== 'Estudiante')) {
                setFetchError('Debes iniciar sesión como estudiante para ver esta página.');
                setIsLoading(false);
            }
        }
    }, [pathId, isAuthInitialized, isAuthenticated, user]);


    const handleContentInteraction = (assignment) => {
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
                    // *** CAMBIO CLAVE AQUÍ: Mostrar el diálogo de confirmación ***
                    setActivityToConfirm(assignment); // Guardar la asignación para usarla después de la confirmación
                    setIsActivityConfirmOpen(true);
                    break;
                case 'Trabajo':
                    // Para trabajos, puedes ir directamente o también añadir un diálogo si lo prefieres
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

    const handleConfirmOpenLink = () => {
        if (linkToOpen) {
            window.open(linkToOpen, '_blank');
            toast.success('Enlace abierto.');
        }
        setIsLinkConfirmOpen(false);
        setLinkToOpen(null);
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

    // NUEVAS FUNCIONES para el diálogo de confirmación de actividad
    const handleConfirmTakeActivity = () => {
        if (activityToConfirm) {
            navigate(`/student/assignments/${activityToConfirm._id}/take-activity`);
            toast.info(`Iniciando ${activityToConfirm.activity_id?.type || 'actividad'}...`); // Mensaje informativo
        }
        setIsActivityConfirmOpen(false);
    };

    const handleCloseActivityConfirm = (event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
            return;
        }
        setIsActivityConfirmOpen(false);
    };

    const handleExitedActivityDialog = () => {
        setActivityToConfirm(null); // <--- ¡MOVIDO AQUÍ! Solo resetea cuando el diálogo ya no es visible
    };


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

    if (fetchError) {
        return (
            <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Alert severity="error">{fetchError}</Alert>
                </Box>
            </Container>
        );
    }

    if (!learningPathStructure) {
        return (
            <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">No se pudo cargar la ruta de aprendizaje o no existe.</Typography>
                </Box>
            </Container>
        );
    }

    // Calcular la fecha y hora de finalización si existe
    const fechaFinActividad = activityToConfirm?.fecha_fin ? format(new Date(activityToConfirm.fecha_fin), 'dd/MM/yyyy HH:mm') : 'N/A';
    // Calcular el tiempo límite si existe
    const tiempoLimiteActividad = activityToConfirm?.tiempo_limite !== undefined ? `${activityToConfirm.tiempo_limite} minutos` : 'N/A';


    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 1 }}>
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
                <Stack spacing={2} >
                    {learningPathStructure.modules.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Esta ruta no tiene módulos definidos.</Typography>
                    ) : (
                        learningPathStructure.modules.map((module) => {
                            if (!module || !module._id) {
                                console.warn("Módulo inválido o sin _id encontrado, omitiendo:", module);
                                return null;
                            }
                            return (
                                <Accordion
                                    key={module._id}
                                    defaultExpanded
                                    sx={{
                                        boxShadow: 3,
                                        borderRadius: theme.shape.borderRadius * 2,
                                        '&:not(:last-child)': { mb: 2 },
                                        border: '1px solid',
                                        borderColor: theme.palette.divider,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls={`panel${module._id}-content`}
                                        id={`panel${module._id}-header`}
                                        sx={{
                                            backgroundColor: theme.palette.primary.dark,
                                            color: theme.palette.primary.contrastText,
                                            '& .MuiAccordionSummary-content': {
                                                alignItems: 'center'
                                            },
                                            p: 1,
                                            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.4)',
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, color: 'inherit', ml: 1 }}>
                                            <LayersIcon />
                                        </ListItemIcon>
                                        <Typography variant="h5" sx={{ flexShrink: 0 }}>
                                            Módulo {module.orden}: {module.nombre}
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 2, backgroundColor: theme.palette.background.paper }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {module.descripcion || 'Sin descripción en el módulo.'}
                                        </Typography>

                                        {/* Lista de Temas dentro del Módulo */}
                                        <Stack spacing={1} sx={{ mt: 2 }}>
                                            {module.themes && module.themes.length > 0 ? (
                                                module.themes.map((themeItem) => {
                                                    if (!themeItem || !themeItem._id) {
                                                        console.warn("Tema inválido o sin _id encontrado dentro del módulo", module.nombre, "omitiento:", themeItem);
                                                        return null;
                                                    }

                                                    // Contar asignaciones con estado 'Open'
                                                    const openAssignmentsCount = themeItem.assignments
                                                        ? themeItem.assignments.filter(
                                                            (assignment) => assignment.status === 'Open'
                                                        ).length
                                                        : 0;

                                                    return (
                                                        <Accordion
                                                            key={themeItem._id}
                                                            elevation={0}
                                                            sx={{
                                                                border: '0.7px dotted',
                                                                borderRadius: theme.shape.borderRadius,
                                                                '&:before': { display: 'none' },
                                                                backgroundColor: theme.palette.background.default,
                                                                '&:not(:last-child)': { mb: 1 },
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <AccordionSummary
                                                                expandIcon={<ExpandMoreIcon />}
                                                                aria-controls={`panel${themeItem._id}-content`}
                                                                id={`panel${themeItem._id}-header`}
                                                                sx={{
                                                                    backgroundColor: theme.palette.action.hover,
                                                                    minHeight: 48,
                                                                    '& .MuiAccordionSummary-content': {
                                                                        alignItems: 'center',
                                                                        my: 0,
                                                                        justifyContent: 'space-between',
                                                                    },
                                                                    px: 2
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                                                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                                                        <ClassIcon sx={{ color: theme.palette.text.secondary }} />
                                                                    </ListItemIcon>
                                                                    <ListItemText
                                                                        primary={<Typography variant="h6" component="span">{themeItem.orden}: {themeItem.nombre}</Typography>}
                                                                        secondary={themeItem.descripcion || 'Sin descripción.'}
                                                                        primaryTypographyProps={{ sx: { fontSize: '1rem', fontWeight: 'medium', color: theme.palette.text.primary } }}
                                                                        secondaryTypographyProps={{ sx: { fontSize: '0.85rem', color: theme.palette.text.secondary } }}
                                                                        sx={{ mr: 1 }}
                                                                    />
                                                                </Box>
                                                                {openAssignmentsCount > 0 && (
                                                                    <Chip
                                                                        label={`${openAssignmentsCount} disponibles`}
                                                                        size="small"
                                                                        color="text.primary"
                                                                        variant="outlined"
                                                                        sx={{ mr: 3, flexShrink: 0 }}
                                                                    />
                                                                )}
                                                            </AccordionSummary>
                                                            <AccordionDetails sx={{ px: 2, py: 1.5, backgroundColor: theme.palette.background.paper }}>
                                                                <List dense disablePadding sx={{ width: '100%' }}>
                                                                    {themeItem.assignments && themeItem.assignments.length > 0 ? (
                                                                        themeItem.assignments.map((assignment, index) => {
                                                                            if (!assignment || !assignment._id) {
                                                                                console.warn("Asignación inválida o sin _id encontrada dentro del tema", themeItem.nombre, "omitiento:", assignment);
                                                                                return null;
                                                                            }

                                                                            const contentItem = assignment.resource_id || assignment.activity_id;

                                                                            return (
                                                                                <React.Fragment key={assignment._id}>
                                                                                <ListItem
                                                                                    key={assignment._id}
                                                                                    disablePadding
                                                                                    secondaryAction={
                                                                                        assignment.status && (
                                                                                            <Chip
                                                                                                label={`${translateAssignmentStatus(assignment.status)}`}
                                                                                                size="small"
                                                                                                variant="filled"
                                                                                                color={assignment.status === 'Open' ? 'success' : assignment.status === 'Closed' ? 'error' : 'default'}
                                                                                            />
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <ListItemButton
                                                                                        onClick={() => handleContentInteraction(assignment)}
                                                                                        sx={{ py: 1, px: 0 }}
                                                                                        disabled={assignment.status !== 'Open'}
                                                                                    >
                                                                                        <ListItemIcon sx={{ minWidth: 40 }}>{getContentIcon(assignment)}</ListItemIcon>
                                                                                        <ListItemText
                                                                                            primary={
                                                                                                <Typography variant="subtitle1" component="span" sx={{ fontSize: '0.95rem', fontWeight: 'normal', color: theme.palette.text.primary }}>
                                                                                                    {contentItem?.title || 'Contenido no encontrado'}
                                                                                                </Typography>
                                                                                            }
                                                                                            secondary={
                                                                                                <Box component="span">
                                                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                                                                        Tipo: {contentItem?.type || 'N/A'}
                                                                                                    </Typography>
                                                                                                    {assignment.fecha_inicio && (
                                                                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                                                            Inicio: {format(new Date(assignment.fecha_inicio), 'dd/MM/yyyy HH:mm')}
                                                                                                        </Typography>
                                                                                                    )}
                                                                                                    {assignment.fecha_fin && (
                                                                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                                                            Fin: {format(new Date(assignment.fecha_fin), 'dd/MM/yyyy HH:mm')}
                                                                                                        </Typography>
                                                                                                    )}
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
                                                                                                    </Stack>
                                                                                                </Box>
                                                                                            }
                                                                                        />
                                                                                    </ListItemButton>
                                                                                </ListItem>
                                                                                {index < themeItem.assignments.length - 1 && (
                                                                                        <Divider component="li" sx={{ my: 0.7, borderStyle: 'dotted' }} />
                                                                                    )}
                                                                                </React.Fragment>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 2, py: 1 }}>
                                                                            Este tema no tiene contenido asignado.
                                                                        </Typography>
                                                                    )}
                                                                </List>
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    );
                                                })
                                            ) : (
                                                <Typography variant="body2" color="text.secondary" sx={{ pl: 2, py: 1 }}>Este módulo no tiene temas definidos.</Typography>
                                            )}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })
                    )}
                </Stack>

                {/* Diálogo de Confirmación para Enlaces (existente) */}
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

                {/* NUEVO: Diálogo de Confirmación para Quiz/Cuestionario */}
                <Dialog
                    open={isActivityConfirmOpen}
                    onClose={handleCloseActivityConfirm}
                    aria-labelledby="activity-confirm-title"
                    aria-describedby="activity-confirm-description"
                    TransitionProps={{
                        onExited: handleExitedActivityDialog // <--- ¡AÑADE ESTA PROP!
                    }}
                >
                    <DialogTitle id="activity-confirm-title">
                        {`Iniciar ${activityToConfirm?.activity_id?.type || 'Actividad'}: ${activityToConfirm?.activity_id?.title || 'Desconocido'}`}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="activity-confirm-description" sx={{ mb: 1 }}>
                            Estás a punto de comenzar este {activityToConfirm?.activity_id?.type || 'actividad'}.
                        </DialogContentText>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                            {activityToConfirm?.puntos_maximos !== undefined && (
                                <Typography variant="body2">
                                    **Puntos Máximos:** {activityToConfirm.puntos_maximos}
                                </Typography>
                            )}
                            {activityToConfirm?.intentos_permitidos !== undefined && (
                                <Typography variant="body2">
                                    **Intentos Permitidos:** {activityToConfirm.intentos_permitidos}
                                </Typography>
                            )}
                            {activityToConfirm?.tiempo_limite !== undefined && (
                                <Typography variant="body2">
                                    **Tiempo Límite:** {tiempoLimiteActividad}
                                </Typography>
                            )}
                            {activityToConfirm?.fecha_fin && (
                                <Typography variant="body2">
                                    **Fecha Límite:** {fechaFinActividad}
                                </Typography>
                            )}
                            <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
                                ¿Deseas continuar?
                            </Typography>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseActivityConfirm} color='secondary'>Cancelar</Button>
                        <Button onClick={handleConfirmTakeActivity} variant="contained" autoFocus>
                            Iniciar {activityToConfirm?.activity_id?.type || 'Actividad'}
                        </Button>
                    </DialogActions>
                </Dialog>


                <ContentModal
                    open={isContentModalOpen}
                    onClose={handleCloseContentModal}
                    title={currentContent?.title}
                    contentBody={currentContent?.contentBody}
                />

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