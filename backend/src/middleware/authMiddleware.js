// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const SubscriptionService = require('../services/SubscriptionService');
const AppError = require('../utils/appError'); // Import AppError

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Populate planId when fetching the user
      req.user = await User.findById(decoded._id).select('-contrasena_hash').populate('planId');

      if (!req.user) {
        console.error('Authentication failed: User not found for token ID.');
        // Use AppError for consistency
        return next(new AppError('No autorizado, usuario del token no encontrado', 401));
      }

      if (!req.user.activo) {
        return next(new AppError('Tu cuenta ha sido desactivada. Contacta al administrador.', 403));
      }
      if (req.user.tipo_usuario === 'Docente' && !req.user.aprobado) {
        return next(new AppError('Tu cuenta de docente aún no ha sido aprobada.', 403));
      }

      if (req.user.tipo_usuario === 'Docente') {
        // Pass the preloaded req.user to checkSubscriptionStatus
        const subscription = await SubscriptionService.checkSubscriptionStatus(req.user._id, req.user);

        if (!subscription.isActive) {
          console.warn(`Subscription check failed for Docente ${req.user.email} (${req.user._id}): ${subscription.message}`);
          return next(new AppError(subscription.message || 'Tu suscripción no está activa o ha expirado. Por favor, verifica tu plan.', 403));
        }

        // Ensure req.user.planId has the plan object from the service if it's more up-to-date or correctly loaded
        // user.planId is already populated, this ensures it's the one validated by the service.
        if (subscription.plan) {
             req.user.planId = subscription.plan;
        }
        // Update subscriptionEndDate if the service might have changed it (e.g., reverted to a free plan)
        if (subscription.user && subscription.user.subscriptionEndDate !== undefined) {
            req.user.subscriptionEndDate = subscription.user.subscriptionEndDate;
            // Also update the local req.user's active status if the service changed it (e.g. plan expired and reverted to free)
            // This is important if other parts of the request lifecycle depend on req.user.activo directly after this middleware
            req.user.activo = subscription.user.activo;
        }
        // If the service could modify other user fields relevant to auth, update req.user fully:
        // if (subscription.user) {
        //   req.user = subscription.user; // This would overwrite req.user.planId if user object from service also has it.
        // }
      }
      next();

    } catch (error) {
      console.error('Error en el middleware de autenticación:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('No autorizado, token inválido.', 401));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('No autorizado, el token ha expirado.', 401));
      }
      return next(new AppError('No autorizado, problema con el token.', 401));
    }
  } else {
    return next(new AppError('No autorizado, no se proporcionó token.', 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('Authorization failed: req.user is not set before authorize middleware.');
      // This case should ideally be caught by 'protect' middleware first.
      return next(new AppError('Error de autenticación interno antes de verificar roles.', 500));
    }
    if (!roles.includes(req.user.tipo_usuario)) {
      console.error(`Authorization failed: User role ${req.user.tipo_usuario} not allowed.`);
      return next(new AppError(`Usuario con rol ${req.user.tipo_usuario} no autorizado para acceder a esta ruta`, 403));
    }
    next();
  };
};

const protectOptional = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Populate planId for optional user as well, in case it's a teacher
      const user = await User.findById(decoded._id).select('-contrasena_hash').populate('planId');

      if (user && user.activo) { // Only check for 'activo', 'aprobado' might be too strict for optional
        // For teachers, optionally check subscription status but don't block if inactive/expired.
        // This part is tricky: if a teacher's subscription is inactive, should they be treated as "not logged in"
        // for optional routes, or "logged in but with limited access"?
        // For simplicity here, if token is valid and user active, we set req.user.
        // Specific route handlers can then check subscription if they need to differentiate.
        if (user.tipo_usuario === 'Docente' && !user.aprobado) {
            // Do not set req.user if teacher is not approved
        } else {
            req.user = user;
             // Optionally, attach non-blocking subscription info if user is Docente
            if (user.tipo_usuario === 'Docente') {
                const subscription = await SubscriptionService.checkSubscriptionStatus(user._id, user);
                req.user.subscriptionStatus = subscription; // Attach full status for controller to decide
                if (subscription.user && subscription.user.subscriptionEndDate !== undefined) {
                    req.user.subscriptionEndDate = subscription.user.subscriptionEndDate;
                }
                 if (subscription.plan) {
                    req.user.planId = subscription.plan;
                }
            }
        }
      }
    } catch (error) {
      // Errors (invalid token, expired) are ignored, req.user remains undefined.
      // console.error('ProtectOptional: Error verifying token or fetching user:', error.message);
    }
  }
  next();
};

module.exports = { protect, authorize, protectOptional };
