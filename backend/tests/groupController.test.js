// backend/tests/groupController.test.js
const mongoose = require('mongoose');
const Group = require('../src/models/GroupModel');
const Membership = require('../src/models/MembershipModel');
const {
    deleteGroup,
    getMyOwnedGroups,
    getGroupById,
    requestJoinGroup,
} = require('../src/controllers/groupController');

// Mock models
jest.mock('../src/models/GroupModel');
jest.mock('../src/models/MembershipModel');

describe('Group Controller - Soft Delete and Fetching', () => {
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
        };
        // Clear all mock implementations and calls
        jest.clearAllMocks();
    });

    describe('deleteGroup', () => {
        it('should successfully soft delete a group', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
            const mockGroupInstance = {
                _id: mockGroupId,
                docente_id: 'docenteTestId',
                activo: true,
                save: jest.fn().mockResolvedValue(true),
            };

            Group.findOne.mockResolvedValue(mockGroupInstance);
            // Mock isTeacherOfGroup to resolve true for ownership check
            // This utility function is used internally by some controller methods.
            // For deleteGroup, the primary check is Group.findOne with docente_id.
            // However, if isTeacherOfGroup was directly used, it would need mocking.
            // Let's assume isTeacherOfGroup is not directly called or its logic is covered by Group.findOne for this specific test.

            mockReq.params.groupId = mockGroupId;

            await deleteGroup(mockReq, mockRes);

            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: 'docenteTestId' });
            expect(mockGroupInstance.activo).toBe(false);
            expect(mockGroupInstance.save).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grupo archivado exitosamente' });
            expect(Membership.countDocuments).not.toHaveBeenCalled(); // Ensure hard delete related checks are gone
        });

        it('should return 404 if group to delete is not found or not owned', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
            Group.findOne.mockResolvedValue(null);
            // Similar to above, isTeacherOfGroup might be relevant if the controller's internal structure changes.
            // For now, Group.findOne returning null covers "not found or not owned by this teacher".

            mockReq.params.groupId = mockGroupId;

            await deleteGroup(mockReq, mockRes);

            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: 'docenteTestId' });
            expect(mockRes.status).toHaveBeenCalledWith(404); // Based on current implementation of deleteGroup
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grupo no encontrado o no te pertenece.' });
        });

        it('should return 403 if user is not Docente', async () => {
            mockReq.user.tipo_usuario = 'Estudiante';
            mockReq.params.groupId = new mongoose.Types.ObjectId().toString();

            await deleteGroup(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Solo los docentes pueden eliminar grupos' });
        });


        it('should return 400 if groupId is invalid', async () => {
            mockReq.params.groupId = 'invalidId';

            await deleteGroup(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'ID de grupo inválido' });
        });
    });

    describe('getMyOwnedGroups', () => {
        it('should return only active groups for a docente', async () => {
            const mockDocenteId = mockReq.user._id;
            const mockActiveGroup = { _id: 'group1', nombre: 'Active Group', activo: true, approvedStudentCount: 5 };
            // The aggregate function is expected to filter by activo: true in its $match stage.
            // So, the mock should represent the data *after* such filtering would have occurred if it were a real DB call.
            Group.aggregate.mockResolvedValue([mockActiveGroup]);

            await getMyOwnedGroups(mockReq, mockRes);

            expect(Group.aggregate).toHaveBeenCalledWith([
                { $match: { docente_id: new mongoose.Types.ObjectId(mockDocenteId), activo: true } },
                {
                    $lookup: {
                        from: 'memberships',
                        localField: '_id',
                        foreignField: 'grupo_id',
                        as: 'memberships'
                    }
                },
                {
                    $addFields: {
                        approvedStudentCount: {
                            $size: {
                                $filter: {
                                    input: '$memberships',
                                    as: 'membership',
                                    cond: { $eq: ['$$membership.estado_solicitud', 'Aprobado'] }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        nombre: 1,
                        codigo_acceso: 1,
                        docente_id: 1,
                        activo: 1,
                        limite_estudiantes: 1,
                        fecha_creacion: 1,
                        approvedStudentCount: 1,
                    }
                }
            ]);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: [mockActiveGroup],
            }));
        });
    });

    describe('getGroupById', () => {
        it('should fetch an active group successfully', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
            const mockActiveGroup = { _id: mockGroupId, nombre: 'Test Group', activo: true, docente_id: mockReq.user._id };
            
            // Mock for isTeacherOfGroup utility
            Group.findOne.mockImplementation(({ _id, docente_id }) => {
                 if (_id === mockGroupId && docente_id === mockReq.user._id) {
                    return Promise.resolve(mockActiveGroup); // Simulates group exists and belongs to teacher
                }
                return Promise.resolve(null);
            });


            mockReq.params.groupId = mockGroupId;
            await getGroupById(mockReq, mockRes);

            // First call in isTeacherOfGroup (indirectly, or direct if refactored)
            // Second call is in getGroupById itself
            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: new mongoose.Types.ObjectId(mockReq.user._id) }); // from isTeacherOfGroup
            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: new mongoose.Types.ObjectId(mockReq.user._id), activo: true }); // from getGroupById
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockActiveGroup);
        });

        it('should return 404 if trying to fetch an inactive group', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
             // isTeacherOfGroup will be true (group exists and owned)
            Group.findOne.mockImplementationOnce(() => Promise.resolve({ _id: mockGroupId, docente_id: mockReq.user._id, activo: false }));
            // but the main query in getGroupById will filter by activo: true, so it will return null
            Group.findOne.mockImplementationOnce(() => Promise.resolve(null));


            mockReq.params.groupId = mockGroupId;

            await getGroupById(mockReq, mockRes);
            
            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: new mongoose.Types.ObjectId(mockReq.user._id) }); // from isTeacherOfGroup
            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: new mongoose.Types.ObjectId(mockReq.user._id), activo: true }); // from getGroupById
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: `Grupo no encontrado con ID ${mockGroupId} o no está activo.` });
        });
         it('should return 403 if user is not owner of the group', async () => {
            const mockGroupId = new mongoose.Types.ObjectId().toString();
            // isTeacherOfGroup returns false
            Group.findOne.mockImplementationOnce(() => Promise.resolve(null)); 

            mockReq.params.groupId = mockGroupId;
            await getGroupById(mockReq, mockRes);

            expect(Group.findOne).toHaveBeenCalledWith({ _id: mockGroupId, docente_id: new mongoose.Types.ObjectId(mockReq.user._id) });
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'No tienes permiso para acceder a este grupo o el grupo no existe.' });
        });
    });

    describe('requestJoinGroup', () => {
        it('should return 404 if student tries to join an inactive group', async () => {
            const mockAccessCode = 'INACTIVE123';
            mockReq.body.codigo_acceso = mockAccessCode;
            mockReq.user.tipo_usuario = 'Estudiante';

            Group.findOne.mockResolvedValue(null); // Simulates group not found or inactive

            await requestJoinGroup(mockReq, mockRes);

            expect(Group.findOne).toHaveBeenCalledWith({ codigo_acceso: mockAccessCode.toUpperCase(), activo: true });
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grupo no encontrado con ese código de acceso' });
        });
    });
});
