// src/services/NotificationService.js
const NotificationModel = require('../models/NotificationModel');

class NotificationService {
  static async createNotification({ recipient, sender, type, message, link }) {
    const notification = new NotificationModel({
      recipient,
      sender,
      type,
      message,
      link,
    });
    await notification.save();

    if (global.io) {
      // Emitting to a room named after the user's ID.
      // The frontend would need to make the socket join this room.
      global.io.to(recipient.toString()).emit('new_notification', notification);
    }

    return notification;
  }
}

module.exports = NotificationService;
