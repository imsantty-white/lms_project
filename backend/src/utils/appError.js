// backend/src/utils/appError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Llama al constructor de la clase padre (Error)

    this.statusCode = statusCode;
    // Determina el 'status' basado en el statusCode (fail para 4xx, error para 5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // Los errores creados con esta clase son operacionales (confiables)
    this.isOperational = true;

    // Captura el stack trace, excluyendo el constructor de AppError de él
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
