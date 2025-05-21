// src/models/ResourceModel.js

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    type: { // Tipo de recurso (Contenido, Enlace, Video-Enlace)
        type: String,
        required: [true, 'El tipo de recurso es obligatorio'],
        enum: ['Contenido', 'Enlace', 'Video-Enlace'] // Validar con los tipos definidos
    },
    title: { // Título del recurso
        type: String,
        required: [true, 'El título del recurso es obligatorio'],
        trim: true
    },
    docente_id: { // El docente que creó este recurso (para su banco)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El docente creador es obligatorio']
    },
    // Campos específicos según el tipo de recurso
    content_body: { // Contenido HTML/texto para tipo 'Contenido'
        type: String
    },
    link_url: { // URL para tipo 'Enlace'
        type: String
    },
    video_url: { // URL de video para tipo 'Video-Enlace'
        type: String
    },
    fecha_creacion: { type: Date, default: Date.now } // Fecha de creación del recurso en el banco
});

const Resource = mongoose.model('Resource', resourceSchema);
module.exports = Resource;