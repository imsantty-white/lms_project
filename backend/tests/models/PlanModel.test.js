// backend/tests/models/PlanModel.test.js
const mongoose = require('mongoose');
const Plan = require('../../src/models/PlanModel'); // Adjust path as needed
// You'll need a test database setup for this (e.g., MongoDB Memory Server)
// For this example, we'll assume it's handled by a global test setup file.

// Example: Connecting to a test DB (conceptual)
// beforeAll(async () => { await connectToTestDB(); });
// afterAll(async () => { await closeTestDBConnection(); });
// afterEach(async () => { await clearTestDB(); });

describe('Plan Model', () => {
  it('should create a plan successfully with valid data', async () => {
    const planData = {
      name: 'Basic',
      duration: 'monthly',
      price: 10,
      limits: {
        maxGroups: 5,
        maxStudentsPerGroup: 30,
        maxRoutes: 3,
        maxResources: 30,
        maxActivities: 30,
      },
      isActive: true,
    };
    const plan = new Plan(planData);
    const savedPlan = await plan.save();

    expect(savedPlan._id).toBeDefined();
    expect(savedPlan.name).toBe('Basic');
    expect(savedPlan.price).toBe(10);
    expect(savedPlan.limits.maxGroups).toBe(5);
  });

  it('should fail if required fields are missing (e.g., name)', async () => {
    const planData = {
      // name is missing
      duration: 'annual',
      price: 100,
      limits: { maxGroups: 1, maxStudentsPerGroup: 1, maxRoutes: 1, maxResources: 1, maxActivities: 1 },
    };
    let err;
    try {
      const plan = new Plan(planData);
      await plan.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
  });

  it('should require price for non-Free plans', async () => {
    const planData = {
      name: 'Premium',
      duration: 'annual',
      // price is missing
      limits: { maxGroups: 10, maxStudentsPerGroup: 50, maxRoutes: 10, maxResources: 50, maxActivities: 50 },
    };
    let err;
    try {
      const plan = new Plan(planData);
      await plan.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.price).toBeDefined();
  });

  it('should allow Free plan to have no price', async () => {
    const planData = {
      name: 'Free',
      duration: 'indefinite',
      // price is not provided
      limits: { maxGroups: 1, maxStudentsPerGroup: 10, maxRoutes: 1, maxResources: 5, maxActivities: 5 },
      isDefaultFree: true,
    };
    const plan = new Plan(planData);
    const savedPlan = await plan.save();
    expect(savedPlan.price).toBeUndefined(); // Or null, depending on how schema handles it
    expect(savedPlan.isDefaultFree).toBe(true);
  });

  // Add more tests for other validations and unique isDefaultFree
});
