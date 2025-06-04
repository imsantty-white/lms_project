// backend/src/middleware/errorHandler.js

// Función para enviar errores en desarrollo (con más detalles)
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err, // Puede ser útil enviar el objeto de error completo en desarrollo
        message: err.message,
        stack: err.stack,
    });
};

// Función para enviar errores en producción (más genéricos)
const sendErrorProd = (err, res) => {
    // Errores operacionales, de confianza: enviar mensaje al cliente
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    // Errores de programación u otros errores desconocidos: no filtrar detalles al cliente
    } else {
        // 1) Loguear el error (importante para el desarrollador)
        console.error('ERROR 💥:', err);

        // 2) Enviar un mensaje genérico
        res.status(500).json({
            status: 'error',
            message: 'Algo salió muy mal!',
        });
    }
};

// Middleware de manejo de errores global
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Hacemos una copia profunda del error para poder modificarlo
    // Es importante copiar también `message` ya que no es enumerable en todos los errores
    let error = { ...err, message: err.message, name: err.name, code: err.code, errors: err.errors, isOperational: err.isOperational || false };

    if (process.env.NODE_ENV === 'development') {
        // Errores específicos de Mongoose en desarrollo (pueden ser más detallados aquí)
        if (error.name === 'CastError') {
            const message = `Valor inválido ${error.path}: ${error.value}. No es un ID válido.`;
            // Podríamos crear una clase de error personalizada que herede de Error y tenga isOperational = true
            // Por ahora, lo manejamos directamente.
            error = { ...error, statusCode: 400, message: message, isOperational: true };
        }
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(el => el.message);
            const message = `Datos de entrada inválidos. ${errors.join('. ')}`;
            error = { ...error, statusCode: 400, message: message, isOperational: true };
        }
        if (error.code === 11000) {
            // Extraer el valor del campo duplicado del mensaje de error (puede variar según el driver de MongoDB)
            // Ejemplo simple:
            const value = error.message.match(/(["'])(\?.)*?/)?.[0] || "desconocido";
            const message = `Valor de campo duplicado: ${value}. Por favor, usa otro valor.`;
            error = { ...error, statusCode: 400, message: message, isOperational: true };
        }

        sendErrorDev(error, res);

    } else if (process.env.NODE_ENV === 'production') {
        // Errores específicos de Mongoose en producción (más genéricos para el cliente)
        if (error.name === 'CastError') {
            const message = `Recurso no encontrado. ID inválido.`;
            error = { ...error, statusCode: 404, message: message, isOperational: true }; // Cambiado a 404 para CastError en prod
        }
        if (error.name === 'ValidationError') {
            // Para producción, un mensaje más genérico sobre validación puede ser suficiente
            // o podrías optar por enviar los mensajes específicos si no revelan lógica interna.
            const errors = Object.values(error.errors).map(el => el.message);
            const message = `Datos de entrada inválidos: ${errors.join('. ')}`;
            error = { ...error, statusCode: 400, message: message, isOperational: true };
        }
        if (error.code === 11000) {
            const message = `Algunos datos ingresados ya existen. Por favor, verifica la información.`;
            error = { ...error, statusCode: 400, message: message, isOperational: true };
        }
        // Otros errores comunes que podrían ser operacionales:
        // if (error.name === 'JsonWebTokenError') error = handleJWTError(error); // Necesitarías una función handleJWTError
        // if (error.name === 'TokenExpiredError') error = handleJWTExpiredError(error); // Necesitarías una función handleJWTExpiredError

        sendErrorProd(error, res);
    }
};

module.exports = globalErrorHandler;
```
