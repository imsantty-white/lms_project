// src/routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  // --- Importa las nuevas funciones de borrado ---
  deleteNotification,
  deleteAllNotifications,
} = require('../controllers/notificationController'); // Asegúrate que estas funciones estén exportadas en tu controlador

const { protect } = require('../middleware/authMiddleware'); // Assuming 'protect' is the auth middleware

// @route   GET /api/notifications
// @desc    Get notifications for the logged-in user with pagination
// @access  Private
router.get('/', protect, getNotifications);

// @route   PATCH /api/notifications/:id/mark-read
// @desc    Mark a specific notification as read
// @access  Private
router.patch('/:id/mark-read', protect, markNotificationAsRead);

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all notifications as read for the logged-in user
// @access  Private
router.post('/mark-all-read', protect, markAllNotificationsAsRead);

// --- NUEVAS RUTAS PARA BORRAR ---
// @route   DELETE /api/notifications/all
// @desc    Borrar todas las notificaciones del usuario autenticado
// @access  Private
// NOTA: Para evitar conflictos con la ruta DELETE /:id, he cambiado esta a '/all'.
// Si DELETE /api/notifications/ sin ID (como en mi ejemplo anterior) NO te da conflicto,
// puedes dejarla así. Pero /all es más explícito y seguro.
router.delete('/all', protect, deleteAllNotifications);

// @route   DELETE /api/notifications/:id
// @desc    Borrar una notificación específica por ID
// @access  Private
router.delete('/:id', protect, deleteNotification); // Aquí usamos el :id para borrar una específica



module.exports = router;