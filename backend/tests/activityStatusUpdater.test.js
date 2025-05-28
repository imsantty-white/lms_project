// backend/tests/activityStatusUpdater.test.js

const cron = require('node-cron');
const ContentAssignment = require('../models/ContentAssignmentModel');
const NotificationService = require('../services/NotificationService');
const { startActivityStatusUpdater } = require('../services/activityStatusUpdater');

// Mock dependencies
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../models/ContentAssignmentModel', () => ({
  find: jest.fn().mockReturnThis(), // Allows chaining .populate()
  populate: jest.fn(), // Explicitly mock populate
}));

jest.mock('../services/NotificationService', () => ({
  createNotification: jest.fn(),
}));

// Spy on console methods
let mockConsoleLog, mockConsoleError, mockConsoleWarn;

describe('activityStatusUpdater', () => {
  let scheduledJob;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Capture the scheduled job
    startActivityStatusUpdater(); // This will call cron.schedule
    if (cron.schedule.mock.calls.length > 0) {
      scheduledJob = cron.schedule.mock.calls[0][1]; // Get the function passed to cron.schedule
    } else {
      // Fallback if startActivityStatusUpdater doesn't immediately schedule (e.g., if it's wrapped)
      // This might happen if the actual cron.schedule is inside an async function not awaited at module level
      // For this specific service, it's called directly.
      console.error("cron.schedule was not called as expected. Check startActivityStatusUpdater implementation.");
    }
    
    // Mock populate to return the chained object for further chaining if necessary
    ContentAssignment.find.mockReturnThis();
    ContentAssignment.populate = jest.fn().mockReturnThis();


    // Spy on console methods and suppress output
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console mocks
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  test('Scenario 1: Assignment past due date - should close and notify', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const mockAssignment = {
      _id: 'assignment1',
      status: 'Open',
      fecha_fin: pastDate,
      docente_id: 'teacher1',
      activity_id: { _id: 'activity1', title: 'Past Due Assignment' },
      save: jest.fn().mockResolvedValue(true),
    };
    ContentAssignment.populate.mockResolvedValue([mockAssignment]);


    await scheduledJob(); // Execute the job

    expect(ContentAssignment.find).toHaveBeenCalledWith({
      status: 'Open',
      fecha_fin: { $lte: expect.any(Date) },
    });
    expect(ContentAssignment.populate).toHaveBeenCalledWith('activity_id', 'title');
    expect(mockAssignment.save).toHaveBeenCalledTimes(1);
    expect(mockAssignment.status).toBe('Closed');
    expect(NotificationService.createNotification).toHaveBeenCalledWith({
      recipient: 'teacher1',
      type: 'GENERAL_INFO',
      message: "La actividad asignada 'Past Due Assignment' ha sido cerrada automáticamente porque su fecha de finalización ha pasado.",
      link: '/teacher/assignments',
    });
    expect(mockConsoleLog).toHaveBeenCalledWith('Assignment assignment1 status updated to Closed.');
    expect(mockConsoleLog).toHaveBeenCalledWith('Notification sent to docente teacher1 for auto-closed assignment assignment1.');
  });

  test('Scenario 2: Assignment not yet due - should not close or notify', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    const mockAssignment = {
      _id: 'assignment2',
      status: 'Open',
      fecha_fin: futureDate,
      docente_id: 'teacher2',
      activity_id: { _id: 'activity2', title: 'Future Assignment' },
      save: jest.fn(),
    };
    // For this scenario, the find query with $lte now won't find this.
    // So, we expect find to return an empty array if it were the only one.
    ContentAssignment.populate.mockResolvedValue([]);


    await scheduledJob();

    expect(mockAssignment.save).not.toHaveBeenCalled();
    expect(NotificationService.createNotification).not.toHaveBeenCalled();
  });

  test('Scenario 3: Assignment already closed - find query should not pick it up', async () => {
    // The find query specifically looks for { status: 'Open', ... }
    // So, if an assignment is already 'Closed', it won't be returned by `find`.
    // We just need to ensure `populate` returns an empty array as if nothing was found.
    ContentAssignment.populate.mockResolvedValue([]);

    await scheduledJob();

    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    // Check that console log indicates no assignments to update
    expect(mockConsoleLog).toHaveBeenCalledWith('No assignments to update.');
  });
  
  test('Scenario 4: No assignments found - should log and not error', async () => {
    ContentAssignment.populate.mockResolvedValue([]);

    await scheduledJob();

    expect(ContentAssignment.find).toHaveBeenCalledWith({
      status: 'Open',
      fecha_fin: { $lte: expect.any(Date) },
    });
    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith('No assignments to update.');
  });

  test('Scenario 5: Error during DB update (assignment.save fails)', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const errorMessage = 'DB save failed';

    const mockAssignment = {
      _id: 'assignment_db_error',
      status: 'Open',
      fecha_fin: pastDate,
      docente_id: 'teacher_db_error',
      activity_id: { _id: 'activity_db_error', title: 'DB Error Test' },
      save: jest.fn().mockRejectedValue(new Error(errorMessage)),
    };
    ContentAssignment.populate.mockResolvedValue([mockAssignment]);

    await scheduledJob();

    expect(mockAssignment.save).toHaveBeenCalledTimes(1);
    expect(mockAssignment.status).toBe('Closed'); // Status is updated before save is awaited
    expect(NotificationService.createNotification).not.toHaveBeenCalled(); // Should not notify if save fails
    expect(mockConsoleError).toHaveBeenCalledWith('Error updating activity statuses:', expect.any(Error));
  });

  test('Handles missing docente_id gracefully for notification', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const mockAssignment = {
      _id: 'assignment_no_teacher',
      status: 'Open',
      fecha_fin: pastDate,
      docente_id: null, // Missing docente_id
      activity_id: { _id: 'activity_no_teacher', title: 'No Teacher Assignment' },
      save: jest.fn().mockResolvedValue(true),
    };
    ContentAssignment.populate.mockResolvedValue([mockAssignment]);

    await scheduledJob();

    expect(mockAssignment.save).toHaveBeenCalledTimes(1);
    expect(mockAssignment.status).toBe('Closed');
    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    expect(mockConsoleWarn).toHaveBeenCalledWith('Cannot send notification for assignment assignment_no_teacher because docente_id is missing.');
  });

   test('Handles missing activity_id or title gracefully for notification message', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const mockAssignment = {
      _id: 'assignment_no_activity_title',
      status: 'Open',
      fecha_fin: pastDate,
      docente_id: 'teacher_no_title',
      activity_id: null, // Missing activity_id
      save: jest.fn().mockResolvedValue(true),
    };
    ContentAssignment.populate.mockResolvedValue([mockAssignment]);

    await scheduledJob();

    expect(mockAssignment.save).toHaveBeenCalledTimes(1);
    expect(mockAssignment.status).toBe('Closed');
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'teacher_no_title',
        message: "La actividad asignada 'NombreDesconocido' ha sido cerrada automáticamente porque su fecha de finalización ha pasado.",
      })
    );
  });
});
