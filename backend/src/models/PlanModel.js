// backend/src/models/PlanModel.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del plan es obligatorio'],
    trim: true,
    unique: true, // Assuming plan names should be unique
    enum: ['Free', 'Basic', 'Premium'] // Restrict to these values initially
  },
  duration: {
    type: String,
    required: [true, 'La duración del plan es obligatoria'],
    enum: ['monthly', 'quarterly', 'annual', 'indefinite'], // Added 'indefinite' for free plans
    default: 'indefinite'
  },
  price: {
    type: Number,
    required: function() { return this.name !== 'Free'; }, // Price required if not Free plan
    min: [0, 'El precio no puede ser negativo']
  },
  limits: {
    maxGroups: {
      type: Number,
      required: true,
      min: [0, 'El límite de grupos no puede ser negativo'],
      default: 0
    },
    maxStudentsPerGroup: {
      type: Number,
      required: true,
      min: [0, 'El límite de estudiantes por grupo no puede ser negativo'],
      default: 0
    },
    maxRoutes: { // Assuming 'routes' refers to learning paths
      type: Number,
      required: true,
      min: [0, 'El límite de rutas de aprendizaje no puede ser negativo'],
      default: 0
    },
    maxResources: {
      type: Number,
      required: true,
      min: [0, 'El límite de recursos no puede ser negativo'],
      default: 0
    },
    maxActivities: {
      type: Number,
      required: true,
      min: [0, 'El límite de actividades no puede ser negativo'],
      default: 0
    }
  },
  // It might be useful to have a way to easily identify the default free plan
  isDefaultFree: {
    type: Boolean,
    default: false
  },
  isActive: { // To allow admins to enable/disable plans from being assigned
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Ensure there's only one default free plan
planSchema.pre('save', async function(next) {
  if (this.isDefaultFree) {
    const existingDefault = await this.constructor.findOne({ isDefaultFree: true });
    if (existingDefault && existingDefault._id.toString() !== this._id.toString()) {
      const err = new Error('Ya existe un plan gratuito predeterminado. Solo puede haber uno.');
      next(err);
    } else {
      next();
    }
  } else {
    next();
  }
});

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
