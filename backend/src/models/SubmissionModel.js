// src/models/SubmissionModel.js

const mongoose = require('mongoose');

// Sub-esquema para las respuestas a preguntas de Cuestionario dentro de una entrega
const cuestionarioAnswerSchema = new mongoose.Schema({
    // Referencia al índice de la pregunta en el array cuestionario_questions de la Actividad original
    question_index: { type: Number, required: [true, 'El índice de la pregunta es obligatorio'] },
    // La respuesta de texto del estudiante para esta pregunta específica
    student_answer: { type: String, trim: true }
});

// Sub-esquema para las respuestas a preguntas de Quiz dentro de una entrega
const quizAnswerSchema = new mongoose.Schema({
    // Referencia al índice de la pregunta en el array quiz_questions de la Actividad original
    question_index: { type: Number, required: [true, 'El índice de la pregunta es obligatorio'] },
    // La respuesta del estudiante. Para Quiz de selección única, sería el texto de la opción elegida.
    // Para futuro, si hubiera preguntas abiertas en Quiz, podría ser texto libre.
    student_answer: { type: String, trim: true }
});

const submissionSchema = new mongoose.Schema({
    assignment_id: { // La asignación de contenido específica a la que corresponde esta entrega
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentAssignment', // Referencia al modelo ContentAssignment
        required: [true, 'La entrega debe estar asociada a una asignación de contenido'],
        index: true
    },
    student_id: { // El estudiante que realiza la entrega
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencia al modelo User
        required: [true, 'La entrega debe estar asociada a un estudiante'],
        index: true
    },
    // Referencias redundantes para facilitar consultas y validación de propiedad (desde la asignación)
    group_id: { // El grupo al que pertenece la asignación
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Group',
         required: [true, 'La entrega debe estar asociada a un grupo'],
         index: true
    },
    docente_id: { // El docente propietario de la asignación/grupo
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'La entrega debe estar asociada a un docente'],
        index: true
    },
    fecha_envio: { // Fecha y hora en que el estudiante envió la entrega
        type: Date,
        // Este campo se llenará en el controlador cuando el estudiante envíe la entrega
        index: true
    },
    attempt_start_time: { type: Date },
    is_timed_auto_submit: { type: Boolean, default: false },
    estado_envio: { // Estado actual de la entrega
        type: String,
        required: [true, 'El estado de la entrega es obligatorio'],
        enum: ['Pendiente', 'EnProgreso', 'Enviado', 'Calificado'], // Estados posibles: Pendiente de envío, Ya enviado, Calificado
        default: 'Pendiente', // Estado inicial antes de que el estudiante envíe
        index: true
    },
     is_late: { // Indica si la entrega fue realizada después de la fecha límite
        type: Boolean,
        default: false // Por defecto, no es tardía al momento de crear el documento inicial
    },
    attempt_number: { // Número de intento de la entrega (si se permiten varios)
        type: Number,
        required: [true, 'El número de intento es obligatorio'],
        min: [1, 'El número de intento debe ser al menos 1']
    },
    calificacion: { // Calificación obtenida por el estudiante (si aplica)
        type: Number,
        min: 0
        // La puntuación máxima se obtiene de la asignación (assignment_id -> ContentAssignment -> puntuacion_maxima)
    },
    retroalimentacion: { // Comentarios/feedback del docente
        type: String,
        trim: true
    },
    respuesta: { // La respuesta/trabajo del estudiante. La estructura varía según el tipo de actividad.
        
        link_entrega: { type: String },    // Para actividades de tipo 'Trabajo' (un link a un archivo, repositorio, etc.)
        quiz_answers: [quizAnswerSchema], // Array de respuestas para actividades de tipo 'Quiz'
        cuestionario_answers: [cuestionarioAnswerSchema] // <-- Nuevo: Array de respuestas para 'Cuestionario'
        // Solo uno de estos campos (texto_respuesta, link_entrega, quiz_answers) se llenará según el tipo de actividad de la asignación.
    }
    // No necesitamos almacenar el tipo de actividad aquí, ya que podemos obtenerlo navegando la referencia:
    // submission.assignment_id.activity_id.type (si assignment_id y activity_id están poblados)
});

// --- Custom Validation ---
// Aunque podemos validar esto en el controlador, una validación básica en el modelo
// puede ayudar a mantener la integridad (asegurar que solo un tipo de respuesta está presente).
// Sin embargo, requeriría poblar la asignación para conocer el tipo de actividad,
// lo cual es complejo en un hook 'validate' síncrono o 'pre' asíncrono.
// Por ahora, confiaremos en la validación del controlador al recibir la entrega.
// Si el proyecto crece, se podría refactorizar la validación de respuesta.
// --- Fin Custom Validation ---

// Definición de Índices
submissionSchema.index({ assignment_id: 1, student_id: 1, estado_envio: 1 });
submissionSchema.index({ assignment_id: 1, student_id: 1, fecha_envio: -1 });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;