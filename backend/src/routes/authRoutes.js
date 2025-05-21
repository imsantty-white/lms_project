//authRoutes
const express = require('express');
const router = express.Router(); // Creamos un router de Express

const { protect } = require('../middleware/authMiddleware');

const { registerUser, loginUser, getMe } = require('../controllers/authController'); // Importamos la función del controlador

// Definimos la ruta POST para el registro de usuarios
// La URL completa será /api/auth/register (veremos en app.js cómo se define /api/auth)
router.post('/register', registerUser);

// Nueva ruta POST para el login de usuarios
router.post('/login', loginUser);

// @desc    Get current authenticated user data
// @route   GET /api/auth/me
// Acceso:  Privado (Requiere Token JWT)
router.get('/me', protect, getMe);


module.exports = router; // Exportamos el router