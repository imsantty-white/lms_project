// src/routes/groupRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware'); // Importamos los middlewares de seguridad
const { createGroup, requestJoinGroup, getGroupMemberships,
        getMyJoinRequests, respondJoinRequest, getGroupById,
        getGroupStudents, getMyApprovedGroups, getMyMembershipsWithStatus,
        updateGroup, deleteGroup, removeStudentFromGroup, getMyOwnedGroups} = require('../controllers/groupController'); // Importaremos la función controladora (la crearemos en el siguiente paso)

// Ruta POST para crear un nuevo grupo
// Aplicamos 'protect' para asegurar que solo usuarios autenticados puedan acceder
// Aplicamos 'authorize('Docente')' para asegurar que solo los usuarios de tipo 'Docente' puedan acceder
router.post('/create', protect, authorize('Docente'), createGroup);

// Ruta POST para que un estudiante solicite unirse a un grupo
// Protegida (cualquier usuario autenticado), la validación de tipo de usuario se hará en el controlador
router.post('/join-request', protect, requestJoinGroup);

// Ruta GET para que un docente vea las solicitudes pendientes de sus grupos
// Protegida y solo para Docentes
router.get('/my-join-requests', protect, authorize('Docente'), getMyJoinRequests);

// Protegida y solo para Docentes
router.put('/join-request/:membershipId/respond', protect, authorize('Docente'), respondJoinRequest);

// Ruta GET para que un Docente vea la lista de estudiantes aprobados en un grupo específico
// La URL incluye el ID del grupo
// Protegida y solo para Docentes. Requiere que el grupo pertenezca al docente.
router.get('/:groupId/students', protect, authorize('Docente'), getGroupStudents);

// Ruta GET para que un usuario autenticado vea la lista de grupos a los que pertenece (aprobado)
// Protegida (cualquier usuario autenticado)
router.get('/my-groups', protect, getMyApprovedGroups);

// Ruta GET para que un estudiante vea la lista de sus membresías con estado
// Protegida y solo para Estudiantes (validación en el controlador o con middleware authorize)
router.get('/my-memberships', protect, getMyMembershipsWithStatus);

// Ruta GET para obtener detalles de un grupo por su ID
// Protegida y solo para Docentes (verificación de dueño en el controlador)
router.get('/:groupId', protect, authorize('Docente'), getGroupById);

// Ruta GET para obtener todas las membresías (estudiantes y estado) de un grupo específico
// Protegida y solo para Docentes (verificación de dueño en el controlador)
router.get('/:groupId/memberships', protect, authorize('Docente'), getGroupMemberships);

// @desc    Obtener grupos creados por el docente autenticado
// @route   GET /api/groups/docente/me
// Acceso: Privado/Docente
router.get('/docente/me', protect, authorize('Docente'), getMyOwnedGroups);

// @desc    Actualizar detalles del grupo (nombre, limite_estudiantes, etc.)
// @route   PUT /api/groups/:groupId
// Acceso: Privado/Docente (solo el dueño del grupo)
// El ID del grupo a actualizar va en los parámetros de la URL
router.put('/:groupId', authorize('Docente'), updateGroup); // <-- Nueva ruta PUT

// @desc    Eliminar un grupo
// @route   DELETE /api/groups/:groupId
// Acceso: Privado/Docente (solo el dueño del grupo)
// El ID del grupo a eliminar va en los parámetros de la URL
router.delete('/:groupId', authorize('Docente'), deleteGroup); // <-- Nueva ruta DELETE


// @desc    Eliminar un estudiante de un grupo (eliminar membresía aprobada)
// @route   DELETE /api/groups/:groupId/students/:studentId
// Acceso: Privado/Docente (solo el dueño del grupo)
// Requiere el ID del grupo Y el ID del estudiante a eliminar en los parámetros de la URL
router.delete('/:groupId/students/:studentId', authorize('Docente'), removeStudentFromGroup); 


// ... otras rutas de grupos futuras ...

module.exports = router; // Exportamos el router