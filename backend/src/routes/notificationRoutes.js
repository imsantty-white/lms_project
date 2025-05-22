const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware'); // Assuming 'protect' is the auth middleware

// @route   GET /api/notifications
// @desc    Get notifications for the logged-in user with pagination
// @access  Private
router.get('/', protect, getNotifications);

// @route   PATCH /api/notifications/:id/mark-read
// @desc    Mark a specific notification as read
// @access  Private
router.patch('/:id/mark-read', protect, markNotificationAsRead);

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all notifications as read for the logged-in user
// @access  Private
router.post('/mark-all-read', protect, markAllNotificationsAsRead);

module.exports = router;
