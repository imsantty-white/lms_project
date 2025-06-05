const cron = require('node-cron');
const ContentAssignment = require('../models/ContentAssignmentModel');
const NotificationService = require('../services/NotificationService'); // Import NotificationService

const startActivityStatusUpdater = () => {
  // Schedule a task to run every minute
  cron.schedule('* * * * *', async () => {
    // console.log('Running activity status update job...');
    const now = new Date();

    try {
      const assignmentsToUpdate = await ContentAssignment.find({
        status: 'Open',
        fecha_fin: { $lte: now },
      }).populate('activity_id', 'title'); // Populate activity_id to get the title

      if (assignmentsToUpdate.length > 0) {
        const updatePromises = assignmentsToUpdate.map(async (assignment) => {
          assignment.status = 'Closed';
          await assignment.save();
          console.log(`Assignment ${assignment._id} status updated to Closed.`);

          // Send notification
          if (assignment.docente_id) {
            const activityTitle = assignment.activity_id?.title || 'NombreDesconocido';
            const message = `La actividad asignada '${activityTitle}' ha sido cerrada automáticamente porque su fecha de finalización ha pasado.`;
            const link = `/teacher/assignments`; // Generic link

            try {
              await NotificationService.createNotification({
                recipient: assignment.docente_id,
                // sender: null, // Sender can be omitted as per NotificationModel
                type: 'GENERAL_INFO', // Using existing type, ASSIGNMENT_AUTO_CLOSED would need enum update
                message: message,
                link: link,
              });
              console.log(`Notification sent to docente ${assignment.docente_id} for auto-closed assignment ${assignment._id}.`);
            } catch (notificationError) {
              console.error(`Error sending notification for assignment ${assignment._id}:`, notificationError);
            }
          } else {
            console.warn(`Cannot send notification for assignment ${assignment._id} because docente_id is missing.`);
          }
        });

        await Promise.all(updatePromises);
        console.log(`Processed ${assignmentsToUpdate.length} assignments for auto-closing.`);
      } else {
        // console.log('No assignments to update.');
      }
    } catch (error) {
      console.error('Error updating activity statuses:', error);
    }
  });

  console.log('Activity status updater cron job started.');
};

module.exports = { startActivityStatusUpdater };
