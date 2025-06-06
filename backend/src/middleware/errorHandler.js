// backend/src/middleware/errorHandler.js

/**
 * Middleware de manejo de errores global.
 * Este middleware debe ser el último middleware que se añade a la app.
 */
const errorHandler = (err, req, res, next) => {
  // Loguea el error completo en el servidor para depuración, independientemente del entorno.
  // En un entorno de producción real, considera usar un logger más robusto (Winston, Pino, etc.)
  console.error('-------------------- ERROR DETECTADO --------------------');
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Ruta: ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.error('Body:', JSON.stringify(req.body, null, 2)); // Cuidado con datos sensibles en logs
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.error('Params:', JSON.stringify(req.params, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.error('Query:', JSON.stringify(req.query, null, 2));
  }
  console.error('Error:', err);
  if (err.stack) {
    console.error('Stacktrace:', err.stack);
  }
  console.error('------------------ FIN ERROR DETECTADO ------------------');

  const statusCode = err.statusCode || 500;
  const publicErrorMessage = 'Ocurrió un error inesperado en el servidor. Por favor, inténtalo de nuevo más tarde.';

  if (process.env.NODE_ENV === 'production') {
    // En producción, no envíes detalles del error al cliente
    res.status(statusCode).json({
      status: 'error',
      statusCode: statusCode,
      message: err.isOperational ? err.message : publicErrorMessage,
      // No incluir err.stack o detalles internos en producción
    });
  } else {
    // En desarrollo, envía más detalles para facilitar la depuración
    res.status(statusCode).json({
      status: 'error',
      statusCode: statusCode,
      message: err.message || publicErrorMessage,
      error: { ...err }, // Envía el objeto de error completo
      stack: err.stack, // Y el stack trace
    });
  }
};

module.exports = errorHandler;
