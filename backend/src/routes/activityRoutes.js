// src/routes/activityRoutes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');


const { getStudentActivityForAttempt, submitStudentActivityAttempt,
            getAssignmentSubmissions, getTeacherAssignments, gradeSubmission } = require('../controllers/activityController');


// Middleware: Aplica 'protect' a todas las rutas en este router de aquí en adelante (si no lo tienes ya)
// router.use(protect);


// Rutas para Estudiantes (Actividades)
// @desc    Obtener los detalles de una Actividad asignada para que un estudiante la inicie
// @route   GET /api/activities/student/:assignmentId/start
router.get('/student/:assignmentId/start', protect, authorize('Estudiante'), getStudentActivityForAttempt);

// @desc    Registrar la entrega de respuestas de un estudiante para una asignación de actividad
// @route   POST /api/activities/student/:assignmentId/submit-attempt
// @access  Privado/Estudiante
router.post('/student/:assignmentId/submit-attempt', protect, authorize('Estudiante'), submitStudentActivityAttempt);

// @desc    Obtener todas las entregas para una asignación (Vista Docente/Admin)
// @route   GET /api/activities/assignments/:assignmentId/submissions
// @access  Privado/Docente, Admin
router.get('/assignments/:assignmentId/submissions', protect, authorize('Docente', 'Administrador'), getAssignmentSubmissions);

// @desc    Obtener la lista de asignaciones de actividades para un docente/admin
// @route   GET /api/activities/teacher/assignments
// @access  Privado/Docente, Admin
router.get('/teacher/assignments', protect, authorize('Docente', 'Administrador'), getTeacherAssignments);

// @desc    Guardar la calificación manual para una entrega (Cuestionario/Trabajo)
// @route   PUT /api/submissions/:submissionId/grade
// @access  Privado/Docente, Admin
router.put('/submissions/:submissionId/grade', protect, authorize('Docente', 'Administrador'), gradeSubmission);
// ...otras rutas de actividades (para docentes o administración)...

module.exports = router; // Exporta el router