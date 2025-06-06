// src/models/ModuleModel.js

const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    nombre: { type: String, required: [true, 'El nombre del módulo es obligatorio'], trim: true },
    descripcion: { type: String, trim: true },
    learning_path_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: [true, 'El módulo debe estar asociado a una ruta de aprendizaje'] }, // El módulo pertenece a una Ruta de Aprendizaje
    orden: { type: Number, required: [true, 'El orden del módulo es obligatorio'] } // Para definir el orden dentro de la ruta
    // Los Temas de este módulo referenciarán este ID
});

// Definición de Índices
moduleSchema.index({ learning_path_id: 1, orden: 1 });

const Module = mongoose.model('Module', moduleSchema);
module.exports = Module;