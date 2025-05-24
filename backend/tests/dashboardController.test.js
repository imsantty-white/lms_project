const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('../src/models/User');
const Group = require('../src/models/Group');
const LearningPath = require('../src/models/LearningPath');
const Module = require('../src/models/Module');
const Theme = require('../src/models/Theme');
const ContentAssignment = require('../src/models/ContentAssignment');
const Progress = require('../src/models/Progress');
const Submission = require('../src/models/Submission');
const Resource = require('../src/models/Resource');
const Activity = require('../src/models/Activity');

let mongoServer;
let teacherToken, adminToken, studentToken;
let teacherUser, adminUser, studentUser;

// Helper function to generate a token (simplified for testing)
const generateToken = (user) => {
  // In a real app, this would involve jwt.sign with a secret
  // For testing, we can mock or use a simple placeholder if the auth middleware is mocked
  // For this test, we'll assume the real token generation is used by logging in the user
  return `Bearer ${user.getSignedJwtToken()}`;
};

describe('Dashboard API Endpoints', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create users and tokens for testing roles
    studentUser = await User.create({
      nombre: 'Student',
      apellidos: 'User',
      email: 'student.dashboard@example.com',
      password: 'password123',
      tipo_usuario: 'Estudiante',
      isVerified: true,
    });
    studentToken = generateToken(studentUser);

    teacherUser = await User.create({
      nombre: 'Teacher',
      apellidos: 'User',
      email: 'teacher.dashboard@example.com',
      password: 'password123',
      tipo_usuario: 'Docente',
      isVerified: true,
    });
    teacherToken = generateToken(teacherUser);

    adminUser = await User.create({
      nombre: 'Admin',
      apellidos: 'User',
      email: 'admin.dashboard@example.com',
      password: 'password123',
      tipo_usuario: 'Administrador',
      isVerified: true,
    });
    adminToken = generateToken(adminUser);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all relevant collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    // Re-create users because they are cleared - tokens will be invalid otherwise
    // Or better, re-fetch/re-login users or handle tokens more robustly if needed,
    // but for simplicity in this test, we'll re-use the initial users/tokens
    // and assume the tests don't modify these base user documents.
    // If user docs are modified, they should be re-created or tokens regenerated.

    // We need to re-insert the users after clearing if we want to use them for auth
    // For simplicity, we will re-use the global users. If a test modifies a user,
    // that user should be re-created for subsequent tests.
    // For this test suite, we are primarily testing read operations on dashboard,
    // so user modifications are less likely to be an issue.
    await User.insertMany([studentUser.toObject(), teacherUser.toObject(), adminUser.toObject()]);

  });

  // --- TEACHER DASHBOARD TESTS ---
  describe('GET /api/dashboard/teacher/stats', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/dashboard/teacher/stats');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if authenticated as a student', async () => {
      const res = await request(app)
        .get('/api/dashboard/teacher/stats')
        .set('Authorization', studentToken);
      expect(res.statusCode).toEqual(403);
    });

    it('should return 200 and default stats for a teacher with no groups/data', async () => {
      const res = await request(app)
        .get('/api/dashboard/teacher/stats')
        .set('Authorization', teacherToken);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        totalStudentsInMyGroups: 0,
        activeStudentsLast7Days: 0,
        averageLearningPathCompletionRate: 0,
        learningPathsManaged: 0,
      });
    });

    it('should return correct stats for a teacher with data', async () => {
      // Seed data for this teacher
      const group1 = await Group.create({ nombre: 'Teacher Group 1', docente_id: teacherUser._id, clave_grupo: 'TG1KEY' });
      const group2 = await Group.create({ nombre: 'Teacher Group 2', docente_id: teacherUser._id, clave_grupo: 'TG2KEY' });

      // Add students to group1
      const s1 = await User.create({ nombre: 's1', email: 's1@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true });
      const s2 = await User.create({ nombre: 's2', email: 's2@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true });
      group1.miembros.push({ estudiante_id: s1._id, estado_inscripcion: 'Aprobado', fecha_inscripcion: new Date() });
      group1.miembros.push({ estudiante_id: s2._id, estado_inscripcion: 'Aprobado', fecha_inscripcion: new Date() });
      await group1.save();
      
      const lp1 = await LearningPath.create({ nombre: 'LP1 Math', group_id: group1._id, docente_id: teacherUser._id });
      const lp2 = await LearningPath.create({ nombre: 'LP2 Science', group_id: group1._id, docente_id: teacherUser._id }); // LP in same group
      const lp3 = await LearningPath.create({ nombre: 'LP3 History', group_id: group2._id, docente_id: teacherUser._id }); // LP in different group

      // Progress for LP1: 1 student completed, 1 student half
      await Progress.create({ estudiante_id: s1._id, learning_path_id: lp1._id, path_status: 'Completado', completed_themes: [{theme_id: new mongoose.Types.ObjectId()}], total_themes: 1 });
      await Progress.create({ estudiante_id: s2._id, learning_path_id: lp1._id, path_status: 'En progreso', completed_themes: [], total_themes: 2 });
      // No progress for LP2 or LP3 for simplicity in this rate calc

      // Submissions for active students
      const sevenDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const act1 = await Activity.create({ title: 'Act1', tipo_actividad: 'Tarea', learning_path_id: lp1._id });
      await Submission.create({ estudiante_id: s1._id, activity_id: act1._id, learning_path_id: lp1._id, fecha_envio: sevenDaysAgo, estado_envio: 'Entregado' });

      const res = await request(app)
        .get('/api/dashboard/teacher/stats')
        .set('Authorization', teacherToken);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.totalStudentsInMyGroups).toEqual(2); // s1, s2 in group1
      expect(res.body.data.learningPathsManaged).toEqual(3); // lp1, lp2, lp3
      expect(res.body.data.activeStudentsLast7Days).toEqual(1); // Only s1 made a submission
      // LP1: 1 of 2 students completed (50% completion rate for LP1)
      // LP2 & LP3: 0 students, so 0% completion, they don't count towards pathsWithProgress
      // Average = 50% / 1 path with progress = 50%
      expect(res.body.data.averageLearningPathCompletionRate).toEqual(50); 
    });
  });

  describe('GET /api/dashboard/teacher/popular-content', () => {
    it('should return 200 and empty arrays for a teacher with no content', async () => {
      const res = await request(app)
        .get('/api/dashboard/teacher/popular-content')
        .set('Authorization', teacherToken);
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.mostAccessedContent).toEqual([]);
      expect(res.body.data.mostCompletedActivities).toEqual([]);
    });

    it('should return correct popular content for a teacher', async () => {
        const group = await Group.create({ nombre: 'Content Group', docente_id: teacherUser._id, clave_grupo: 'CGKEY' });
        const lp = await LearningPath.create({ nombre: 'Content LP', group_id: group._id, docente_id: teacherUser._id });

        const resource1 = await Resource.create({ nombre: 'Resource 1', tipo_recurso: 'Video', url_recurso: 'http://example.com/vid1' });
        const resource2 = await Resource.create({ nombre: 'Resource 2', tipo_recurso: 'Articulo', url_recurso: 'http://example.com/art1' });
        const activity1 = await Activity.create({ title: 'Activity 1', tipo_actividad: 'Tarea', learning_path_id: lp._id });
        const activity2 = await Activity.create({ title: 'Activity 2', tipo_actividad: 'Examen', learning_path_id: lp._id });

        // Content Assignments (for "mostAccessedContent" proxy)
        await ContentAssignment.create({ learning_path_id: lp._id, content_id: resource1._id, content_type: 'Resource', order: 1 });
        await ContentAssignment.create({ learning_path_id: lp._id, content_id: resource1._id, content_type: 'Resource', order: 2 }); // Assigned twice
        await ContentAssignment.create({ learning_path_id: lp._id, content_id: resource2._id, content_type: 'Resource', order: 3 });
        await ContentAssignment.create({ learning_path_id: lp._id, content_id: activity1._id, content_type: 'Activity', order: 4 });

        // Submissions (for "mostCompletedActivities")
        const s1 = await User.create({ nombre: 's1c', email: 's1c@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true });
        await Submission.create({ estudiante_id: s1._id, activity_id: activity1._id, learning_path_id: lp._id, estado_envio: 'Calificado', calificacion: 80 });
        await Submission.create({ estudiante_id: s1._id, activity_id: activity1._id, learning_path_id: lp._id, estado_envio: 'Calificado', calificacion: 90 }); // activity1 completed twice by same student
        await Submission.create({ estudiante_id: s1._id, activity_id: activity2._id, learning_path_id: lp._id, estado_envio: 'Entregado' }); // Not 'Calificado' or 'Completado'

        const res = await request(app)
            .get('/api/dashboard/teacher/popular-content')
            .set('Authorization', teacherToken);

        expect(res.statusCode).toEqual(200);
        // mostAccessedContent (Most Assigned)
        expect(res.body.data.mostAccessedContent).toContainEqual(expect.objectContaining({ name: 'Resource 1', count: 2 }));
        expect(res.body.data.mostAccessedContent).toContainEqual(expect.objectContaining({ name: 'Resource 2', count: 1 }));
        expect(res.body.data.mostAccessedContent).toContainEqual(expect.objectContaining({ name: 'Activity 1', count: 1 }));
        
        // mostCompletedActivities
        expect(res.body.data.mostCompletedActivities.length).toBe(1);
        expect(res.body.data.mostCompletedActivities[0]).toEqual(expect.objectContaining({ name: 'Activity 1', count: 2 }));
    });
  });

  // --- ADMIN DASHBOARD TESTS ---
  describe('GET /api/dashboard/admin/stats', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/dashboard/admin/stats');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if authenticated as a teacher', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin/stats')
        .set('Authorization', teacherToken);
      expect(res.statusCode).toEqual(403);
    });
    
    it('should return 200 and default/zero stats if no data in platform', async () => {
        // Clear all users except the admin making the request
        await User.deleteMany({ _id: { $ne: adminUser._id } });

        const res = await request(app)
            .get('/api/dashboard/admin/stats')
            .set('Authorization', adminToken);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.totalUsersByRole).toEqual({ Administrador: 1 }); // Only the admin user
        expect(res.body.data.totalLearningPaths).toEqual(0);
        expect(res.body.data.totalGroups).toEqual(0);
        expect(res.body.data.platformWideAverageCompletionRate).toEqual(0);
         // activeUsersLast7Days counts users created in last 7 days. Admin was created earlier.
        expect(res.body.data.activeUsersLast7Days).toEqual(0); 
    });


    it('should return correct platform-wide stats for an admin', async () => {
      // Seed platform data
      // Users are already created (studentUser, teacherUser, adminUser)
      // Let's add one more student created recently for activeUsersLast7Days
      const newStudent = await User.create({
          nombre: 'New Kid', email: 'newkid@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true, createdAt: new Date()
      });


      const group1 = await Group.create({ nombre: 'Group A', docente_id: teacherUser._id, clave_grupo: 'GAKEY' });
      const group2 = await Group.create({ nombre: 'Group B', docente_id: teacherUser._id, clave_grupo: 'GBKEY' });
      await Group.create({ nombre: 'Group C', docente_id: teacherUser._id, clave_grupo: 'GCKEY' });


      const lp1 = await LearningPath.create({ nombre: 'LP A1', group_id: group1._id, docente_id: teacherUser._id });
      const lp2 = await LearningPath.create({ nombre: 'LP B1', group_id: group2._id, docente_id: teacherUser._id });
      
      // Add studentUser to group1 and newStudent to group2
      group1.miembros.push({ estudiante_id: studentUser._id, estado_inscripcion: 'Aprobado', fecha_inscripcion: new Date() });
      await group1.save();
      group2.miembros.push({ estudiante_id: newStudent._id, estado_inscripcion: 'Aprobado', fecha_inscripcion: new Date() });
      await group2.save();

      // Progress for LP A1 (studentUser): 100% completed
      await Progress.create({ estudiante_id: studentUser._id, learning_path_id: lp1._id, path_status: 'Completado', completed_themes: [{theme_id: new mongoose.Types.ObjectId()}], total_themes: 1 });
      // Progress for LP B1 (newStudent): 50% completed
      await Progress.create({ estudiante_id: newStudent._id, learning_path_id: lp2._id, path_status: 'En progreso', completed_themes: [{theme_id: new mongoose.Types.ObjectId()}], total_themes: 2 });


      const res = await request(app)
        .get('/api/dashboard/admin/stats')
        .set('Authorization', adminToken);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.totalUsersByRole).toEqual({ Estudiante: 2, Docente: 1, Administrador: 1 });
      expect(res.body.data.totalLearningPaths).toEqual(2);
      expect(res.body.data.totalGroups).toEqual(3);
      // LP A1: 100% completion (1 student enrolled, 1 completed)
      // LP B1: 50% completion (1 student enrolled, 0.5 effectively completed for rate)
      // Average = (100 + 50) / 2 = 75%
      expect(res.body.data.platformWideAverageCompletionRate).toEqual(75);
      expect(res.body.data.activeUsersLast7Days).toEqual(1); // Only newStudent
    });
  });

  describe('GET /api/dashboard/admin/popular-content', () => {
    it('should return 200 and empty arrays if no content on platform', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin/popular-content')
        .set('Authorization', adminToken);
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.mostPopularLearningPaths).toEqual([]);
      expect(res.body.data.mostUtilizedContentTypes).toEqual([]);
    });

    it('should return correct popular content for an admin', async () => {
        // LP1 (popular)
        const group1 = await Group.create({ nombre: 'Pop Group 1', docente_id: teacherUser._id, clave_grupo: 'PG1KEY' });
        const lp1 = await LearningPath.create({ nombre: 'Popular LP', group_id: group1._id, docente_id: teacherUser._id });
        const s1 = await User.create({ nombre: 's1p', email: 's1p@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true });
        const s2 = await User.create({ nombre: 's2p', email: 's2p@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true });
        group1.miembros.push({ estudiante_id: s1._id, estado_inscripcion: 'Aprobado' });
        group1.miembros.push({ estudiante_id: s2._id, estado_inscripcion: 'Aprobado' });
        await group1.save();

        // LP2 (less popular)
        const group2 = await Group.create({ nombre: 'Less Pop Group', docente_id: teacherUser._id, clave_grupo: 'LPGKEY' });
        const lp2 = await LearningPath.create({ nombre: 'Less Popular LP', group_id: group2._id, docente_id: teacherUser._id });
        const s3 = await User.create({ nombre: 's3p', email: 's3p@example.com', password: 'pw', tipo_usuario: 'Estudiante', isVerified: true });
        group2.miembros.push({ estudiante_id: s3._id, estado_inscripcion: 'Aprobado' });
        await group2.save();

        // Content Types
        const resourceVideo = await Resource.create({ nombre: 'Video Intro', tipo_recurso: 'Video', url_recurso: 'http://example.com/vid' });
        const resourceArticle = await Resource.create({ nombre: 'Article Details', tipo_recurso: 'Articulo', url_recurso: 'http://example.com/art' });
        const activityQuiz = await Activity.create({ title: 'Basic Quiz', tipo_actividad: 'Examen', learning_path_id: lp1._id });

        await ContentAssignment.create({ learning_path_id: lp1._id, content_id: resourceVideo._id, content_type: 'Resource' });
        await ContentAssignment.create({ learning_path_id: lp1._id, content_id: resourceVideo._id, content_type: 'Resource' }); // Video assigned twice
        await ContentAssignment.create({ learning_path_id: lp2._id, content_id: resourceArticle._id, content_type: 'Resource' });
        await ContentAssignment.create({ learning_path_id: lp2._id, content_id: activityQuiz._id, content_type: 'Activity' });

        const res = await request(app)
            .get('/api/dashboard/admin/popular-content')
            .set('Authorization', adminToken);
        
        expect(res.statusCode).toEqual(200);
        
        // mostPopularLearningPaths (by enrollment)
        expect(res.body.data.mostPopularLearningPaths.length).toBe(2);
        expect(res.body.data.mostPopularLearningPaths[0]).toEqual(expect.objectContaining({ name: 'Popular LP', enrolled: 2 }));
        expect(res.body.data.mostPopularLearningPaths[1]).toEqual(expect.objectContaining({ name: 'Less Popular LP', enrolled: 1 }));

        // mostUtilizedContentTypes
        // Video: 2, Articulo: 1, Examen: 1
        const contentTypes = res.body.data.mostUtilizedContentTypes;
        expect(contentTypes).toContainEqual(expect.objectContaining({ name: 'Video', count: 2 }));
        expect(contentTypes).toContainEqual(expect.objectContaining({ name: 'Articulo', count: 1 }));
        expect(contentTypes).toContainEqual(expect.objectContaining({ name: 'Examen', count: 1 }));
    });
  });
});
