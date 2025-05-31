// src/routes/progressRoutes.js

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
    updateThemeProgress,
    getStudentProgressForPath, // Esta es la función que necesita el group_id
    getAllStudentProgressForPathForDocente,
    getSpecificStudentProgressForPathForDocente,
  } = require('../controllers/progressController');

router.use(protect);

router.post('/update-theme', authorize('Estudiante'), updateThemeProgress);


router.get('/:learningPathId/:groupId/student', authorize('Estudiante'), getStudentProgressForPath);


router.get('/group/:groupId/path/:learningPathId/docente', authorize('Docente'), getAllStudentProgressForPathForDocente);


router.get('/student/:studentId/path/:learningPathId/docente', authorize('Docente'), getSpecificStudentProgressForPathForDocente);

module.exports = router;