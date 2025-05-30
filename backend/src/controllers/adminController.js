// src/controllers/adminController.js

const User = require('../models/UserModel'); // Necesitamos el modelo de Usuario para gestionar usuarios
const Group = require('../models/GroupModel'); // Necesitamos el modelo de Grupo para gestionar grupos
const Membership = require('../models/MembershipModel'); // Necesitamos el modelo de Membresía para contar miembros
const mongoose = require('mongoose'); // Para validar ObjectIds
const NotificationService = require('../services/NotificationService');
const ContactMessage = require('../models/ContactMessageModel'); // Importar el modelo de mensajes de contacto

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
    const { tipo_usuario, page, limit, sortBy, sortOrder, searchNombre, searchEmail } = req.query;

    // --- Configurar Filtro ---
    const filter = {}; // Objeto para construir el filtro de la consulta a la BD
    if (tipo_usuario) {
        filter.tipo_usuario = tipo_usuario;
    }
    if (searchNombre) {
        filter.$or = [
            { nombre: { $regex: searchNombre, $options: 'i' } },
            { apellidos: { $regex: searchNombre, $options: 'i' } }
        ];
    }
    if (searchEmail) {
        // Si ya hay una condición $or por searchNombre, añadimos el email al $and implícito.
        // Si no, simplemente añadimos la condición de email.
        // Para asegurar que searchEmail no entre en conflicto con $or si ambos están presentes y se quiere que email sea una condición separada:
        // Si filter.$or existe, y queremos que email sea una condición AND, mongoose lo maneja bien.
        // Si searchNombre y searchEmail deben ser parte de un $or más grande, la estructura del filtro necesitaría cambiar.
        // Por ahora, asumimos que son condiciones AND (o la única condición si $or no está).
        filter.email = { $regex: searchEmail, $options: 'i' };
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
        let query = User.find(filter)
                        .sort(sort)
                        .skip(skip)
                        .limit(limitNumber)
                        .select('-contrasena_hash')
                        .lean(); // Usar .lean() para obtener objetos planos

        // Condicionalmente poblar grupo_id para Estudiantes
        // Esto es un poco general; si tipo_usuario es específicamente 'Estudiante', siempre poblamos.
        // Si tipo_usuario no está definido (todos los tipos), también poblamos por si hay estudiantes.
        if (!tipo_usuario || tipo_usuario === 'Estudiante') {
            query = query.populate({ path: 'grupo_id', select: 'nombre' });
        }

        const users = await query;

        // Procesar usuarios para añadir detalles adicionales
        const usersWithDetails = await Promise.all(users.map(async (user) => {
            if (user.tipo_usuario === 'Estudiante') {
                if (user.grupo_id && user.grupo_id.nombre) {
                    user.nombre_grupo = user.grupo_id.nombre;
                } else {
                    user.nombre_grupo = 'No asignado';
                }
                // No es necesario eliminar user.grupo_id si se usa .lean() y se puebla selectivamente,
                // pero si se quiere una respuesta más limpia, se puede hacer:
                // delete user.grupo_id; // Eliminar el objeto grupo_id original si solo se quiere nombre_grupo
            }

            if (user.tipo_usuario === 'Docente') {
                const groupCount = await Group.countDocuments({ docente_id: user._id });
                user.numero_grupos_asignados = groupCount;
            }
            return user;
        }));

        // --- Calcular metadatos de paginación ---
        const totalPages = Math.ceil(totalUsers / limitNumber); // Redondea hacia arriba
        const hasNextPage = pageNumber < totalPages; // ¿Hay una página después de la actual?
        const hasPrevPage = pageNumber > 1; // ¿Hay una página antes de la actual?
        const nextPage = hasNextPage ? pageNumber + 1 : null; // Número de la siguiente página o null
        const prevPage = hasPrevPage ? pageNumber - 1 : null; // Número de la página anterior o null


        // --- Responder con los datos paginados y los metadatos ---
        res.status(200).json({
            data: usersWithDetails, // El array de usuarios para la página actual
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


// @desc    Obtener la lista completa de todos los grupos (para Admin) CON PAGINACIÓN Y FILTRADO
// @route   GET /api/admin/groups
// @access  Privado/Admin
const getAllGroupsForAdmin = async (req, res) => {
    const { page, limit, searchNombreGrupo, searchNombreDocente, sortBy, sortOrder } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    if (pageNumber <= 0 || limitNumber <= 0) {
        return res.status(400).json({ message: 'Los parámetros page y limit deben ser números positivos.' });
    }

    const filter = {};
    if (searchNombreGrupo) {
        filter.nombre = { $regex: searchNombreGrupo, $options: 'i' };
    }

    try {
        if (searchNombreDocente) {
            const teachers = await User.find({
                $or: [
                    { nombre: { $regex: searchNombreDocente, $options: 'i' } },
                    { apellidos: { $regex: searchNombreDocente, $options: 'i' } }
                ]
            }).select('_id').lean();

            if (teachers.length > 0) {
                filter.docente_id = { $in: teachers.map(t => t._id) };
            } else {
                // Si no se encuentran docentes, ningún grupo coincidirá.
                filter.docente_id = { $in: [] }; // Mongoose maneja esto devolviendo 0 resultados.
            }
        }

        const totalGroups = await Group.countDocuments(filter);

        const sortField = sortBy || 'nombre'; // Default sort by group name
        const sortOrderValue = sortOrder === 'desc' ? -1 : 1;
        const sort = { [sortField]: sortOrderValue };

        const groups = await Group.find(filter)
            .populate('docente_id', 'nombre apellidos email')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const groupsWithDetails = await Promise.all(
            groups.map(async (group) => {
                const approvedMemberCount = await Membership.countDocuments({
                    grupo_id: group._id,
                    estado_solicitud: 'Aprobado',
                });
                let daysArchived = null;
                if (group.activo === false && group.archivedAt) {
                    const now = new Date();
                    const archivedDate = new Date(group.archivedAt);
                    if (!isNaN(archivedDate.getTime())) {
                        daysArchived = Math.floor((now - archivedDate) / (1000 * 60 * 60 * 24));
                    } else {
                        console.warn(`Fecha 'archivedAt' inválida para el grupo ID: ${group._id}`);
                    }
                }
                return {
                    ...group,
                    approvedMemberCount,
                    daysArchived,
                };
            })
        );

        const totalPages = Math.ceil(totalGroups / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.status(200).json({
            data: groupsWithDetails,
            pagination: {
                totalItems: totalGroups,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: hasNextPage ? pageNumber + 1 : null,
                prevPage: hasPrevPage ? pageNumber - 1 : null,
            },
        });
    } catch (error) {
        console.error('Error al obtener todos los grupos para admin:', error);
        res.status(500).json({
            message: 'Error interno del servidor al obtener los grupos.',
            error: error.message,
        });
    }
};

// @desc    Eliminar permanentemente un grupo (Admin)
// @route   DELETE /api/admin/groups/:groupId
// @access  Privado/Admin
const deleteGroupAsAdmin = async (req, res) => {
    const { groupId } = req.params;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ success: false, message: 'ID de grupo inválido.' });
    }

    try {
        const group = await Group.findById(groupId);

        // Verificar si el grupo existe
        if (!group) {
            return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
        }

        // Verificar condiciones de eliminación
        if (group.activo === true) {
            return res.status(400).json({
                success: false,
                message: 'El grupo no está archivado y no puede ser eliminado permanentemente.',
            });
        }

        if (!group.archivedAt) {
            return res.status(400).json({
                success: false,
                message: 'El grupo no tiene fecha de archivación, no se puede determinar la elegibilidad para eliminación.',
            });
        }

        const daysArchived = Math.floor((new Date() - new Date(group.archivedAt)) / (1000 * 60 * 60 * 24));

        if (daysArchived <= 15) {
            return res.status(403).json({ // 403 Forbidden
                success: false,
                message: `El grupo debe estar archivado por más de 15 días para ser eliminado permanentemente. Actualmente: ${daysArchived} días.`,
            });
        }

        // Iniciar una sesión de Mongoose para transacciones si es posible/necesario,
        // aunque para dos operaciones separadas podría no ser estrictamente necesario si la consistencia eventual es aceptable.
        // Para este caso, se procederá sin transacción explícita por simplicidad.

        // Eliminar membresías asociadas
        await Membership.deleteMany({ grupo_id: groupId });

        // Eliminar el grupo
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({
            success: true,
            message: 'Grupo eliminado permanentemente junto con sus membresías.',
        });

    } catch (error) {
        console.error('Error al eliminar grupo (admin):', error);
        if (error.name === 'CastError') { // Aunque ya validamos ObjectId, es buena práctica mantenerlo por si acaso
            return res.status(400).json({ success: false, message: 'ID de grupo con formato inválido.' });
        }
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar el grupo.',
            error: error.message,
        });
    }
};


// --- Nuevas Funciones ---

// @desc    Crear una notificación del sistema para audiencias específicas o usuarios individuales
// @route   POST /api/admin/notifications/system
// @access  Privado/Admin
async function createSystemNotification(req, res) {
    const { message, audience, recipient_id, link } = req.body;
    const sender_id = req.user?._id; // El admin que crea la notificación

    if (!sender_id) {
        return res.status(401).json({ message: 'Acción no autorizada. Se requiere autenticación de administrador.' });
    }

    if (!message || !audience) {
        return res.status(400).json({ message: 'Los campos "message" y "audience" son obligatorios.' });
    }

    const validAudiences = ['todos', 'docentes', 'estudiantes', 'usuario_especifico'];
    if (!validAudiences.includes(audience)) {
        return res.status(400).json({ message: `Valor de "audience" no válido. Debe ser uno de: ${validAudiences.join(', ')}.` });
    }

    if (audience === 'usuario_especifico' && !recipient_id) {
        return res.status(400).json({ message: 'El campo "recipient_id" es obligatorio cuando la audiencia es "usuario_especifico".' });
    }
    if (audience === 'usuario_especifico' && !mongoose.Types.ObjectId.isValid(recipient_id)) {
        return res.status(400).json({ message: 'El "recipient_id" proporcionado no es un ID de usuario válido.' });
    }

    try {
        // NotificationService ya está importado en la parte superior del archivo.
        let notificationCount = 0;
        let notificationType = 'GENERAL_INFO'; // Default, será sobreescrito

        if (audience === 'usuario_especifico') {
            const user = await User.findById(recipient_id);
            if (!user) {
                return res.status(404).json({ message: `Usuario con ID "${recipient_id}" no encontrado.` });
            }

            notificationType = 'NOTIFICACION_SISTEMA_INDIVIDUAL';
            await NotificationService.createNotification({
                recipient: user._id,
                sender: sender_id,
                type: notificationType,
                message,
                link: link || undefined,
            });
            notificationCount = 1;
        } else {
            let userFilter = {};
            switch (audience) {
                case 'todos':
                    userFilter = {}; // No es necesario, pero para claridad
                    notificationType = 'NOTIFICACION_SISTEMA_GENERAL';
                    break;
                case 'docentes':
                    userFilter = { tipo_usuario: 'Docente' };
                    notificationType = 'NOTIFICACION_SISTEMA_DOCENTES';
                    break;
                case 'estudiantes':
                    userFilter = { tipo_usuario: 'Estudiante' };
                    notificationType = 'NOTIFICACION_SISTEMA_ESTUDIANTES';
                    break;
            }

            const usersToNotify = await User.find(userFilter).select('_id').lean();
            if (usersToNotify.length === 0) {
                return res.status(404).json({ message: `No se encontraron usuarios para la audiencia "${audience}".` });
            }

            for (const user of usersToNotify) {
                await NotificationService.createNotification({
                    recipient: user._id,
                    sender: sender_id,
                    type: notificationType,
                    message,
                    link: link || undefined,
                });
            }
            notificationCount = usersToNotify.length;
        }

        res.status(201).json({
            success: true,
            message: `Notificación enviada exitosamente a ${notificationCount} usuario(s) de la audiencia "${audience}".`,
            type: notificationType
        });

    } catch (error) {
        console.error('Error al crear notificación del sistema:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la notificación del sistema.', error: error.message });
    }
}

// @desc    Obtener reportes de soporte técnico (Placeholder)
// @route   GET /api/admin/reports/technical-support
// @access  Privado/Admin
async function getTechnicalSupportReports(req, res) {
    res.status(200).json({ message: "Función para obtener reportes de soporte técnico aún no implementada.", data: [] });
}

// @desc    Obtener quejas y reclamos (Placeholder)
// @route   GET /api/admin/reports/complaints
// @access  Privado/Admin
async function getComplaintsAndClaims(req, res) {
    res.status(200).json({ message: "Función para obtener quejas y reclamos aún no implementada.", data: [] });
}

// @desc    Obtener mensajes de contacto para el administrador (Placeholder)
// @route   GET /api/admin/contact-messages
// @access  Privado/Admin
async function getAdminContactMessages(req, res) {
    const { page, limit, isResolved, sortBy, sortOrder } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};
    if (isResolved !== undefined) {
        // Asegurarse de que isResolved sea un booleano. 'true' string a true, cualquier otra cosa a false.
        filter.isResolved = (isResolved === 'true');
    }

    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1; // DESC por defecto para ver los más nuevos primero
    const sort = { [sortField]: sortDirection };

    try {
        const totalMessages = await ContactMessage.countDocuments(filter);

        const messages = await ContactMessage.find(filter)
            .populate('userId', 'nombre apellidos email') // Popula quien envió el mensaje si es usuario registrado
            .sort(sort)
            .skip(skip)
            .limit(limitNumber)
            .lean(); // .lean() para obtener objetos JS planos y mejorar rendimiento

        const totalPages = Math.ceil(totalMessages / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.status(200).json({
            success: true,
            data: messages,
            pagination: {
                totalItems: totalMessages,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: hasNextPage ? pageNumber + 1 : null,
                prevPage: hasPrevPage ? pageNumber - 1 : null,
            }
        });
    } catch (error) {
        console.error('Error al obtener mensajes de contacto para el admin:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al obtener los mensajes de contacto.', 
            error: error.message 
        });
    }
}

// @desc    Obtener estadísticas generales del sistema
// @route   GET /api/admin/statistics
// @access  Privado/Admin
async function getSystemStatistics(req, res) {
    try {
        const totalUsers = await User.countDocuments({});
        const totalTeachers = await User.countDocuments({ tipo_usuario: 'Docente' });
        const totalStudents = await User.countDocuments({ tipo_usuario: 'Estudiante' });
        const activeGroups = await Group.countDocuments({ activo: true });
        const pendingTeacherApprovals = await User.countDocuments({ tipo_usuario: 'Docente', aprobado: false });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalTeachers,
                totalStudents,
                activeGroups,
                pendingTeacherApprovals,
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del sistema:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener estadísticas.', error: error.message });
    }
}

// @desc    Marcar un mensaje de contacto como resuelto o no resuelto
// @route   PUT /api/admin/contact-messages/:messageId/resolve
// @access  Privado/Admin
async function markMessageAsResolved(req, res) {
    const { messageId } = req.params;
    // Opcionalmente, podrías permitir cambiar el estado a no resuelto también.
    // const { isResolved } = req.body; // Si quieres que sea más flexible (true/false)
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ success: false, message: 'ID de mensaje inválido.' });
    }

    try {
        const message = await ContactMessage.findById(messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: 'Mensaje de contacto no encontrado.' });
        }

        // Cambiar el estado a resuelto. Si se quisiera poder alternar:
        // message.isResolved = typeof isResolved === 'boolean' ? isResolved : true;
        message.isResolved = true; 
        
        const updatedMessage = await message.save();

        // Poblar datos del usuario si existen, para devolver el objeto completo como en GET
        const populatedMessage = await ContactMessage.findById(updatedMessage._id)
            .populate('userId', 'nombre apellidos email')
            .lean();
            
        res.status(200).json({
            success: true,
            message: 'Estado del mensaje de contacto actualizado correctamente.',
            data: populatedMessage,
        });

    } catch (error) {
        console.error('Error al actualizar estado del mensaje de contacto:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al actualizar el estado del mensaje.', 
            error: error.message 
        });
    }
}


module.exports = {
    getPendingDocentes,
    approveDocente,
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllGroupsForAdmin,
    deleteGroupAsAdmin,
    createSystemNotification, // Added
    getTechnicalSupportReports, // Added
    getComplaintsAndClaims, // Added
    getAdminContactMessages, // Added
    getSystemStatistics, // Added
    markMessageAsResolved // Added
};