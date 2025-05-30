// src/models/UserModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // ... (todos tus otros campos permanecen igual) ...

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
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, usa un email válido']
  },
  contrasena_hash: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  tipo_usuario: {
    type: String,
    required: [true, 'El tipo de usuario es obligatorio'],
    enum: ['Estudiante', 'Docente', 'Administrador'],
    default: 'Estudiante'
  },

  // Campo específico para Estudiantes (como lo modificamos antes)
  grupos_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: [] // Opcional, pero buena práctica
  }],

  // MODIFICACIÓN AQUÍ para los campos específicos para Docentes
  grupos_asignados_ids: [{ // Nuevo campo para almacenar los IDs de los grupos asignados al docente
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: [] // Opcional, pero buena práctica
  }],
  // El campo numero_grupos_asignados podría volverse redundante o usarse de otra forma
  // Por ahora lo comentaremos o puedes decidir eliminarlo si la longitud del array es suficiente
  /*
  numero_grupos_asignados: {
    type: Number,
    default: 0
  },
  */

  tipo_identificacion: {
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
  numero_identificacion: {
    type: String,
    trim: true,
    maxlength: [15, 'El número de identificación no puede exceder 15 caracteres'],
    validate: {
      validator: function(v) {
        return !v || /^\d+$/.test(v);
      },
      message: 'El número de identificación solo puede contener números'
    }
  },
  fecha_nacimiento: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value < new Date();
      },
      message: 'La fecha de nacimiento debe ser una fecha pasada'
    }
  },
  telefono: {
    type: String,
    trim: true,
    maxlength: [15, 'El teléfono no puede exceder 15 caracteres'],
    validate: {
      validator: function(v) {
        return !v || /^\d+$/.test(v);
      },
      message: 'El teléfono solo puede contener números'
    }
  },
  institucion: {
    type: String,
    trim: true,
    maxlength: [100, 'La institución no puede exceder 100 caracteres']
  },
  fecha_registro: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  aprobado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: false
});

// ... (tu middleware pre y método matchPassword permanecen igual) ...
userSchema.pre('save', async function(next) {
  if (!this.isModified('contrasena_hash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.contrasena_hash, salt);
    this.contrasena_hash = hash;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.contrasena_hash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;