const ContactMessage = require('../models/ContactMessageModel');
const User = require('../models/UserModel'); // Para acceder a datos del usuario logueado

// @desc    Enviar un mensaje de contacto al administrador
// @route   POST /api/contact
// @access  Público (autenticación opcional)
async function submitContactMessage(req, res) {
    const { name, email, subject, message } = req.body;

    // Validación básica
    if (!subject || !subject.trim()) {
        return res.status(400).json({ success: false, message: 'El asunto es obligatorio.' });
    }
    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'El mensaje es obligatorio.' });
    }

    try {
        const newMessageData = {
            subject: subject.trim(),
            message: message.trim(),
        };

        // Si el usuario está autenticado (req.user es establecido por un middleware de autenticación opcional)
        if (req.user) {
            newMessageData.userId = req.user._id;
            // Pre-rellenar nombre y email desde el perfil del usuario si no se proporcionaron en el formulario
            newMessageData.name = name?.trim() || `${req.user.nombre} ${req.user.apellidos}`.trim();
            newMessageData.email = email?.trim()?.toLowerCase() || req.user.email;
        } else {
            // Para usuarios no autenticados, tomar nombre y email del body si se proporcionan
            if (name && name.trim()) newMessageData.name = name.trim();
            if (email && email.trim()) newMessageData.email = email.trim().toLowerCase();
        }
        
        // Validar formato de email si se proporcionó (opcional, pero bueno)
        if (newMessageData.email) {
            const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(newMessageData.email)) {
                return res.status(400).json({ success: false, message: 'Por favor, introduce un email válido.' });
            }
        }


        const contactMessage = new ContactMessage(newMessageData);
        await contactMessage.save();

        // TODO: Considerar enviar una notificación por email al administrador aquí

        res.status(201).json({ 
            success: true, 
            message: 'Mensaje enviado correctamente. Gracias por contactarnos.',
            data: { // Devolver algunos datos puede ser útil para el frontend, aunque no es estrictamente necesario
                subject: contactMessage.subject,
                isResolved: contactMessage.isResolved,
                createdAt: contactMessage.createdAt,
                id: contactMessage._id
            }
        });

    } catch (error) {
        console.error('Error al guardar el mensaje de contacto:', error);
        // Manejo de errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar tu mensaje.' });
    }
}

module.exports = { 
    submitContactMessage,
};
