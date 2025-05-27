// backend/tests/progressController.test.js
const mongoose = require('mongoose');
const {
    triggerActivityBasedProgressUpdate,
    // Import other functions if you decide to test them directly and they are exported
} = require('../src/controllers/progressController');

// Mock Models
jest.mock('../src/models/ProgressModel');
jest.mock('../src/models/LearningPathModel');
jest.mock('../src/models/ModuleModel');
jest.mock('../src/models/ThemeModel');
jest.mock('../src/models/ContentAssignmentModel');
jest.mock('../src/models/ActivityModel'); // Though not directly used by name in controller, ContentAssignment populates it.
jest.mock('../src/models/SubmissionModel');
jest.mock('../src/models/MembershipModel'); // Used by getStudentProgressForPath, not directly by _calculate...
jest.mock('../src/models/GroupModel');      // Used by other functions, not directly by _calculate...
jest.mock('../src/models/UserModel');        // Used by other functions

const Progress = require('../src/models/ProgressModel');
const LearningPath = require('../src/models/LearningPathModel');
const Module = require('../src/models/ModuleModel');
const Theme = require('../src/models/ThemeModel');
const ContentAssignment = require('../src/models/ContentAssignmentModel');
const Submission = require('../src/models/SubmissionModel');

// Helper to create ObjectId
const newId = (id) => new mongoose.Types.ObjectId(id);

describe('Progress Controller - Activity Based Progress', () => {
    let studentId, learningPathId, groupId, moduleId1, themeId1, activityId1, assignmentId1;
    let activityId2, assignmentId2, activityId3, assignmentId3;

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test

        studentId = newId();
        learningPathId = newId();
        groupId = newId();
        moduleId1 = newId();
        themeId1 = newId();
        activityId1 = newId();
        assignmentId1 = newId();
        activityId2 = newId();
        assignmentId2 = newId();
        activityId3 = newId();
        assignmentId3 = newId();

        // Default mock for LearningPath.findById to return a valid group_id
        LearningPath.findById.mockResolvedValue({
            _id: learningPathId,
            group_id: groupId,
            // other fields if necessary
        });
    });

    describe('_calculateAndUpdatePathProgress (via triggerActivityBasedProgressUpdate)', () => {
        test('Path with No Activities, No Themes Viewed: status "No Iniciado"', async () => {
            Module.find.mockResolvedValue([]); // No modules -> no themes -> no assignments
            Theme.find.mockResolvedValue([]);
            ContentAssignment.find.mockResolvedValue([]);
            Progress.findOne.mockResolvedValue(null); // No existing progress doc
            Progress.prototype.save = jest.fn().mockResolvedValue(this); // Mock save on instance
            Progress.mockImplementation(data => ({ ...data, save: Progress.prototype.save }));


            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('No Iniciado');
            expect(result.data.total_activities).toBe(0);
            expect(result.data.graded_activities).toBe(0);
            // Should not create a progress doc if status is 'No Iniciado' and no themes viewed
            expect(Progress.prototype.save).not.toHaveBeenCalled();
        });

        test('Path with No Activities, All Themes Viewed: status "Completado"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            Theme.find.mockResolvedValue([{ _id: themeId1, module_id: moduleId1 }]); // Path has 1 theme
            ContentAssignment.find.mockResolvedValue([]); // No activities
            Progress.findOne.mockResolvedValue({ // Existing progress with theme completed
                student_id: studentId,
                learning_path_id: learningPathId,
                group_id: groupId,
                path_status: 'En Progreso', // was 'En Progreso' due to theme
                completed_themes: [{ theme_id: { _id: themeId1, toString: () => themeId1.toString() }, status: 'Completado' }],
                save: jest.fn().mockResolvedValue(this)
            });
             Progress.prototype.save = jest.fn().mockResolvedValue(this);


            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('Completado');
            expect(result.data.total_activities).toBe(0);
            expect(result.data.graded_activities).toBe(0);
            expect(Progress.findOne.mock.results[0].value.save).toHaveBeenCalled();
        });
        
        test('Path with No Activities, Some Themes Viewed: status "En Progreso"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            // Path has 2 themes, student viewed 1
            Theme.find.mockResolvedValue([
                { _id: themeId1, module_id: moduleId1, toString: () => themeId1.toString() }, 
                { _id: newId(), module_id: moduleId1, toString: () => newId().toString() }
            ]); 
            ContentAssignment.find.mockResolvedValue([]); // No activities
            Progress.findOne.mockResolvedValue({ // Existing progress with one theme completed
                student_id: studentId,
                learning_path_id: learningPathId,
                group_id: groupId,
                path_status: 'No Iniciado', 
                completed_themes: [{ theme_id: { _id: themeId1, toString: () => themeId1.toString() }, status: 'Visto' }],
                save: jest.fn().mockResolvedValue(this)
            });
            Progress.prototype.save = jest.fn().mockResolvedValue(this);

            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('En Progreso');
            expect(result.data.total_activities).toBe(0);
            expect(result.data.graded_activities).toBe(0);
            expect(Progress.findOne.mock.results[0].value.save).toHaveBeenCalled();
        });


        test('Path with 3 Activities, No Submissions/Grading, No Themes Viewed: status "No Iniciado"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            Theme.find.mockResolvedValue([{ _id: themeId1, module_id: moduleId1 }]);
            ContentAssignment.find.mockResolvedValue([
                { _id: assignmentId1, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId1 } },
                { _id: assignmentId2, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId2 } },
                { _id: assignmentId3, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId3 } },
            ]);
            Submission.find.mockResolvedValue([]); // No submissions
            Progress.findOne.mockResolvedValue(null); // No existing progress doc
            Progress.prototype.save = jest.fn().mockResolvedValue(this);
            Progress.mockImplementation(data => ({ ...data, save: Progress.prototype.save }));


            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('No Iniciado');
            expect(result.data.total_activities).toBe(3);
            expect(result.data.graded_activities).toBe(0);
            expect(Progress.prototype.save).not.toHaveBeenCalled(); // Stays 'No Iniciado', no doc created unless themes viewed or activities graded
        });

        test('Path with 3 Activities, No Graded Submissions, But Themes Viewed: status "En Progreso"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            Theme.find.mockResolvedValue([{ _id: themeId1, module_id: moduleId1 }]);
            ContentAssignment.find.mockResolvedValue([
                { _id: assignmentId1, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId1 } },
                { _id: assignmentId2, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId2 } },
                { _id: assignmentId3, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId3 } },
            ]);
            Submission.find.mockResolvedValue([ // One submission, not graded
                { student_id: studentId, assignment_id: assignmentId1, estado_envio: 'Enviado' }
            ]);
            Progress.findOne.mockResolvedValue({ // Existing progress with theme viewed
                student_id: studentId,
                learning_path_id: learningPathId,
                path_status: 'No Iniciado', // Initial status before this calculation
                completed_themes: [{ theme_id: { _id: themeId1, toString: () => themeId1.toString() }, status: 'Visto' }],
                save: jest.fn().mockResolvedValue(this)
            });

            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('En Progreso');
            expect(result.data.total_activities).toBe(3);
            expect(result.data.graded_activities).toBe(0);
            expect(Progress.findOne.mock.results[0].value.save).toHaveBeenCalledWith(); 
        });

        test('Path with 3 Activities, 1 Graded: status "En Progreso"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            Theme.find.mockResolvedValue([{ _id: themeId1, module_id: moduleId1 }]);
            ContentAssignment.find.mockResolvedValue([
                { _id: assignmentId1, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId1 } },
                { _id: assignmentId2, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId2 } },
                { _id: assignmentId3, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId3 } },
            ]);
            Submission.find.mockResolvedValue([
                { student_id: studentId, assignment_id: assignmentId1, estado_envio: 'Calificado' },
                { student_id: studentId, assignment_id: assignmentId2, estado_envio: 'Enviado' },
            ]);
            Progress.findOne.mockResolvedValue(null); // No existing progress doc
            Progress.prototype.save = jest.fn().mockResolvedValue(this);
            Progress.mockImplementation(data => ({ ...data, save: Progress.prototype.save }));

            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('En Progreso');
            expect(result.data.total_activities).toBe(3);
            expect(result.data.graded_activities).toBe(1);
            expect(Progress.prototype.save).toHaveBeenCalled();
            const savedDoc = Progress.mock.calls[0][0];
            expect(savedDoc.path_status).toBe('En Progreso');
        });

        test('Path with 3 Activities, All Graded: status "Completado"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            Theme.find.mockResolvedValue([{ _id: themeId1, module_id: moduleId1 }]);
            ContentAssignment.find.mockResolvedValue([
                { _id: assignmentId1, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId1 } },
                { _id: assignmentId2, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId2 } },
                { _id: assignmentId3, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId3 } },
            ]);
            Submission.find.mockResolvedValue([
                { student_id: studentId, assignment_id: assignmentId1, estado_envio: 'Calificado' },
                { student_id: studentId, assignment_id: assignmentId2, estado_envio: 'Calificado' },
                { student_id: studentId, assignment_id: assignmentId3, estado_envio: 'Calificado' },
            ]);
            Progress.findOne.mockResolvedValue(null); // No existing progress doc
            Progress.prototype.save = jest.fn().mockResolvedValue(this);
            Progress.mockImplementation(data => ({ ...data, save: Progress.prototype.save }));

            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('Completado');
            expect(result.data.total_activities).toBe(3);
            expect(result.data.graded_activities).toBe(3);
            expect(Progress.prototype.save).toHaveBeenCalled();
            const savedDoc = Progress.mock.calls[0][0];
            expect(savedDoc.path_status).toBe('Completado');
            expect(savedDoc.path_completion_date).toBeInstanceOf(Date);
        });

        test('New Student (No Progress Doc), 1 Graded Activity: creates Progress doc with "En Progreso"', async () => {
            Module.find.mockResolvedValue([{ _id: moduleId1 }]);
            Theme.find.mockResolvedValue([{ _id: themeId1, module_id: moduleId1 }]);
            ContentAssignment.find.mockResolvedValue([ // Path with 1 activity
                { _id: assignmentId1, theme_id: themeId1, group_id: groupId, tipo_contenido: 'Actividad', activity_id: { _id: activityId1 } },
            ]);
            Submission.find.mockResolvedValue([ // Student has 1 graded submission
                { student_id: studentId, assignment_id: assignmentId1, estado_envio: 'Calificado' },
            ]);
            Progress.findOne.mockResolvedValue(null); // No ProgressModel document exists
            Progress.prototype.save = jest.fn().mockResolvedValue({ // Mock the save method on the instance
                _id: newId(), student_id: studentId, learning_path_id: learningPathId, group_id: groupId,
                path_status: 'En Progreso', total_activities: 1, graded_activities: 1, 
                completed_themes: [], path_completion_date: null,
                // include other fields that are returned by the actual save operation
            });
            Progress.mockImplementation(data => ({ 
                ...data, 
                save: Progress.prototype.save,
                // Mock any other methods/properties accessed on the new Progress doc if necessary
            }));


            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(Progress.findOne).toHaveBeenCalledWith({ student_id: studentId, learning_path_id: learningPathId });
            expect(Progress).toHaveBeenCalledWith({ // Check constructor call for new doc
                student_id: studentId,
                learning_path_id: learningPathId,
                group_id: groupId,
                path_status: 'En Progreso', // Initially calculated status
                completed_themes: [],
                path_completion_date: null, // Not completed yet
            });
            expect(Progress.prototype.save).toHaveBeenCalledTimes(1);
            
            expect(result.success).toBe(true);
            expect(result.data.path_status).toBe('En Progreso');
            expect(result.data.total_activities).toBe(1);
            expect(result.data.graded_activities).toBe(1);
            expect(result.data._id).toBeDefined(); // Ensure new doc ID is part of result
        });
    });

    describe('triggerActivityBasedProgressUpdate', () => {
        test('Successfully fetches groupId and calls _calculateAndUpdatePathProgress logic', async () => {
            const mockLearningPath = { _id: learningPathId, group_id: groupId };
            LearningPath.findById.mockResolvedValue(mockLearningPath);

            // Mock internal calculations to simplify spying on the call structure
            Module.find.mockResolvedValue([]);
            Theme.find.mockResolvedValue([]);
            ContentAssignment.find.mockResolvedValue([]);
            Progress.findOne.mockResolvedValue(null);
            Progress.prototype.save = jest.fn().mockResolvedValue(this);


            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(LearningPath.findById).toHaveBeenCalledWith(learningPathId);
            // We are testing the internal logic of _calculateAndUpdatePathProgress through the trigger,
            // so the detailed assertions on status/counts are covered in the suite above.
            // Here, we focus on the trigger's responsibility.
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.group_id.toString()).toBe(groupId.toString()); // Ensure correct group_id was used
        });

        test('Handles LearningPath not found', async () => {
            LearningPath.findById.mockResolvedValue(null);
            const result = await triggerActivityBasedProgressUpdate(studentId, learningPathId);

            expect(LearningPath.findById).toHaveBeenCalledWith(learningPathId);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Ruta de aprendizaje no encontrada o incompleta.');
        });
         test('Handles invalid studentId or learningPathId input', async () => {
            let result = await triggerActivityBasedProgressUpdate("invalidId", learningPathId);
            expect(result.success).toBe(false);
            expect(result.message).toBe('IDs inválidos.');

            result = await triggerActivityBasedProgressUpdate(studentId, "invalidId");
            expect(result.success).toBe(false);
            expect(result.message).toBe('IDs inválidos.');
        });
    });
});
