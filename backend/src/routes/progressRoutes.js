// src/routes/progressRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
    updateThemeProgress,
    getStudentProgressForPath,
    getAllStudentProgressForPathForDocente,
    getSpecificStudentProgressForPathForDocente
  } = require('../controllers/progressController');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Progreso
 *   description: Endpoints para gestión y visualización del progreso de los estudiantes
 */

/**
 * @swagger
 * /api/progress/update-theme:
 *   post:
 *     summary: Actualizar el progreso del estudiante para un tema específico
 *     tags: [Progreso]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               temaId:
 *                 type: string
 *                 description: ID del tema
 *               completado:
 *                 type: boolean
 *                 description: Si el tema fue completado o no
 *     responses:
 *       200:
 *         description: Progreso actualizado correctamente
 *       400:
 *         description: Error en los datos enviados
 *       401:
 *         description: No autorizado
 */
router.post('/update-theme', authorize('Estudiante'), updateThemeProgress);

/**
 * @swagger
 * /api/progress/my/{learningPathId}:
 *   get:
 *     summary: Obtener el progreso del estudiante autenticado para una ruta de aprendizaje específica
 *     tags: [Progreso]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: learningPathId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la ruta de aprendizaje
 *     responses:
 *       200:
 *         description: Progreso del estudiante para la ruta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Progress'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Ruta de aprendizaje no encontrada
 */
router.get('/my/:learningPathId', authorize('Estudiante'), getStudentProgressForPath);

/**
 * @swagger
 * /api/progress/group/{groupId}/path/{learningPathId}/docente:
 *   get:
 *     summary: Obtener el resumen del progreso de todos los estudiantes para una ruta en un grupo (para el docente dueño)
 *     tags: [Progreso]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del grupo
 *       - in: path
 *         name: learningPathId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la ruta de aprendizaje
 *     responses:
 *       200:
 *         description: Resumen del progreso de todos los estudiantes del grupo para la ruta
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Progress'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Grupo o ruta no encontrada
 */
router.get('/group/:groupId/path/:learningPathId/docente', authorize('Docente'), getAllStudentProgressForPathForDocente);

/**
 * @swagger
 * /api/progress/student/{studentId}/path/{learningPathId}/docente:
 *   get:
 *     summary: Obtener el progreso detallado de un estudiante específico para una ruta (para el docente dueño)
 *     tags: [Progreso]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del estudiante
 *       - in: path
 *         name: learningPathId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la ruta de aprendizaje
 *     responses:
 *       200:
 *         description: Progreso detallado del estudiante para la ruta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Progress'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Estudiante o ruta no encontrada
 */
router.get('/student/:studentId/path/:learningPathId/docente', authorize('Docente'), getSpecificStudentProgressForPathForDocente);

module.exports = router;