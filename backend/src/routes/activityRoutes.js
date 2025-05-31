// src/routes/activityRoutes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const { 
  getStudentActivityForAttempt, 
  submitStudentActivityAttempt,
  getAssignmentSubmissions, 
  getTeacherAssignments, 
  gradeSubmission,
  getAssignmentById, getMyPendingActivities,
  updateAssignmentStatus
} = require('../controllers/activityController');

/**
 * @swagger
 * tags:
 *   name: Actividades
 *   description: Endpoints para gestión y entrega de actividades
 */

/**
 * @swagger
 * /api/activities/student/{assignmentId}/start:
 *   get:
 *     summary: Obtener los detalles de una actividad asignada para que un estudiante la inicie
 *     tags: [Actividades]
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
 *         description: Detalles de la actividad para el estudiante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.get('/student/:assignmentId/start', protect, authorize('Estudiante'), getStudentActivityForAttempt);

/**
 * @swagger
 * /api/activities/student/{assignmentId}/submit-attempt:
 *   post:
 *     summary: Registrar la entrega de respuestas de un estudiante para una asignación de actividad
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asignación de la actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               respuestas:
 *                 type: array
 *                 description: Respuestas del estudiante
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Entrega registrada correctamente
 *       400:
 *         description: Error en la entrega o validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.post('/student/:assignmentId/submit-attempt', protect, authorize('Estudiante'), submitStudentActivityAttempt);

/**
 * @swagger
 * /api/activities/assignments/{assignmentId}/submissions:
 *   get:
 *     summary: Obtener todas las entregas para una asignación (vista Docente/Admin)
 *     tags: [Actividades]
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
 *         description: Lista de entregas de estudiantes
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
router.get('/assignments/:assignmentId/submissions', protect, authorize('Docente', 'Administrador'), getAssignmentSubmissions);

/**
 * @swagger
 * /api/activities/teacher/assignments:
 *   get:
 *     summary: Obtener la lista de asignaciones de actividades para un docente/admin
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: No autorizado
 */
router.get('/teacher/assignments', protect, authorize('Docente', 'Administrador'), getTeacherAssignments);

/**
 * @swagger
 * /api/submissions/{submissionId}/grade:
 *   put:
 *     summary: Guardar la calificación manual para una entrega (Cuestionario/Trabajo)
 *     tags: [Actividades]
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
router.put('/submissions/:submissionId/grade', protect, authorize('Docente', 'Administrador'), gradeSubmission);

/**
 * @swagger
 * /api/activities/assignments/{assignmentId}:
 *   get:
 *     summary: Obtener una asignación por ID
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asignación
 *     responses:
 *       200:
 *         description: Asignación encontrada
 *       404:
 *         description: Asignación no encontrada
 */
router.get('/assignments/:assignmentId', protect, authorize('Docente', 'Administrador'), getAssignmentById);

router.get('/my-pendings', protect, authorize('Estudiante'), getMyPendingActivities);

/**
 * @swagger
 * /api/activities/assignments/{assignmentId}/status:
 *   patch:
 *     summary: Actualizar el estado de una asignación (Open/Closed)
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asignación de la actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, Closed]
 *                 description: Nuevo estado de la asignación
 *     responses:
 *       200:
 *         description: Estado de la asignación actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Estado inválido proporcionado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido (no es el docente de la asignación o rol incorrecto)
 *       404:
 *         description: Asignación no encontrada
 */
router.patch('/assignments/:assignmentId/status', protect, authorize('Docente', 'Administrador'), updateAssignmentStatus);

module.exports = router; // Exporta el router