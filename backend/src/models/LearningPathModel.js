// src/models/LearningPathModel.js

const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema({
    nombre: { type: String, required: [true, 'El nombre de la ruta es obligatorio'], trim: true },
    descripcion: { type: String, trim: true },
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: [true, 'La ruta debe estar asociada a un grupo'] }, // La ruta pertenece a un Grupo
    fecha_inicio: { type: Date }, // Fecha de inicio de la ruta
    fecha_fin: { type: Date },   // Fecha de fin de la ruta
    activo: { type: Boolean, default: true } // Indica si la ruta está activa
    // Los Módulos de esta ruta referenciarán este ID
});

const LearningPath = mongoose.model('LearningPath', learningPathSchema);
module.exports = LearningPath;