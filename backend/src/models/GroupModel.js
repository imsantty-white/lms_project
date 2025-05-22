// src/models/GroupModel.js
const mongoose = require('mongoose');

// Definimos el esquema de Grupo
const groupSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del grupo es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre del grupo no puede exceder los 100 caracteres']
  },
  codigo_acceso: {
    type: String,
    required: [true, 'El código de acceso es obligatorio'],
    unique: true, // Cada código debe ser único
    trim: true,
    uppercase: true, // Convertir a mayúsculas
    minlength: [6, 'El código de acceso debe tener al menos 6 caracteres'], // Puedes ajustar la longitud
    maxlength: [10, 'El código de acceso no puede exceder los 10 caracteres'], // Puedes ajustar la longitud
    index: true
  },
  docente_id: {
    type: mongoose.Schema.Types.ObjectId, // Tipo especial para IDs de MongoDB
    ref: 'User', // Referencia al modelo 'User' (el docente que creó el grupo)
    required: [true, 'El docente creador es obligatorio'],
    index: true
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  limite_estudiantes: { // Para futuras limitaciones
    type: Number,
    default: 0 // 0 podría significar sin límite por defecto, o puedes poner un valor inicial
  }
  // Podrías añadir más campos aquí si los necesitas para el grupo (ej: descripción)
}, {
  timestamps: false // O true si quieres createdAt y updatedAt
});

// Creamos el modelo a partir del esquema
const Group = mongoose.model('Group', groupSchema);

module.exports = Group; // Exportamos el modelo