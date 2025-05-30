// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');


const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verifica el token y obtiene el payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Busca el usuario y verifica que esté activo y aprobado
      req.user = await User.findById(decoded._id).select('-contrasena_hash');

      if (!req.user) {
        console.error('Authentication failed: User not found for token ID.');
        return res.status(401).json({ message: 'No autorizado, usuario del token no encontrado' });
      }

      // Validación adicional: usuario activo y aprobado
      if (!req.user.activo) {
        return res.status(403).json({ message: 'Cuenta desactivada. Contacta al administrador.' });
      }
      if (!req.user.aprobado) {
        return res.status(403).json({ message: 'Cuenta pendiente de aprobación.' });
      }

      next();

    } catch (error) {
      console.error('Error en el middleware de autenticación:', error.message);
      return res.status(401).json({ message: 'No autorizado, token inválido o expirado' });
    }
  } else {
    return res.status(401).json({ message: 'No autorizado, no se proporcionó token' });
  }
};


// Middleware para autorizar acceso basado en roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('Authorization failed: req.user is not set before authorize middleware.');
      return res.status(500).json({ message: 'Error de autenticación interno antes de verificar roles.' });
    }
    if (!roles.includes(req.user.tipo_usuario)) {
      console.error(`Authorization failed: User role ${req.user.tipo_usuario} not allowed.`);
      return res.status(403).json({ message: `Usuario con rol ${req.user.tipo_usuario} no autorizado para acceder a esta ruta` });
    } else {
      next();
    }
  };
};

// Middleware de autenticación opcional:
// Intenta autenticar al usuario si se proporciona un token,
// pero no falla si el token no está presente o no es válido.
// Simplemente establece req.user si la autenticación es exitosa.
const protectOptional = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Busca el usuario y verifica que esté activo y aprobado
      const user = await User.findById(decoded._id).select('-contrasena_hash');

      if (user && user.activo && user.aprobado) {
        req.user = user; // Establece req.user solo si el usuario es válido y está activo/aprobado
      } else {
        // Si el usuario no se encuentra, no está activo, o no está aprobado, no se establece req.user.
        // No se envía error, simplemente se procede sin usuario autenticado.
        // Puedes añadir un log aquí si es necesario para depuración.
        // console.log('ProtectOptional: User found but not active/approved, or token invalid.');
      }

    } catch (error) {
      // Si hay un error en la verificación del token (ej. inválido, expirado),
      // no se establece req.user y no se envía error.
      // console.error('ProtectOptional: Error verifying token:', error.message);
    }
  }
  // Si no hay token o si hubo un error/usuario no válido, simplemente llama a next()
  // req.user no estará definido o será null.
  next();
};


module.exports = { protect, authorize, protectOptional };