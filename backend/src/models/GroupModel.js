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
  descripcion: {
    type: String,
    trim: true,
    maxlength: [150, 'La descripción del grupo no puede exceder los 150 caracteres']
  },
  codigo_acceso: {
    type: String,
    required: [true, 'El código de acceso es obligatorio'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [6, 'El código de acceso debe tener al menos 6 caracteres'],
    maxlength: [10, 'El código de acceso no puede exceder los 10 caracteres'],
    index: true
  },
  docente_id: { // Esto ya estaba y es correcto para "un docente"
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  limite_estudiantes: {
    type: Number,
    default: 0 // 0 podría significar sin límite
  },
  archivedAt: {
    type: Date,
    default: null
  },
  learning_path_ids: [{ // Este es el campo que añadimos antes para las rutas de aprendizaje
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningPath'
  }],
  // NUEVO CAMPO PARA REFERENCIAR A LOS ESTUDIANTES DEL GRUPO
  estudiantes_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Referencia al modelo 'User' (específicamente a usuarios que son estudiantes)
  }]
}, {
  timestamps: false
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;