const express = require('express');
const router = express.Router();

const {
    getTeacherStats,
    getTeacherPopularContent,
    getAdminStats,
    getAdminPopularContent
} = require('../controllers/DashboardController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Teacher Dashboard Routes
router.route('/teacher/stats')
    .get(protect, authorize('Docente', 'Administrador'), getTeacherStats); // Admin can also access teacher stats for overview

router.route('/teacher/popular-content')
    .get(protect, authorize('Docente', 'Administrador'), getTeacherPopularContent);

// Admin Dashboard Routes
router.route('/admin/stats')
    .get(protect, authorize('Administrador'), getAdminStats);

router.route('/admin/popular-content')
    .get(protect, authorize('Administrador'), getAdminPopularContent);

module.exports = router;
