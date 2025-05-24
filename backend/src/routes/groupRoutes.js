// src/routes/groupRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createGroup, requestJoinGroup, getGroupMemberships,
  getMyJoinRequests, respondJoinRequest, getGroupById,
  getGroupStudents, getMyApprovedGroups, getMyMembershipsWithStatus,
  updateGroup, deleteGroup, removeStudentFromGroup, getMyOwnedGroups,
  removeMembershipById, // Added removeMembershipById
  restoreGroup, // Added restoreGroup
} = require('../controllers/groupController');

/**
 * @swagger
 * /api/groups/create:
 *   post:
 *     summary: Crear un nuevo grupo
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Grupo creado correctamente
 */
router.post('/create', protect, authorize('Docente'), createGroup);

/**
 * @swagger
 * /api/groups/join-request:
 *   post:
 *     summary: Solicitar unirse a un grupo
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solicitud enviada
 */
router.post('/join-request', protect, requestJoinGroup);

/**
 * @swagger
 * /api/groups/my-join-requests:
 *   get:
 *     summary: Ver solicitudes pendientes de mis grupos
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
router.get('/my-join-requests', protect, authorize('Docente'), getMyJoinRequests);

/**
 * @swagger
 * /api/groups/join-request/{membershipId}/respond:
 *   put:
 *     summary: Responder a una solicitud de ingreso a grupo
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta enviada
 */
router.put('/join-request/:membershipId/respond', protect, authorize('Docente'), respondJoinRequest);

/**
 * @swagger
 * /api/groups/{groupId}/students:
 *   get:
 *     summary: Obtener lista de estudiantes de un grupo
 *     tags: [Groups]
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
 *         description: Lista de estudiantes
 */
router.get('/:groupId/students', protect, authorize('Docente'), getGroupStudents);

/**
 * @swagger
 * /api/groups/my-groups:
 *   get:
 *     summary: Obtener grupos a los que pertenezco
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de grupos
 */
router.get('/my-groups', protect, getMyApprovedGroups);

/**
 * @swagger
 * /api/groups/my-memberships:
 *   get:
 *     summary: Obtener mis membresías con estado
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de membresías
 */
router.get('/my-memberships', protect, getMyMembershipsWithStatus);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Obtener detalles de un grupo por ID
 *     tags: [Groups]
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
 *         description: Detalles del grupo
 */
router.get('/:groupId', protect, authorize('Docente'), getGroupById);

/**
 * @swagger
 * /api/groups/{groupId}/memberships:
 *   get:
 *     summary: Obtener membresías de un grupo
 *     tags: [Groups]
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
 *         description: Lista de membresías
 */
router.get('/:groupId/memberships', protect, authorize('Docente'), getGroupMemberships);

/**
 * @swagger
 * /api/groups/docente/me:
 *   get:
 *     summary: Obtener grupos creados por el docente
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de grupos del docente
 */
router.get('/docente/me', protect, authorize('Docente'), getMyOwnedGroups);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: Actualizar grupo por ID
 *     tags: [Groups]
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
 *         description: Grupo actualizado
 */
router.put('/:groupId', protect, authorize('Docente'), updateGroup);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Eliminar un grupo por ID
 *     tags: [Groups]
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
 *         description: Grupo eliminado
 */
router.delete('/:groupId', protect, authorize('Docente'), deleteGroup);

/**
 * @swagger
 * /api/groups/{groupId}/students/{studentId}:
 *   delete:
 *     summary: Eliminar un estudiante de un grupo
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estudiante eliminado del grupo
 */
router.delete('/:groupId/students/:studentId', protect, authorize('Docente'), removeStudentFromGroup);

// Ruta para eliminar una membresía por ID
router.delete('/:groupId/memberships/:membershipId', protect, authorize('Docente'), removeMembershipById);

// Ruta para restaurar un grupo eliminado
router.put('/:groupId/restore', protect, authorize(['Docente']), restoreGroup);

module.exports = router;