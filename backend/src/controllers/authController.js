//authController
const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const NotificationService = require('../services/NotificationService'); // Importar NotificationService

// Función del controlador para manejar el registro de usuarios
const registerUser = async (req, res) => {
  // Solo extrae los campos permitidos, incluyendo telefono
  const { nombre, apellidos, email, password, tipo_usuario, telefono } = req.body; // <--- AÑADIR telefono aquí

  // --- Validación básica de entrada ---
  if (!nombre || !apellidos || !email || !password || !tipo_usuario) {
    return res.status(400).json({ message: 'Por favor, completa todos los campos obligatorios: nombre, apellidos, email, contraseña y tipo de usuario.' });
  }

  // Validar que tipo_usuario sea uno permitido
  if (!['Estudiante', 'Docente'].includes(tipo_usuario)) {
    return res.status(400).json({ message: 'Tipo de usuario no válido. Debe ser "Estudiante" o "Docente".' });
  }

  // --- NUEVA VALIDACIÓN: Telefono obligatorio para Docentes ---
  if (tipo_usuario === 'Docente' && (!telefono || telefono.trim() === '')) {
    return res.status(400).json({ message: 'El teléfono es obligatorio para el registro de docentes.' });
  }
  // Aquí podrías añadir más validaciones para el formato del teléfono si es necesario,
  // aunque tu modelo User ya tiene algunas validaciones para 'telefono'.

  try {
    // --- Verificar si el email ya existe ---
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El email ya está registrado. Por favor, usa otro.' });
    }

    // --- Preparar datos para crear el nuevo usuario ---
    const userData = {
      nombre,
      apellidos,
      email,
      contrasena_hash: password, // El modelo hará el hash automáticamente
      tipo_usuario,
      aprobado: tipo_usuario === 'Estudiante' ? true : false,
    };

    // Añadir telefono solo si es Docente y se proporcionó
    if (tipo_usuario === 'Docente' && telefono) {
      userData.telefono = telefono.trim();
    }
    // --- Fin Preparar datos ---

    const user = await User.create(userData);

    if (user) {
      // Notificar a los administradores sobre el nuevo registro
      try {
        const admins = await User.find({ tipo_usuario: 'Administrador' });
        const message = `Un nuevo usuario '${user.nombre} ${user.apellidos}' (${user.email}) se ha registrado como ${user.tipo_usuario}.`;
        const link = '/admin/user-management'; // O la ruta que uses para la gestión de usuarios en el admin panel

        for (const admin of admins) {
          await NotificationService.createNotification({
            recipient: admin._id,
            sender: user._id,
            type: 'NUEVO_USUARIO_REGISTRADO',
            message: message,
            link: link,
          });
        }
        console.log('Notificaciones de nuevo usuario enviadas a los administradores.');
      } catch (notificationError) {
        console.error('Error al enviar notificación de nuevo usuario a los administradores:', notificationError);
      }

      // Preparar la respuesta
      const responseUser = {
        _id: user._id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        aprobado: user.aprobado,
        message: 'Usuario registrado exitosamente. Si eres docente, tu cuenta requiere aprobación.'
      };
      // Añadir telefono a la respuesta si es docente
      if (user.tipo_usuario === 'Docente' && user.telefono) {
        responseUser.telefono = user.telefono;
      }

      res.status(201).json(responseUser);

    } else {
      res.status(400).json({ message: 'No se pudo registrar el usuario debido a datos inválidos.' }); // Mensaje ligeramente modificado
    }

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      // Añadir un mensaje más genérico si los específicos son muy técnicos
      return res.status(400).json({ message: 'Error de validación. Verifica los datos ingresados.', errors: messages });
    }
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      // Este error ya se maneja arriba con findOne, pero es una salvaguarda.
      return res.status(400).json({ message: 'El email ya está registrado.' });
    }
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
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
      { _id: user._id, tipo_usuario: user.tipo_usuario },
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