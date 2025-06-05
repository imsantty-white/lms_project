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

  // States for timer
  const [tiempoLimite, setTiempoLimite] = useState(null);
  const [attemptStartTime, setAttemptStartTime] = useState(null);
  const [submissionId, setSubmissionId] = useState(null); // This will hold the ID of an 'InProgress' submission
  const [remainingTime, setRemainingTime] = useState(0); // in seconds
  const [isActiveTimer, setIsActiveTimer] = useState(false);


  // States for WebSocket driven auto-save when teacher closes activity
  const [isActivityClosedByTeacher, setIsActivityClosedByTeacher] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const socket = useSocket(); // Get socket instance

  const determineRedirectPath = () => {
    if (assignmentDetails?.theme_id?.module_id?.learning_path_id?._id) {
      return `/student/learning-paths/${assignmentDetails.theme_id.module_id.learning_path_id._id}/view`;
    }
    toast.warn("No se pudo determinar la ruta de aprendizaje, redirigiendo a la lista general.");
    return '/student/learning-paths';
  };

  // Wrapped handleSubmitAttempt in useCallback to satisfy useEffect dependency linting for timer effects
  const handleSubmitAttemptCallback = React.useCallback(async (isAuto = false) => {
    if (!isAuto) handleCloseConfirmDialog(); // Close confirmation dialog if not an auto-submission

    setIsSubmitting(true);

    try {
      const url = `/api/activities/student/${assignmentId}/submit-attempt`;
      let payload = {};
      if (activityDetails.type === 'Quiz' || activityDetails.type === 'Cuestionario') {
        payload = { studentAnswers };
      } else if (activityDetails.type === 'Trabajo') {
        payload = { trabajoLink };
      } else {
        toast.error('Tipo de actividad no soportado para envío.');
        setIsSubmitting(false);
        return;
      }

      if (submissionId) { // Include submissionId if available (for timed activities)
        payload.submissionId = submissionId;
      }

      if (isAuto) { // If it's an auto-submit (timer expired or teacher closed)
        payload.isAutoSaveDueToClosure = isActivityClosedByTeacher; // True if teacher closed, false if timer just expired
        // For timed auto-submit, the backend will set is_timed_auto_submit based on time check
      }


      console.log('Frontend: Enviando respuestas...');
      console.log('Frontend: URL:', url);
      console.log('Frontend: Payload:', payload);

      const response = await axiosInstance.post(url, payload);
      console.log('Intento enviado con éxito:', response.data);

      setHasSubmitted(true);
      setAttemptsUsed(prev => prev + 1);
      setSubmissionDetails(response.data.submission);
      setIsActiveTimer(false); // Stop timer on successful submission

      if (isAuto) { // If auto-submitted (e.g. timer ran out or teacher closed)
        setAutoSaveMessage(response.data.message || 'Tu progreso ha sido guardado automáticamente. Serás redirigido.');
        setIsAutoSaving(false); // Ensure auto-saving state is reset
        setTimeout(() => {
          navigate(determineRedirectPath());
        }, 4000);
      } else {
        setIsSuccessModalOpen(true); // Open manual success modal
      }

    } catch (err) {
      console.error('Error submitting attempt:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al enviar tus respuestas.';
      toast.error(errorMessage);
       if (isAuto) {
         setAutoSaveMessage(errorMessage);
         setIsAutoSaving(false);
       }
    } finally {
      if (!isAuto) setIsSubmitting(false); // Only reset for manual submit, auto might be followed by redirect
    }
  }, [assignmentId, activityDetails, studentAnswers, trabajoLink, submissionId, navigate, isActivityClosedByTeacher, determineRedirectPath]);


  // WebSocket listener for assignment closure
  useEffect(() => {
    if (socket && assignmentId && activityDetails) { // Ensure activityDetails is available for type check
      const handleAssignmentClosed = (data) => {
        if (data.assignmentId === assignmentId) {
          console.log(`Activity ${data.title} (ID: ${data.assignmentId}) closed by teacher. Initiating auto-save.`);
          setIsActivityClosedByTeacher(true); // Set flag
          setAutoSaveMessage(`La actividad '${data.title}' ha sido cerrada por el docente. Guardando tu progreso actual...`);
          setIsAutoSaving(true);
          handleSubmitAttemptCallback(true); // Call auto-submit
        }
      };

      socket.on('assignmentClosed', handleAssignmentClosed);
      return () => socket.off('assignmentClosed', handleAssignmentClosed);
    }
  }, [socket, assignmentId, activityDetails, handleSubmitAttemptCallback]);


  // Efecto para cargar los detalles de la actividad y la asignación
  useEffect(() => {
    if (isAuthInitialized) {
      if (isAuthenticated && user?.userType === 'Estudiante') {
        const fetchActivityData = async () => {
          if (!assignmentId) {
            setFetchError('ID de asignación no proporcionado en la URL.');
            setIsLoading(false);
            return;
          }
          setIsLoading(true);
          setFetchError(null);
          // Reset relevant states
          setAssignmentDetails(null);
          setActivityDetails(null);
          setStudentAnswers({});
          setAttemptsUsed(0);
          setTrabajoLink('');
          setLastSubmissionDetails(null);
          setHasSubmitted(false);
          setSubmissionDetails(null);
          setIsLastSubmissionExpanded(false);
          // Reset timer states
          setTiempoLimite(null);
          setAttemptStartTime(null);
          setSubmissionId(null);
          setRemainingTime(0);
          setIsActiveTimer(false);


          try {
            const response = await axiosInstance.get(`/api/activities/student/${assignmentId}/start`);
            console.log("Datos de actividad para intento cargados:", response.data);

            setAssignmentDetails(response.data.assignmentDetails);
            setActivityDetails(response.data.activityDetails);
            setAttemptsUsed(response.data.attemptsUsed);
            setLastSubmissionDetails(response.data.lastSubmission);

            // Store timer-related data from response
            if (response.data.tiempo_limite && response.data.attempt_start_time && response.data.submissionId) {
              setTiempoLimite(response.data.tiempo_limite);
              setAttemptStartTime(response.data.attempt_start_time);
              setSubmissionId(response.data.submissionId); // This is the ID of the 'InProgress' submission
            }

            setFetchError(null);

            if (response.data.lastSubmission) {
              if (response.data.lastSubmission.calificacion !== undefined && response.data.lastSubmission.calificacion !== null) {
                setIsGraded(true);
              } else {
                setIsGraded(false);
              }
              if (response.data.activityDetails?.type === 'Trabajo' && response.data.lastSubmission.respuesta?.link_entrega) {
                setTrabajoLink(response.data.lastSubmission.respuesta.link_entrega);
              }
            } else {
              setIsGraded(false);
            }
          } catch (err) {
            console.error('Error fetching activity data:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar la actividad.';
            setFetchError(errorMessage);
            toast.error(errorMessage);
          } finally {
            setIsLoading(false);
          }
        };
        fetchActivityData();
      } else {
        setFetchError('Debes iniciar sesión como estudiante para ver esta página.');
        setIsLoading(false);
      }
    }
  }, [assignmentId, user, isAuthenticated, isAuthInitialized]);

  // Effect to initialize and manage the timer once data is fetched
  useEffect(() => {
    if (tiempoLimite && attemptStartTime && submissionId && !hasSubmitted && !isActivityClosedByTeacher) { // Only run if timed, submissionId exists, not submitted, and not closed by teacher
      const serverStartTimeMs = new Date(attemptStartTime).getTime();
      const nowMs = Date.now();
      const elapsedSeconds = Math.max(0, (nowMs - serverStartTimeMs) / 1000); // Ensure elapsedSeconds is not negative
      const initialRemainingSeconds = Math.round((tiempoLimite * 60) - elapsedSeconds);

      if (initialRemainingSeconds <= 0) {
        toast.info("El tiempo para esta actividad ha expirado. Enviando automáticamente...");
        handleSubmitAttemptCallback(true); // Auto-submit
      } else {
        setRemainingTime(initialRemainingSeconds);
        setIsActiveTimer(true);
      }
    } else {
      setIsActiveTimer(false); // Ensure timer is not active if conditions aren't met
    }
  }, [tiempoLimite, attemptStartTime, submissionId, handleSubmitAttemptCallback, hasSubmitted, isActivityClosedByTeacher]);


  // Countdown timer effect
  useEffect(() => {
    if (!isActiveTimer || hasSubmitted || isActivityClosedByTeacher) return; // also stop if submitted or closed

    if (remainingTime <= 0) {
      setIsActiveTimer(false);
      toast.info("Tiempo agotado. Enviando respuestas...");
      handleSubmitAttemptCallback(true); // Auto-submit
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingTime(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActiveTimer, remainingTime, handleSubmitAttemptCallback, hasSubmitted, isActivityClosedByTeacher]);


  // --- Calcular intentos restantes ---
  const remainingAttempts = assignmentDetails?.intentos_permitidos !== undefined && assignmentDetails.intentos_permitidos !== null
    ? assignmentDetails.intentos_permitidos - attemptsUsed
    : null;
  // ---------------------------------

  const canTakeNewAttempt = (() => {
    if (!assignmentDetails || !activityDetails) return false;

    // If it's a timed activity with an active timer or an 'InProgress' submission, allow interaction
    if (submissionId && (isActiveTimer || tiempoLimite > 0)) { // Check isActiveTimer OR if it was ever a timed activity
      return !hasSubmitted && !isActivityClosedByTeacher; // Allow if not submitted and not closed by teacher
    }

    // Original logic for non-timed or already completed/non-started timed activities
    const hasRemainingAttempts = (remainingAttempts === null || remainingAttempts > 0);
    const notSubmittedInThisSession = !hasSubmitted;
    let isBlockingByGrading = false;
    if (activityDetails.type === 'Cuestionario' || activityDetails.type === 'Trabajo') {
      isBlockingByGrading = isGraded;
    }
    return hasRemainingAttempts && notSubmittedInThisSession && !isBlockingByGrading && !isActivityClosedByTeacher;
  })();


  // --- Lógica para capturar respuestas del estudiante ---
  const handleAnswerChange = (questionId, answer) => {
    setStudentAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer
    }));
    console.log(`Respuesta para pregunta ${questionId}:`, answer);
  };

  const _handleMultipleAnswerChange = (questionId, optionId, isChecked) => {
    setStudentAnswers(prevAnswers => {
      const currentAnswers = prevAnswers[questionId] || [];
      const newAnswers = isChecked
        ? [...currentAnswers, optionId]
        : currentAnswers.filter(id => id !== optionId);

      return {
        ...prevAnswers,
        [questionId]: newAnswers
      };
    });
    console.log(`Respuesta múltiple cambiada para pregunta ${questionId}:`, studentAnswers);
  };

  const handleOpenConfirmDialog = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setIsConfirmDialogOpen(false);
  };

  const handleCloseSuccessModalAndRedirect = () => {
    setIsSuccessModalOpen(false);
    if (assignmentDetails?.theme_id?.module_id?.learning_path_id?._id) {
      const learningPathId = assignmentDetails.theme_id.module_id.learning_path_id._id;
      navigate(`/student/learning-paths/${learningPathId}/view`);
    } else {
      console.warn('Could not determine learning path ID, redirecting to my learning paths list.');
      navigate('/student/learning-paths');
    }
  };

  // Use the callback version for the dialog confirmation
  const handleSubmitAttemptFromDialog = () => {
    handleSubmitAttemptCallback(false); // false indicates it's not an auto-submission
  };

  // Function to format time (MM:SS)
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleToggleLastSubmission = () => {
    setIsLastSubmissionExpanded(prev => !prev);
  };

  // --- Renderizado de la Página ---

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            {isAuthInitialized ? 'Cargando actividad...' : 'Inicializando autenticación...'}
          </Typography>
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

  if (!assignmentDetails || !activityDetails) {
      return (
        <Container>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Actividad no encontrada o no disponible.</Typography>
          </Box>
        </Container>
    );
  }

  const questionsToRender = activityDetails.type === 'Quiz'
    ? activityDetails.quiz_questions
    : activityDetails.type === 'Cuestionario'
      ? activityDetails.cuestionario_questions
      : [];

return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {activityDetails.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {activityDetails.description || 'Sin descripción.'}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          {assignmentDetails?.puntos_maximos !== undefined && assignmentDetails.puntos_maximos !== null && (
            <Chip label={`Pts máximos: ${assignmentDetails.puntos_maximos}`} size="small" variant="outlined" />
          )}
          {assignmentDetails?.intentos_permitidos !== undefined && assignmentDetails.intentos_permitidos !== null ? (
            <Chip label={`Intentos permitidos: ${assignmentDetails.intentos_permitidos}`} size="small" variant="outlined" />
          ) : (
             <Chip label={`Intentos permitidos: Ilimitados`} size="small" variant="outlined" />
          )}
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
          {/* Display Timer if active */}
          {isActiveTimer && tiempoLimite && (
            <Chip
              label={`Tiempo Restante: ${formatTime(remainingTime)}`}
              size="small"
              color={remainingTime < 60 ? "error" : "primary"} // Change color if less than 1 minute
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          )}
           {/* Display original tiempo_limite if not active but was set */}
          {!isActiveTimer && tiempoLimite && !hasSubmitted && (
             <Chip label={`Tiempo límite: ${tiempoLimite} min`} size="small" variant="outlined" />
          )}

        </Stack>

        {lastSubmissionDetails && (
          <Paper elevation={2} sx={{ mb: 4 }}>
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

            <Collapse in={isLastSubmissionExpanded}>
              <Box sx={{ p: 3, pt: 0 }}>
                <Divider sx={{ mb: 2 }} />
                
                {activityDetails.type === 'Quiz' && lastSubmissionDetails.respuesta?.quiz_answers && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Reporte de Respuestas:</Typography>
                    <List dense>
                      {lastSubmissionDetails.respuesta.quiz_answers.map((answer, qIndex) => {
                        const originalQuestion = Array.isArray(questionsToRender) && questionsToRender[answer.question_index] ? questionsToRender[answer.question_index] : null;
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

      {canTakeNewAttempt ? (
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
                                                          disabled={hasSubmitted || !canTakeNewAttempt || isActivityClosedByTeacher || (isActiveTimer && remainingTime <=0) }
                                                      />
                                                  ) : activityDetails.type === 'Quiz' && question.options && question.options.length > 0 ? (
                                                      <FormControl component="fieldset">
                                                          <FormLabel component="legend"> Selecciona una opción: </FormLabel>
                                                          <RadioGroup
                                                              value={studentAnswers[question._id] || ''}
                                                              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                                                              disabled={hasSubmitted || !canTakeNewAttempt || isActivityClosedByTeacher || (isActiveTimer && remainingTime <=0) }
                                                          >
                                                              {question.options.map((option, optionIndex) => (
                                                                  <FormControlLabel key={optionIndex} value={option} control={<Radio sx={{ '&.Mui-checked': { color: '#f00c8d' }}}/>} label={option} disabled={isActivityClosedByTeacher || (isActiveTimer && remainingTime <=0)} />
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
                  <Box sx={{ mt: 4, textAlign: 'center' }}>
                      <Button
                          variant="contained" color="primary" onClick={handleOpenConfirmDialog}
                          disabled={isSubmitting || !questionsToRender || questionsToRender.length === 0 || !canTakeNewAttempt || isActivityClosedByTeacher || (isActiveTimer && remainingTime <=0)}
                      >
                          {isActivityClosedByTeacher ? "Actividad Cerrada" : (isActiveTimer && remainingTime <=0 ? "Tiempo Agotado" : "Enviar Respuestas")}
                      </Button>
                  </Box>
              </Paper>
          ) : activityDetails.type === 'Trabajo' ? (
              <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom> Trabajo: {activityDetails.title} </Typography>
                  <Typography variant="body1"> {activityDetails.description || 'Sin descripción para el trabajo.'} </Typography>
                  <Box sx={{ mt: 3 }}>
                      <TextField
                          label="Enlace de tu entrega (URL)" fullWidth margin="normal"
                          value={trabajoLink} onChange={(e) => setTrabajoLink(e.target.value)}
                          disabled={isSubmitting || !canTakeNewAttempt || isActivityClosedByTeacher || (isActiveTimer && remainingTime <=0)}
                      />
                      <Box sx={{ mt: 4, textAlign: 'center' }}>
                          <Button
                              variant="contained" color="primary" onClick={handleOpenConfirmDialog}
                              disabled={isSubmitting || !trabajoLink.trim() || !canTakeNewAttempt || isActivityClosedByTeacher || (isActiveTimer && remainingTime <=0)}
                          >
                              {isActivityClosedByTeacher ? "Actividad Cerrada" : (isActiveTimer && remainingTime <=0 ? "Tiempo Agotado" : "Enviar Trabajo")}
                          </Button>
                      </Box>
                  </Box>
              </Paper>
          ) : null
      ) : (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Alert severity="info">
                  {isActivityClosedByTeacher ? "Esta actividad ha sido cerrada por el docente." :
                   (activityDetails.type === 'Quiz' ?
                      `Has utilizado todos tus ${assignmentDetails.intentos_permitidos} intentos permitidos para esta actividad.`
                  : (
                      isGraded
                          ? 'Esta actividad ya ha sido calificada. No puedes realizar más entregas.'
                          : `Has utilizado todos tus ${assignmentDetails.intentos_permitidos} intentos permitidos para esta actividad.`
                  ))}
              </Alert>
          </Box>
      )}

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
      >
        <DialogTitle id="confirm-submit-dialog-title">{"Confirmar Envío"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-submit-dialog-description">
              Una vez que envíes, no podrás cambiar tu entrega para este intento. ¿Estás seguro de enviar?
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
                onClick={handleSubmitAttemptFromDialog} color="primary" // Use the callback version here
                disabled={isSubmitting || !canTakeNewAttempt || (isActiveTimer && remainingTime <=0)}
            >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
                {isSubmitting && <CircularProgress size={15} sx={{ ml: 1 }} />}
            </Button>
        </DialogActions>
      </Dialog>

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