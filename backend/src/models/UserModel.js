// src/models/UserModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Importamos bcrypt para cifrar contraseñas

// Definimos el esquema de usuario
const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son obligatorios'],
    trim: true,
    minlength: [2, 'Los apellidos deben tener al menos 2 caracteres'],
    maxlength: [50, 'Los apellidos no pueden exceder 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true, // Asegura que cada email sea único en la base de datos
    lowercase: true, // Convierte el email a minúsculas antes de guardar
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, usa un email válido'] // Validación de formato de email
  },
  contrasena_hash: { // Almacenaremos el hash de la contraseña aquí
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  tipo_usuario: {
    type: String,
    required: [true, 'El tipo de usuario es obligatorio'],
    enum: ['Estudiante', 'Docente', 'Administrador'], // Solo permite estos valores
    default: 'Estudiante' // Por defecto, un usuario registrado es Estudiante
  },
  // --- REMOVE THIS FIELD ---
  // grupo_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Group',
  //   default: null
  // },
  // --- END REMOVE THIS FIELD ---

  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan', // Reference to the Plan model
    default: null // Default to null, will be set for teachers upon registration or by an admin
  },
  subscriptionEndDate: {
    type: Date,
    default: null // Null for indefinite subscriptions or until set
  },
  usage: {
    groupsCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    resourcesGenerated: { // Assuming 'resources' is a feature to track
      type: Number,
      default: 0,
      min: 0
    },
    activitiesGenerated: { // Assuming 'activities' is a feature to track
      type: Number,
      default: 0,
      min: 0
    },
    // --- ADD THIS FIELD ---
    routesCreated: { // For Learning Paths
      type: Number,
      default: 0,
      min: 0
    }
    // --- END OF ADD THIS FIELD ---
  },
  // --- END OF NEW FIELDS FOR TEACHER PLANS ---
  // Campo específico para Docentes (existing field, may be redundant if plan limits are used)
  numero_grupos_asignados: { // This might be derived from usage.groupsCreated or kept for other purposes
    type: Number,
    default: 0
  },
  tipo_identificacion: { // Campos opcionales
    type: String,
    trim: true,
    maxlength: [30, 'El tipo de identificación no puede exceder 30 caracteres'],
    enum: [
      'Tarjeta de Identidad',
      'Cédula de Ciudadanía',
      'Registro Civil de Nacimiento',
      'Tarjeta de Extranjería',
      'Cédula de Extranjería',
      'NIT',
      'Pasaporte'
    ]
  },
  numero_identificacion: { // Campos opcionales
    type: String,
    trim: true,
    maxlength: [15, 'El número de identificación no puede exceder 15 caracteres'],
    validate: {
      validator: function(v) {
        // Solo números, opcional
        return !v || /^\d+$/.test(v);
      },
      message: 'El número de identificación solo puede contener números'
    }
  },
  fecha_nacimiento: { // Campos opcionales
    type: Date,
    validate: {
      validator: function(value) {
        // Debe ser una fecha pasada
        return !value || value < new Date();
      },
      message: 'La fecha de nacimiento debe ser una fecha pasada'
    }
  },
  telefono: { // Campos opcionales
    type: String,
    trim: true,
    maxlength: [15, 'El teléfono no puede exceder 15 caracteres'],
    validate: {
      validator: function(v) {
        // Solo números, opcional
        return !v || /^\d+$/.test(v);
      },
      message: 'El teléfono solo puede contener números'
    }
  },
  institucion: { // NUEVO CAMPO
    type: String,
    trim: true,
    maxlength: [100, 'La institución no puede exceder 100 caracteres']
  },
  fecha_registro: {
    type: Date,
    default: Date.now // Establece la fecha actual por defecto al crear un usuario
  },
  activo: {
    type: Boolean,
    default: true // Por defecto, la cuenta está activa
  },
  aprobado: {
    type: Boolean,
    default: true // Por defecto aprobado (cambiaremos esto en la lógica de registro para docentes)
  }
}, {
  timestamps: false // Deshabilita timestamps automáticos si ya tenemos fecha_registro. Si quieres createdAt y updatedAt, pon true y elimina fecha_registro.
});

// Middleware de Mongoose que se ejecuta ANTES de guardar un documento
// Usaremos esto para hashear la contraseña antes de guardarla en la BD
userSchema.pre('save', async function(next) {
  // Solo hashea la contraseña si ha sido modificada (o es nueva)
  if (!this.isModified('contrasena_hash')) {
    return next(); // Si no se modificó, pasa al siguiente middleware o guarda
  }

  try {
    // Genera un 'salt' (valor aleatorio) para mejorar la seguridad del hash
    const salt = await bcrypt.genSalt(10); // 10 es el número de rondas de hashing

    // Hashea la contraseña usando el salt
    const hash = await bcrypt.hash(this.contrasena_hash, salt);

    // Reemplaza la contraseña en texto plano con el hash
    this.contrasena_hash = hash;
    next(); // Continúa con el proceso de guardado
  } catch (err) {
    next(err); // Pasa el error al siguiente middleware
  }
});

// Método de instancia para comparar contraseñas
// Lo usaremos al hacer login
userSchema.methods.matchPassword = async function(enteredPassword) {
  // Compara la contraseña proporcionada con el hash guardado
  return await bcrypt.compare(enteredPassword, this.contrasena_hash);
};

// Definición de Índices
userSchema.index({ tipo_usuario: 1, aprobado: 1 });
userSchema.index({ planId: 1 });

// Creamos el modelo a partir del esquema
const User = mongoose.model('User', userSchema);

module.exports = User; // Exportamos el modelo para usarlo en los controladores