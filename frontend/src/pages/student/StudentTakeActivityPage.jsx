// src/pages/StudentTakeActivityPage.jsx

import React, { useState, useEffect, useCallback } from 'react'; // Añadido useCallback
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, CircularProgress, Alert, Button, Paper,
  RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, TextField,
  Divider, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItem, ListItemText, Stack, Collapse, IconButton, Modal, Backdrop
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

function StudentTakeActivityPage() {
  const { assignmentId } = useParams();
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const navigate = useNavigate();

  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [activityDetails, setActivityDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trabajoLink, setTrabajoLink] = useState('');
  const [studentAnswers, setStudentAnswers] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [lastSubmissionDetails, setLastSubmissionDetails] = useState(null);
  const [isGraded, setIsGraded] = useState(false);
  const [isLastSubmissionExpanded, setIsLastSubmissionExpanded] = useState(false);
  const [isActivityClosedByTeacher, setIsActivityClosedByTeacher] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Nuevos estados para el cronómetro
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [fechaInicioIntento, setFechaInicioIntento] = useState(null);
  const [tiempoLimiteMinutos, setTiempoLimiteMinutos] = useState(null);
  const [tiempoRestanteSegundos, setTiempoRestanteSegundos] = useState(null);
  const [cronometroActivo, setCronometroActivo] = useState(false);
  const [intentoActualCompletado, setIntentoActualCompletado] = useState(false);

  const socket = useSocket();

  const determineRedirectPath = useCallback(() => {
    if (assignmentDetails?.theme_id?.module_id?.learning_path_id?._id) {
      return `/student/learning-paths/${assignmentDetails.theme_id.module_id.learning_path_id._id}/view`;
    }
    toast.warn("No se pudo determinar la ruta de aprendizaje, redirigiendo a la lista general.");
    return '/student/learning-paths';
  }, [assignmentDetails]);

  const handleForceSubmitByTime = useCallback(async () => {
    if (intentoActualCompletado || !currentSubmissionId) return;
    setIntentoActualCompletado(true);
    setIsSubmitting(true);
    setCronometroActivo(false);

    try {
        const url = `/api/activities/student/${assignmentId}/submit-attempt`;
        let payload = {
            submissionId: currentSubmissionId,
            isAutoSaveDueToClosure: false, // No es por cierre del profesor
            tiempoAgotado: true // Indicar que fue por tiempo
        };

        if (activityDetails?.type === 'Quiz' || activityDetails?.type === 'Cuestionario') {
            payload.studentAnswers = studentAnswers;
        }
        // No se envía trabajoLink aquí porque el cronómetro es para Quiz/Cuestionario

        console.log('Frontend: Forzando envío por tiempo...');
        const response = await axiosInstance.post(url, payload);
        setSubmissionDetails(response.data.submission);
        setIsSuccessModalOpen(true);
        toast.info("El tiempo ha terminado. Tu actividad ha sido enviada.");
    } catch (err) {
        console.error('Error en envío forzado por tiempo:', err.response ? err.response.data : err.message);
        toast.error(err.response?.data?.message || 'Error al enviar tu actividad por tiempo agotado.');
    } finally {
        setIsSubmitting(false);
    }
  }, [assignmentId, activityDetails, studentAnswers, currentSubmissionId, intentoActualCompletado, axiosInstance]);


  useEffect(() => {
    if (socket && assignmentId) {
      const handleAssignmentClosed = async (data) => {
        if (data.assignmentId === assignmentId && !intentoActualCompletado) { // Verificar que no se haya completado ya
          console.log(`Activity ${data.title} (ID: ${data.assignmentId}) closed by teacher. Initiating auto-save.`);

          setCronometroActivo(false); // Detener cronómetro si estaba activo
          setIntentoActualCompletado(true); // Marcar como completado para evitar otros envíos
          setIsActivityClosedByTeacher(true); // Mostrar UI de actividad cerrada
          setAutoSaveMessage(`La actividad '${data.title}' ha sido cerrada por el docente. Guardando tu progreso actual...`);
          setIsAutoSaving(true);

          let payload = { isAutoSaveDueToClosure: true };
          if (currentSubmissionId) { // Si hay un intento en progreso, enviarlo
            payload.submissionId = currentSubmissionId;
          }

          if (activityDetails?.type === 'Quiz' || activityDetails?.type === 'Cuestionario') {
            payload.studentAnswers = studentAnswers;
          } else if (activityDetails?.type === 'Trabajo') {
            payload.trabajoLink = trabajoLink;
          } else {
            setAutoSaveMessage('Error: No se pudo determinar el tipo de actividad para el guardado automático.');
            setIsAutoSaving(false);
            return;
          }

          try {
            const response = await axiosInstance.post(`/api/activities/student/${assignmentId}/submit-attempt`, payload);
            setAutoSaveMessage(response.data.message || 'Tu progreso ha sido guardado. Serás redirigido en unos segundos...');
            setSubmissionDetails(response.data.submission); // Actualizar con la respuesta del auto-guardado
          } catch (err) {
            console.error('Error during auto-save due to closure:', err);
            setAutoSaveMessage(err.response?.data?.message || 'Ocurrió un error al guardar tu progreso. Por favor, notifica a tu docente.');
          } finally {
            setIsAutoSaving(false);
            setTimeout(() => {
              navigate(determineRedirectPath());
            }, 4000);
          }
        }
      };
      socket.on('assignmentClosed', handleAssignmentClosed);
      return () => {
        socket.off('assignmentClosed', handleAssignmentClosed);
      };
    }
  }, [socket, assignmentId, navigate, studentAnswers, trabajoLink, activityDetails, determineRedirectPath, currentSubmissionId, intentoActualCompletado]);

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
          setAssignmentDetails(null);
          setActivityDetails(null);
          setStudentAnswers({});
          setAttemptsUsed(0);
          setTrabajoLink('');
          setLastSubmissionDetails(null);
          setHasSubmitted(false);
          setSubmissionDetails(null);
          setIsLastSubmissionExpanded(false);
          // Resetear estados del cronómetro
          setCurrentSubmissionId(null);
          setFechaInicioIntento(null);
          setTiempoLimiteMinutos(null);
          setTiempoRestanteSegundos(null);
          setCronometroActivo(false);
          setIntentoActualCompletado(false);


          try {
              const response = await axiosInstance.get(`/api/activities/student/${assignmentId}/start`);
              console.log("Datos de actividad para intento cargados:", response.data);

              setAssignmentDetails(response.data.assignmentDetails);
              setActivityDetails(response.data.activityDetails);
              setAttemptsUsed(response.data.attemptsUsed);
              setLastSubmissionDetails(response.data.lastSubmission);
              setFetchError(null);

              if (response.data.currentSubmissionId) {
                  setCurrentSubmissionId(response.data.currentSubmissionId);
              }
              if (response.data.fecha_inicio_intento) {
                  setFechaInicioIntento(response.data.fecha_inicio_intento);
              }

              const activityType = response.data.activityDetails?.type;
              const tiempoLimite = response.data.tiempo_limite_minutos;

              if (tiempoLimite && tiempoLimite > 0 && (activityType === 'Quiz' || activityType === 'Cuestionario')) {
                  setTiempoLimiteMinutos(tiempoLimite);
                  setIntentoActualCompletado(false);

                  if (response.data.fecha_inicio_intento) { // Intento cronometrado ya iniciado
                      const fechaInicioMs = new Date(response.data.fecha_inicio_intento).getTime();
                      const ahoraMs = Date.now();
                      const tiempoTranscurridoSegundos = Math.floor((ahoraMs - fechaInicioMs) / 1000);
                      const tiempoLimiteTotalSegundos = tiempoLimite * 60;
                      const restante = tiempoLimiteTotalSegundos - tiempoTranscurridoSegundos;

                      if (restante <= 0) {
                          setTiempoRestanteSegundos(0);
                          setCronometroActivo(false);
                          // No llamar a handleForceSubmitByTime aquí directamente, useEffect del cronómetro lo hará.
                      } else {
                          setTiempoRestanteSegundos(restante);
                          setCronometroActivo(true);
                      }
                  } else if (response.data.currentSubmissionId) {
                      // Esto implica que el backend creó una submission para el intento actual PERO no devolvió fecha_inicio_intento
                      // Lo cual sería un estado inesperado si hay tiempo_limite_minutos.
                      // Asumimos que si hay currentSubmissionId Y tiempo_limite_minutos, SIEMPRE debe haber fecha_inicio_intento.
                      // Si el backend no la devuelve, puede ser un error o el intento aún no ha "comenzado" formalmente.
                      // Por seguridad, si hay tiempoLimite pero no fechaInicio, no iniciamos el cronómetro aquí.
                      // El backend debería haber seteado fecha_inicio_intento al crear la submission 'en_progreso'.
                      console.warn("Intento cronometrado tiene currentSubmissionId pero no fecha_inicio_intento. El cronómetro no se activará hasta que el backend lo confirme.");
                      setCronometroActivo(false);
                  }
              } else {
                  setCronometroActivo(false);
                  setTiempoLimiteMinutos(null);
                  setTiempoRestanteSegundos(null);
              }

              if (response.data.lastSubmission) {
                  if (response.data.lastSubmission.calificacion !== undefined && response.data.lastSubmission.calificacion !== null) {
                      setIsGraded(true);
                  } else {
                      setIsGraded(false);
                  }
                  if (activityDetails?.type === 'Trabajo' && response.data.lastSubmission.respuesta?.link_entrega) {
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

  useEffect(() => {
    if (!cronometroActivo || tiempoRestanteSegundos === null || intentoActualCompletado || isActivityClosedByTeacher) {
        return;
    }
    if (tiempoRestanteSegundos <= 0) {
        setCronometroActivo(false);
        if (!isSubmitting && !intentoActualCompletado) {
             console.log("Tiempo agotado, forzando envío...");
             toast.warn("¡Tiempo agotado! Enviando tus respuestas...");
             handleForceSubmitByTime();
        }
        return;
    }
    const intervalId = setInterval(() => {
        setTiempoRestanteSegundos(prev => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [cronometroActivo, tiempoRestanteSegundos, intentoActualCompletado, isActivityClosedByTeacher, isSubmitting, handleForceSubmitByTime]);


  const remainingAttempts = assignmentDetails?.intentos_permitidos !== undefined && assignmentDetails.intentos_permitidos !== null
    ? assignmentDetails.intentos_permitidos - attemptsUsed
    : null;

  const canTakeNewAttempt = (() => {
      if (!assignmentDetails || !activityDetails) return false;
      if (intentoActualCompletado) return false; // Si el intento actual ya se envió/completó
      if (isActivityClosedByTeacher) return false; // Si la actividad fue cerrada por el profesor

      // Si es una actividad con tiempo y ya hay un intento en progreso (currentSubmissionId),
      // se debe continuar ese intento, no iniciar uno nuevo.
      if (tiempoLimiteMinutos && currentSubmissionId) {
          return true; // Permite continuar el intento actual
      }

      const hasRemainingAttempts = (remainingAttempts === null || remainingAttempts > 0);
      const notSubmittedInThisSession = !hasSubmitted; // 'hasSubmitted' se refiere a un envío manual exitoso en esta carga de página
      let isBlockingByGrading = false;
      if (activityDetails.type === 'Cuestionario' || activityDetails.type === 'Trabajo') {
          isBlockingByGrading = isGraded;
      }
      return hasRemainingAttempts && notSubmittedInThisSession && !isBlockingByGrading;
  })();

  const handleAnswerChange = (questionId, answer) => {
    setStudentAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer
    }));
  };

  const handleOpenConfirmDialog = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setIsConfirmDialogOpen(false);
  };

  const handleCloseSuccessModalAndRedirect = () => {
    setIsSuccessModalOpen(false);
    navigate(determineRedirectPath());
  };

  const handleSubmitAttempt = async () => {
    handleCloseConfirmDialog();
    if (intentoActualCompletado) return; // Prevenir doble envío si ya se está procesando o se completó

    if (cronometroActivo) { // Si hay un cronómetro activo, el envío manual lo detiene y marca como completado
        setCronometroActivo(false);
    }
    setIntentoActualCompletado(true);
    setIsSubmitting(true);

    try {
      const url = `/api/activities/student/${assignmentId}/submit-attempt`;
      let payload = {};
      if (currentSubmissionId) { // Si es un intento cronometrado que se está continuando/finalizando
          payload.submissionId = currentSubmissionId;
      }

      if (activityDetails.type === 'Quiz' || activityDetails.type === 'Cuestionario') {
        payload.studentAnswers = studentAnswers;
      } else if (activityDetails.type === 'Trabajo') {
        payload.trabajoLink = trabajoLink;
      } else {
        toast.error('Tipo de actividad no soportado para envío.');
        setIsSubmitting(false);
        setIntentoActualCompletado(false); // Revertir si no se envía
        return;
      }

      const response = await axiosInstance.post(url, payload);
      setHasSubmitted(true);
      setAttemptsUsed(prev => prev + 1);
      setSubmissionDetails(response.data.submission);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error('Error submitting attempt:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al enviar tus respuestas.';
      toast.error(errorMessage);
      setIntentoActualCompletado(false); // Permitir reintentar si el envío falló
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLastSubmission = () => {
    setIsLastSubmissionExpanded(prev => !prev);
  };

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

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          {assignmentDetails?.puntos_maximos !== undefined && assignmentDetails.puntos_maximos !== null && (
            <Chip label={`Pts máximos: ${assignmentDetails.puntos_maximos}`} size="small" variant="outlined" />
          )}
          {assignmentDetails?.intentos_permitidos !== undefined && assignmentDetails.intentos_permitidos !== null ? (
            <Chip label={`Intentos permitidos: ${assignmentDetails.intentos_permitidos}`} size="small" variant="outlined" />
          ) : (
                <Chip label={`Intentos permitidos: Ilimitados`} size="small" variant="outlined" />
            )}
          {attemptsUsed !== undefined && ( // Muestra intentos usados si está definido
             <Chip label={`Intentos totales realizados: ${attemptsUsed}`} size="small" variant="outlined" />
          )}
          {/* Mostrar el cronómetro si está activo */}
        </Stack>
         {cronometroActivo && tiempoRestanteSegundos !== null && !intentoActualCompletado && !isActivityClosedByTeacher && (
             <Chip
                 label={`Tiempo Restante: ${Math.floor(tiempoRestanteSegundos / 60)}:${('0' + (tiempoRestanteSegundos % 60)).slice(-2)}`}
                 color={tiempoRestanteSegundos < 60 ? "error" : "primary"}
                 sx={{ mt:1, mb: 2, fontSize: '1rem', padding: '10px' }}
             />
         )}
        {lastSubmissionDetails && (
          <Paper elevation={2} sx={{ mb: 4, mt: 2 }}>
            <Box 
              sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover'}}}
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
                        const originalQuestion = Array.isArray(activityDetails.quiz_questions) && activityDetails.quiz_questions[answer.question_index] ? activityDetails.quiz_questions[answer.question_index] : null;
                        const hasAnswer = (Array.isArray(answer.student_answer) && answer.student_answer.length > 0) || 
                                          (typeof answer.student_answer === 'string' && answer.student_answer.trim() !== '');
                        return (
                          <ListItem key={qIndex}>
                            <ListItemText
                              primary={`Q${answer.question_index + 1}: ${originalQuestion ? originalQuestion.text : 'Pregunta desconocida'}`}
                              secondary={hasAnswer ? `Tu respuesta: ${answer.student_answer}` : 'Respuesta NO seleccionada'}
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
                        const originalQuestion = Array.isArray(activityDetails.cuestionario_questions) && activityDetails.cuestionario_questions[answer.question_index] ? activityDetails.cuestionario_questions[answer.question_index] : null;
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

      {canTakeNewAttempt && !isActivityClosedByTeacher ? (
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
                                                          disabled={isSubmitting || isActivityClosedByTeacher || intentoActualCompletado}
                                                      />
                                                  ) : activityDetails.type === 'Quiz' && question.options && question.options.length > 0 ? (
                                                      <FormControl component="fieldset" disabled={isSubmitting || isActivityClosedByTeacher || intentoActualCompletado}>
                                                          <FormLabel component="legend"> Selecciona una opción: </FormLabel>
                                                          <RadioGroup
                                                              value={studentAnswers[question._id] || ''}
                                                              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                                                          >
                                                              {question.options.map((option, optionIndex) => (
                                                                  <FormControlLabel key={optionIndex} value={option} control={<Radio sx={{ '&.Mui-checked': { color: '#f00c8d' }}}/>} label={option} />
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
                          disabled={isSubmitting || !questionsToRender || questionsToRender.length === 0 || isActivityClosedByTeacher || intentoActualCompletado}
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
                      <TextField
                          label="Enlace de tu entrega (URL)" fullWidth margin="normal"
                          value={trabajoLink} onChange={(e) => setTrabajoLink(e.target.value)}
                          disabled={isSubmitting || isActivityClosedByTeacher || intentoActualCompletado}
                      />
                      <Box sx={{ mt: 4, textAlign: 'center' }}>
                          <Button
                              variant="contained" color="primary" onClick={handleOpenConfirmDialog}
                              disabled={isSubmitting || !trabajoLink.trim() || isActivityClosedByTeacher || intentoActualCompletado}
                          >
                              {isActivityClosedByTeacher ? "Actividad Cerrada" : "Enviar Trabajo"}
                          </Button>
                      </Box>
                  </Box>
              </Paper>
          ) : null
      ) : (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Alert severity={isActivityClosedByTeacher ? "warning" : "info"}>
                  {isActivityClosedByTeacher
                    ? "Esta actividad ha sido cerrada por el docente. No se pueden realizar más envíos."
                    : (activityDetails.type === 'Quiz'
                        ? `Has utilizado todos tus ${assignmentDetails.intentos_permitidos} intentos permitidos para esta actividad.`
                        : (isGraded
                            ? 'Esta actividad ya ha sido calificada. No puedes realizar más entregas.'
                            : `Has utilizado todos tus ${assignmentDetails.intentos_permitidos} intentos permitidos para esta actividad.`))
                  }
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
              {tiempoLimiteMinutos && cronometroActivo && tiempoRestanteSegundos > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{mt:1}}>
                    Tiempo restante: {Math.floor(tiempoRestanteSegundos / 60)}:{('0' + (tiempoRestanteSegundos % 60)).slice(-2)}
                </Typography>
              )}
              {remainingAttempts !== null && (
                  <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                      Tendrás {Math.max(0, remainingAttempts - (currentSubmissionId ? 0 : 1) )} intento{Math.max(0, remainingAttempts - (currentSubmissionId ? 0 : 1)) !== 1 ? 's' : ''} restante{Math.max(0, remainingAttempts - (currentSubmissionId ? 0 : 1)) !== 1 ? 's' : ''} después de este.
                  </Typography>
              )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseConfirmDialog} color="secondary" disabled={isSubmitting}> Cancelar </Button>
            <Button
                onClick={handleSubmitAttempt} color="primary"
                disabled={isSubmitting || !canTakeNewAttempt || isActivityClosedByTeacher || intentoActualCompletado }
            >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
                {isSubmitting && <CircularProgress size={15} sx={{ ml: 1 }} />}
            </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isSuccessModalOpen} disableEscapeKeyDown
        onClose={(event, reason) => { if (reason && reason === "backdropClick" || reason === "escapeKeyDown") return; handleCloseSuccessModalAndRedirect(); }}
        aria-labelledby="success-submit-dialog-title"
      >
        <DialogTitle id="success-submit-dialog-title" sx={{color: 'success.main'}}>{"Entrega Exitosa"}</DialogTitle>
        <DialogContent>
          <Alert severity="success">
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

      <Modal
        open={isActivityClosedByTeacher}
        aria-labelledby="autosave-modal-title"
        aria-describedby="autosave-modal-description"
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500, style: { backgroundColor: 'rgba(0, 0, 0, 0.8)' } }}
      >
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400, md: 500 }, bgcolor: 'background.paper',
          border: '2px solid #000', boxShadow: 24, p: { xs: 2, sm: 3, md: 4 },
          textAlign: 'center', borderRadius: 2,
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