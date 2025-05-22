// src/components/CreateActivityModal.jsx
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Box,
  Paper,
  IconButton,
  Divider,
  FormHelperText,
  Button // Keep Button for specific actions like "Add Question"
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import GenericFormModal from '../../components/GenericFormModal'; // Ajusta la ruta

function CreateActivityModal({ open, onClose, onSubmit, isCreating }) {
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuestionarioQuestions, setCuestionarioQuestions] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [errors, setErrors] = useState({});

  const activityTypes = ['Cuestionario', 'Trabajo', 'Quiz'];

  const handleAddCuestionarioQuestion = () => {
    setCuestionarioQuestions(prev => [...prev, { text: '' }]);
  };
  const handleUpdateCuestionarioQuestion = (index, newText) => {
    setCuestionarioQuestions(prev => prev.map((q, i) => i === index ? { ...q, text: newText } : q));
  };
  const handleRemoveCuestionarioQuestion = (index) => {
    setCuestionarioQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddQuizQuestion = () => {
    setQuizQuestions(prev => [...prev, { text: '', options: ['', ''], correct_answer: '' }]);
  };
  const handleUpdateQuizQuestionText = (index, newText) => {
    setQuizQuestions(prev => prev.map((q, i) => i === index ? { ...q, text: newText } : q));
  };
  const handleRemoveQuizQuestion = (index) => {
    setQuizQuestions(prev => prev.filter((_, i) => i !== index));
  };
  const handleAddQuizOption = (questionIndex) => {
    setQuizQuestions(prev => prev.map((q, i) => i === questionIndex ? { ...q, options: [...q.options, ''] } : q));
  };
  const handleUpdateQuizOptionText = (questionIndex, optionIndex, newText) => {
    setQuizQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        const newOptions = q.options.map((opt, j) => j === optionIndex ? newText : opt);
        const newCorrectAnswer = (q.correct_answer === q.options[optionIndex]) ? newText : q.correct_answer;
        return { ...q, options: newOptions, correct_answer: newCorrectAnswer };
      }
      return q;
    }));
  };
  const handleRemoveQuizOption = (questionIndex, optionIndex) => {
    setQuizQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        const newOptions = q.options.filter((_, j) => j !== optionIndex);
        const newCorrectAnswer = (q.correct_answer === q.options[optionIndex]) ? '' : q.correct_answer;
        return { ...q, options: newOptions, correct_answer: newCorrectAnswer };
      }
      return q;
    }));
  };
  const handleUpdateQuizCorrectAnswer = (questionIndex, newAnswer) => {
    setQuizQuestions(prev => prev.map((q, i) => i === questionIndex ? { ...q, correct_answer: newAnswer } : q));
  };

  // --- Fin Lógica de estados de preguntas/opciones ---

  // Restablecer formulario y errores cuando el modal se abre
  useEffect(() => {
      if (open) {
          setType('');
          setTitle('');
          setDescription('');
          setCuestionarioQuestions([]);
          setQuizQuestions([]);
           // Limpiar errores
           setErrors({});
      }
  }, [open]);


  // Maneja el cambio en el selector de tipo de actividad
  const handleTypeChange = (event) => {
    const selectedType = event.target.value;
    setType(selectedType);
    // Limpiar estados de campos específicos de otros tipos al cambiar de tipo
    setCuestionarioQuestions([]);
    setQuizQuestions([]);
    // Limpiar errores
    setErrors({});
    // Inicializar con estados por defecto si es necesario
    if (selectedType === 'Cuestionario') {
      setCuestionarioQuestions([{ text: '' }]);
    } else if (selectedType === 'Quiz') {
      setQuizQuestions([{ text: '', options: ['', ''], correct_answer: '' }]);
    }
  };

    // *** Función de Validación Frontend (ajustada para los campos de actividad base) ***
    const validateForm = () => {
        const newErrors = {};

        if (!type) {
            newErrors.type = 'Debe seleccionar un tipo de actividad.';
        }
        if (!title.trim()) {
            newErrors.title = 'El título es obligatorio.';
        }

        if (type === 'Cuestionario') {
            if (cuestionarioQuestions.length === 0 || cuestionarioQuestions.some(q => !q.text || !q.text.trim())) {
                 newErrors.cuestionarioQuestions = 'Debe tener al menos una pregunta y todas deben tener texto.';
            }
            // *** No hay validación para campos de configuración de la actividad base aquí ***

        } else if (type === 'Quiz') {
             // Validaciones para Quiz
             if (quizQuestions.length === 0 || quizQuestions.some(q =>
                !q.text || !q.text.trim() ||
                !q.options || !Array.isArray(q.options) || q.options.length < 2 ||
                q.options.some(opt => !opt || opt.trim() === '') ||
                !q.correct_answer || q.correct_answer.trim() === '' ||
                !q.options.includes(q.correct_answer.trim())
             )) {
                 newErrors.quizQuestions = 'Cada pregunta debe tener texto, al menos 2 opciones (con texto) y una respuesta correcta seleccionada que coincida con una opción.';
             }
            // *** No hay validación para campos de configuración de la actividad base aquí ***

        }
        // El tipo 'Trabajo' solo usa title y description, la validación básica ya los cubre.

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
    };
    // *** Fin Función de Validación Frontend ***


  // Maneja la presentación del formulario (llama a onSubmit del padre)
  const handleInternalSubmit = () => { // Renamed
    // Ejecutar validación antes de enviar
    if (!validateForm()) {
        toast.warning('Por favor, corrige los errores en el formulario.');
        return;
    }

    // Prepara los datos para pasar al componente padre
    const newActivityData = {
        type,
        title: title.trim(),
        description: description?.trim() || '',
        // *** CAMPOS DE CONFIGURACIÓN DE LA ACTIVIDAD (PUNTOS, INTENTOS, TIEMPO) - NO INCLUIDOS AQUÍ ***
        // Estos campos pertenecen a la ASIGNACIÓN, no a la Actividad base.
        // Se recopilan en AddContentAssignmentModal.
        // **************************************************************************************
        ...(type === 'Cuestionario' && { cuestionario_questions: cuestionarioQuestions.map(q => ({ text: q.text?.trim() || '' })) }),
        ...(type === 'Quiz' && {
            quiz_questions: quizQuestions.map(q => ({
                text: q.text?.trim() || '',
                options: Array.isArray(q.options) ? q.options.map(opt => opt?.trim() || '') : [],
                correct_answer: q.correct_answer?.trim() || ''
            }))
        }),
        // El tipo 'Trabajo' no añade campos específicos aquí.
    };

    // Llama a la función onSubmit proporcionada por el padre
    onSubmit(newActivityData);
  };


  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title="Crear Nueva Actividad"
      onSubmit={handleInternalSubmit} // Pasa la función de submit interna
      isSubmitting={isCreating}
      submitText="Crear"
      maxWidth="md" // May need more width for questions
      // The submit button in GenericFormModal will be disabled if isCreating is true.
      // We also need to disable it if the form is invalid.
      // This can be done by passing a prop like `isSubmitDisabled` to GenericFormModal
      // or by ensuring handleInternalSubmit (passed as onSubmit) doesn't call the parent onSubmit if invalid.
      // The latter is simpler for now.
    >
      {/* Removed DialogTitle, DialogContent, DialogActions - GenericFormModal handles these */}
      {/* The Stack for form elements is now the direct child */}
      <Stack spacing={2} sx={{ pt: 1 }}> {/* pt:1 for padding top */}
        {/* Selector de Tipo de Actividad */}
        <FormControl fullWidth variant="outlined" required disabled={isCreating} error={!!errors.type}>
          <InputLabel id="activity-type-label">Tipo de Actividad</InputLabel>
          <Select
            labelId="activity-type-label"
            value={type}
            onChange={handleTypeChange}
            label="Tipo de Actividad"
            autoFocus // Autofocus on the first field
          >
            <MenuItem value=""><em>Selecciona un tipo</em></MenuItem>
            {activityTypes.map((activityTypeOption) => (
              <MenuItem key={activityTypeOption} value={activityTypeOption}>{activityTypeOption}</MenuItem>
            ))}
          </Select>
          {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
        </FormControl>

        {/* Campos base (Título y Descripción) */}
          <TextField
            label="Título de la Actividad"
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            disabled={isCreating || !type}
             error={!!errors.title}
             helperText={errors.title}
          />
          <TextField
            label="Descripción (Opcional)"
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            disabled={isCreating || !type}
            multiline
            rows={2}
          />

            {/* *** CAMPOS DE CONFIGURACIÓN DE LA ACTIVIDAD (PUNTOS, INTENTOS, TIEMPO) - ELIMINADOS AQUÍ *** */}
            {/* Deben manejarse en AddContentAssignmentModal */}
            {/* **************************************************************************************** */}

            <Divider sx={{ my: 2 }} /> {/* Separador visual */}


          {/* --- Renderizado Condicional de Campos Específicos de Preguntas/Opciones --- */}

          {type === 'Cuestionario' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Preguntas del Cuestionario</Typography>
                 {errors.cuestionarioQuestions && <FormHelperText error>{errors.cuestionarioQuestions}</FormHelperText>}
                {cuestionarioQuestions.map((q, index) => (
                  <Paper key={index} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
                    <TextField
                      label={`Pregunta ${index + 1}`}
                      variant="outlined"
                      value={q.text}
                      onChange={(e) => handleUpdateCuestionarioQuestion(index, e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                      disabled={isCreating}
                      sx={{ mb: 1 }}
                      required
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRemoveCuestionarioQuestion(index)}
                        disabled={isCreating || cuestionarioQuestions.length <= 1}
                      >
                        Eliminar Pregunta
                      </Button>
                    </Box>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  onClick={handleAddCuestionarioQuestion}
                  disabled={isCreating}
                  sx={{ mt: 1 }}
                >
                  Añadir Pregunta
                </Button>
              </Box>
          )}

          {type === 'Quiz' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Preguntas del Quiz</Typography>
                 {errors.quizQuestions && <FormHelperText error>{errors.quizQuestions}</FormHelperText>}
                {quizQuestions.map((q, qIndex) => (
                  <Paper key={qIndex} sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
                    <TextField
                      label={`Pregunta ${qIndex + 1}`}
                      variant="outlined"
                      value={q.text}
                      onChange={(e) => handleUpdateQuizQuestionText(qIndex, e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                      disabled={isCreating}
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
                          disabled={isCreating}
                          required
                        />
                        <IconButton
                          aria-label="eliminar opción"
                          size="small"
                          color="error"
                          onClick={() => handleRemoveQuizOption(qIndex, optIndex)}
                          disabled={isCreating || q.options.length <= 2}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddQuizOption(qIndex)}
                    disabled={isCreating}
                    sx={{ mt: 1, mb: 2 }}
                  >
                    Añadir Opción
                  </Button>

                  <FormControl fullWidth variant="outlined" disabled={isCreating} required sx={{ mb: 2 }} error={!!(errors.quizQuestions && errors.quizQuestions.includes('respuesta correcta'))}>
                    <InputLabel>Respuesta Correcta</InputLabel>
                    <Select
                      value={q.correct_answer}
                      onChange={(e) => handleUpdateQuizCorrectAnswer(qIndex, e.target.value)}
                      label="Respuesta Correcta"
                    >
                      {q.options.map((opt, optIndex) => (
                        <MenuItem key={optIndex} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                      {errors.quizQuestions && errors.quizQuestions.includes('respuesta correcta') && <FormHelperText>{errors.quizQuestions}</FormHelperText>}
                  </FormControl>

                  <Box sx={{ textAlign: 'right' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleRemoveQuizQuestion(qIndex)}
                      disabled={isCreating || quizQuestions.length <= 1}
                    >
                      Eliminar Pregunta
                    </Button>
                  </Box>
                </Paper>
                ))}
                <Button
                  variant="outlined"
                  onClick={handleAddQuizQuestion}
                  disabled={isCreating}
                  sx={{ mt: 1 }}
                >
                  Añadir Pregunta
                </Button>
              </Box>
          )}

          {type === 'Trabajo' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Este tipo de actividad ('Trabajo') solo requiere Título y Descripción para las instrucciones.
              </Typography>
            </Box>
          )}
        {/* No separate submit button here, GenericFormModal handles it */}
      </Stack>
    </GenericFormModal>
  );
}

export default CreateActivityModal;