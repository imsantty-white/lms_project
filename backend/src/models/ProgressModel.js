// src/models/ProgressModel.js

const mongoose = require('mongoose');

// Sub-esquema para rastrear la finalización o visualización de temas individuales
const themeCompletionSchema = new mongoose.Schema({
    theme_id: { // El tema específico que se está rastreando
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theme', // Referencia al modelo Theme
        required: [true, 'La finalización del tema debe referenciar un tema válido']
    },
    completion_date: { // Fecha y hora en que el tema fue marcado como completado o visto
        type: Date,
        default: Date.now
    },
    status: { // Estado dentro del tema (ej: 'Visto', 'Completado')
         type: String,
         enum: ['Visto', 'Completado'], // Puedes ajustar los estados según necesites
         default: 'Visto' // Por defecto, al registrar un tema, se marca como visto
    }
    // No necesitamos rastrear la finalización de recursos individualmente aquí;
    // ver un tema implica haber accedido a sus recursos.
    // El progreso en Actividades se rastrea a través del modelo Submission.
});


const progressSchema = new mongoose.Schema({
    student_id: { // El estudiante cuyo progreso se está rastreando
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencia al modelo User
        required: [true, 'El progreso debe estar asociado a un estudiante']
    },
    learning_path_id: { // La ruta de aprendizaje específica a la que corresponde este progreso
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningPath', // Referencia al modelo LearningPath
        required: [true, 'El progreso debe estar asociado a una ruta de aprendizaje']
    },
    group_id: { // El grupo al que pertenece esta ruta de aprendizaje (redundante pero útil para consultas)
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Group', // Referencia al modelo Group
         required: [true, 'El progreso debe estar asociado a un grupo']
    },
    // Estado general del estudiante en esta ruta de aprendizaje
    path_status: {
        type: String,
        enum: ['No Iniciado', 'En Progreso', 'Completado'],
        default: 'No Iniciado' // Estado inicial
    },
    // Campo para rastrear los temas que el estudiante ha marcado como completados o vistos
    // Es un array de referencias a temas con una fecha asociada
    completed_themes: [themeCompletionSchema],

    // Fecha en que la ruta de aprendizaje completa fue marcada como completada por el estudiante (si aplica)
    path_completion_date: {
        type: Date
    }

    // Nota: El progreso en actividades individuales se puede inferir revisando
    // los documentos en la colección Submission para este estudiante y las asignaciones
    // de la ruta de aprendizaje.
});

// --- Índices para Consultas Eficientes ---
// Un estudiante solo debe tener un documento de progreso por cada ruta de aprendizaje
progressSchema.index({ student_id: 1, learning_path_id: 1 }, { unique: true });
// Índice para buscar progreso por grupo (útil para docentes)
progressSchema.index({ group_id: 1 });
// --- Fin Índices ---


const Progress = mongoose.model('Progress', progressSchema);
module.exports = Progress;