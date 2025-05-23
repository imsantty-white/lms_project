const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getStudentProfileForTeacher } = require('../controllers/profileController'); // Added getStudentProfileForTeacher
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);

// Route for teachers to get a specific student's profile
router.get('/:userId', protect, getStudentProfileForTeacher);

module.exports = router;