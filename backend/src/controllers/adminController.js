// src/controllers/adminController.js

const User = require('../models/UserModel'); // Necesitamos el modelo de Usuario para gestionar usuarios
const mongoose = require('mongoose'); // Para validar ObjectIds

// @desc    Obtener la lista de docentes pendientes de aprobación
// @route   GET /api/admin/users/docentes/pending
// @access  Privado/Admin
const getPendingDocentes = async (req, res) => {
    try {
        // Busca usuarios que son de tipo 'Docente' y cuyo campo 'aprobado' es false
        const pendingDocentes = await User.find({ tipo_usuario: 'Docente', aprobado: false }).select('-contrasena_hash'); // Excluye el hash de la contraseña por seguridad

        res.status(200).json(pendingDocentes); // Responde con la lista de docentes pendientes

    } catch (error) {
        console.error('Error al obtener docentes pendientes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener docentes pendientes', error: error.message });
    }
};

// @desc    Aprobar el registro de un docente
// @route   PUT /api/admin/users/docentes/:userId/approve
// @access  Privado/Admin
const approveDocente = async (req, res) => {
    const { userId } = req.params; // Obtiene el ID del usuario a aprobar de los parámetros de la URL

    // Validación básica del ID de usuario
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
        // Busca el usuario por ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verifica que el usuario encontrado sea un docente y que aún no esté aprobado
        if (user.tipo_usuario !== 'Docente') {
             return res.status(400).json({ message: 'Este usuario no es un docente' });
        }
        if (user.aprobado) {
             return res.status(400).json({ message: 'Este docente ya ha sido aprobado' });
        }

        // Si es un docente pendiente, lo aprueba
        user.aprobado = true;
        await user.save(); // Guarda los cambios en la base de datos

        res.status(200).json({
            message: 'Docente aprobado exitosamente',
            // Convierte el documento Mongoose a objeto JS y omite contrasena_hash
            user: (({ contrasena_hash, ...rest }) => rest)(user.toObject())
        });

    } catch (error) {
        console.error('Error al aprobar docente:', error);
        res.status(500).json({ message: 'Error interno del servidor al aprobar docente', error: error.message });
    }
};

// @desc    Obtener la lista completa de todos los usuarios del sistema CON PAGINACIÓN
// @route   GET /api/admin/users
// @access  Privado/Admin
// Soporta filtrado por tipo_usuario mediante query parameters (ej: ?tipo_usuario=Estudiante)
// SOPORTA PAGINACIÓN: ?page=1&limit=10
// SOPORTA ORDENAMIENTO (Opcional): &sortBy=email&sortOrder=asc
const getAllUsers = async (req, res) => {
    // Obtenemos los query parameters de la URL, incluyendo filtro, paginación y ordenamiento
    const { tipo_usuario, page, limit, sortBy, sortOrder } = req.query;

    // --- Configurar Filtro ---
    const filter = {}; // Objeto para construir el filtro de la consulta a la BD
    if (tipo_usuario) {
        // Si se proporcionó tipo_usuario en la URL, lo añade al filtro
        // Asegurarte de que el tipo_usuario proporcionado sea válido (Estudiante, Docente, Administrador) es una buena validación adicional aquí.
        filter.tipo_usuario = tipo_usuario;
    }
    // --- Fin Configurar Filtro ---


    // --- Parámetros de Paginación ---
    // Convierte page y limit a números. Usa parseInt(..., 10) para asegurar base 10.
    // Usa valores por defecto si no se proporcionan o si son inválidos.
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    // Validar que page y limit sean números positivos válidos
    if (pageNumber <= 0 || limitNumber <= 0) {
         return res.status(400).json({ message: 'Los parámetros page y limit deben ser números positivos.' });
    }

    // Calcula cuántos documentos saltar para la página solicitada
    const skip = (pageNumber - 1) * limitNumber;
    // --- Fin Parámetros de Paginación ---


    // --- Parámetros de Ordenamiento (Opcional - Puedes expandirlo) ---
    // Define el campo por defecto y el orden por defecto (ej: por fecha de creación, por email, por nombre)
    const sortField = sortBy || 'createdAt'; // Puedes cambiar 'createdAt' por otro campo por defecto
    const sortOrderValue = sortOrder === 'desc' ? -1 : 1; // -1 para descendente, 1 para ascendente
    const sort = { [sortField]: sortOrderValue }; // Objeto de ordenamiento para Mongoose (ej: { email: 1 })
    // --- Fin Parámetros de Ordenamiento ---


    try {
        // --- Obtener el número total de usuarios que coinciden CON EL FILTRO ---
        // Esto es crucial para calcular el total de páginas correctamente para el conjunto filtrado.
        const totalUsers = await User.countDocuments(filter);

        // --- Obtener los usuarios para la página actual, aplicando filtro, paginación y ordenamiento ---
        // Usa User.find() con el filtro, aplica .sort(), .skip() y .limit()
        // Excluye el hash de la contraseña por seguridad
        const users = await User.find(filter) // Aplica el filtro (por tipo_usuario si existe)
                               .sort(sort) // Aplica el ordenamiento
                               .skip(skip) // Salta los documentos de páginas anteriores
                               .limit(limitNumber) // Limita el número de documentos a obtener
                               .select('-contrasena_hash'); // Excluye el hash de la contraseña

        // --- Calcular metadatos de paginación ---
        const totalPages = Math.ceil(totalUsers / limitNumber); // Redondea hacia arriba
        const hasNextPage = pageNumber < totalPages; // ¿Hay una página después de la actual?
        const hasPrevPage = pageNumber > 1; // ¿Hay una página antes de la actual?
        const nextPage = hasNextPage ? pageNumber + 1 : null; // Número de la siguiente página o null
        const prevPage = hasPrevPage ? pageNumber - 1 : null; // Número de la página anterior o null


        // --- Responder con los datos paginados y los metadatos ---
        res.status(200).json({
            data: users, // El array de usuarios para la página actual
            pagination: {
                totalItems: totalUsers, // Número total de ítems que coinciden con el filtro
                currentPage: pageNumber, // Número de la página que se devuelve
                itemsPerPage: limitNumber, // Número máximo de ítems por página
                totalPages: totalPages, // Número total de páginas para el conjunto filtrado
                hasNextPage: hasNextPage, // Booleano
                hasPrevPage: hasPrevPage, // Booleano
                nextPage: nextPage, // Número o null
                prevPage: prevPage // Número o null
            }
        });

    } catch (error) {
        // Manejo de errores generales
        console.error('Error al obtener todos los usuarios (paginado):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuarios paginados', error: error.message });
    }
};

// @desc    Obtener los detalles de un usuario específico por ID
// @route   GET /api/admin/users/:userId
// @access  Privado/Admin
const getUserById = async (req, res) => {
    const { userId } = req.params; // Obtiene el ID del usuario de los parámetros de la URL

     // Validación básica del ID de usuario
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
        // Busca el usuario por ID, excluye el hash de contraseña
        const user = await User.findById(userId).select('-contrasena_hash');

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(
            // Convierte el documento Mongoose a objeto JS y omite contrasena_hash
            (({ contrasena_hash, ...rest }) => rest)(user.toObject())
        );

    } catch (error) {
        console.error('Error al obtener usuario por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuario por ID', error: error.message });
    }
};

// @desc    Activar o desactivar la cuenta de un usuario
// @route   PUT /api/admin/users/:userId/status
// @access  Privado/Admin
const updateUserStatus = async (req, res) => {
    const { userId } = req.params; // Obtiene el ID del usuario de la URL
    const { isActive } = req.body; // Obtiene el estado deseado (verdadero/falso) del cuerpo de la petición

    // Validación básica del ID de usuario y del estado proporcionado
     if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    if (isActive === undefined || typeof isActive !== 'boolean') { // isActive debe ser un booleano
         return res.status(400).json({ message: 'El estado "isActive" es obligatorio y debe ser verdadero o falso' });
    }


    try {
        // Busca el usuario por ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // --- Salvaguardas para cuentas de administrador ---
        // Opcional pero recomendado: Evitar que un admin se desactive a sí mismo
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'No autenticado o usuario no válido' });
        }
        if (user._id.equals(req.user._id)) {
            return res.status(400).json({ message: 'No puedes cambiar el estado de tu propia cuenta de administrador' });
        }
         // Opcional: Evitar que un admin cambie el estado de otras cuentas de admin
        if (user.tipo_usuario === 'Administrador') {
             return res.status(403).json({ message: 'No tienes permiso para cambiar el estado de otras cuentas de administrador' });
        }
        // --- Fin Salvaguardas ---


        // Actualiza el estado 'activo' del usuario
        user.activo = isActive;
        await user.save(); // Guarda los cambios

        // Responde con un mensaje de éxito y los datos del usuario actualizado (sin contraseña)
        res.status(200).json({
            message: `Estado del usuario ${user.email} actualizado a ${isActive ? 'activo' : 'inactivo'}`,
            // Convierte el documento Mongoose a objeto JS, luego usa desestructuración para omitir contrasena_hash
            user: (({ contrasena_hash, ...rest }) => rest)(user.toObject())
        });

    } catch (error) {
         // Manejo de errores generales (ej: base de datos)
         if (error.name === 'ValidationError') { // Poco probable para un simple cambio booleano, pero buena práctica
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar estado del usuario', errors: messages });
        }
        console.error('Error actualizando estado de usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar estado del usuario', error: error.message });
    }
};


module.exports = {
    getPendingDocentes,
    approveDocente,
    getAllUsers,
    getUserById,
    updateUserStatus
};