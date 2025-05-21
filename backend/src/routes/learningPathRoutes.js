// src/routes/learningPathRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createLearningPath, createModule, updateContentAssignmentStatus,
  createTheme, assignContentToTheme, getGroupLearningPathsForDocente,
  getGroupLearningPathsForStudent, getLearningPathStructure, updateLearningPath,
  deleteLearningPath, updateModule, deleteModule, updateTheme, deleteTheme,
  updateContentAssignment, deleteContentAssignment, getMyAssignedLearningPaths,
  getMyCreatedLearningPaths, getContentAssignmentById
} = require('../controllers/learningPathController');

// Middleware global de protección
router.use(protect);

/**
 * @swagger
 * /api/learning-paths:
 *   post:
 *     summary: Crear una nueva ruta de aprendizaje
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Ruta creada correctamente
 */
router.post('/', authorize('Docente'), createLearningPath);

/**
 * @swagger
 * /api/learning-paths/{learningPathId}/modules:
 *   post:
 *     summary: Crear un módulo dentro de una ruta de aprendizaje
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: learningPathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Módulo creado correctamente
 */
router.post('/:learningPathId/modules', authorize('Docente'), createModule);

/**
 * @swagger
 * /api/learning-paths/modules/{moduleId}/themes:
 *   post:
 *     summary: Crear un tema dentro de un módulo
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Tema creado correctamente
 */
router.post('/modules/:moduleId/themes', authorize('Docente'), createTheme);

/**
 * @swagger
 * /api/learning-paths/themes/{themeId}/assign-content:
 *   post:
 *     summary: Asignar contenido a un tema
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contenido asignado correctamente
 */
router.post('/themes/:themeId/assign-content', authorize('Docente'), assignContentToTheme);

/**
 * @swagger
 * /api/learning-paths/assignments/{assignmentId}/status:
 *   put:
 *     summary: Actualizar el estado de una asignación de contenido
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.put('/assignments/:assignmentId/status', authorize('Docente', 'Administrador'), updateContentAssignmentStatus);

/**
 * @swagger
 * /api/learning-paths/my-creations:
 *   get:
 *     summary: Obtener rutas creadas por el docente
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de rutas creadas
 */
router.get('/my-creations', authorize('Docente'), getMyCreatedLearningPaths);

/**
 * @swagger
 * /api/learning-paths/groups/{groupId}/docente:
 *   get:
 *     summary: Obtener rutas de un grupo (vista docente)
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rutas obtenidas
 */
router.get('/groups/:groupId/docente', authorize('Docente'), getGroupLearningPathsForDocente);

/**
 * @swagger
 * /api/learning-paths/groups/{groupId}/student:
 *   get:
 *     summary: Obtener rutas de un grupo (vista estudiante)
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rutas obtenidas
 */
router.get('/groups/:groupId/student', getGroupLearningPathsForStudent);

/**
 * @swagger
 * /api/learning-paths/{pathId}/structure:
 *   get:
 *     summary: Obtener estructura completa de una ruta
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estructura obtenida
 */
router.get('/:pathId/structure', getLearningPathStructure);

/**
 * @swagger
 * /api/learning-paths/my-assigned:
 *   get:
 *     summary: Obtener rutas asignadas al usuario
 *     tags: [LearningPaths]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rutas asignadas obtenidas
 */
router.get('/my-assigned', getMyAssignedLearningPaths);

module.exports = router;
