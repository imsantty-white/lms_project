// src/routes/submissionRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware'); // Necesita ambos middlewares de seguridad
const {
    createSubmission,
    getStudentSubmissionsForAssignment, // <-- Nueva función
    getAssignmentSubmissionsForDocente, // <-- Nueva función
    getSubmissionByIdForDocente,       // <-- Nueva función
    gradeSubmission,// <-- Nueva función
    deleteSubmissionByDocente // <-- Nueva función
  } = require('../controllers/submissionController'); // Importa el controlador

// Middleware: Aplica 'protect' a todas las rutas de este router
router.use(protect);

// Rutas de Estudiante (existente)
router.post('/', authorize('Estudiante'), createSubmission);
router.get('/my/:assignmentId', authorize('Estudiante'), getStudentSubmissionsForAssignment);


// Rutas de Docente (existente)
router.get('/assignment/:assignmentId/docente', authorize('Docente'), getAssignmentSubmissionsForDocente);
router.get('/:submissionId', authorize('Docente'), getSubmissionByIdForDocente);

// --- Nueva Ruta para Calificar ---

// @desc    Calificar una entrega específica (manual para Cuestionario/Trabajo)
// @route   PUT /api/submissions/:submissionId/grade
// Acceso: Privado/Docente (solo puede calificar entregas de asignaciones en sus grupos)
// Usamos PUT porque estamos actualizando el estado y campos de una entrega existente
router.put('/:submissionId/grade', authorize('Docente'), gradeSubmission);


// @desc    Eliminar una entrega de estudiante específica (para el docente dueño)
// @route   DELETE /api/submissions/:submissionId/docente
// Acceso: Privado/Docente (solo el dueño de la ruta/grupo donde está la asignación)
// El ID de la entrega a eliminar va en los parámetros de la URL
router.delete('/:submissionId/docente', authorize('Docente'), deleteSubmissionByDocente); // <-- Nueva ruta DELETE

// Aquí agregaremos rutas para ver las entregas (por estudiante, por docente) más adelante

module.exports = router; // Exporta el router