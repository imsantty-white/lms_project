// src/models/LearningPathModel.js
const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema({
  nombre: { type: String, required: [true, 'El nombre de la ruta es obligatorio'], trim: true },
  descripcion: { type: String, trim: true },
  // Este campo sigue siendo importante
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: [true, 'La ruta debe estar asociada a un grupo'] },
  fecha_inicio: { type: Date },
  fecha_fin: { type: Date },
  activo: { type: Boolean, default: true }
});

const LearningPath = mongoose.model('LearningPath', learningPathSchema);
module.exports = LearningPath;