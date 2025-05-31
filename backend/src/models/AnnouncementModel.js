const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título del anuncio es obligatorio.'],
    trim: true,
    maxlength: [150, 'El título no puede exceder los 150 caracteres.']
  },
  message: {
    type: String,
    required: [true, 'El mensaje del anuncio es obligatorio.'],
    trim: true,
    maxlength: [2000, 'El mensaje no puede exceder los 2000 caracteres.'] // Ajusta según necesidad
  },
  audience: {
    type: String,
    required: [true, 'La audiencia del anuncio es obligatoria.'],
    enum: ['todos', 'docentes', 'estudiantes'], // Define las audiencias posibles
    default: 'todos'
  },
  createdBy: { // El administrador que creó el anuncio
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencia a tu UserModel
    required: [true, 'El creador del anuncio es obligatorio.']
  },
  link: { // Un enlace opcional que puede acompañar al anuncio
    type: String,
    trim: true,
    // Opcional: podrías añadir una validación de URL si es necesario
    // match: [/^(ftp|http|https|):\/\/[^ "]+$/, 'Por favor, usa un enlace válido']
  },
  isActive: { // Para controlar si el anuncio está activo y debe mostrarse
    type: Boolean,
    default: true,
    index: true // Puede ser útil para filtrar anuncios activos rápidamente
  },
  expiresAt: { // <--- NUEVO CAMPO
    type: Date,
    index: true // Bueno para consultas
  }
  // Opcional: Podrías añadir una fecha de expiración para los anuncios
  // expiresAt: {
  //   type: Date,
  //   index: true // Para poder limpiar o filtrar anuncios expirados
  // }
}, {
  timestamps: true // Esto añadirá automáticamente los campos createdAt y updatedAt
});

// Opcional: Índice para consultas comunes, por ejemplo, por audiencia y estado activo, ordenado por fecha de creación
announcementSchema.index({ audience: 1, isActive: 1, createdAt: -1 });
announcementSchema.index({ isActive: 1, expiresAt: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;