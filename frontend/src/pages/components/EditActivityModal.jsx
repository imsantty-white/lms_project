// src/pages/components/EditActivityModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  FormHelperText,
  Paper,
  IconButton,
  Button // Keep for Add/Remove Question/Option buttons
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { axiosInstance } from '../../contexts/AuthContext'; // Ajusta la ruta si es necesario
import { toast } from 'react-toastify';
import GenericFormModal from '../../components/GenericFormModal'; // Ajusta la ruta

const generateTempId = () => `temp-${Math.random().toString(36).substring(2, 15)}`;

function EditActivityModal({ open, onClose, activityId, onUpdateSuccess }) {
  const [originalActivityType, setOriginalActivityType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuestionarioQuestions, setCuestionarioQuestions] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
      if (open && activityId) { // Cargar solo si el modal está abierto y tenemos un ID
          const fetchActivity = async () => {
              setIsLoading(true);
              setFetchError(null);
              setErrors({}); // Limpiar errores previos al cargar

              try {
                  // *** LLAMADA PARA OBTENER LA ACTIVIDAD POR ID - USANDO axiosInstance ***
                  const response = await axiosInstance.get(`/api/content/activities/${activityId}`);
                  const activityData = response.data;
                  console.log("Actividad cargada para edición:", activityData);

                  // Guardar el tipo original y rellenar estados del formulario
                  setOriginalActivityType(activityData.type || '');
                  setTitle(activityData.title || '');
                  setDescription(activityData.description || '');

                  // Rellenar estados de preguntas según el tipo
                  if (activityData.type === 'Cuestionario') {
                    setCuestionarioQuestions(activityData.cuestionario_questions || []);
                    setQuizQuestions([]); // Limpiar preguntas de Quiz si no aplica
                  } else if (activityData.type === 'Quiz') {
                    setQuizQuestions(activityData.quiz_questions || []);
                    setCuestionarioQuestions([]); // Limpiar preguntas de Cuestionario si no aplica
                  } else {
                    // Si es tipo 'Trabajo' u otro, limpiar ambas listas de preguntas
                    setCuestionarioQuestions([]);
                    setQuizQuestions([]);
                  }

                  setFetchError(null);

              } catch (err) {
                  console.error('Error fetching activity for editing:', err.response ? err.response.data : err.message);
                  const errorMessage = err.response?.data?.message || 'Error al cargar los datos de la actividad para editar.';
                  setFetchError(errorMessage);
                  toast.error(errorMessage);
              } finally {
                  setIsLoading(false); // Siempre desactiva la carga al finalizar
              }
          };

          fetchActivity(); // Llamar a la función fetchActivity

      } else if (!open) {
          // Limpiar estados si el modal se cierra
          setOriginalActivityType('');
          setTitle('');
          setDescription('');
          setCuestionarioQuestions([]);
          setQuizQuestions([]);
          setIsLoading(true); // Reset loading state for next open
          setFetchError(null);
          setErrors({}); // Limpiar errores
          setIsSaving(false); // Limpiar estado de guardado también
      }
  }, [open, activityId]); // Dependencias: se ejecuta al abrir/cerrar o cambiar el ID de la actividad


  // --- Funciones para manejar la edición de Preguntas de Cuestionario ---
  const handleAddCuestionarioQuestion = () => {
      setCuestionarioQuestions([...cuestionarioQuestions, { text: '', _id: generateTempId() }]); // Añadir pregunta vacía con ID temporal
  };

  const handleUpdateCuestionarioQuestion = (index, newText) => {
      const updatedQuestions = [...cuestionarioQuestions];
      updatedQuestions[index].text = newText;
      setCuestionarioQuestions(updatedQuestions);
  };

  const handleRemoveCuestionarioQuestion = (index) => {
      if (cuestionarioQuestions.length <= 1) {
        toast.warning('Debe haber al menos una pregunta.');
        return;
      }
      const updatedQuestions = cuestionarioQuestions.filter((_, i) => i !== index);
      setCuestionarioQuestions(updatedQuestions);
  };

  // --- Funciones para manejar la edición de Preguntas de Quiz ---
  const handleAddQuizQuestion = () => {
      setQuizQuestions([...quizQuestions, { text: '', options: ['', ''], correct_answer: '', _id: generateTempId() }]); // Añadir pregunta vacía con 2 opciones vacías
  };

  const handleUpdateQuizQuestionText = (qIndex, newText) => {
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[qIndex].text = newText;
      setQuizQuestions(updatedQuestions);
  };

  const handleAddQuizOption = (qIndex) => {
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[qIndex].options.push(''); // Añadir opción vacía
      setQuizQuestions(updatedQuestions);
  };

  const handleUpdateQuizOptionText = (qIndex, optIndex, newText) => {
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[qIndex].options[optIndex] = newText;
      // Si la opción actualizada era la respuesta correcta, también actualiza correct_answer
      if (updatedQuestions[qIndex].correct_answer === quizQuestions[qIndex].options[optIndex]) {
        updatedQuestions[qIndex].correct_answer = newText;
      }
      setQuizQuestions(updatedQuestions);
  };

  const handleRemoveQuizOption = (qIndex, optIndex) => {
      const updatedQuestions = [...quizQuestions];
      if (updatedQuestions[qIndex].options.length <= 2) {
        toast.warning('Debe haber al menos dos opciones.');
        return;
      }
      // Si la opción eliminada era la respuesta correcta, limpia correct_answer
      if (updatedQuestions[qIndex].correct_answer === updatedQuestions[qIndex].options[optIndex]) {
        updatedQuestions[qIndex].correct_answer = '';
      }
      updatedQuestions[qIndex].options = updatedQuestions[qIndex].options.filter((_, i) => i !== optIndex);
      setQuizQuestions(updatedQuestions);
  };

  const handleUpdateQuizCorrectAnswer = (qIndex, newAnswer) => {
      const updatedQuestions = [...quizQuestions];
      updatedQuestions[qIndex].correct_answer = newAnswer;
      setQuizQuestions(updatedQuestions);
  };

  const handleRemoveQuizQuestion = (qIndex) => {
      if (quizQuestions.length <= 1) {
        toast.warning('Debe haber al menos una pregunta de Quiz.');
        return;
      }
      const updatedQuestions = quizQuestions.filter((_, i) => i !== qIndex);
      setQuizQuestions(updatedQuestions);
  };


  // --- Función de Validación Frontend (Adaptada para incluir preguntas) ---
  const validateForm = () => {
    const newErrors = {};

    // Título es obligatorio
    if (!title.trim()) {
      newErrors.title = 'El título es obligatorio.';
    }

    // Validación específica para Cuestionario
    if (originalActivityType === 'Cuestionario') {
      if (cuestionarioQuestions.length === 0) {
        newErrors.cuestionarioQuestions = 'Debe haber al menos una pregunta de cuestionario.';
      } else if (cuestionarioQuestions.some(q => !q.text || !q.text.trim())) {
        newErrors.cuestionarioQuestions = 'Todas las preguntas de cuestionario deben tener texto.';
      }
    }

    // Validación específica para Quiz
    if (originalActivityType === 'Quiz') {
      if (quizQuestions.length === 0) {
        newErrors.quizQuestions = 'Debe haber al menos una pregunta de quiz.';
      } else if (quizQuestions.some(q =>
        !q.text || !q.text.trim() || // Pregunta sin texto
        !q.options || q.options.length < 2 || // Menos de dos opciones
        q.options.some(opt => !opt || !opt.trim()) || // Alguna opción vacía
        !q.correct_answer || !q.correct_answer.trim() || // Respuesta correcta vacía
        !q.options.includes(q.correct_answer.trim()) // Respuesta correcta no es una de las opciones
      )) {
        newErrors.quizQuestions = 'Todas las preguntas de quiz deben tener texto, al menos dos opciones válidas, y una respuesta correcta que sea una de las opciones.';
      }
    }

    // Actualizar el estado de errores
    setErrors(newErrors);

    // Retorna true si no hay errores
    return Object.keys(newErrors).length === 0;
  };

  // Determinar si el formulario es válido para habilitar el botón (basado en el estado de errores)
  const isFormValid = Object.keys(errors).length === 0;


  // --- Maneja el envío del formulario para actualizar la actividad ---
  const handleInternalSubmit = async () => { // Renamed
      // Ejecutar validación frontend antes de enviar
      if (!validateForm()) {
          toast.warning('Por favor, corrige los errores en el formulario.');
          return;
      }

      // Prepara los datos para enviar al backend
      const updatedActivityData = {
          title: title.trim(),
          description: description.trim(), // Enviar descripción aunque esté vacía
      };

      // Añadir las preguntas específicas según el tipo original
      if (originalActivityType === 'Cuestionario') {
          // Limpiar IDs temporales antes de enviar
          updatedActivityData.cuestionario_questions = cuestionarioQuestions.map(q => ({ text: q.text.trim() }));
      } else if (originalActivityType === 'Quiz') {
          // Limpiar IDs temporales y asegurar trim en opciones y respuesta correcta
          updatedActivityData.quiz_questions = quizQuestions.map(q => ({
            text: q.text.trim(),
            options: q.options.map(opt => opt.trim()),
            correct_answer: q.correct_answer.trim(),
          }));
      }
      // Para tipo 'Trabajo', solo se envían title y description.

      setIsSaving(true); // Activa estado de guardado

      try {
          // *** LLAMADA PUT PARA ACTUALIZAR LA ACTIVIDAD - USANDO axiosInstance ***
          const response = await axiosInstance.put(`/api/content/activities/${activityId}`, updatedActivityData);
          console.log("Actividad actualizada con éxito:", response.data);

          const responseMessage = response.data.message || 'Actividad actualizada con éxito!';
          toast.success(responseMessage);

          // Llama a la función de éxito del padre, pasando los datos actualizados si los devuelve el backend
          if(onUpdateSuccess) {
              onUpdateSuccess(response.data); // Asume que response.data contiene la actividad actualizada
          }

          onClose(); // Cierra el modal al finalizar con éxito

      } catch (err) {
          console.error('Error updating activity:', err.response ? err.response.data : err.message);
          const errorMessage = err.response?.data?.message || 'Error al intentar actualizar la actividad.';
          toast.error(errorMessage);
          // No cerramos el modal aquí en caso de error
      } finally {
          setIsSaving(false); // Siempre desactiva el estado de guardado
      }
  };


  // --- Renderizado del Modal ---
  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title={`Editar Actividad (${originalActivityType || 'Cargando...'})`}
      onSubmit={handleInternalSubmit}
      isSubmitting={isSaving}
      submitText="Guardar Cambios"
      maxWidth="md" // Keep md for more space for questions
    >
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {fetchError && !isLoading && (
        <Alert severity="error" sx={{ my: 2 }}>Error al cargar actividad: {fetchError}</Alert>
      )}
      {!isLoading && !fetchError && originalActivityType && (
        // No <form> tag needed here, GenericFormModal's onSubmit handles it.
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Título de la Actividad"
            fullWidth
            value={title}
            onChange={(e) => { setTitle(e.target.value); /* validateForm(); */ }} // validation on submit
            error={!!errors.title}
            helperText={errors.title}
            disabled={isSaving}
            required
            autoFocus
          />
          <TextField
            label="Descripción (Opcional)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
          <TextField // Display original type, not editable
            label="Tipo de Actividad"
            fullWidth
            value={originalActivityType}
            InputProps={{ readOnly: true }}
            disabled={isSaving}
          />

          {originalActivityType === 'Cuestionario' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Preguntas del Cuestionario</Typography>
              {errors.cuestionarioQuestions && <FormHelperText error>{errors.cuestionarioQuestions}</FormHelperText>}
              {cuestionarioQuestions.map((q, index) => (
                <Paper key={q._id || index} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
                  <TextField
                    label={`Pregunta ${index + 1}`}
                    variant="outlined"
                    value={q.text}
                    onChange={(e) => handleUpdateCuestionarioQuestion(index, e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    disabled={isSaving}
                    sx={{ mb: 1 }}
                    required
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleRemoveCuestionarioQuestion(index)}
                      disabled={isSaving || cuestionarioQuestions.length <= 1}
                      startIcon={<DeleteIcon />}
                    >
                      Eliminar Pregunta
                    </Button>
                  </Box>
                </Paper>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleAddCuestionarioQuestion}
                disabled={isSaving}
                sx={{ mt: 1 }}
              >
                Añadir Pregunta
              </Button>
            </Box>
          )}

          {originalActivityType === 'Quiz' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Preguntas del Quiz</Typography>
              {errors.quizQuestions && <FormHelperText error>{errors.quizQuestions}</FormHelperText>}
              {quizQuestions.map((q, qIndex) => (
                <Paper key={q._id || qIndex} sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
                  <TextField
                    label={`Pregunta ${qIndex + 1}`}
                    variant="outlined"
                    value={q.text}
                    onChange={(e) => handleUpdateQuizQuestionText(qIndex, e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    disabled={isSaving}
                    sx={{ mb: 2 }}
                    required
                  />
                  <Typography variant="subtitle2" gutterBottom>Opciones:</Typography>
                  {q.options.map((opt, optIndex) => (
                    <Stack key={optIndex} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField
                        label={`Opción ${optIndex + 1}`}
                        variant="outlined"
                        value={opt}
                        onChange={(e) => handleUpdateQuizOptionText(qIndex, optIndex, e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isSaving}
                        required
                      />
                      <IconButton
                        aria-label="eliminar opción"
                        size="small"
                        color="error"
                        onClick={() => handleRemoveQuizOption(qIndex, optIndex)}
                        disabled={isSaving || q.options.length <= 2}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => handleAddQuizOption(qIndex)}
                    disabled={isSaving}
                    sx={{ mt: 1, mb: 2 }}
                  >
                    Añadir Opción
                  </Button>
                  <FormControl fullWidth variant="outlined" disabled={isSaving} required sx={{ mb: 2 }} error={!!errors.quizQuestions && q && (!q.correct_answer || !q.options.includes(q.correct_answer.trim()))}>
                    <InputLabel>Respuesta Correcta</InputLabel>
                    <Select
                      value={q.correct_answer || ''} // Ensure value is not undefined
                      onChange={(e) => handleUpdateQuizCorrectAnswer(qIndex, e.target.value)}
                      label="Respuesta Correcta"
                    >
                      {q.options.map((opt, optIndex) => (
                        <MenuItem key={optIndex} value={opt}>{opt || `Opción ${optIndex + 1} (vacía)`}</MenuItem>
                      ))}
                    </Select>
                    {errors.quizQuestions && q && (!q.correct_answer || !q.options.includes(q.correct_answer.trim())) && <FormHelperText>Debes seleccionar una respuesta correcta válida.</FormHelperText>}
                  </FormControl>
                  <Box sx={{ textAlign: 'right' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleRemoveQuizQuestion(qIndex)}
                      disabled={isSaving || quizQuestions.length <= 1}
                      startIcon={<DeleteIcon />}
                    >
                      Eliminar Pregunta
                    </Button>
                  </Box>
                </Paper>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleAddQuizQuestion}
                disabled={isSaving}
                sx={{ mt: 1 }}
              >
                Añadir Pregunta
              </Button>
            </Box>
          )}

          {originalActivityType === 'Trabajo' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Este tipo de actividad ('Trabajo') solo requiere Título y Descripción para las instrucciones.
              </Typography>
            </Box>
          )}
          {/* Submit button is handled by GenericFormModal */}
        </Stack>
      )}
      {!isLoading && !fetchError && !originalActivityType && (
        <Alert severity="info" sx={{ my: 2 }}>
          No se pudo determinar el tipo de actividad para editar.
        </Alert>
      )}
    </GenericFormModal>
  );
}

export default EditActivityModal;