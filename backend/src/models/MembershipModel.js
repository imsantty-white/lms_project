const mongoose = require('mongoose');

// Definimos el esquema de Membresía de Grupo
const membershipSchema = new mongoose.Schema({
  usuario_id: { // El usuario (Estudiante) que es miembro
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencia al modelo 'User'
    required: [true, 'El usuario es obligatorio']
  },
  grupo_id: { // El grupo al que pertenece el usuario
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group', // Referencia al modelo 'Group'
    required: [true, 'El grupo es obligatorio']
  },
  estado_solicitud: { // Estado de la solicitud de unión
    type: String,
    required: [true, 'El estado de la solicitud es obligatorio'],
    enum: ['Pendiente', 'Aprobado', 'Rechazado'], // Solo permite estos valores
    default: 'Pendiente' // Por defecto, la solicitud está pendiente
  },
  fecha_solicitud: {
    type: Date,
    default: Date.now
  },
  fecha_aprobacion: { // Fecha en que fue aprobada (si aplica)
    type: Date
  }
  // Podrías añadir un campo para el rol dentro del grupo si fuera necesario (ej: 'Estudiante', 'Ayudante')
});

// Opcional pero recomendado: Asegurar que un usuario solo pueda tener UNA solicitud 'Pendiente' o 'Aprobado' por grupo
// O que solo pueda tener UNA membresía 'Aprobado' por grupo
// Esto se puede manejar en la lógica del controlador O con un índice único compuesto
// Un índice único compuesto en usuario_id y grupo_id puede ser útil, PERO necesita manejo de estado.
// Por ahora, lo manejaremos en la lógica del controlador para mayor flexibilidad con los estados.

// Definición de Índices
membershipSchema.index({ usuario_id: 1, grupo_id: 1, estado_solicitud: 1 });
membershipSchema.index({ grupo_id: 1, estado_solicitud: 1 });

// Creamos el modelo a partir del esquema
const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership; // Exportamos el modelo