// src/routes/progressRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware'); // Importamos middlewares de seguridad
const {
    updateThemeProgress,
    getStudentProgressForPath, // <-- Nueva función
    getAllStudentProgressForPathForDocente, // <-- Nueva función
    getSpecificStudentProgressForPathForDocente // <-- Nueva función
  } = require('../controllers/progressController');

// Middleware: Aplica 'protect' a todas las rutas de este router
router.use(protect);

// @desc    Actualizar el progreso del estudiante para un tema específico
// @route   POST /api/progress/update-theme
// Acceso: Privado/Estudiante
router.post('/update-theme', authorize('Estudiante'), updateThemeProgress);

// @desc    Obtener el progreso de UN estudiante autenticado para una ruta de aprendizaje específica
// @route   GET /api/progress/my/:learningPathId
// Acceso: Privado/Estudiante (solo puede ver su propio progreso)
router.get('/my/:learningPathId', authorize('Estudiante'), getStudentProgressForPath);


// @desc    Obtener el resumen del progreso de TODOS los estudiantes para una ruta en un grupo (para el docente dueño)
// @route   GET /api/progress/group/:groupId/path/:learningPathId/docente
// Acceso: Privado/Docente (solo puede ver progreso de rutas en sus grupos)
router.get('/group/:groupId/path/:learningPathId/docente', authorize('Docente'), getAllStudentProgressForPathForDocente);

// @desc    Obtener el progreso detallado de UN estudiante específico para una ruta (para el docente dueño)
// @route   GET /api/progress/student/:studentId/path/:learningPathId/docente
// Acceso: Privado/Docente (solo puede ver progreso de estudiantes en sus grupos para sus rutas)
router.get('/student/:studentId/path/:learningPathId/docente', authorize('Docente'), getSpecificStudentProgressForPathForDocente);



// Aquí agregaremos rutas para visualizar el progreso más adelante (para estudiante y docente)

module.exports = router; // Exporta el router