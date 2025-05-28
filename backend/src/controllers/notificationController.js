// src/controllers/notificationController.js

const NotificationModel = require('../models/NotificationModel'); // Asegúrate de que el nombre del modelo sea correcto
const mongoose = require('mongoose'); // Importa mongoose para validar IDs

// @desc    Obtener todas las notificaciones del usuario autenticado
// @route   GET /api/notifications
// @access  Privado
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id; // Usas req.user.id, lo mantendremos.
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notifications = await NotificationModel.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'name profilePicture'); // Asegúrate que 'name' y 'profilePicture' existen en tu modelo User

        const total = await NotificationModel.countDocuments({ recipient: userId });

        res.json({
            notifications,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// @desc    Marcar una notificación específica como leída
// @route   PUT /api/notifications/:id/read
// @access  Privado
const markNotificationAsRead = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({ message: 'ID de notificación inválido.' });
        }

        const notification = await NotificationModel.findOneAndUpdate(
            { _id: notificationId, recipient: userId, isRead: false }, // Solo actualiza si no está leída
            { isRead: true },
            { new: true }
        ).populate('sender', 'name profilePicture');

        if (!notification) {
            // Si la notificación no se encuentra, no pertenece al usuario, o ya estaba leída.
            return res.status(404).json({ message: 'Notificación no encontrada, no autorizada, o ya estaba marcada como leída.' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
};

// @desc    Marcar todas las notificaciones de un usuario como leídas
// @route   PUT /api/notifications/mark-all-read
// @access  Privado
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await NotificationModel.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.json({
            message: 'All notifications marked as read.',
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
};

// --- NUEVAS FUNCIONES PARA BORRAR ---

// @desc    Borrar una notificación específica por ID
// @route   DELETE /api/notifications/:id
// @access  Privado
const deleteNotification = async (req, res) => {
    const { id } = req.params; // ID de la notificación a borrar
    const userId = req.user.id; // ID del usuario autenticado

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de notificación inválido.' });
    }

    try {
        // Encuentra y elimina la notificación, asegurándote de que pertenezca al usuario actual
        const notification = await NotificationModel.findOneAndDelete({ _id: id, recipient: userId });

        if (!notification) {
            // Si no se encuentra la notificación o no pertenece al usuario autenticado
            return res.status(404).json({ message: 'Notificación no encontrada o no tienes permiso para borrarla.' });
        }

        res.status(200).json({ success: true, message: 'Notificación eliminada exitosamente.' });

    } catch (error) {
        console.error('Error al borrar notificación:', error);
        res.status(500).json({ message: 'Error interno del servidor al borrar notificación', error: error.message });
    }
};

// @desc    Borrar todas las notificaciones del usuario autenticado
// @route   DELETE /api/notifications
// @access  Privado
const deleteAllNotifications = async (req, res) => {
    const userId = req.user.id;

    try {
        // Eliminar todas las notificaciones que pertenecen al usuario autenticado
        const result = await NotificationModel.deleteMany({ recipient: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No se encontraron notificaciones para eliminar.' });
        }

        res.status(200).json({
            success: true,
            message: `Se eliminaron ${result.deletedCount} notificaciones.`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Error al borrar todas las notificaciones del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al borrar todas las notificaciones', error: error.message });
    }
};

module.exports = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,        // <-- Exporta la nueva función
    deleteAllNotifications,    // <-- Exporta la nueva función
};