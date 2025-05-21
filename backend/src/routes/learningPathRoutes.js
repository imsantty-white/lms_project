// src/routes/learningPathRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware'); // Importamos los middlewares de seguridad
const { createLearningPath, createModule, updateContentAssignmentStatus,
            createTheme, assignContentToTheme, getGroupLearningPathsForDocente,
                getGroupLearningPathsForStudent, getLearningPathStructure, updateLearningPath, 
                    deleteLearningPath, updateModule, deleteModule, updateTheme, deleteTheme, updateContentAssignment,
                        deleteContentAssignment, getMyAssignedLearningPaths, getMyCreatedLearningPaths, getContentAssignmentById} = require('../controllers/learningPathController'); // Importamos los controladores de rutas de aprendizaje

// Middleware: Aplica 'protect' a todas las rutas en este router de aquí en adelante
// La autorización por rol ('Docente') o la verificación de membresía se harán en los controladores
router.use(protect);


// Rutas para creación y asignación (solo para Docentes, usan authorize en el router.use superior)
router.post('/', authorize('Docente'), createLearningPath); // Aseguramos que la creación es solo para docentes
router.post('/:learningPathId/modules', authorize('Docente'), createModule);
router.post('/modules/:moduleId/themes', authorize('Docente'), createTheme);
router.post('/themes/:themeId/assign-content', authorize('Docente'), assignContentToTheme);

// @desc    Update Content Assignment Status
// @route   PUT /api/learning-paths/assignments/:assignmentId/status
// @access  Privado/Docente, Admin
router.put('/assignments/:assignmentId/status', protect, authorize('Docente', 'Administrador'), updateContentAssignmentStatus);

// @desc    Obtener Rutas de Aprendizaje creadas por el docente autenticado
// @route   GET /api/learning-paths/my-creations
// Acceso:  Privado/Docente
router.get('/my-creations', authorize('Docente'), getMyCreatedLearningPaths);

// @desc    Obtener Rutas de Aprendizaje para un grupo (Vista Docente)
// @route   GET /api/learning-paths/groups/:groupId/docente
// Acceso: Protegida, solo Docente dueño del grupo
router.get('/groups/:groupId/docente', authorize('Docente'), getGroupLearningPathsForDocente);

// @desc    Obtener Rutas de Aprendizaje para un grupo (Vista Estudiante)
// @route   GET /api/learning-paths/groups/:groupId/student
// Acceso: Protegida, solo Estudiante miembro aprobado del grupo
router.get('/groups/:groupId/student', getGroupLearningPathsForStudent); // Verificación de membresía en el controlador

// @desc    Obtener la estructura completa de una Ruta de Aprendizaje específica
// @route   GET /api/learning-paths/:pathId/structure
// Acceso: Protegida, Docente dueño del grupo O Estudiante miembro aprobado del grupo
router.get('/:pathId/structure', getLearningPathStructure); // Verificación de propiedad/membresía en el controlador

// @desc    Obtener todas las Rutas de Aprendizaje asignadas al usuario autenticado (a través de membresías de grupo aprobadas)
// @route   GET /api/learning-paths/my-assigned
// Acceso:  Privado (ya cubierto por router.use(protect)), para cualquier usuario miembro de grupos
router.get('/my-assigned', getMyAssignedLearningPaths); // <-- AÑADE ESTA NUEVA LÍNEA DE RUTA
// No necesita authorize('Estudiante') aquí, ya que la membresía se verifica en el controlador.
// Podría ser útil si un docente también fuera miembro de un grupo y quisiera ver sus rutas asignadas como estudiante.

// @desc    Actualizar detalles de una Ruta de Aprendizaje
// @route   PUT /api/learning-paths/:learningPathId
// Acceso: Privado/Docente (solo el dueño de la ruta - se verifica por el grupo)
// El ID de la ruta a actualizar va en los parámetros de la URL
router.put('/:learningPathId', authorize('Docente'), updateLearningPath); // <-- Nueva ruta PUT

// @desc    Eliminar una Ruta de Aprendizaje
// @route   DELETE /api/learning-paths/:learningPathId
// Acceso: Privado/Docente (solo el dueño de la ruta - se verifica por el grupo)
// El ID de la ruta a eliminar va en los parámetros de la URL
router.delete('/:learningPathId', authorize('Docente'), deleteLearningPath); // <-- Nueva ruta DELETE


// @desc    Actualizar un Módulo específico
// @route   PUT /api/learning-paths/modules/:moduleId
// Acceso: Privado/Docente (solo el dueño del módulo - se verifica por la ruta/grupo)
router.put('/modules/:moduleId', authorize('Docente'), updateModule); // <-- Nueva ruta PUT para Módulo

// @desc    Eliminar un Módulo específico
// @route   DELETE /api/learning-paths/modules/:moduleId
// Acceso: Privado/Docente (solo el dueño del módulo - se verifica por la ruta/grupo)
router.delete('/modules/:moduleId', authorize('Docente'), deleteModule); // <-- Nueva ruta DELETE para Módulo

// @desc    Actualizar un Tema específico
// @route   PUT /api/learning-paths/themes/:themeId
// Acceso: Privado/Docente (solo el dueño del tema - se verifica por módulo/ruta/grupo)
router.put('/themes/:themeId', authorize('Docente'), updateTheme); // <-- Nueva ruta PUT para Tema

// @desc    Eliminar un Tema específico
// @route   PUT /api/learning-paths/assignments/:assignmentId
// Acceso: Privado/Docente (solo el dueño del tema - se verifica por módulo/ruta/grupo)
router.delete('/themes/:themeId', authorize('Docente'), deleteTheme);

// Rutas para Asignaciones de Contenido (ContentAssignment)
// @desc    Obtener una asignación de contenido específica por ID
// @route   GET /api/learning-paths/assignments/:assignmentId
router.get('/assignments/:assignmentId', protect, authorize('Docente'), getContentAssignmentById);

// @desc    Actualizar una Asignación de Contenido específica
// @route   PUT /api/content-assignments/:assignmentId
// @access  Privado/Docente
router.put('/assignments/:assignmentId', authorize('Docente'), updateContentAssignment);

// @desc    Eliminar una Asignación de Contenido específica
// @route   DELETE /api/learning-paths/assignments/:assignmentId
// Acceso: Privado/Docente (solo el dueño de la asignación - se verifica por tema/módulo/ruta/grupo)
// El ID de la asignación a eliminar va en los parámetros de la URL
router.delete('/assignments/:assignmentId', authorize('Docente'), deleteContentAssignment);

// Aquí agregaremos otras rutas que se necesiten si es el caso

module.exports = router; // Exportamos el router