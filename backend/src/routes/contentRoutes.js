// src/routes/contentRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware'); // Importamos los middlewares de seguridad
const {
    createResource,
    createActivity,
    getDocenteContentBank,
    getResourceById,
    getActivityById,
    updateResource,
    deleteResource,
    updateActivity,
    deleteActivity
  } = require('../controllers/contentController');

// Middleware: Aplica 'protect' y 'authorize('Docente')' a todas las rutas definidas en este router
// Esto asegura que solo los docentes autenticados puedan usar estas rutas
router.use(protect, authorize('Docente'));

// @desc    Crear un nuevo Recurso (para el banco del docente)
// @route   POST /api/content/resources
// (La ruta es '/resources' porque este router se montará en '/api/content' en app.js)
router.post('/resources', createResource);

// @desc    Crear una nueva Actividad (para el banco del docente)
// @route   POST /api/content/activities
router.post('/activities', createActivity);

// @desc    Obtener el Banco de Contenido (Recursos y Actividades) del Docente autenticado
// @route   GET /api/content/my-bank
router.get('/my-bank', getDocenteContentBank); // O '/my-bank' si usas req.user._id

// @desc    Obtener un Recurso específico por ID
// @route   GET /api/content/resources/:resourceId
router.get('/resources/:resourceId', getResourceById);

// Rutas para Actividades
// @desc    Obtener una Actividad específica por ID
// @route   GET /api/content/activities/:activityId
router.get('/activities/:activityId', getActivityById);

// --- Nuevas Rutas de Gestión del Banco de Contenido para Docente ---

// @desc    Actualizar un Recurso específico en el Banco de Contenido
// @route   PUT /api/content/resources/:resourceId
router.put('/resources/:resourceId', updateResource); // <-- Nueva ruta PUT para Recurso

// @desc    Eliminar un Recurso específico del Banco de Contenido
// @route   DELETE /api/content/resources/:resourceId
router.delete('/resources/:resourceId', deleteResource); // <-- Nueva ruta DELETE para Recurso

// @desc    Actualizar una Actividad específica en el Banco de Contenido
// @route   PUT /api/content/activities/:activityId
router.put('/activities/:activityId', updateActivity); // <-- Nueva ruta PUT para Actividad

// @desc    Eliminar una Actividad específica del Banco de Contenido
// @route   DELETE /api/content/activities/:activityId
router.delete('/activities/:activityId', deleteActivity); // <-- Nueva ruta DELETE para Actividad


// Nota: Las rutas relacionadas con la estructura de Rutas de Aprendizaje (Paths, Modules, Themes) y asignaciones específicas
// se manejarán en un paso posterior. Estas rutas son solo para los ítems del banco.


module.exports = router; // Exportamos el router