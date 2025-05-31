// src/routes/announcementRoutes.js
const express = require('express');
const router = express.Router(); // Un solo router para todos los anuncios
const { protect, authorize } = require('../middleware/authMiddleware'); //
const {
    // Funciones del AnnouncementController
    createAnnouncement,
    getAllAnnouncementsAdmin,
    getAnnouncementByIdAdmin,
    updateAnnouncement,
    deleteAnnouncement,
    getPanelAnnouncements
} = require('../controllers/AnnouncementController'); // Asumiendo que todas las funciones están aquí

// --- Rutas para Usuarios Finales (Docentes/Estudiantes) ---

// @route   GET /api/announcements/panel
// @desc    Obtener anuncios para el panel del usuario
// @access  Privado
router.get('/panel', protect, getPanelAnnouncements);


// --- Rutas para Administración de Anuncios ---
// Estas rutas estarán prefijadas con /admin por el montaje en app.js, o puedes definirlas aquí:
// Opción A: Prefijo en app.js (router.post('/', createAnnouncement) se convierte en /api/admin/announcements/)
// Opción B: Prefijo aquí (router.post('/admin/', createAnnouncement) se convierte en /api/announcements/admin/)

// Vamos a seguir la lógica de que el prefijo /admin se maneja al montar este router si es para admin.
// O, si este router se monta en /api/announcements, entonces las rutas de admin necesitan el /admin aquí.
// Para mayor claridad y para que este archivo sea autocontenido para "anuncios",
// vamos a definir las sub-rutas /admin/* aquí.

// @route   POST /api/announcements/admin
// @desc    Crear un nuevo anuncio
// @access  Privado/Admin
router.post('/admin', protect, authorize('Administrador'), createAnnouncement);

// @route   GET /api/announcements/admin
// @desc    Obtener todos los anuncios (para gestión)
// @access  Privado/Admin
router.get('/admin', protect, authorize('Administrador'), getAllAnnouncementsAdmin);

// @route   GET /api/announcements/admin/:announcementId
// @desc    Obtener un anuncio específico por ID (para edición/vista previa por admin)
// @access  Privado/Admin
router.get('/admin/:announcementId', protect, authorize('Administrador'), getAnnouncementByIdAdmin);

// @route   PUT /api/announcements/admin/:announcementId
// @desc    Actualizar un anuncio existente
// @access  Privado/Admin
router.put('/admin/:announcementId', protect, authorize('Administrador'), updateAnnouncement);

// @route   DELETE /api/announcements/admin/:announcementId
// @desc    Eliminar un anuncio
// @access  Privado/Admin
router.delete('/admin/:announcementId', protect, authorize('Administrador'), deleteAnnouncement);

module.exports = router; // Exportar el único router