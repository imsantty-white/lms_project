// backend/tests/learningPathController.test.js
const mongoose = require('mongoose');
const LearningPath = require('../src/models/LearningPathModel');
const Group = require('../src/models/GroupModel');
const Module = require('../src/models/ModuleModel');
const Theme = require('../src/models/ThemeModel');
const ContentAssignment = require('../src/models/ContentAssignmentModel');
const Resource = require('../src/models/ResourceModel');
const Activity = require('../src/models/ActivityModel');
const Membership = require('../src/models/MembershipModel');

const {
    createLearningPath,
    getMyCreatedLearningPaths,
    getLearningPathStructure,
} = require('../src/controllers/learningPathController');

jest.mock('../src/models/LearningPathModel');
jest.mock('../src/models/GroupModel');
jest.mock('../src/models/ModuleModel');
jest.mock('../src/models/ThemeModel');
jest.mock('../src/models/ContentAssignmentModel');
jest.mock('../src/models/ResourceModel');
jest.mock('../src/models/ActivityModel');
jest.mock('../src/models/MembershipModel');


describe('LearningPath Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            user: { _id: 'docenteTestId', tipo_usuario: 'Docente' },
            params: {},
            body: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {}, // For potential middleware data
        };
        jest.clearAllMocks();
    });

    describe('createLearningPath', () => {
        it('should return 404 if trying to create a learning path for an inactive group', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
            mockReq.body = {
                nombre: 'Test LP',
                group_id: mockGroupId,
            };

            Group.findOne.mockResolvedValue(null); // Simulates group not found or inactive

            await createLearningPath(mockReq, mockRes, jest.fn()); // Added next function

            expect(Group.findOne).toHaveBeenCalledWith({
                _id: mockGroupId,
                docente_id: mockReq.user._id,
                activo: true,
            });
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Grupo no encontrado, no está activo o no te pertenece. No puedes crear una ruta aquí.',
            });
        });

        it('should successfully create a learning path for an active group', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
            const mockGroup = { _id: mockGroupId, docente_id: mockReq.user._id, activo: true };
            const mockLPData = {
                nombre: 'Test LP',
                group_id: mockGroupId,
                descripcion: 'A test LP',
            };
            const createdLP = { ...mockLPData, _id: new mongoose.Types.ObjectId().toString() };

            mockReq.body = mockLPData;
            Group.findOne.mockResolvedValue(mockGroup);
            LearningPath.create.mockResolvedValue(createdLP);

            await createLearningPath(mockReq, mockRes, jest.fn());

            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: mockReq.user._id, activo: true });
            expect(LearningPath.create).toHaveBeenCalledWith(expect.objectContaining(mockLPData));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(createdLP);
        });
    });

    describe('getMyCreatedLearningPaths', () => {
        it('should only return learning paths associated with active groups', async () => {
            const mockDocenteId = mockReq.user._id;
            const activeGroup1Id = new mongoose.Types.ObjectId().toString();
            // This mock represents that Group.find will only return active groups.
            Group.find.mockResolvedValue([{ _id: activeGroup1Id, docente_id: mockDocenteId, activo: true }]);
            
            const mockLPs = [
                { _id: 'lp1', nombre: 'LP for Active Group', group_id: activeGroup1Id },
            ];
            LearningPath.find.mockResolvedValue(mockLPs);

            await getMyCreatedLearningPaths(mockReq, mockRes, jest.fn());

            expect(Group.find).toHaveBeenCalledWith({ docente_id: mockDocenteId, activo: true });
            expect(LearningPath.find).toHaveBeenCalledWith({ group_id: { $in: [activeGroup1Id] } });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockLPs,
            }));
        });

        it('should return empty array if docente has no active groups', async () => {
            Group.find.mockResolvedValue([]); // No active groups for this teacher

            await getMyCreatedLearningPaths(mockReq, mockRes, jest.fn());
            
            expect(Group.find).toHaveBeenCalledWith({ docente_id: mockReq.user._id, activo: true });
            expect(LearningPath.find).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, count: 0, data: [] });
        });
    });

    describe('getLearningPathStructure', () => {
        const mockPathId = new mongoose.Types.ObjectId().toString();
        const mockGroupId = new mongoose.Types.ObjectId().toString();
        const mockModuleId1 = new mongoose.Types.ObjectId().toString();
        const mockThemeId1 = new mongoose.Types.ObjectId().toString();
        const mockAssignmentId1 = new mongoose.Types.ObjectId().toString();
        const mockResourceId1 = new mongoose.Types.ObjectId().toString();

        const mockLP = {
            _id: mockPathId,
            nombre: 'Structured LP',
            descripcion: 'LP with full structure',
            fecha_inicio: new Date(),
            fecha_fin: new Date(),
            activo: true,
            group_id: { // Populated structure
                _id: mockGroupId,
                nombre: 'Mock Group for Structure',
                activo: true,
                docente_id: 'docenteTestId', // For ownership check
            },
            toObject: function() { return { ...this, group_id: this.group_id }; } // Simple toObject mock
        };

        const mockModules = [
            { _id: mockModuleId1, nombre: 'Module 1', descripcion: 'First Module', orden: 1, learning_path_id: mockPathId, toObject: function() { return this; } },
        ];
        const mockThemes = [
            { _id: mockThemeId1, nombre: 'Theme 1.1', descripcion: 'First Theme', orden: 1, module_id: mockModuleId1, toObject: function() { return this; } },
        ];
        const mockAssignments = [
            {
                _id: mockAssignmentId1,
                type: 'Resource',
                orden: 1,
                status: 'Open',
                fecha_inicio: new Date(),
                fecha_fin: new Date(),
                puntos_maximos: null,
                theme_id: mockThemeId1,
                resource_id: { _id: mockResourceId1, title: 'Resource 1', type: 'Contenido' }, // Populated
                activity_id: null, // Populated
                toObject: function() { return this; }
            },
        ];
        
        beforeEach(() => {
            mockReq.params.pathId = mockPathId;
            mockReq.user = { _id: 'docenteTestId', tipo_usuario: 'Docente' }; // Ensure user is set for permission checks

            LearningPath.findById.mockReturnValue({ // Mock the Mongoose query object
                populate: jest.fn().mockResolvedValue(mockLP) // Ensure populate leads to mockLP
            });
            Module.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockModules) });
            Theme.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockThemes) });
            ContentAssignment.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockImplementation(arg => {
                        // Simulate chained populate calls
                        if (arg.path === 'resource_id') return { populate: jest.fn().mockResolvedValue(mockAssignments) };
                        if (arg.path === 'activity_id') return { populate: jest.fn().mockResolvedValue(mockAssignments) };
                        return { populate: jest.fn().mockResolvedValue(mockAssignments) }; // Default for other cases
                    })
                })
            });
        });

        it('should return the streamlined DTO for a learning path structure', async () => {
            await getLearningPathStructure(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            const responseData = mockRes.json.mock.calls[0][0];

            // Verify LP DTO
            expect(responseData).toEqual(expect.objectContaining({
                _id: mockPathId,
                nombre: 'Structured LP',
                descripcion: 'LP with full structure',
                activo: true,
            }));
            expect(responseData.group_id).toEqual({
                _id: mockGroupId,
                nombre: 'Mock Group for Structure',
                activo: true,
            });
            expect(responseData.group_id.docente_id).toBeUndefined(); // Should not be present

            // Verify Module DTO
            expect(responseData.modules.length).toBe(1);
            expect(responseData.modules[0]).toEqual(expect.objectContaining({
                _id: mockModuleId1,
                nombre: 'Module 1',
                orden: 1,
            }));
            expect(responseData.modules[0].learning_path_id).toBeUndefined();

            // Verify Theme DTO
            expect(responseData.modules[0].themes.length).toBe(1);
            expect(responseData.modules[0].themes[0]).toEqual(expect.objectContaining({
                _id: mockThemeId1,
                nombre: 'Theme 1.1',
                orden: 1,
            }));
            expect(responseData.modules[0].themes[0].module_id).toBeUndefined();

            // Verify Assignment DTO
            const assignmentDTO = responseData.modules[0].themes[0].assignments[0];
            expect(assignmentDTO).toEqual(expect.objectContaining({
                _id: mockAssignmentId1,
                type: 'Resource',
                orden: 1,
                status: 'Open',
            }));
            expect(assignmentDTO.resource_details).toEqual({
                _id: mockResourceId1,
                title: 'Resource 1',
                type: 'Contenido',
            });
            expect(assignmentDTO.activity_details).toBeNull();
            expect(assignmentDTO.theme_id).toBeUndefined();
            expect(assignmentDTO.resource_id).toBeUndefined(); // The raw populated field should be gone
            expect(assignmentDTO.activity_id).toBeUndefined(); // The raw populated field should be gone

        });

        it('should return 403 if user is not owner (Docente)', async () => {
            const nonOwnerLP = { ...mockLP, group_id: { ...mockLP.group_id, docente_id: 'anotherDocenteId' } };
            LearningPath.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(nonOwnerLP) });
            
            await getLearningPathStructure(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'No tienes permiso para ver esta ruta de aprendizaje' });
        });

        it('should return 403 if user is not an approved member (Estudiante)', async () => {
            mockReq.user = { _id: 'studentTestId', tipo_usuario: 'Estudiante' };
            LearningPath.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockLP) }); // LP belongs to docenteTestId
            Membership.findOne.mockResolvedValue(null); // Student is not a member

            await getLearningPathStructure(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'No tienes permiso para ver esta ruta de aprendizaje' });
        });

         it('should return 404 if learning path not found', async () => {
            LearningPath.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
            await getLearningPathStructure(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Ruta de aprendizaje no encontrada' });
        });
    });
});
