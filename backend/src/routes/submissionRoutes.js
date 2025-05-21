// src/routes/submissionRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createSubmission,
    getStudentSubmissionsForAssignment,
    getAssignmentSubmissionsForDocente,
    getSubmissionByIdForDocente,
    gradeSubmission,
    deleteSubmissionByDocente
  } = require('../controllers/submissionController');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Entregas
 *   description: Endpoints para gestión de entregas de actividades
 */

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Crear una nueva entrega para una actividad asignada
 *     tags: [Entregas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Submission'
 *     responses:
 *       201:
 *         description: Entrega creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Error en los datos enviados
 *       401:
 *         description: No autorizado
 */
router.post('/', authorize('Estudiante'), createSubmission);

/**
 * @swagger
 * /api/submissions/my/{assignmentId}:
 *   get:
 *     summary: Obtener las entregas de un estudiante para una asignación específica
 *     tags: [Entregas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asignación de la actividad
 *     responses:
 *       200:
 *         description: Lista de entregas del estudiante para la asignación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.get('/my/:assignmentId', authorize('Estudiante'), getStudentSubmissionsForAssignment);

/**
 * @swagger
 * /api/submissions/assignment/{assignmentId}/docente:
 *   get:
 *     summary: Obtener todas las entregas para una asignación específica (para el docente dueño)
 *     tags: [Entregas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asignación de la actividad
 *     responses:
 *       200:
 *         description: Lista de entregas de estudiantes para la asignación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.get('/assignment/:assignmentId/docente', authorize('Docente'), getAssignmentSubmissionsForDocente);

/**
 * @swagger
 * /api/submissions/{submissionId}:
 *   get:
 *     summary: Obtener una entrega específica por ID (para el docente dueño)
 *     tags: [Entregas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la entrega (submission)
 *     responses:
 *       200:
 *         description: Entrega encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Entrega no encontrada
 */
router.get('/:submissionId', authorize('Docente'), getSubmissionByIdForDocente);

/**
 * @swagger
 * /api/submissions/{submissionId}/grade:
 *   put:
 *     summary: Calificar una entrega específica (manual para Cuestionario/Trabajo)
 *     tags: [Entregas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la entrega (submission)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               calificacion:
 *                 type: number
 *                 description: Calificación asignada
 *               retroalimentacion:
 *                 type: string
 *                 description: Comentarios del docente
 *     responses:
 *       200:
 *         description: Calificación guardada correctamente
 *       400:
 *         description: Error en la calificación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Entrega no encontrada
 */
router.put('/:submissionId/grade', authorize('Docente'), gradeSubmission);

/**
 * @swagger
 * /api/submissions/{submissionId}/docente:
 *   delete:
 *     summary: Eliminar una entrega de estudiante específica (para el docente dueño)
 *     tags: [Entregas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la entrega (submission)
 *     responses:
 *       200:
 *         description: Entrega eliminada correctamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Entrega no encontrada
 */
router.delete('/:submissionId/docente', authorize('Docente'), deleteSubmissionByDocente);

module.exports = router;