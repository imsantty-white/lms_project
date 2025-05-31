// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const SubscriptionService = require('../services/SubscriptionService'); // <--- ADD THIS LINE


const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verifica el token y obtiene el payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Busca el usuario y verifica que esté activo y aprobado
      // Fetch user, excluding password hash
      // It's important to select planId here if we want to avoid another DB call in SubscriptionService sometimes,
      // but SubscriptionService is designed to fetch the user anyway for a full check.
      req.user = await User.findById(decoded._id).select('-contrasena_hash');

      if (!req.user) {
        console.error('Authentication failed: User not found for token ID.');
        return res.status(401).json({ message: 'No autorizado, usuario del token no encontrado' });
      }

      if (!req.user.activo) {
        return res.status(403).json({ message: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
      }
      if (req.user.tipo_usuario === 'Docente' && !req.user.aprobado) {
        return res.status(403).json({ message: 'Tu cuenta de docente aún no ha sido aprobada.' });
      }

      // --- BEGIN SUBSCRIPTION CHECK FOR DOCENTES ---
      if (req.user.tipo_usuario === 'Docente') {
        const subscription = await SubscriptionService.checkSubscriptionStatus(req.user._id);
        if (!subscription.isActive) {
          // Log the reason for subscription check failure for admin review if necessary
          console.warn(`Subscription check failed for Docente ${req.user.email} (${req.user._id}): ${subscription.message}`);
          // Return a generic message or the specific one from the service
          return res.status(403).json({ message: subscription.message || 'Tu suscripción no está activa o ha expirado. Por favor, verifica tu plan.' });
        }
        // Optionally, attach plan details to req.user if not already there and needed by subsequent controllers/services
        // req.user.plan = subscription.plan; // Note: user.planId is already on req.user if populated
      }
      // --- END SUBSCRIPTION CHECK FOR DOCENTES ---

      next();

    } catch (error) {
      console.error('Error en el middleware de autenticación:', error.message);
      // Handle specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'No autorizado, token inválido.' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'No autorizado, el token ha expirado.' });
      }
      // Generic fallback for other errors during token processing or user fetching
      return res.status(401).json({ message: 'No autorizado, problema con el token.' });
    }
  } else {
    return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
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