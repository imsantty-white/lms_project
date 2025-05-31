//authController
const User = require('../models/UserModel');
const Plan = require('../models/PlanModel'); // <--- ADD THIS LINE
const jwt = require('jsonwebtoken');
const NotificationService = require('../services/NotificationService'); // Importar NotificationService

// Función del controlador para manejar el registro de usuarios
const registerUser = async (req, res) => {
  // Solo extrae los campos permitidos, incluyendo telefono
  const { nombre, apellidos, email, password, tipo_usuario, telefono } = req.body;

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
      contrasena_hash: password,
      tipo_usuario,
      aprobado: tipo_usuario === 'Estudiante' ? true : false,
      // Initialize usage counters (they have defaults in model, but explicit is fine)
      usage: {
          groupsCreated: 0,
          resourcesGenerated: 0,
          activitiesGenerated: 0
      }
    };

    if (tipo_usuario === 'Docente' && telefono) {
      userData.telefono = telefono.trim();
    }

    // If the user is a Docente, assign the default Free plan
    if (tipo_usuario === 'Docente') {
      const defaultPlan = await Plan.findOne({ isDefaultFree: true, isActive: true });
      if (!defaultPlan) {
        // This is a server configuration issue, should not ideally happen if plans are set up
        console.error('Error Crítico: No se encontró un plan gratuito predeterminado activo para asignar a nuevos docentes.');
        return res.status(500).json({ message: 'Error al configurar la cuenta del docente. Por favor, contacte al administrador.' });
      }
      userData.planId = defaultPlan._id;
      // Set subscriptionEndDate based on plan's duration
      if (defaultPlan.duration === 'indefinite') {
        userData.subscriptionEndDate = null; // Or a very far future date if preferred
      } else {
        // For fixed duration free plans (e.g., a trial period)
        let endDate = new Date();
        if (defaultPlan.duration === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (defaultPlan.duration === 'quarterly') {
          endDate.setMonth(endDate.getMonth() + 3);
        } else if (defaultPlan.duration === 'annual') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        userData.subscriptionEndDate = endDate;
      }
    }

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
      if (user.tipo_usuario === 'Docente') {
        responseUser.telefono = user.telefono;
        responseUser.planId = user.planId; // Include planId in response for newly registered teacher
        responseUser.subscriptionEndDate = user.subscriptionEndDate;
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
    // Populate plan details if user is a Docente
    let userQuery = User.findOne({ email });
    // We need to decide if we populate plan details here or in 'getMe'
    // For login, it's good to send essential plan info like plan name and limits
    // Let's populate planId for Docente type users.
    // Note: UserModel does not automatically populate planId. We need to explicitly do it.
    // However, we need to know the user type first. So, first find the user.

    const user = await User.findOne({ email }).select('+contrasena_hash'); // Include password for comparison

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Now that we have the user, if they are a Docente, fetch their plan details
    // It's often better to do this in a separate query if not all users have plans,
    // or if plan details are extensive. For now, let's fetch it.
    let planDetails = null;
    if (user.tipo_usuario === 'Docente' && user.planId) {
        planDetails = await Plan.findById(user.planId).lean(); // .lean() for plain JS object
    }

    if (!user.activo) {
      // Consider if this message should be more generic like "Credenciales inválidas"
      // to prevent account status enumeration. For now, keeping it specific.
      return res.status(401).json({ message: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
    }
    if (user.tipo_usuario === 'Docente' && !user.aprobado) {
      return res.status(401).json({ message: 'Tu cuenta de docente aún no ha sido aprobada. Por favor, espera la aprobación o contacta al administrador.' });
    }

    // Check subscription for teachers
    if (user.tipo_usuario === 'Docente') {
        if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
            return res.status(401).json({ message: 'Tu suscripción ha expirado. Por favor, renueva tu plan o contacta al administrador.' });
        }
        // Also, ensure the plan itself is active
        if (planDetails && !planDetails.isActive) {
            return res.status(401).json({ message: 'Tu plan actual no está activo. Por favor, contacta al administrador.' });
        }
         if (!planDetails && user.planId) { // User has a planId but it couldn't be found/populated
            console.warn(`Usuario Docente ${user.email} tiene planId ${user.planId} pero no se encontró el plan.`);
            return res.status(401).json({ message: 'Error al cargar los detalles de tu plan. Contacta al administrador.' });
        }
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { _id: user._id, tipo_usuario: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = {
      _id: user._id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      token: token,
    };

    if (user.tipo_usuario === 'Docente') {
      userResponse.plan = planDetails; // Send the whole plan object
      userResponse.subscriptionEndDate = user.subscriptionEndDate;
      userResponse.usage = user.usage; // Send current usage stats
    }

    res.status(200).json(userResponse);

  } catch (error) {
    console.error('Error en el login de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al iniciar sesión' });
  }
};

// @desc    Obtener datos del usuario autenticado
// @route   GET /api/auth/me
// Acceso:  Privado (manejado por el middleware 'protect')
const getMe = async (req, res) => {
  try {
    // req.user is already populated by the 'protect' middleware.
    // We need to re-fetch or populate plan details if it's a teacher.
    // The user object from 'protect' middleware might not have plan details populated.

    const userFromDb = await User.findById(req.user._id).lean(); // Use .lean()
    if (!userFromDb) {
        // Should not happen if protect middleware worked correctly
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    let planDetails = null;
    if (userFromDb.tipo_usuario === 'Docente' && userFromDb.planId) {
        planDetails = await Plan.findById(userFromDb.planId).lean();
    }

    // Construct a safe user object to return
    const safeUser = {
      _id: userFromDb._id,
      nombre: userFromDb.nombre,
      apellidos: userFromDb.apellidos,
      email: userFromDb.email,
      tipo_usuario: userFromDb.tipo_usuario,
      aprobado: userFromDb.aprobado,
      activo: userFromDb.activo,
      // Add institution, phone etc. if they are needed by the frontend 'me' context
      institucion: userFromDb.institucion,
      telefono: userFromDb.telefono,
      fecha_registro: userFromDb.fecha_registro,
    };

    if (userFromDb.tipo_usuario === 'Docente') {
      safeUser.plan = planDetails;
      safeUser.subscriptionEndDate = userFromDb.subscriptionEndDate;
      safeUser.usage = userFromDb.usage;
      // If planDetails were not found but planId exists, you might want to signal this
      if (userFromDb.planId && !planDetails) {
        console.warn(`getMe: Usuario Docente ${userFromDb.email} tiene planId ${userFromDb.planId} pero no se encontró el plan.`);
        // Optionally, include planId directly if plan object isn't available
        safeUser.planId = userFromDb.planId;
      }
    }

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