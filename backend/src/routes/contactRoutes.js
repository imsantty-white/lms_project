const express = require('express');
const router = express.Router();
const { submitContactMessage } = require('../controllers/contactController');
const { protectOptional } = require('../middleware/authMiddleware'); // Asumiendo que tienes un middleware de autenticación opcional

// @route   POST /api/contact
// @desc    Enviar un mensaje de contacto
// @access  Público (la autenticación es opcional, si se provee token, se usa req.user)
// Usamos protectOptional para que req.user esté disponible si el usuario está logueado,
// pero no bloquea la ruta si no lo está.
router.post('/', protectOptional, submitContactMessage);

module.exports = router;
