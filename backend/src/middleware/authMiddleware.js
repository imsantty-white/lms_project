// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');


const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-contrasena_hash');

      if (!req.user) {
          // Si el usuario no se encuentra
          // No necesitamos lanzar un error aquí, simplemente enviamos la respuesta de error
          console.error('Authentication failed: User not found for token ID.');
          return res.status(401).json({ message: 'No autorizado, usuario del token no encontrado' }); // <-- Añadir return
      }

      // Si todo es correcto
      next();

    } catch (error) {
      // Si el token es inválido, expiró, o hay otro error de verificación/búsqueda
      console.error('Error en el middleware de autenticación:', error.message);
      return res.status(401).json({ message: 'No autorizado, token inválido o expirado' }); // <-- Añadir return
    }
  } else { // *** Añadir este else para manejar el caso donde NO hay encabezado Authorization ***
    // Si no hay token en el encabezado
    return res.status(401).json({ message: 'No autorizado, no se proporcionó token' }); // <-- Añadir return
  }

  // Ya no necesitamos el if (!token) fuera del try/catch,
  // porque el primer if con el `else` cubre todos los casos.
  // Si llegara aquí (lo cual no debería pasar con los returns), podríamos llamar a next(error) genérico.
  // Pero con los returns, la ejecución se detendrá antes de llegar aquí.
  // Si por alguna razón extraña llegara aquí, significa que ninguna de las condiciones anteriores se cumplió.
  // next(); // Si quisieras que continuara, pero es mejor detenerlo si no hay auth

};


// Middleware para autorizar acceso basado en roles (este estaba bien)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) { // *** Añadir esta verificación por si protect falló de manera inesperada antes de adjuntar req.user ***
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


module.exports = { protect, authorize };