// src/routes/contentRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
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
router.use(protect, authorize('Docente'));

/**
 * @swagger
 * tags:
 *   name: Banco de Contenido
 *   description: Endpoints para gestión de recursos y actividades del banco personal del docente
 */

/**
 * @swagger
 * /api/content/resources:
 *   post:
 *     summary: Crear un nuevo recurso en el banco del docente
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Resource'
 *     responses:
 *       201:
 *         description: Recurso creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Error en los datos enviados
 *       401:
 *         description: No autorizado
 */
router.post('/resources', createResource);

/**
 * @swagger
 * /api/content/activities:
 *   post:
 *     summary: Crear una nueva actividad en el banco del docente
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Activity'
 *     responses:
 *       201:
 *         description: Actividad creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 *       400:
 *         description: Error en los datos enviados
 *       401:
 *         description: No autorizado
 */
router.post('/activities', createActivity);

/**
 * @swagger
 * /api/content/my-bank:
 *   get:
 *     summary: Obtener el banco de contenido (recursos y actividades) del docente autenticado
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Banco de contenido del docente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recursos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *                 actividades:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         description: No autorizado
 */
router.get('/my-bank', getDocenteContentBank);

/**
 * @swagger
 * /api/content/resources/{resourceId}:
 *   get:
 *     summary: Obtener un recurso específico por ID
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del recurso
 *     responses:
 *       200:
 *         description: Recurso encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       404:
 *         description: Recurso no encontrado
 *       401:
 *         description: No autorizado
 */
router.get('/resources/:resourceId', getResourceById);

/**
 * @swagger
 * /api/content/activities/{activityId}:
 *   get:
 *     summary: Obtener una actividad específica por ID
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Actividad encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Actividad no encontrada
 *       401:
 *         description: No autorizado
 */
router.get('/activities/:activityId', getActivityById);

/**
 * @swagger
 * /api/content/resources/{resourceId}:
 *   put:
 *     summary: Actualizar un recurso específico en el banco de contenido
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del recurso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Resource'
 *     responses:
 *       200:
 *         description: Recurso actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       404:
 *         description: Recurso no encontrado
 *       401:
 *         description: No autorizado
 */
router.put('/resources/:resourceId', updateResource);

/**
 * @swagger
 * /api/content/resources/{resourceId}:
 *   delete:
 *     summary: Eliminar un recurso específico del banco de contenido
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del recurso
 *     responses:
 *       200:
 *         description: Recurso eliminado correctamente
 *       404:
 *         description: Recurso no encontrado
 *       401:
 *         description: No autorizado
 */
router.delete('/resources/:resourceId', deleteResource);

/**
 * @swagger
 * /api/content/activities/{activityId}:
 *   put:
 *     summary: Actualizar una actividad específica en el banco de contenido
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la actividad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Activity'
 *     responses:
 *       200:
 *         description: Actividad actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Actividad no encontrada
 *       401:
 *         description: No autorizado
 */
router.put('/activities/:activityId', updateActivity);

/**
 * @swagger
 * /api/content/activities/{activityId}:
 *   delete:
 *     summary: Eliminar una actividad específica del banco de contenido
 *     tags: [Banco de Contenido]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la actividad
 *     responses:
 *       200:
 *         description: Actividad eliminada correctamente
 *       404:
 *         description: Actividad no encontrada
 *       401:
 *         description: No autorizado
 */
router.delete('/activities/:activityId', deleteActivity);

module.exports = router;