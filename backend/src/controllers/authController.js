//authController
const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');

// Función del controlador para manejar el registro de usuarios
const registerUser = async (req, res) => {
  // Solo extrae los campos permitidos
  const { nombre, apellidos, email, password, tipo_usuario } = req.body;

  // --- Validación básica de entrada ---
  if (!nombre || !apellidos || !email || !password || !tipo_usuario) {
    return res.status(400).json({ message: 'Por favor, completa todos los campos obligatorios' });
  }

  // Validar que tipo_usuario sea uno permitido
  if (!['Estudiante', 'Docente'].includes(tipo_usuario)) {
    return res.status(400).json({ message: 'Tipo de usuario no válido. Debe ser "Estudiante" o "Docente".' });
  }

  try {
    // --- Verificar si el email ya existe ---
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El email ya está registrado. Por favor, usa otro.' });
    }

    // --- Crear el nuevo usuario SOLO con los campos permitidos ---
    const user = await User.create({
      nombre,
      apellidos,
      email,
      contrasena_hash: password, // El modelo hará el hash automáticamente
      tipo_usuario,
      aprobado: tipo_usuario === 'Estudiante' ? true : false,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        aprobado: user.aprobado,
        message: 'Usuario registrado exitosamente. Si eres docente, tu cuenta requiere aprobación.'
      });
    } else {
      res.status(400).json({ message: 'No se pudo registrar el usuario' });
    }

  } catch (error) {
    // Manejo de errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    // Error por email duplicado (índice único)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ message: 'No se pudo registrar el usuario' });
    }
    // Otros errores
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al registrar usuario' });
  }
};


// Función del controlador para manejar el login de usuarios
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // --- Validación básica ---
  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, ingresa email y contraseña' });
  }

  try {
    // --- Buscar el usuario por email ---
    const user = await User.findOne({ email });

    // Mensaje genérico para evitar enumeración de usuarios
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // --- Verificar estado de la cuenta (activo y aprobado si es docente) ---
    if (!user.activo) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    if (user.tipo_usuario === 'Docente' && !user.aprobado) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // --- Comparar la contraseña proporcionada con el hash almacenado ---
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // --- Generar JWT ---
    const token = jwt.sign(
      { id: user._id, tipo_usuario: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // --- Respuesta exitosa ---
    res.status(200).json({
      _id: user._id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      token: token
    });

  } catch (error) {
    console.error('Error en el login de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al iniciar sesión' });
  }
};

// @desc    Obtener datos del usuario autenticado
// @route   GET /api/auth/me
// Acceso:  Privado (manejado por el middleware 'protect')
// Notas:   El middleware 'protect' ya adjunta la información del usuario (decriptada del token) a req.user
const getMe = async (req, res) => {
  try {
    const safeUser = {
      _id: req.user._id,
      nombre: req.user.nombre,
      apellidos: req.user.apellidos,
      email: req.user.email,
      tipo_usuario: req.user.tipo_usuario,
      aprobado: req.user.aprobado,
      activo: req.user.activo
    };
    res.status(200).json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Error en el controlador getMe:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener datos del usuario autenticado.'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};