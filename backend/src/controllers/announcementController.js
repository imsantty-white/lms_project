// src/controllers/AnnouncementController.js
const Announcement = require('../models/AnnouncementModel'); //
const User = require('../models/UserModel'); //
const mongoose = require('mongoose');

// --- Funciones para Administración de Anuncios (Admin) ---

// @desc    Crear un nuevo anuncio
// @route   POST /api/admin/announcements
// @access  Privado/Admin
exports.createAnnouncement = async (req, res) => {
    const { title, message, audience, link, isActive, expiresAt } = req.body;
    const createdBy = req.user._id; // Admin autenticado

    try {
        if (!title || !message || !audience) {
            return res.status(400).json({ message: 'Título, mensaje y audiencia son obligatorios.' });
        }

        let validExpiresAt = null;
        if (expiresAt) {
            const dateExpiresAt = new Date(expiresAt);
            if (isNaN(dateExpiresAt.getTime())) {
                return res.status(400).json({ message: 'La fecha de expiración proporcionada no es válida.' });
            }
            validExpiresAt = dateExpiresAt;
        }

        const newAnnouncement = new Announcement({
            title,
            message,
            audience,
            link,
            isActive: isActive !== undefined ? isActive : true,
            createdBy,
            expiresAt: validExpiresAt
        });

        await newAnnouncement.save();
        res.status(201).json({ success: true, data: newAnnouncement });
    } catch (error) {
        console.error("Error creando anuncio:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al crear el anuncio.', errors: messages });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear el anuncio.' });
    }
};

// @desc    Obtener todos los anuncios (para gestión de admin, con paginación)
// @route   GET /api/admin/announcements
// @access  Privado/Admin
exports.getAllAnnouncementsAdmin = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    try {
        const totalAnnouncements = await Announcement.countDocuments();
        const announcements = await Announcement.find()
            .populate('createdBy', 'nombre apellidos email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: announcements.length,
            totalItems: totalAnnouncements,
            totalPages: Math.ceil(totalAnnouncements / limit),
            currentPage: page,
            data: announcements
        });
    } catch (error) {
        console.error("Error obteniendo todos los anuncios para admin:", error);
        res.status(500).json({ message: 'Error interno del servidor al obtener los anuncios para administración.' });
    }
};

// @desc    Obtener un anuncio específico por ID (para admin editar/ver)
// @route   GET /api/admin/announcements/:announcementId
// @access  Privado/Admin
exports.getAnnouncementByIdAdmin = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.announcementId)) {
            return res.status(400).json({ message: 'ID de anuncio inválido.' });
        }
        const announcement = await Announcement.findById(req.params.announcementId)
            .populate('createdBy', 'nombre apellidos email');

        if (!announcement) {
            return res.status(404).json({ message: 'Anuncio no encontrado.' });
        }
        res.status(200).json({ success: true, data: announcement });
    } catch (error) {
        console.error("Error obteniendo anuncio por ID para admin:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// @desc    Actualizar un anuncio existente
// @route   PUT /api/admin/announcements/:announcementId
// @access  Privado/Admin
exports.updateAnnouncement = async (req, res) => {
    const { announcementId } = req.params;
    const { title, message, audience, link, isActive, expiresAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
        return res.status(400).json({ message: 'ID de anuncio inválido.' });
    }

    try {
        const announcement = await Announcement.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ message: 'Anuncio no encontrado.' });
        }

        if (title) announcement.title = title;
        if (message) announcement.message = message;
        if (audience) announcement.audience = audience;
        if (link !== undefined) announcement.link = link;
        if (isActive !== undefined) announcement.isActive = isActive;
        
        if (expiresAt !== undefined) {
            if (expiresAt === null || expiresAt === '') {
                announcement.expiresAt = null;
            } else {
                const dateExpiresAt = new Date(expiresAt);
                if (isNaN(dateExpiresAt.getTime())) {
                    return res.status(400).json({ message: 'La fecha de expiración proporcionada no es válida.' });
                }
                announcement.expiresAt = dateExpiresAt;
            }
        }
        
        const updatedAnnouncement = await announcement.save();
        res.status(200).json({ success: true, data: updatedAnnouncement });
    } catch (error) {
        console.error("Error actualizando anuncio:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar el anuncio.', errors: messages });
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar el anuncio.' });
    }
};

// @desc    Eliminar un anuncio
// @route   DELETE /api/admin/announcements/:announcementId
// @access  Privado/Admin
exports.deleteAnnouncement = async (req, res) => {
    const { announcementId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
        return res.status(400).json({ message: 'ID de anuncio inválido.' });
    }
    try {
        const announcement = await Announcement.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ message: 'Anuncio no encontrado.' });
        }
        await announcement.deleteOne();
        res.status(200).json({ success: true, message: 'Anuncio eliminado exitosamente.' });
    } catch (error) {
        console.error("Error eliminando anuncio:", error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el anuncio.' });
    }
};

// --- Función para que los Usuarios (Docentes/Estudiantes) obtengan anuncios para su panel ---

// @desc    Obtener anuncios para el panel del usuario (docente/estudiante)
// @route   GET /api/announcements/panel
// @access  Privado
exports.getPanelAnnouncements = async (req, res) => {
    const userType = req.user.tipo_usuario;
    const limit = parseInt(req.query.limit, 10) || 3;
    const now = new Date();

    try {
        let audienceFilter = ['todos'];
        if (userType === 'Docente') {
            audienceFilter.push('docentes');
        } else if (userType === 'Estudiante') {
            audienceFilter.push('estudiantes');
        }

        const announcements = await Announcement.find({
            isActive: true,
            audience: { $in: audienceFilter },
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: null },
                { expiresAt: { $gt: now } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'nombre apellidos');

        res.status(200).json({ success: true, data: announcements });

    } catch (error) {
        console.error("Error obteniendo anuncios para panel:", error);
        res.status(500).json({ message: 'Error interno del servidor al obtener anuncios.' });
    }
};