// src/models/ContentAssignmentModel.js

const mongoose = require('mongoose');

const contentAssignmentSchema = new mongoose.Schema({
    theme_id: { // El tema al que se asigna este contenido
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theme', // Referencia al modelo Theme
        required: [true, 'La asignación debe estar asociada a un tema']
    },
    resource_id: { // Referencia al Recurso (si se asigna un Recurso)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource' // Referencia al modelo Resource
        // Campo opcional, solo uno entre resource_id y activity_id debe estar presente
    },
    activity_id: { // Referencia a la Actividad (si se asigna una Actividad)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity' // Referencia al modelo Activity
        // Campo opcional, solo uno entre resource_id y activity_id debe estar presente
    },
    type: { // Indica si la asignación es de un Recurso o una Actividad
        type: String,
        required: [true, 'El tipo de asignación (Resource/Activity) es obligatorio'],
        enum: ['Resource', 'Activity'] // Validar los tipos de asignación
    },
    orden: { // Orden en que aparece este contenido dentro del tema
        type: Number,
        required: [true, 'El orden de la asignación es obligatorio']
    },
    // Campos específicos de la asignación (no del contenido original del banco)
    // Estos campos de fecha/hora podrían volverse opcionales o sugerencias si el estado es el control principal
    fecha_inicio: { type: Date },
    fecha_fin: { type: Date }, // Fecha límite (sugerida o forzada dependiendo de la lógica de estados vs fechas)
    puntos_maximos: { type: Number }, // Puntuación máxima posible (para actividades evaluables)
    intentos_permitidos: { type: Number}, // Número de intentos permitidos para actividades (ej: Quiz)
    tiempo_limite: { type: Number}, // Tiempo límite en minutos para actividades (ej: Quiz)

    // *** NUEVO CAMPO: Estado de la asignación ***
    status: {
        type: String,
        required: [true, 'El estado de la asignación es obligatorio'],
        enum: ['Draft', 'Open', 'Closed'], // Posibles estados: Borrador, Abierto, Cerrado
        default: 'Draft' // Estado por defecto al crear una nueva asignación
    },
    // --- Fin NUEVO CAMPO ---

    // --- Referencias redundantes para facilitar consultas y validación de propiedad ---
    group_id: { // El grupo al que pertenece la jerarquía del tema
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Group',
         required: [true, 'La asignación debe estar asociada a un grupo']
    },
    docente_id: { // El docente propietario del grupo y el contenido
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Asumo que tu modelo de usuario docente se llama 'User'
        required: [true, 'La asignación debe estar asociada a un docente']
    }
    // --- Fin Referencias redundantes ---
});

// --- Validación personalizada para asegurar que solo resource_id O activity_id estén presentes (mantener) ---
contentAssignmentSchema.pre('validate', function(next) {
    const isResourceAssigned = this.resource_id !== undefined && this.resource_id !== null;
    const isActivityAssigned = this.activity_id !== undefined && this.activity_id !== null;

    if (isResourceAssigned && isActivityAssigned) {
        this.invalidate('resource_id', 'Una asignación no puede referenciar un Recurso y una Actividad al mismo tiempo');
    } else if (!isResourceAssigned && !isActivityAssigned) {
         this.invalidate('resource_id', 'Una asignación debe referenciar un Recurso o una Actividad');
    } else if (isResourceAssigned && this.type !== 'Resource') {
         this.invalidate('type', 'El tipo de asignación debe ser "Resource" cuando se asigna un recurso');
    } else if (isActivityAssigned && this.type !== 'Activity') {
         this.invalidate('type', 'El tipo de asignación debe ser "Activity" cuando se asigna una actividad');
    }

    // *** VALIDACIÓN ADICIONAL EN EL MODELO (Opcional, revisaremos si son necesarias con la lógica de estados) ***
    // Las validaciones de fecha/hora en el modelo podrían ser menos estrictas o eliminarse si el estado es el control principal
    // y las fechas son solo sugerencias. La validación de tiempo_limite sí debe mantenerse.

    // Ejemplo: Validar que puntos_maximos sea no negativo si existe (mantener)
    if (this.puntos_maximos !== undefined && this.puntos_maximos !== null && this.puntos_maximos < 0) {
         this.invalidate('puntos_maximos', 'La puntuación máxima no puede ser negativa.');
    }
    // Ejemplo: Validar que intentos_permitidos sea entero no negativo si existe (mantener)
    if (this.intentos_permitidos !== undefined && this.intentos_permitidos !== null && (this.intentos_permitidos < 0 || !Number.isInteger(this.intentos_permitidos))) {
         this.invalidate('intentos_permitidos', 'Los intentos permitidos deben ser un número entero no negativo.');
    }
    // Ejemplo: Validar que tiempo_limite sea entero no negativo si existe (mantener)
    if (this.tiempo_limite !== undefined && this.tiempo_limite !== null && (this.tiempo_limite < 0 || !Number.isInteger(this.tiempo_limite))) {
         this.invalidate('tiempo_limite', 'El tiempo límite debe ser un número entero no negativo.');
    }

    // Ejemplo: Validar que fecha_fin no sea anterior a fecha_inicio si ambas existen (mantener por integridad de datos, aunque no se use para acceso si controlas por estado)
     if (this.fecha_inicio && this.fecha_fin && this.fecha_fin < this.fecha_inicio) {
         this.invalidate('fecha_fin', 'La fecha de fin no puede ser anterior a la fecha de inicio.');
     }


    next(); // Continúa con la validación estándar de Mongoose
});
// --- Fin Validación personalizada y adicional ---


const ContentAssignment = mongoose.model('ContentAssignment', contentAssignmentSchema);
module.exports = ContentAssignment;