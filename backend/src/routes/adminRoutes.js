// src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getPendingDocentes,
  approveDocente,
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllGroupsForAdmin,
  deleteGroupAsAdmin
} = require('../controllers/adminController');

// Aplica protección y autorización a todas las rutas de este router
router.use(protect, authorize('Administrador'));

/**
 * @swagger
 * tags:
 *   name: Administración
 *   description: Endpoints exclusivos para administradores
 */

/**
 * @swagger
 * /api/admin/users/docentes/approve/{userId}:
 *   put:
 *     summary: Aprobar el registro de un docente
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del docente a aprobar
 *     responses:
 *       200:
 *         description: Docente aprobado correctamente
 *       404:
 *         description: Docente no encontrado
 *       401:
 *         description: No autorizado
 */
router.put('/users/docentes/approve/:userId', approveDocente);

/**
 * @swagger
 * /api/admin/users/docentes/pending:
 *   get:
 *     summary: Obtener la lista de docentes pendientes de aprobación
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de docentes pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 */
router.get('/users/docentes/pending', getPendingDocentes);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Obtener la lista completa de todos los usuarios (con filtro opcional)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *         description: Filtrar por rol de usuario
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtrar por estado de usuario
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Obtener los detalles de un usuario específico por ID
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Detalles del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: No autorizado
 */
router.get('/users/:userId', getUserById);

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Activar o desactivar la cuenta de un usuario
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activo:
 *                 type: boolean
 *                 description: Estado de la cuenta (true = activa, false = inactiva)
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: No autorizado
 */
router.put('/users/:userId/status', updateUserStatus);

/**
 * @swagger
 * /api/admin/groups:
 *   get:
 *     summary: Obtener la lista completa de todos los grupos
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de grupos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: No autorizado
 */
router.get('/groups', getAllGroupsForAdmin);

/**
 * @swagger
 * /api/admin/groups/{groupId}:
 *   delete:
 *     summary: Eliminar permanentemente un grupo (solo Admin)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del grupo a eliminar permanentemente
 *     responses:
 *       200:
 *         description: Grupo eliminado permanentemente junto con sus membresías.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: ID de grupo inválido, o el grupo no cumple las condiciones para eliminación (e.g., no archivado, archivado por menos de 15 días).
 *       403:
 *         description: El grupo no cumple con el requisito de tiempo de archivado (más de 15 días).
 *       404:
 *         description: Grupo no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
router.delete('/groups/:groupId', deleteGroupAsAdmin);

module.exports = router;