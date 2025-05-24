const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getStudentProfileForTeacher, getUserProfileForAdmin } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.get('/:userId', protect, getStudentProfileForTeacher);
// Ruta para que el admin vea el perfil de cualquier usuario
router.get('/admin/:userId', protect, getUserProfileForAdmin);

module.exports = router;