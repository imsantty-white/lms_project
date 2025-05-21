//authController
const User = require('../models/UserModel'); // Importamos el modelo de usuario
const jwt = require('jsonwebtoken');

// Función del controlador para manejar el registro de usuarios
const registerUser = async (req, res) => {
  const { nombre, apellidos, email, password, tipo_usuario } = req.body; // Extraemos los datos del cuerpo de la petición

  // --- Validación básica de entrada ---
  if (!nombre || !apellidos || !email || !password || !tipo_usuario) {
    return res.status(400).json({ message: 'Por favor, completa todos los campos obligatorios' });
  }

  // Validar que tipo_usuario sea uno permitido
  if (!['Estudiante', 'Docente'].includes(tipo_usuario)) {
       return res.status(400).json({ message: 'Tipo de usuario no válido. Debe ser "Estudiante" o "Docente".' });
  }
  // --- Fin Validación básica ---


  try {
    // --- Verificar si el email ya existe ---
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    // --- Fin Verificar email ---

    // --- Crear el nuevo usuario ---
    const user = await User.create({
      nombre,
      apellidos,
      email,
      // Mongoose hará el hashing de la contraseña automáticamente gracias al middleware 'pre save' en el modelo
      contrasena_hash: password, // Pasamos la contraseña en texto plano aquí
      tipo_usuario,
      // Lógica para la aprobación: Docentes requieren aprobación, Estudiantes no
      aprobado: tipo_usuario === 'Estudiante' ? true : false,
      // Los otros campos opcionales quedan vacíos por defecto
    });
    // --- Fin Crear usuario ---


    // --- Respuesta al cliente ---
    if (user) {
      // Si el usuario se creó exitosamente
      res.status(201).json({
        _id: user._id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        aprobado: user.aprobado,
        // No enviamos la contraseña ni el hash de vuelta
        message: 'Usuario registrado exitosamente. Si eres docente, tu cuenta requiere aprobación.'
      });
    } else {
      // Si por alguna razón no se pudo crear el usuario
       res.status(400).json({ message: 'No se pudo registrar el usuario' });
    }
    // --- Fin Respuesta ---

  } catch (error) {
    // Manejo de errores generales (ej: error de base de datos)
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al registrar usuario', error: error.message });
  }
};


// Función del controlador para manejar el login de usuarios
const loginUser = async (req, res) => {
  const { email, password } = req.body; // Extraemos email y password del cuerpo de la petición

  // --- Validación básica ---
  if (!email || !password) {
      return res.status(400).json({ message: 'Por favor, ingresa email y contraseña' });
  }
  // --- Fin Validación básica ---

  try {
      // --- Buscar el usuario por email ---
      const user = await User.findOne({ email });

      // Si el usuario no existe
      if (!user) {
          return res.status(401).json({ message: 'Credenciales inválidas' }); // No damos detalles específicos por seguridad
      }

      // --- Verificar estado de la cuenta (activo y aprobado si es docente) ---
      if (!user.activo) {
           return res.status(401).json({ message: 'Tu cuenta ha sido desactivada' });
      }
      // Si es docente, verificar si está aprobado
      if (user.tipo_usuario === 'Docente' && !user.aprobado) {
           return res.status(401).json({ message: 'Tu cuenta de docente está pendiente de aprobación' });
      }
       // --- Fin Verificar estado ---


      // --- Comparar la contraseña proporcionada con el hash almacenado ---
      // Usamos el método matchPassword que definimos en el modelo
      const isMatch = await user.matchPassword(password);

      // Si las contraseñas no coinciden
      if (!isMatch) {
          return res.status(401).json({ message: 'Credenciales inválidas' }); // De nuevo, mensaje genérico
      }
      // --- Fin Comparar contraseña ---

      // --- Generar JWT ---
      const token = jwt.sign(
          { id: user._id, tipo_usuario: user.tipo_usuario }, // Payload del token (información que queremos guardar)
          process.env.JWT_SECRET, // Clave secreta para firmar el token
          { expiresIn: '24h' } // Opciones: el token expira en 24 horas
      );
      // --- Fin Generar JWT ---


      // --- Respuesta exitosa ---
      res.status(200).json({
          _id: user._id,
          nombre: user.nombre,
          apellidos: user.apellidos,
          email: user.email,
          tipo_usuario: user.tipo_usuario,
          token: token // Enviamos el JWT al cliente
      });
      // --- Fin Respuesta ---

  } catch (error) {
      console.error('Error en el login de usuario:', error);
      res.status(500).json({ message: 'Error interno del servidor al iniciar sesión', error: error.message });
  }
};

// @desc    Obtener datos del usuario autenticado
// @route   GET /api/auth/me
// Acceso:  Privado (manejado por el middleware 'protect')
// Notas:   El middleware 'protect' ya adjunta la información del usuario (decriptada del token) a req.user
const getMe = async (req, res) => { // <-- Función asíncrona
  try {
      // Cuando la ruta '/me' es alcanzada, significa que el middleware 'protect' ya se ejecutó con éxito.
      // 'protect' decodifica el token JWT y busca al usuario en la base de datos,
      // adjuntando el objeto del usuario (o una versión de él) a req.user.
      // Por lo tanto, la información del usuario ya está disponible en req.user.
      // No necesitas buscar el usuario en la base de datos de nuevo en la mayoría de los casos.

      // Responde con el estado 200 OK y el objeto del usuario que 'protect' adjuntó a req.user.
      // Esto enviará al frontend el objeto de usuario que se usó para verificar el token.
      res.status(200).json({
          success: true,
          data: req.user // <-- Responde con el objeto de usuario que el middleware 'protect' puso aquí
          // La estructura de req.user depende de cómo implementaste protect, pero debería incluir _id, email, tipo_usuario, etc.
      });

  } catch (error) {
      // Si ocurre algún error (menos probable aquí si 'protect' ya pasó), lo capturamos.
      console.error('Error en el controlador getMe:', error);
      // Respondemos con un estado de error (ej: 500).
      res.status(500).json({
          success: false,
          message: error.message || 'Error al obtener datos del usuario autenticado.' // Mensaje de error genérico o del error
      });
      // Si tienes un middleware de manejo de errores central, podrías usar next(error) aquí.
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};