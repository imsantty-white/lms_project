const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    required: true,
    enum: [
      'NEW_ASSIGNMENT',
      'GRADED_WORK',
      'DEADLINE_APPROACHING',
      'NEW_SUBMISSION',
      'JOIN_REQUEST',
      'GROUP_INVITE_ACCEPTED',
      'GROUP_INVITE_DECLINED',
      'MEMBERSHIP_REMOVED',
      'CONTENT_SHARED',
      'GENERAL_INFO',
      'GROUP_ARCHIVED',
      'NUEVO_USUARIO_REGISTRADO',
      'NOTIFICACION_SISTEMA_GENERAL',
      'NOTIFICACION_SISTEMA_DOCENTES',
      'NOTIFICACION_SISTEMA_ESTUDIANTES',
      'NOTIFICACION_SISTEMA_INDIVIDUAL',
    ],
  },
  message: {
    type: String,
    required: true,
  },
  link: {
    type: String,
  },
  isRead: {
    type: Boolean,
    default: false,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
