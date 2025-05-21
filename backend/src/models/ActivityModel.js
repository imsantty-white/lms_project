// src/models/ActivityModel.js

const mongoose = require('mongoose');

// Sub-esquema para las preguntas de un Cuestionario
const cuestionarioQuestionSchema = new mongoose.Schema({
    text: { type: String, required: [true, 'El texto de la pregunta del cuestionario es obligatorio'] } // Solo el texto de la pregunta abierta
    // Podríamos añadir un campo para orden si es necesario, pero el orden en el array es suficiente por ahora.
});

// Sub-esquema para las preguntas de un Quiz (tipo de actividad)
const quizQuestionSchema = new mongoose.Schema({
    text: { type: String, required: [true, 'El texto de la pregunta es obligatorio'] }, // El texto de la pregunta
    options: [{ type: String }], // Array de opciones para preguntas de opción múltiple
    correct_answer: { type: String } // La respuesta correcta (debe coincidir con una opción para opción múltiple)
    // Para cuestionario (respuesta abierta), options y correct_answer no aplicarían o se usarían diferente
});

const activitySchema = new mongoose.Schema({
    type: { // Tipo de actividad (Cuestionario, Trabajo, Quiz)
        type: String,
        required: [true, 'El tipo de actividad es obligatorio'],
        enum: ['Cuestionario', 'Trabajo', 'Quiz'] // Validar con los tipos definidos
    },
    title: { // Título de la actividad
        type: String,
        required: [true, 'El título de la actividad es obligatorio'],
        trim: true
    },
    description: { // Instrucciones o descripción detallada de la actividad
        type: String,
        trim: true
    },
    docente_id: { // El docente que creó esta actividad (para su banco)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El docente creador es obligatorio']
    },
    // Campos específicos según el tipo de actividad
    cuestionario_questions: [cuestionarioQuestionSchema], // <-- Nuevo: Array de preguntas para 'Cuestionario'
    quiz_questions: [quizQuestionSchema], // Array de preguntas para actividades de tipo 'Quiz'

    fecha_creacion: { type: Date, default: Date.now } // Fecha de creación en el banco
    // La puntuación máxima, intentos permitidos, fechas límite se definirán en el documento de *asignación*
    // cuando se vincule esta actividad del banco a un Tema específico.
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;