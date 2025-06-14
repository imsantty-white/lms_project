// src/models/ThemeModel.js

const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    nombre: { type: String, required: [true, 'El nombre del tema es obligatorio'], trim: true },
    descripcion: { type: String, trim: true },
    module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: [true, 'El tema debe estar asociado a un módulo'] }, // El tema pertenece a un Módulo
    orden: { type: Number, required: [true, 'El orden del tema es obligatorio'] } // Para definir el orden dentro del módulo
    // Los Recursos y Actividades asignados a este tema lo referenciarán
});

// Definición de Índices
themeSchema.index({ module_id: 1, orden: 1 });

const Theme = mongoose.model('Theme', themeSchema);
module.exports = Theme;