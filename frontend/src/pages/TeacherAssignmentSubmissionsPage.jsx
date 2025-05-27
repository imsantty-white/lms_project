import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
  Button,
  List, ListItem, ListItemButton, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Divider,
  TextField,
  Link,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
// Añadido: iconos para mejorar la UX
import VisibilityIcon from '@mui/icons-material/Visibility';
import GradingIcon from '@mui/icons-material/Grading';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

function TeacherAssignmentSubmissionsPage() {
  const { assignmentId } = useParams();
  const { user, isAuthenticated, isAuthInitialized } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [manualGrade, setManualGrade] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState(null);
  const [showGradeSection, setShowGradeSection] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const handleViewDetailsClick = (submission) => {
    if (isSavingGrade) return;
    setSelectedSubmission(submission);
    setManualGrade(submission.calificacion !== undefined && submission.calificacion !== null ? String(submission.calificacion) : '');
    setGradeError(null);
    setShowGradeSection(false); // No mostrar sección de calificación
    setIsDetailsModalOpen(true);
  };
  
  const handleGradeClick = (submission) => {
    if (isSavingGrade) return;
    setSelectedSubmission(submission);
    setManualGrade(submission.calificacion !== undefined && submission.calificacion !== null ? String(submission.calificacion) : '');
    setGradeError(null);
    setShowGradeSection(true); // Mostrar sección de calificación
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = (event, reason) => {
    if (isSavingGrade) return;
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsDetailsModalOpen(false);
    setSelectedSubmission(null);
    setManualGrade('');
    setGradeError(null);
    setShowGradeSection(false);
  };

  const handleGradeChange = (e) => {
    setManualGrade(e.target.value);
    if (gradeError) setGradeError(null);
  };
  
  // Función para abrir el diálogo de confirmación
  const handleConfirmSaveGrade = () => {
    setIsConfirmDialogOpen(true);
  };
  
  // Función para cerrar el diálogo de confirmación
  const handleCloseConfirmDialog = () => {
    setIsConfirmDialogOpen(false);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    setIsConfirmDialogOpen(false);
    
    const puntosMaximos = selectedSubmission.assignment_id?.puntos_maximos;
    const gradeValue = manualGrade.trim() === '' ? null : parseFloat(manualGrade);
    if (manualGrade.trim() !== '' && (isNaN(gradeValue) || gradeValue < 0 || (puntosMaximos !== undefined && puntosMaximos !== null && gradeValue > puntosMaximos))) {
      setGradeError(
        puntosMaximos !== undefined && puntosMaximos !== null
          ? `Por favor, ingresa una calificación numérica válida entre 0 y ${puntosMaximos}.`
          : 'Por favor, ingresa una calificación numérica válida y positiva.'
      );
      return;
    }
    setIsSavingGrade(true);
    setGradeError(null);
    try {
      const response = await axiosInstance.put(`/api/submissions/${selectedSubmission._id}/grade`, { calificacion: gradeValue });
      console.log('Calificación guardada con éxito:', response.data);
      toast.success(response.data.message || 'Calificación guardada con éxito.');
      setSubmissions(prevSubmissions =>
        prevSubmissions.map(sub =>
          sub._id === selectedSubmission._id ? response.data : sub
        )
      );
      handleCloseDetailsModal();
    } catch (err) {
      console.error('Error saving grade:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al guardar la calificación.';
      setGradeError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSavingGrade(false);
    }
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!assignmentId) {
        setFetchError('ID de asignación no proporcionado en la URL.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setFetchError(null);
      setSubmissions([]);
      setAssignmentTitle('');
      try {
        const response = await axiosInstance.get(`/api/activities/assignments/${assignmentId}/submissions`);
        setSubmissions(response.data);

        if (response.data.length > 0 && response.data[0].assignment_id?.activity_id?.title) {
          setAssignmentTitle(`Entregas para Asignación: ${response.data[0].assignment_id.activity_id.title}`);
        } else {
          // Si no hay entregas, obtener el título de la asignación
          const assignmentRes = await axiosInstance.get(`/api/activities/assignments/${assignmentId}`);
          setAssignmentTitle(
            assignmentRes.data?.activity_id?.title
              ? `Entregas para la Actividad Asignada: ${assignmentRes.data.activity_id.title}`
              : 'Entregas para la Actividad Asignada'
          );
        }
        setFetchError(null);
      } catch (err) {
        console.error('Error fetching assignment submissions:', err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.message || 'Error al cargar las entregas de la asignación.';
        setFetchError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (assignmentId && isAuthInitialized) {
      if (isAuthenticated && (user?.userType === 'Docente' || user?.userType === 'Administrador')) {
        fetchSubmissions();
      } else {
        setFetchError('No tienes permiso para ver esta página.');
        setIsLoading(false);
      }
    } else if (!isAuthInitialized) {
      console.log("Auth aún no inicializada. Esperando para cargar entregas.");
    } else if (!assignmentId) {
      setFetchError('ID de asignación no proporcionado en la URL.');
      setIsLoading(false);
    }
  }, [assignmentId, user, isAuthenticated, isAuthInitialized]);

  // --- Renderizado de la Página ---

  // Mostrar estado de carga (mientras auth inicializa o mientras se hace el fetch)
  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Mostrar error de carga o acceso denegado después de cargar
  if (fetchError) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="error">{fetchError}</Alert>
        </Box>
      </Container>
    );
  }

  // Si no hay entregas después de cargar y sin error
  if (submissions.length === 0) {
      return (
        <Container>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>
                    {assignmentTitle || 'Entregas de Asignación'}
                </Typography>
            <Typography variant="h6" color="text.secondary">No hay entregas registradas para esta asignación aún.</Typography>
          </Box>
        </Container>
    );
  }

  // Renderizar la lista de entregas en una tabla
return (
    <Container maxWidth="lg"> {/* Usar lg para una tabla más amplia */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {assignmentTitle || 'Entregas de Asignación'}
        </Typography>

        {/* Mejora: Añadido stickyHeader para tablas grandes y estilización */}
        <Paper elevation={3} sx={{ p: 2, borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Estudiante</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Intentos</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Fecha Envío</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Calificación</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow 
                    key={submission._id}
                    hover
                    sx={{ 
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    {/* *** COMIENZO DE LAS CELDAS DE DATOS *** */}
                    <TableCell component="th" scope="row">
                      {/* Mostrar nombre del estudiante populado */}
                      {submission.student_id && submission.student_id.nombre && submission.student_id.apellidos
                      ? `${submission.student_id.nombre} ${submission.student_id.apellidos}`
                      : 'Estudiante Desconocido'}
                    </TableCell>
                    <TableCell align="center">{submission.attempt_number}</TableCell>
                    <TableCell align="center">
                      {new Date(submission.fecha_envio).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      {submission.estado_envio ? (
                        <Chip
                          label={submission.estado_envio}
                          color={
                            submission.estado_envio === 'Calificado' ? 'success' :
                            submission.estado_envio === 'Enviado' ? 'warning' : // O 'info' o 'primary'
                            'default' // Para otros estados
                          }
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      ) : (
                        '-' // Mostrar '-' si el estado no está definido
                      ) }
                    </TableCell>
                    <TableCell align="center">
                      {submission.calificacion !== undefined && submission.calificacion !== null
                        ? submission.calificacion.toFixed(2)
                        : '-'} {/* Mostrar '-' si la calificación es null/undefined */}
                    </TableCell>
                    {/* *** FIN DE LAS CELDAS DE DATOS *** */}

                    <TableCell align="center">
                      {/* Mejora: Separar botones de Ver y Calificar con funcionalidades distintas */}
                      <Tooltip title="Ver detalles">
                        <IconButton 
                          color="primary"
                          onClick={() => handleViewDetailsClick(submission)}
                          size="small"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {(submission.assignment_id?.activity_id?.type === 'Cuestionario' || 
                       submission.assignment_id?.activity_id?.type === 'Trabajo') && (
                        <Tooltip title="Calificar">
                          <IconButton 
                            color="secondary"
                            onClick={() => handleGradeClick(submission)}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <GradingIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Box>

    {/* Mejora: Dialog con mejor diseño y estructura */}
    <Dialog
      open={isDetailsModalOpen}
      onClose={handleCloseDetailsModal}
      fullWidth
      maxWidth="md" // Cambiado a md para dar más espacio
      aria-labelledby="submission-details-dialog-title"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle 
        id="submission-details-dialog-title"
        sx={{ 
          bgcolor: 'primary.light', 
          color: 'primary.contrastText',
          py: 2
        }}
      >
        Detalles de Entrega
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}> {/* Aumentado el padding */}
        {selectedSubmission && (
          <Box>
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Información del Estudiante
              </Typography>
              <Typography variant="subtitle1" fontWeight="medium">
                {selectedSubmission.student_id && selectedSubmission.student_id.nombre && selectedSubmission.student_id.apellidos
                ? `${selectedSubmission.student_id.nombre} ${selectedSubmission.student_id.apellidos}`
                : 'Desconocido'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1, gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Intento #{selectedSubmission.attempt_number}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enviado: {new Date(selectedSubmission.fecha_envio).toLocaleString()}
                </Typography>
                <Chip 
                  label={selectedSubmission.estado_envio || "Sin estado"} 
                  size="small" 
                  color={
                    selectedSubmission.estado_envio === 'Calificado' ? 'success' :
                    selectedSubmission.estado_envio === 'Enviado' ? 'warning' :
                    'default'
                  }
                />
              </Box>
            </Paper>

            {/* Mostrar Contenido de la Entrega según el tipo de actividad */}
            {/* Para Quiz: Mostrar respuestas del estudiante (calificación es automática) */}
            {selectedSubmission.assignment_id?.activity_id?.type === 'Quiz' &&
              selectedSubmission.respuesta?.quiz_answers &&
              selectedSubmission.assignment_id?.activity_id?.quiz_questions && (
                <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Respuestas del Quiz:
                  </Typography>
                  <List dense>
                    {/* Iterar sobre las respuestas del estudiante */}
                    {selectedSubmission.respuesta.quiz_answers.map((answer, index) => {
                      // Buscar la pregunta original usando el question_index de la respuesta
                      const originalQuestion =
                        selectedSubmission.assignment_id.activity_id.quiz_questions[
                          answer.question_index
                        ];

                      // Determinar si la respuesta es correcta
                      const isCorrect =
                        originalQuestion &&
                        originalQuestion.correct_answer !== undefined &&
                        originalQuestion.correct_answer !== null
                          ? String(originalQuestion.correct_answer).trim() ===
                            String(answer.student_answer || "").trim()
                          : false; // No podemos determinar si es correcta si falta la pregunta o la respuesta correcta

                      // Usar color de fondo basado en si es correcta
                      return (
                        <ListItem
                          key={index}
                          sx={{
                            bgcolor: isCorrect ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
                            mb: 1,
                            borderRadius: 2,
                            border: 1,
                            borderColor: isCorrect ? "success.light" : "error.light",
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body1" fontWeight="bold">
                                {`Pregunta ${answer.question_index + 1}: ${
                                  originalQuestion
                                    ? originalQuestion.text
                                    : "Texto de pregunta no disponible"
                                }`}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.primary">
                                  Tu respuesta: {answer.student_answer || "Sin respuesta"}
                                </Typography>
                                {/* Mostrar respuesta correcta si está definida */}
                                {originalQuestion?.correct_answer !== undefined &&
                                  originalQuestion?.correct_answer !== null && (
                                    <Typography
                                      variant="body2"
                                      color={isCorrect ? "success.dark" : "error.dark"}
                                      fontWeight="medium"
                                    >
                                      {isCorrect
                                        ? "¡Correcta!"
                                        : `Respuesta correcta: ${originalQuestion.correct_answer}`}
                                    </Typography>
                                  )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
            )}

            {/* Para Cuestionario: Mostrar preguntas y respuestas del estudiante */}
            {selectedSubmission.assignment_id?.activity_id?.type === "Cuestionario" &&
              selectedSubmission.respuesta?.cuestionario_answers &&
              selectedSubmission.assignment_id?.activity_id?.cuestionario_questions && (
                <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Respuestas del Cuestionario:
                  </Typography>
                  <List dense>
                    {/* Iterar sobre las respuestas del estudiante */}
                    {selectedSubmission.respuesta.cuestionario_answers.map((answer, index) => {
                      // Buscar la pregunta original usando el question_index
                      const originalQuestion =
                        selectedSubmission.assignment_id.activity_id.cuestionario_questions[
                          answer.question_index
                        ];

                      return (
                        <ListItem
                          key={index}
                          sx={{
                            mb: 1,
                            borderRadius: 2,
                            border: "1px solid #e0e0e0",
                            bgcolor: "rgba(0, 0, 0, 0.02)",
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body1" fontWeight="bold" color="primary.main">
                                {`Pregunta ${answer.question_index + 1}: ${
                                  originalQuestion
                                    ? originalQuestion.text
                                    : "Texto de pregunta no disponible"
                                }`}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ mt: 1, p: 1, bgcolor: "background.paper", borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                  Respuesta del estudiante:
                                </Typography>
                                <Typography variant="body1" color="text.primary" sx={{ whiteSpace: "pre-wrap", p: 1 }}>
                                  {answer.student_answer || "Sin respuesta"}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
            )}

            {selectedSubmission.assignment_id?.activity_id?.type === 'Trabajo' && (
              <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  Enlace de Entrega del Trabajo:
                </Typography>
                {selectedSubmission.respuesta?.link_entrega ? (
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1, 
                    wordBreak: 'break-all',
                    border: '1px solid',
                    borderColor: 'divider' 
                  }}>
                    <Link 
                      href={selectedSubmission.respuesta.link_entrega} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      variant="body1"
                      sx={{ 
                        display: 'block',
                        '&:hover': { textDecoration: 'underline' } 
                      }}
                    >
                      {selectedSubmission.respuesta.link_entrega}
                    </Link>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No hay enlace de entrega registrado.</Typography>
                )}
              </Paper>
            )}

            {/* Sección de Calificación Manual (solo para Cuestionario y Trabajo) */}
            {showGradeSection && 
            (selectedSubmission.assignment_id?.activity_id?.type === 'Cuestionario' || selectedSubmission.assignment_id?.activity_id?.type === 'Trabajo') && (
              <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>Calificación:</Typography>
                {gradeError && <Alert severity="error" sx={{ mb: 2 }}>{gradeError}</Alert>}
                <TextField
                  label={`Califica (${selectedSubmission.assignment_id?.puntos_maximos !== undefined && selectedSubmission.assignment_id.puntos_maximos !== null ? `sobre ${selectedSubmission.assignment_id.puntos_maximos}` : 'manual'})`}
                  fullWidth
                  margin="normal"
                  value={manualGrade}
                  onChange={handleGradeChange}
                  type="number" // Usar tipo number para el input
                  disabled={isSavingGrade}
                  InputLabelProps={{ shrink: true }} // Para que el label no se superponga con la calificación pre-llenada
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'primary.main',
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.dark',
                      },
                    }
                  }}
                />
                <Button
                  onClick={handleConfirmSaveGrade}
                  variant="contained"
                  color="primary"
                  disabled={isSavingGrade || !manualGrade.trim() || gradeError}
                  sx={{ mt: 2 }}
                >
                  {isSavingGrade ? 'Guardando...' : 'Guardar Calificación'}
                  {isSavingGrade && <CircularProgress size={15} sx={{ ml: 1 }} color="inherit" />}
                </Button>
              </Paper>
            )}

            {/* Sección de Calificación Automática (solo para Quiz) */}
            {selectedSubmission.assignment_id?.activity_id?.type === 'Quiz' && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>Calificación Automática:</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  p: 2,
                  bgcolor: selectedSubmission.calificacion !== undefined && selectedSubmission.calificacion !== null 
                    ? 'rgba(76, 175, 80, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 2
                }}>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {selectedSubmission.calificacion !== undefined && selectedSubmission.calificacion !== null
                      ? `${selectedSubmission.calificacion.toFixed(2)} / ${selectedSubmission.assignment_id?.puntos_maximos !== undefined && selectedSubmission.assignment_id.puntos_maximos !== null ? selectedSubmission.assignment_id.puntos_maximos : 'N/A'}`
                      : 'Calificación no disponible.'}
                  </Typography>
                </Box>
              </Paper>
            )}

          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Button 
          onClick={handleCloseDetailsModal} 
          variant="outlined" 
          color="primary"
          size="large"
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
    
    {/* Diálogo de confirmación para guardar calificación */}
    <Dialog
      open={isConfirmDialogOpen}
      onClose={handleCloseConfirmDialog}
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        Confirmar acción
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <DialogContentText>
          ¿Estás seguro de que deseas guardar la calificación de {manualGrade} 
          {selectedSubmission?.assignment_id?.puntos_maximos !== undefined && 
           selectedSubmission?.assignment_id?.puntos_maximos !== null ? 
           ` sobre ${selectedSubmission.assignment_id.puntos_maximos}` : 
           ''} para este estudiante?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleCloseConfirmDialog} color="primary" variant="outlined">
          Cancelar
        </Button>
        <Button onClick={handleSaveGrade} color="primary" variant="contained" autoFocus>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
    
    </Container>
  );
}

export default TeacherAssignmentSubmissionsPage;