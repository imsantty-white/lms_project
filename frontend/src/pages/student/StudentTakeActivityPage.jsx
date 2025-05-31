// src/pages/StudentTakeActivityPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Para obtener el assignmentId de la URL
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  Checkbox,
  FormGroup,
  Divider,
  Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItem, ListItemText,
  Stack, FormHelperText, // Para organizar elementos
  Collapse, // Añadido para el efecto de colapso
  IconButton // Añadido para el botón de colapso
  , Modal, Backdrop // Added for auto-save modal
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material'; // Añadido para los iconos

// *** Importar useAuth (ahora incluyendo isAuthInitialized y isAuthenticated) Y axiosInstance ***
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext'; // Added for WebSocket
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// Un Quiz/Cuestionario tiene un array de 'questions', y cada pregunta tiene 'text', 'type', 'options'.

function StudentTakeActivityPage() {
  const { assignmentId } = useParams(); // Obtiene el assignmentId de la URL
  // *** Usa tu contexto de autenticación para obtener el usuario, si está autenticado, y si la autenticación está inicializada ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth();

  const navigate = useNavigate();

  // Estados para los datos de la actividad, carga y error
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [activityDetails, setActivityDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Estado de carga general
  const [fetchError, setFetchError] = useState(null); // Estado para errores o acceso denegado
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [trabajoLink, setTrabajoLink] = useState('');

  // Estado para almacenar las respuestas del estudiante
  const [studentAnswers, setStudentAnswers] = useState({});

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [submissionDetails, setSubmissionDetails] = useState(null);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const [lastSubmissionDetails, setLastSubmissionDetails] = useState(null);

  const [isGraded, setIsGraded] = useState(false);

  // *** NUEVO ESTADO: Para controlar si la sección de última entrega está expandida ***
  const [isLastSubmissionExpanded, setIsLastSubmissionExpanded] = useState(false);

  // States for WebSocket driven auto-save when teacher closes activity
  const [isActivityClosedByTeacher, setIsActivityClosedByTeacher] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const socket = useSocket(); // Get socket instance

  const determineRedirectPath = () => {
    if (assignmentDetails?.theme_id?.module_id?.learning_path_id?._id) {
      return `/student/learning-paths/${assignmentDetails.theme_id.module_id.learning_path_id._id}/view`;
    }
    // Fallback if path details are not available for some reason
    toast.warn("No se pudo determinar la ruta de aprendizaje, redirigiendo a la lista general.");
    return '/student/learning-paths';
  };

  // WebSocket listener for assignment closure
  useEffect(() => {
    if (socket && assignmentId) {
      const handleAssignmentClosed = async (data) => {
        if (data.assignmentId === assignmentId) {
          console.log(`Activity ${data.title} (ID: ${data.assignmentId}) closed by teacher. Initiating auto-save.`);
          setIsActivityClosedByTeacher(true);
          setAutoSaveMessage(`La actividad '${data.title}' ha sido cerrada por el docente. Guardando tu progreso actual...`);
          setIsAutoSaving(true);

          // Collect current answers
          const currentAnswers = studentAnswers;
          const currentTrabajoLink = trabajoLink;
          let payload = {};

          if (activityDetails?.type === 'Quiz' || activityDetails?.type === 'Cuestionario') {
            payload = { studentAnswers: currentAnswers, isAutoSaveDueToClosure: true };
          } else if (activityDetails?.type === 'Trabajo') {
            payload = { trabajoLink: currentTrabajoLink, isAutoSaveDueToClosure: true };
          } else {
            console.error('Auto-save failed: Could not determine activity type.');
            setAutoSaveMessage('Error: No se pudo determinar el tipo de actividad para el guardado automático. Notifica a tu docente.');
            setIsAutoSaving(false);
            return;
          }

          try {
            const response = await axiosInstance.post(`/api/activities/student/${assignmentId}/submit-attempt`, payload);
            setAutoSaveMessage(response.data.message || 'Tu progreso ha sido guardado. Serás redirigido en unos segundos...');
            setIsAutoSaving(false);
            setTimeout(() => {
              navigate(determineRedirectPath());
            }, 4000); // 4-second delay before redirect
          } catch (err) {
            console.error('Error during auto-save due to closure:', err);
            setAutoSaveMessage(err.response?.data?.message || 'Ocurrió un error al guardar tu progreso. Por favor, notifica a tu docente.');
            setIsAutoSaving(false);
            // Optionally, you might want to allow the student to copy their answers or take some other action here.
            // For now, it just shows the error.
          }
        }
      };

      socket.on('assignmentClosed', handleAssignmentClosed);

      return () => {
        socket.off('assignmentClosed', handleAssignmentClosed);
      };
    }
  }, [socket, assignmentId, navigate, studentAnswers, trabajoLink, activityDetails]); // activityDetails needed for type, studentAnswers & trabajoLink for payload

  // Efecto para cargar los detalles de la actividad y la asignación
  useEffect(() => {
    // *** Esperar a que la autenticación inicialice antes de hacer cualquier otra cosa ***
    if (isAuthInitialized) { // <-- Lógica añadida
      // Una vez inicializada, verificar si el usuario está autenticado y tiene el rol correcto
      if (isAuthenticated && user?.userType === 'Estudiante') { // <-- Lógica añadida
        const fetchActivityData = async () => {
          if (!assignmentId) {
            setFetchError('ID de asignación no proporcionado en la URL.');
            setIsLoading(false);
            return;
          }

          setIsLoading(true); // Activar carga
          setFetchError(null); // Limpiar errores previos
          setAssignmentDetails(null);
          setActivityDetails(null);
          setStudentAnswers({}); // Limpiar respuestas anteriores
          setAttemptsUsed(0);
          setTrabajoLink('');
          setLastSubmissionDetails(null);

          setHasSubmitted(false); // Reiniciar estado de envío
          setSubmissionDetails(null);

          // *** REINICIAR ESTADO DE EXPANSIÓN ***
          setIsLastSubmissionExpanded(false);

          try {
              // *** LLAMADA GET AL BACKEND USANDO axiosInstance ***
              const response = await axiosInstance.get(`/api/activities/student/${assignmentId}/start`);
              console.log("Datos de actividad para intento cargados:", response.data);

              setAssignmentDetails(response.data.assignmentDetails);
              setActivityDetails(response.data.activityDetails);
              setAttemptsUsed(response.data.attemptsUsed);
              setLastSubmissionDetails(response.data.lastSubmission);
              setFetchError(null); // Asegurarse de que no haya error

              // *** Lógica para inicializar studentAnswers/trabajoLink si se muestra la última entrega y para determinar si está calificada ***
              if (response.data.lastSubmission) {
                  // Si hay una última entrega Y tiene una calificación (no nula y no indefinida)
                  // La condición es que 'calificacion' debe ser un número (no null, no undefined)
                  if (response.data.lastSubmission.calificacion !== undefined && response.data.lastSubmission.calificacion !== null) {
                      setIsGraded(true);
                  } else {
                      setIsGraded(false); // Si hay lastSubmission pero no calificación, no está calificada.
                  }

                  // Si tienes una estructura de respuesta en lastSubmission.respuesta
                  if (response.data.activityDetails?.type === 'Quiz' && response.data.lastSubmission.respuesta?.quiz_answers) {
                      // Mapear quiz_answers a la estructura de studentAnswers si es necesario
                      // Por ejemplo, para mostrar las respuestas del estudiante en un formulario deshabilitado
                      const _initialAnswers = {};
                      // Asumiendo que quiz_answers es un array de objetos { question_index: N, student_answer: "respuesta" }
                      // O { question_id: "id", student_answer: "respuesta" }
                      // Si tus preguntas tienen '_id', lo ideal es usar eso.
                      response.data.lastSubmission.respuesta.quiz_answers.forEach(qAnswer => {
                          // Si la pregunta tiene _id, usar qAnswer.question_id
                          // _initialAnswers[qAnswer.question_id] = qAnswer.student_answer;
                          // Si usas question_index como ID temporal:
                          // _initialAnswers[questionsToRender[qAnswer.question_index]._id] = qAnswer.student_answer;
                          // Por ahora, solo precargamos si la respuesta es simple como texto o una sola opción.
                          // Ajusta esto según cómo almacenas las respuestas de Quiz/Cuestionario.
                      });
                      // setStudentAnswers(_initialAnswers); // Descomentar si implementas el mapeo
                  } else if (response.data.activityDetails?.type === 'Cuestionario' && response.data.lastSubmission.respuesta?.cuestionario_answers) {
                      // Lógica similar para Cuestionario (asume que son respuestas de texto)
                      const _initialAnswers = {};
                      response.data.lastSubmission.respuesta.cuestionario_answers.forEach(qAnswer => {
                          // _initialAnswers[qAnswer.question_id] = qAnswer.student_answer;
                      });
                      // setStudentAnswers(_initialAnswers); // Descomentar si implementas el mapeo
                  } else if (response.data.activityDetails?.type === 'Trabajo' && response.data.lastSubmission.respuesta?.link_entrega) {
                      setTrabajoLink(response.data.lastSubmission.respuesta.link_entrega); // Sí podemos precargar el enlace de Trabajo
                  }
              } else {
                  // Si NO hay lastSubmission, la actividad no ha sido entregada y, por lo tanto, no está calificada.
                  setIsGraded(false);
              }
              // Fin Lógica de inicialización
            
          } catch (err) {
            console.error('Error fetching activity data:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar la actividad.';
            setFetchError(errorMessage);
            toast.error(errorMessage);
          } finally {
            setIsLoading(false); // Desactivar carga
          }
        };

        // Solo intentar cargar si assignmentId está presente Y el usuario es un estudiante autenticado
        fetchActivityData();

      } else {
        // Si la autenticación inicializó pero el usuario no está autenticado o no es estudiante
        setFetchError('Debes iniciar sesión como estudiante para ver esta página.'); // Mensaje de acceso denegado
        setIsLoading(false); // Desactivar carga
      }
    }
    // Si !isAuthInitialized, isLoading sigue siendo true y se muestra el indicador de carga inicial.

    // Dependencias del effect: Recargar si cambian assignmentId, o el estado de autenticación
  }, [assignmentId, user, isAuthenticated, isAuthInitialized]);

  // --- Calcular intentos restantes ---
  const remainingAttempts = assignmentDetails?.intentos_permitidos !== undefined && assignmentDetails.intentos_permitidos !== null
    ? assignmentDetails.intentos_permitidos - attemptsUsed
    : null; // O undefined, o un valor que indique ilimitado
  // ---------------------------------

  // *** NUEVO: Lógica para determinar si un nuevo intento es permitido ***
  const canTakeNewAttempt = (() => {
      // Si no hay detalles de asignación o actividad (aún cargando o error), no se puede intentar
      if (!assignmentDetails || !activityDetails) return false;

      // Condición 1: Comprobar intentos restantes
      // true si es ilimitado (null) o si hay > 0 intentos restantes
      const hasRemainingAttempts = (remainingAttempts === null || remainingAttempts > 0);

      // Condición 2: Comprobar si ya se envió en esta sesión (para evitar doble clic/envío)
      const notSubmittedInThisSession = !hasSubmitted;

      // Condición 3: Comprobar el estado de calificación, dependiendo del tipo de actividad
      let isBlockingByGrading = false;
      if (activityDetails.type === 'Cuestionario' || activityDetails.type === 'Trabajo') {
          // Para Cuestionario y Trabajo (calificación manual):
          // Si ya está calificada (isGraded es true), bloquea nuevos intentos.
          isBlockingByGrading = isGraded;
      }
      // Para 'Quiz' (calificación automática):
      // La calificación no bloquea nuevos intentos, solo importa si quedan intentos.
      // Por lo tanto, isBlockingByGrading permanece false para Quiz.

      // Un nuevo intento es permitido si:
      // a) Quedan intentos O son ilimitados
      // b) No se ha enviado en la sesión actual
      // c) NO está bloqueado por calificación (solo aplica a Cuestionario/Trabajo)
      return hasRemainingAttempts && notSubmittedInThisSession && !isBlockingByGrading;
  })();

  // --- Lógica para capturar respuestas del estudiante ---
  // Se mantiene la lógica de tu código para Single-Choice (RadioGroup) y Text (TextField)
  // No añadimos lógica específica para Multiple-Choice si no estaba presente.

  // Maneja el cambio en una pregunta (ej. radio button, text field)
  const handleAnswerChange = (questionId, answer) => {
    setStudentAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer // Guarda la respuesta asociada al ID de la pregunta
    }));
    console.log(`Respuesta para pregunta ${questionId}:`, answer); // Log de depuración
  };

  // Maneja el cambio en una pregunta de selección múltiple (checkboxes)
  // Asume que la respuesta es un array de IDs de opción seleccionados
  // Esta función parece estar preparada para Multiple-Choice aunque esto sera por ahora.
  const _handleMultipleAnswerChange = (questionId, optionId, isChecked) => {
    setStudentAnswers(prevAnswers => {
      const currentAnswers = prevAnswers[questionId] || []; // Obtiene el array actual o crea uno nuevo
      const newAnswers = isChecked
        ? [...currentAnswers, optionId] // Añade la opción si está marcada
        : currentAnswers.filter(id => id !== optionId); // Elimina la opción si está desmarcada

      return {
        ...prevAnswers,
        [questionId]: newAnswers // Actualiza el array de respuestas para la pregunta
      };
    });
    console.log(`Respuesta múltiple cambiada para pregunta ${questionId}:`, studentAnswers); // Log de depuración
  };

  // --- Lógica para abrir el diálogo de confirmación ---
  const handleOpenConfirmDialog = () => {
    // Opcional: Validar respuestas mínimas antes de abrir el diálogo
    // if (!validateMinimumAnswers()) {
    //   toast.warning('Debes responder al menos una pregunta antes de enviar.');
    //   return;
    // }
    setIsConfirmDialogOpen(true); // Abre el diálogo de confirmación
  };

  // --- Lógica para cerrar el diálogo de confirmación ---
  const handleCloseConfirmDialog = () => {
    setIsConfirmDialogOpen(false); // Cierra el diálogo de confirmación
  };

  // --- Lógica para cerrar el modal de éxito y REDIRECCIONAR ---
  const handleCloseSuccessModalAndRedirect = () => {
    setIsSuccessModalOpen(false); // Cierra el modal de éxito

    // *** LÓGICA DE REDIRECCIÓN ***
    // Opción 1: Redireccionar a la página de la ruta de aprendizaje específica
    // Necesitamos el ID de la ruta de aprendizaje, que está en assignmentDetails.
    if (assignmentDetails?.theme_id?.module_id?.learning_path_id?._id) {
      const learningPathId = assignmentDetails.theme_id.module_id.learning_path_id._id;
      navigate(`/student/learning-paths/${learningPathId}/view`);
    } else {
      // Opción 2: Redireccionar a la lista de mis rutas de aprendizaje si no se pudo obtener el ID de la ruta actual
      console.warn('Could not determine learning path ID, redirecting to my learning paths list.');
      navigate('/student/learning-paths');
    }
  };

  // --- Lógica para enviar respuestas (LLAMADA POR EL DIÁLOGO DE CONFIRMACIÓN) ---
  const handleSubmitAttempt = async () => {
    handleCloseConfirmDialog();

    setIsSubmitting(true);

    try {
      // *** LLAMADA POST AL BACKEND USANDO axiosInstance ***
      const url = `/api/activities/student/${assignmentId}/submit-attempt`; // <-- MODIFICADO
      let payload = {};
      if (activityDetails.type === 'Quiz' || activityDetails.type === 'Cuestionario') {
        payload = { studentAnswers: studentAnswers };
      } else if (activityDetails.type === 'Trabajo') {
        payload = { trabajoLink: trabajoLink }; // Enviar el enlace de trabajo
      } else {
        // Esto no debería pasar si la validación inicial funciona, pero es una precaución
        console.error(`Frontend: Attempting to submit unsupported activity type: ${activityDetails.type}`);
        toast.error('Tipo de actividad no soportado para envío.');
        setIsSubmitting(false); // Desactiva estado de envío si no se envía
        return; // Detener la ejecución
      }

      console.log('Frontend: Enviando respuestas...');
      console.log('Frontend: URL:', url);
      console.log('Frontend: Payload:', payload);

      const response = await axiosInstance.post(url, payload); // <-- MODIFICADO

      console.log('Intento enviado con éxito:', response.data);

      // *** Manejo de éxito: guardar detalles y abrir modal de éxito ***
      setHasSubmitted(true); // Marca que se ha enviado con éxito
      setAttemptsUsed(prev => prev + 1); // <--- Añade esta línea
      setSubmissionDetails(response.data.submission); // Guarda los detalles de la entrega
      //toast.success(response.data.message || 'Entrega registrada con éxito.'); // Eliminamos el toast
      setIsSuccessModalOpen(true); // Abre el modal de éxito

    } catch (err) {
      console.error('Error submitting attempt:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al enviar tus respuestas.';
      toast.error(errorMessage); // Mantenemos el toast para errores
      // No establecemos hasSubmitted(true) en caso de error (a menos que sea error de límite de intentos)
    } finally {
      setIsSubmitting(false); // Desactiva estado de envío
    }
  };

  // *** NUEVA FUNCIÓN: Togglear expansión de última entrega ***
  const handleToggleLastSubmission = () => {
    setIsLastSubmissionExpanded(prev => !prev);
  };
  // --- FIN Lógica para enviar respuestas ---

  // --- Renderizado de la Página ---

  // *** Mostrar estado de carga inicial mientras la autenticación inicializa o se cargan los datos ***
  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          {/* Mensaje opcional para el usuario */}
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            {isAuthInitialized ? 'Cargando actividad...' : 'Inicializando autenticación...'}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Mostrar error de carga (incluye errores de permiso 403 del backend manejados por axiosInstance)
  if (fetchError) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="error">{fetchError}</Alert>
        </Box>
      </Container>
    );
  }

  // Si no hay assignmentDetails o activityDetails después de cargar (ej. ID inválido que no dio 404 o 500)
  if (!assignmentDetails || !activityDetails) {
      return (
        <Container>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Actividad no encontrada o no disponible.</Typography>
          </Box>
        </Container>
    );
  }

  // --- Declara questionsToRender AQUÍ, antes del return principal ---
  const questionsToRender = activityDetails.type === 'Quiz'
    ? activityDetails.quiz_questions
    : activityDetails.type === 'Cuestionario' // Añade la verificación para Cuestionario aquí también
      ? activityDetails.cuestionario_questions
      : []; // Si no es Quiz ni Cuestionario, es un array vacío (o undefined, pero [] es más seguro)
  // --- Fin declaración questionsToRender ---

  // Renderizar la interfaz de la Actividad (Quiz/Cuestionario/Trabajo)
return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        {/* Título y descripción de la Actividad (siempre visibles) */}
        <Typography variant="h4" gutterBottom>
          {activityDetails.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {activityDetails.description || 'Sin descripción.'}
        </Typography>

        {/* Mostrar detalles de la asignación (puntos, intentos, tiempo) (siempre visibles) */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          {/* ...Chips existentes para Puntos máximos, Intentos permitidos... */}
          {assignmentDetails?.puntos_maximos !== undefined && assignmentDetails.puntos_maximos !== null && (
            <Chip label={`Pts máximos: ${assignmentDetails.puntos_maximos}`} size="small" variant="outlined" />
          )}
          {assignmentDetails?.intentos_permitidos !== undefined && assignmentDetails.intentos_permitidos !== null ? (
            <Chip label={`Intentos permitidos: ${assignmentDetails.intentos_permitidos}`} size="small" variant="outlined" />
          ) : (
                <Chip label={`Intentos permitidos: Ilimitados`} size="small" variant="outlined" />
            )}
          {/* Chips de intentos usados y restantes (siempre visibles si se cargaron) */}
          {attemptsUsed !== undefined && (
            <Chip label={`Intentos usados: ${attemptsUsed}`} size="small" variant="outlined" />
          )}
          {remainingAttempts !== null && (
            <Chip
              label={`Intentos restantes: ${remainingAttempts}`}
              size="small"
              color={remainingAttempts <= 0 ? 'error' : 'default'}
              variant="outlined"
            />
          )}
          {assignmentDetails?.tiempo_limite !== undefined && assignmentDetails.tiempo_limite !== null && (
            <Chip label={`Tiempo límite: ${assignmentDetails.tiempo_limite} min`} size="small" variant="outlined" />
          )}
        </Stack>

        {/* *** SECCIÓN DE ÚLTIMA ENTREGA COLAPSABLE *** */}
        {lastSubmissionDetails && (
          <Paper elevation={2} sx={{ mb: 4 }}>
            {/* Encabezado clickeable para expandir/colapsar */}
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={handleToggleLastSubmission}
            >
              <Box>
                <Typography variant="h6">
                  Última Entrega (Intento #{lastSubmissionDetails.attempt_number})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enviada el: {lastSubmissionDetails.fecha_envio ? format(new Date(lastSubmissionDetails.fecha_envio), 'dd/MM/yyyy HH:mm') : 'No especificada'}
                  {lastSubmissionDetails.is_late && <Chip label="Tardía" color="warning" size="small" sx={{ ml: 1 }} />}
                </Typography>
              </Box>
              <IconButton>
                {isLastSubmissionExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            {/* Contenido colapsable */}
            <Collapse in={isLastSubmissionExpanded}>
              <Box sx={{ p: 3, pt: 0 }}>
                <Divider sx={{ mb: 2 }} />
                
                {/* Mostrar contenido de la última entrega según el tipo de actividad */}
                {activityDetails.type === 'Quiz' && lastSubmissionDetails.respuesta?.quiz_answers && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Reporte de Respuestas:</Typography>
                    
                    <List dense>
                      {/* Mapear respuestas del Quiz */}
                      {lastSubmissionDetails.respuesta.quiz_answers.map((answer, qIndex) => {
                        // Encontrar la pregunta original usando el question_index de la respuesta
                        const originalQuestion = Array.isArray(questionsToRender) && questionsToRender[answer.question_index] ? questionsToRender[answer.question_index] : null;
                        
                        // Determinar si hay una respuesta para esta pregunta
                        // HAY QUE AJUSTAR EL BACKEND PARA QUE NO MANDE LA RESPUESTA, SOLAMENTE SE MOSTRARA SI HAY RESPUESTA O NO
                        // PARA EVITAR TRAMPAS
                        const hasAnswer = (Array.isArray(answer.student_answer) && answer.student_answer.length > 0) || 
                                          (typeof answer.student_answer === 'string' && answer.student_answer.trim() !== '');

                        return (
                          <ListItem key={qIndex}>
                            <ListItemText
                              primary={`Q${answer.question_index + 1}: ${originalQuestion ? originalQuestion.text : 'Pregunta desconocida'}`}
                              secondary={hasAnswer ? 'Respuesta Seleccionada' : 'Respuesta NO seleccionada'}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                    {lastSubmissionDetails.calificacion !== undefined && lastSubmissionDetails.calificacion !== null && (
                      <Alert severity={lastSubmissionDetails.calificacion >= (assignmentDetails?.puntos_maximos || 0) * 0.7 ? 'success' : 'info'} sx={{ mb: 2 }}>
                        Calificación: {lastSubmissionDetails.calificacion.toFixed(2)} / {assignmentDetails?.puntos_maximos !== undefined ? assignmentDetails.puntos_maximos : 'N/A'}
                      </Alert>
                    )}
                  </Box>
                )}

                {activityDetails.type === 'Cuestionario' && lastSubmissionDetails.respuesta?.cuestionario_answers && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Respuestas:</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Estado: {lastSubmissionDetails.estado_envio}</Typography>
                    {lastSubmissionDetails.calificacion !== undefined && lastSubmissionDetails.calificacion !== null && (
                      <Alert severity={lastSubmissionDetails.calificacion >= (assignmentDetails?.puntos_maximos || 0) * 0.7 ? 'success' : 'info'} sx={{ mb: 2 }}>
                        Calificación: {lastSubmissionDetails.calificacion.toFixed(2)} / {assignmentDetails?.puntos_maximos !== undefined ? assignmentDetails.puntos_maximos : 'N/A'}
                      </Alert>
                    )}
                    <List dense>
                      {/* Mapear respuestas del Cuestionario */}
                      {lastSubmissionDetails.respuesta.cuestionario_answers.map((answer, qIndex) => {
                        const originalQuestion = Array.isArray(questionsToRender) && questionsToRender[answer.question_index] ? questionsToRender[answer.question_index] : null;
                        return (
                          <ListItem key={qIndex}>
                            <ListItemText
                              primary={`Q${answer.question_index + 1}: ${originalQuestion ? originalQuestion.text : 'Pregunta desconocida'}`}
                              secondary={`Tu respuesta: ${answer.student_answer || 'Sin respuesta'}`}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )}

                {activityDetails.type === 'Trabajo' && lastSubmissionDetails.respuesta?.link_entrega && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Enlace de Entrega:</Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      <a href={lastSubmissionDetails.respuesta.link_entrega} target="_blank" rel="noopener noreferrer">
                        {lastSubmissionDetails.respuesta.link_entrega}
                      </a>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Estado: {lastSubmissionDetails.estado_envio}</Typography>
                    {lastSubmissionDetails.calificacion !== undefined && lastSubmissionDetails.calificacion !== null && (
                      <Alert severity={lastSubmissionDetails.calificacion >= (assignmentDetails?.puntos_maximos || 0) * 0.7 ? 'success' : 'info'} sx={{ mb: 2 }}>
                        Calificación: {lastSubmissionDetails.calificacion.toFixed(2)} / {assignmentDetails?.puntos_maximos !== undefined ? assignmentDetails.puntos_maximos : 'N/A'}
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Paper>
        )}
        {/* *** FIN SECCIÓN DE ÚLTIMA ENTREGA COLAPSABLE *** */}

      {/* *** MOSTRAR FORMULARIO DE INTENTO SOLO SI canTakeNewAttempt ES TRUE *** */}
      {canTakeNewAttempt ? (
          // Renderizar el formulario interactivo según el tipo de actividad
          activityDetails.type === 'Quiz' || activityDetails.type === 'Cuestionario' ? (
              <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom> Preguntas </Typography>
                  {questionsToRender && questionsToRender.length > 0 ? (
                      <List>
                          {questionsToRender.map((question, index) => (
                              <React.Fragment key={question._id}>
                                  <ListItem alignItems="flex-start">
                                      <ListItemText
                                          primary={<Typography variant="h6"> Pregunta {index + 1}: {question.text} </Typography>}
                                          secondary={
                                              <Box sx={{ mt: 2 }}>
                                                  {activityDetails.type === 'Cuestionario' ? (
                                                      <TextField
                                                          label="Tu respuesta" fullWidth margin="normal"
                                                          value={studentAnswers[question._id] || ''}
                                                          onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                                                          disabled={hasSubmitted || !canTakeNewAttempt || isActivityClosedByTeacher}
                                                      />
                                                  ) : activityDetails.type === 'Quiz' && question.options && question.options.length > 0 ? (
                                                      <FormControl component="fieldset">
                                                          <FormLabel component="legend"> Selecciona una opción: </FormLabel>
                                                          <RadioGroup
                                                              value={studentAnswers[question._id] || ''}
                                                              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                                                              disabled={hasSubmitted || !canTakeNewAttempt || isActivityClosedByTeacher}
                                                          >
                                                              {question.options.map((option, optionIndex) => (
                                                                  <FormControlLabel key={optionIndex} value={option} control={<Radio sx={{ '&.Mui-checked': { color: '#f00c8d' }}}/>} label={option} disabled={isActivityClosedByTeacher} />
                                                              ))}
                                                          </RadioGroup>
                                                      </FormControl>
                                                  ) : (
                                                      <Typography variant="body2" color="error"> Tipo de pregunta o estructura no soportada. </Typography>
                                                  )}
                                              </Box>
                                          }
                                      />
                                  </ListItem>
                                  {index < questionsToRender.length - 1 && (<Divider component="li" sx={{ my: 2 }} />)}
                              </React.Fragment>
                          ))}
                      </List>
                  ) : (
                      <Typography variant="body2" color="text.secondary"> Esta actividad no tiene preguntas definidas. </Typography>
                  )}

                  {/* Botón para enviar respuestas (Solo mostrar si canTakeNewAttempt es true) */}
                  <Box sx={{ mt: 4, textAlign: 'center' }}>
                      <Button
                          variant="contained" color="primary" onClick={handleOpenConfirmDialog}
                          disabled={isSubmitting || !questionsToRender || questionsToRender.length === 0 || !canTakeNewAttempt || isActivityClosedByTeacher}
                      >
                          {isActivityClosedByTeacher ? "Actividad Cerrada" : "Enviar Respuestas"}
                      </Button>
                  </Box>
              </Paper>
          ) : activityDetails.type === 'Trabajo' ? (
              <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom> Trabajo: {activityDetails.title} </Typography>
                  <Typography variant="body1"> {activityDetails.description || 'Sin descripción para el trabajo.'} </Typography>
                  <Box sx={{ mt: 3 }}>
                      {/* Campo de texto para el enlace de entrega */}
                      <TextField
                          label="Enlace de tu entrega (URL)" fullWidth margin="normal"
                          value={trabajoLink} onChange={(e) => setTrabajoLink(e.target.value)}
                          disabled={isSubmitting || !canTakeNewAttempt || isActivityClosedByTeacher}
                      />

                      {/* Botón de envío */}
                      <Box sx={{ mt: 4, textAlign: 'center' }}>
                          <Button
                              variant="contained" color="primary" onClick={handleOpenConfirmDialog}
                              disabled={isSubmitting || !trabajoLink.trim() || !canTakeNewAttempt || isActivityClosedByTeacher}
                          >
                              {isActivityClosedByTeacher ? "Actividad Cerrada" : "Enviar Trabajo"}
                          </Button>
                      </Box>
                  </Box>
              </Paper>
          ) : null
      ) : (
          // *** Este es el bloque que se muestra cuando canTakeNewAttempt es false ***
          <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Alert severity="info">
                  {activityDetails.type === 'Quiz' ? (
                      // Para Quiz: si no puede intentar, es porque agotó intentos o ya envió en esta sesión.
                      // Como ya se maneja hasSubmitted a nivel de canTakeNewAttempt, aquí solo queda si agotó intentos.
                      `Has utilizado todos tus ${assignmentDetails.intentos_permitidos} intentos permitidos para esta actividad.`
                  ) : (
                      // Para Cuestionario/Trabajo: puede ser por intentos agotados O porque ya está calificada.
                      isGraded
                          ? 'Esta actividad ya ha sido calificada. No puedes realizar más entregas.'
                          : `Has utilizado todos tus ${assignmentDetails.intentos_permitidos} intentos permitidos para esta actividad.`
                  )}
              </Alert>
          </Box>
      )}
      {/* *** Fin MOSTRAR FORMULARIO DE INTENTO *** */}

        {/* Tipo de actividad desconocido */}
        {activityDetails && activityDetails.type !== 'Quiz' &&
          activityDetails.type !== 'Cuestionario' &&
          activityDetails.type !== 'Trabajo' && (
            <Alert severity="warning" sx={{ mt: 4 }}>
              Tipo de actividad no soportado para visualización.
            </Alert>
          )}
      </Box>

      <Dialog
        open={isConfirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="confirm-submit-dialog-title"
        aria-describedby="confirm-submit-dialog-description"
        // Añadimos disabled={isSubmitting} a las acciones del diálogo para prevenir doble clic mientras se envía
      >
        <DialogTitle id="confirm-submit-dialog-title">{"Confirmar Envío"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-submit-dialog-description">
              Una vez que envíes, no podrás cambiar tu entrega para este intento. ¿Estás seguro de enviar?
              {/* Información adicional sobre intentos en el diálogo si es relevante */}
              {remainingAttempts !== null && (
                  <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                      Tendrás {Math.max(0, remainingAttempts - 1)} intento{Math.max(0, remainingAttempts - 1) !== 1 ? 's' : ''} restante{Math.max(0, remainingAttempts - 1) !== 1 ? 's' : ''} después de este.
                  </Typography>
              )}
              {remainingAttempts === null && (
                  <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                      Tienes intentos ilimitados.
                  </Typography>
              )}
              {/* Mensaje de advertencia si la actividad es de calificación manual y ya fue calificada */}
              {(activityDetails.type === 'Cuestionario' || activityDetails.type === 'Trabajo') && isGraded && (
                  <Typography variant="body2" color="error" sx={{mt: 1}}>
                      Esta actividad ya ha sido calificada. No podrás realizar más intentos.
                  </Typography>
              )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseConfirmDialog} color="secondary" disabled={isSubmitting}> Cancelar </Button>
            <Button
                onClick={handleSubmitAttempt} color="primary"
                // El botón de envío debe deshabilitarse si isSubmitting o si la acción ya no está permitida
                disabled={isSubmitting || !canTakeNewAttempt}
            >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
                {isSubmitting && <CircularProgress size={15} sx={{ ml: 1 }} />}
            </Button>
        </DialogActions>
      </Dialog>

      {/* ... Código existente de Dialog para Éxito ... */}
      <Dialog
        open={isSuccessModalOpen} disableEscapeKeyDown
        // Mantenemos el onClose original de tu código que evita cierre por backdrop/escape
        onClose={(event, reason) => { if (reason && reason === "backdropClick" || reason === "escapeKeyDown") return; handleCloseSuccessModalAndRedirect(); }}
        aria-labelledby="success-submit-dialog-title"
      >
        <DialogTitle id="success-submit-dialog-title" color='success'>{"Entrega Exitosa"}</DialogTitle>
        <DialogContent>
          <Alert severity="success">
            {/* Usamos submissionDetails para la calificación, que se actualiza al enviar */}
            {activityDetails?.type === 'Quiz' && submissionDetails?.calificacion !== undefined && submissionDetails.calificacion !== null ?
              `¡Tu entrega ha sido registrada! Tu calificación obtenida es: ${submissionDetails.calificacion.toFixed(2)} / ${assignmentDetails?.puntos_maximos !== undefined ? assignmentDetails.puntos_maximos : 'N/A'}`
              : '¡Tu entrega ha sido registrada con éxito!'}
            <br />
            {activityDetails?.type === 'Cuestionario' && "Tu entrega será revisada manualmente por el docente."}
            {activityDetails?.type === 'Trabajo' && "Tu trabajo ha sido enviado y será revisado por el docente."}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSuccessModalAndRedirect} color="secondary"> Volver a la Ruta </Button>
        </DialogActions>
      </Dialog>

      {/* Modal for Auto-Save / Activity Closed by Teacher */}
      <Modal
        open={isActivityClosedByTeacher}
        aria-labelledby="autosave-modal-title"
        aria-describedby="autosave-modal-description"
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          style: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }, // Darker backdrop
        }}
        // Prevent closing by clicking backdrop or escape key
        // onClose={(event, reason) => { if (reason !== "backdropClick" && reason !== "escapeKeyDown") { /* handle potential close if needed */ } }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400, md: 500 }, // Responsive width
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
          textAlign: 'center',
          borderRadius: 2,
        }}>
          <Typography id="autosave-modal-title" variant="h5" component="h2" color="primary.main" gutterBottom>
            Actividad Cerrada por el Docente
          </Typography>
          <Typography id="autosave-modal-description" sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
            {autoSaveMessage}
          </Typography>
          {isAutoSaving && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
              <CircularProgress sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">Guardando progreso...</Typography>
            </Box>
          )}
           {/* Optionally, a button to acknowledge if not auto-redirecting or on error */}
           {!isAutoSaving && autoSaveMessage && autoSaveMessage.toLowerCase().includes("error") && (
             <Button variant="outlined" color="error" onClick={() => navigate(determineRedirectPath())}>
                Entendido, salir
             </Button>
           )}
        </Box>
      </Modal>

    </Container>
  );
}
export default StudentTakeActivityPage;