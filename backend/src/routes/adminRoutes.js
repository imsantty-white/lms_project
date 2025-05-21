// src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware'); // Importamos los middlewares de seguridad
const {
  getPendingDocentes,
  approveDocente,
  getAllUsers,
  getUserById,
  updateUserStatus
} = require('../controllers/adminController'); // Importamos los controladores de administración

// Middleware: Aplica 'protect' y 'authorize('Administrador')' a TODAS las rutas definidas en este router
// Esto asegura que solo los administradores autenticados puedan usar estas rutas
router.use(protect, authorize('Administrador'));


// @desc    Aprobar el registro de un docente
// @route   PUT /api/admin/users/docentes/${userIdToApprove}/approve
router.put('/users/docentes/approve/:userId', approveDocente);


// @desc    Obtener la lista de docentes pendientes de aprobación
// @route   GET /api/admin/users/docentes/pending
router.get('/users/docentes/pending', getPendingDocentes);


// @desc    Obtener la lista completa de todos los usuarios (con filtro opcional)
// @route   GET /api/admin/users
router.get('/users', getAllUsers);

// @desc    Obtener los detalles de un usuario específico por ID
// @route   GET /api/admin/users/:userId
router.get('/users/:userId', getUserById);

// @desc    Activar o desactivar la cuenta de un usuario
// @route   PUT /api/admin/users/:userId/status
router.put('/users/:userId/status', updateUserStatus);


// Aquí agregaremos rutas para manejar limitaciones si es necesario en el futuro

module.exports = router; // Exportamos el router