const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        // Nota: No se requiere 'required: true' para permitir envíos anónimos o de usuarios no logueados
        // que podrían no querer dejar un email, aunque se recomienda para seguimiento.
        // Se puede añadir validación de formato de email si se desea:
        // match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, introduce un email válido']
    },
    subject: {
        type: String,
        required: [true, 'El asunto es obligatorio.'],
        trim: true,
        maxlength: [200, 'El asunto no puede exceder los 200 caracteres.']
    },
    message: {
        type: String,
        required: [true, 'El mensaje es obligatorio.'],
        trim: true,
        maxlength: [5000, 'El mensaje no puede exceder los 5000 caracteres.']
    },
    userId: { // ID del usuario si el mensaje fue enviado por un usuario autenticado
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, 
    },
    isResolved: { // Para que el administrador pueda marcar el mensaje como resuelto/gestionado
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Opcional: Añadir un índice para createdAt si se espera ordenar o consultar frecuentemente por fecha
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ isResolved: 1, createdAt: -1 }); // Para buscar no resueltos primero

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

module.exports = ContactMessage;
