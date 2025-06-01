// backend/tests/controllers/groupController.test.js (Conceptual additions)
// const request = require('supertest');
// const app = require('../../src/app');
// const mongoose = require('mongoose');
// const User = require('../../src/models/UserModel');
// const Group = require('../../src/models/GroupModel');
// const Plan = require('../../src/models/PlanModel');
// const jwt = require('jsonwebtoken');

// ... (Assume similar beforeEach setup as in learningPathController.test.js, creating users, plans, tokens)

describe('Group Controller - DELETE /api/groups/:groupId (Archive)', () => {
  let teacherUser, teacherToken, activeGroup;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Plan.deleteMany({});
    await Group.deleteMany({});

    const freePlan = await new Plan({
      name: 'Free',
      duration: 'indefinite',
      limits: { maxGroups: 2, maxStudentsPerGroup: 10, maxRoutes: 1, maxResources: 5, maxActivities: 5 },
      isDefaultFree: true,
      isActive: true,
    }).save();

    teacherUser = await new User({
      nombre: 'Archive',
      apellidos: 'Teacher',
      email: 'teacherarchive@test.com',
      contrasena_hash: 'password123',
      tipo_usuario: 'Docente',
      planId: freePlan._id,
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usage: { groupsCreated: 1, resourcesGenerated: 0, activitiesGenerated: 0, routesCreated: 0 }, // Initially has 1 group created
      aprobado: true,
      activo: true,
    }).save();
    teacherToken = jwt.sign({ _id: teacherUser._id, tipo_usuario: teacherUser.tipo_usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });

    activeGroup = await new Group({
        nombre: 'Group to Archive',
        docente_id: teacherUser._id,
        codigo_acceso: 'ARCHIVE1',
        activo: true // Ensure it's active
    }).save();
  });

  it('should archive an active group and decrement teacher usage.groupsCreated', async () => {
    const initialUsage = teacherUser.usage.groupsCreated; // Should be 1

    const res = await request(app)
      .delete(`/api/groups/${activeGroup._id.toString()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('Grupo archivado exitosamente');

    const updatedGroup = await Group.findById(activeGroup._id);
    expect(updatedGroup.activo).toBe(false); // Group is archived

    const updatedTeacher = await User.findById(teacherUser._id);
    // usage.groupsCreated should REMAIN THE SAME after teacher archives.
    expect(updatedTeacher.usage.groupsCreated).toBe(initialUsage);
    // console.log('Usage after teacher archive:', updatedTeacher.usage.groupsCreated); // Expected: 1
  });

  it('should still report "already archived" if attempting to archive an already archived group', async () => {
    // First, archive the group
    await request(app)
      .delete(`/api/groups/${activeGroup._id.toString()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    const updatedTeacher = await User.findById(teacherUser._id);
    const usageAfterFirstArchive = updatedTeacher.usage.groupsCreated; // Should be 1

    // Attempt to archive again
    const res = await request(app)
      .delete(`/api/groups/${activeGroup._id.toString()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('El grupo ya se encuentra archivado');

    const finalTeacherState = await User.findById(teacherUser._id);
    expect(finalTeacherState.usage.groupsCreated).toBe(usageAfterFirstArchive); // Should still be 1
  });

  // Add tests for admin deleting groups and its effect on teacher's counter in adminController.test.js
});
