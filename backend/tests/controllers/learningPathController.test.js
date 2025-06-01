// backend/tests/controllers/learningPathController.test.js
const request = require('supertest'); // For making HTTP requests
const app = require('../../src/app'); // Assuming your Express app is exported from src/app.js
const mongoose = require('mongoose');
const User = require('../../src/models/UserModel');
const Plan = require('../../src/models/PlanModel');
const Group = require('../../src/models/GroupModel');
const LearningPath = require('../../src/models/LearningPathModel');
const jwt = require('jsonwebtoken'); // To generate mock tokens

// Test DB setup (conceptual - usually in a global test setup)
// beforeAll(async () => { /* Connect to test DB */ });
// afterAll(async () => { /* Disconnect test DB */ });
// afterEach(async () => { /* Clear DB collections */ });

describe('Learning Path Controller - POST /api/learning-paths', () => {
  let teacherUser, adminUser, teacherToken, adminToken, testGroup, freePlan, premiumPlan;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Plan.deleteMany({});
    await Group.deleteMany({});
    await LearningPath.deleteMany({});

    // Create Plans
    freePlan = await new Plan({
      name: 'Free',
      duration: 'indefinite',
      limits: { maxGroups: 1, maxStudentsPerGroup: 10, maxRoutes: 1, maxResources: 5, maxActivities: 5 },
      isDefaultFree: true,
      isActive: true,
    }).save();

    premiumPlan = await new Plan({
      name: 'Premium',
      duration: 'monthly',
      price: 20,
      limits: { maxGroups: 10, maxStudentsPerGroup: 50, maxRoutes: 5, maxResources: 50, maxActivities: 50 },
      isActive: true,
    }).save();

    // Create Users
    teacherUser = await new User({
      nombre: 'Test',
      apellidos: 'Teacher',
      email: 'teacher@test.com',
      contrasena_hash: 'password123', // Will be hashed by pre-save hook
      tipo_usuario: 'Docente',
      planId: freePlan._id, // Assign free plan initially
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Active for 30 days
      usage: { groupsCreated: 0, resourcesGenerated: 0, activitiesGenerated: 0, routesCreated: 0 },
      aprobado: true,
      activo: true,
    }).save();
    teacherToken = jwt.sign({ _id: teacherUser._id, tipo_usuario: teacherUser.tipo_usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });

    adminUser = await new User({
      nombre: 'Test',
      apellidos: 'Admin',
      email: 'admin@test.com',
      contrasena_hash: 'password123',
      tipo_usuario: 'Administrador',
      aprobado: true,
      activo: true,
    }).save();
    adminToken = jwt.sign({ _id: adminUser._id, tipo_usuario: adminUser.tipo_usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create a Group owned by the teacher
    testGroup = await new Group({
        nombre: 'Test Group for LP',
        docente_id: teacherUser._id,
        codigo_acceso: 'TGLP123'
    }).save();
  });

  it('should allow a teacher with an active Free plan (limit 1) to create their first learning path', async () => {
    const res = await request(app)
      .post('/api/learning-paths')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        nombre: 'My First LP',
        descripcion: 'Desc for first LP',
        group_id: testGroup._id.toString(),
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.nombre).toBe('My First LP');

    const updatedTeacher = await User.findById(teacherUser._id);
    expect(updatedTeacher.usage.routesCreated).toBe(1);
  });

  it('should prevent a teacher on Free plan (limit 1) from creating a second learning path', async () => {
    // Create one LP first
    await new LearningPath({ nombre: 'LP 1', group_id: testGroup._id }).save();
    await User.findByIdAndUpdate(teacherUser._id, { 'usage.routesCreated': 1 });

    const res = await request(app)
      .post('/api/learning-paths')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        nombre: 'My Second LP',
        descripcion: 'Desc for second LP',
        group_id: testGroup._id.toString(),
      });
    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toContain('Has alcanzado el límite de 1 rutas de aprendizaje');

    const updatedTeacher = await User.findById(teacherUser._id);
    expect(updatedTeacher.usage.routesCreated).toBe(1); // Should not have incremented
  });

  it('should allow a teacher on Premium plan (limit 5) to create multiple learning paths', async () => {
    await User.findByIdAndUpdate(teacherUser._id, { planId: premiumPlan._id, 'usage.routesCreated': 0 });

    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post('/api/learning-paths')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ nombre: `Premium LP ${i}`, group_id: testGroup._id.toString() });
      expect(res.statusCode).toEqual(201);
    }
    const updatedTeacher = await User.findById(teacherUser._id);
    expect(updatedTeacher.usage.routesCreated).toBe(3);
  });

  it('should prevent learning path creation if teacher subscription is expired', async () => {
    await User.findByIdAndUpdate(teacherUser._id, { subscriptionEndDate: new Date(Date.now() - 1000) }); // Expired yesterday

    const res = await request(app)
      .post('/api/learning-paths')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ nombre: 'LP with Expired Sub', group_id: testGroup._id.toString() });
    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toContain('La suscripción'); // Message from SubscriptionService
  });

  it('should allow an admin to create a learning path without limit checks', async () => {
    // Admin needs a group to create a learning path in, or the controller logic for admins needs to differ
    // For this test, let's assume admin can create LP in any group or group_id is optional for admin
    // Or, an admin might create a group first if that's the flow.
    // For simplicity, let's assume the controller is adapted or admin has a group.
    // We'll use the teacher's group for this test, but an admin is making the call.
    const res = await request(app)
      .post('/api/learning-paths')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Admin LP',
        descripcion: 'Admin created this',
        group_id: testGroup._id.toString(), // Admin creating in teacher's group
      });
    expect(res.statusCode).toEqual(201);
    // Ensure admin's usage (if any) is not affected
    const admin = await User.findById(adminUser._id);
    expect(admin.usage.routesCreated).toBe(0); // Assuming admin usage is not tracked or relevant here
  });

});

// Similar describe blocks would be needed for groupController student approval limits
