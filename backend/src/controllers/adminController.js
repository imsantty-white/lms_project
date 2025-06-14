// src/controllers/adminController.js

const User = require('../models/UserModel'); // Necesitamos el modelo de Usuario para gestionar usuarios
const Group = require('../models/GroupModel'); // Necesitamos el modelo de Grupo para gestionar grupos
const Membership = require('../models/MembershipModel'); // Necesitamos el modelo de Membresía para contar miembros
const Plan = require('../models/PlanModel'); // <--- ADD THIS LINE
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
    const filter = {};
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
        filter.email = { $regex: searchEmail, $options: 'i' };
    }
    // --- Fin Configurar Filtro ---

    // --- Parámetros de Paginación ---
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    if (pageNumber <= 0 || limitNumber <= 0) {
         return res.status(400).json({ message: 'Los parámetros page y limit deben ser números positivos.' });
    }
    const skip = (pageNumber - 1) * limitNumber;
    // --- Fin Parámetros de Paginación ---

    // --- Parámetros de Ordenamiento ---
    const sortField = sortBy || 'createdAt';
    const sortOrderValue = sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortField]: sortOrderValue };
    // --- Fin Parámetros de Ordenamiento ---

    try {
        // Obtener el número total de usuarios que coinciden CON EL FILTRO (antes de la agregación de detalles)
        const totalUsers = await User.countDocuments(filter);

        // Pipeline de agregación para obtener usuarios con detalles
        const usersWithDetails = await User.aggregate([
            { $match: filter },
            { $sort: sort },
            { $skip: skip },
            { $limit: limitNumber },
            { // Lookup para el plan de los docentes
                $lookup: {
                    from: 'plans', // colección de planes
                    localField: 'planId',
                    foreignField: '_id',
                    as: 'planDetails'
                }
            },
            { $unwind: { path: '$planDetails', preserveNullAndEmptyArrays: true } },
            { // Lookup para el conteo de grupos de docentes
                $lookup: {
                    from: 'groups', // colección de grupos
                    let: { teacherId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$docente_id', '$$teacherId'] }, activo: true } },
                        { $count: 'count' }
                    ],
                    as: 'teacherGroupCount'
                }
            },
            { $unwind: { path: '$teacherGroupCount', preserveNullAndEmptyArrays: true } },
            { // Lookup para las membresías de estudiantes
                $lookup: {
                    from: 'memberships',
                    let: { studentId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$usuario_id', '$$studentId'] }, estado_solicitud: 'Aprobado' } },
                        {
                            $lookup: {
                                from: 'groups',
                                localField: 'grupo_id',
                                foreignField: '_id',
                                as: 'groupInfo',
                                pipeline: [{ $project: { _id: 0, nombre: 1 } }] // Solo necesitamos el nombre del grupo
                            }
                        },
                        { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } }
                    ],
                    as: 'studentMemberships'
                }
            },
            { // Proyección final para dar forma a los datos y excluir la contraseña
                $project: {
                    contrasena_hash: 0, // Excluir contraseña
                    nombre: 1,
                    apellidos: 1,
                    email: 1,
                    tipo_usuario: 1,
                    activo: 1,
                    aprobado: 1,
                    fecha_registro: 1,
                    createdAt: 1, // Asegurarse de incluir createdAt si se usa para ordenar por defecto
                    updatedAt: 1,
                    planId: 1, // Mantener planId por si se necesita en el frontend
                    // Campos condicionales
                    plan_nombre: {
                        $cond: {
                            if: { $eq: ['$tipo_usuario', 'Docente'] },
                            then: '$planDetails.name',
                            else: null
                        }
                    },
                    numero_grupos_asignados: { // Para Docentes
                        $cond: {
                            if: { $eq: ['$tipo_usuario', 'Docente'] },
                            then: { $ifNull: ['$teacherGroupCount.count', 0] },
                            else: null
                        }
                    },
                    nombre_grupo: { // Para Estudiantes
                        $cond: {
                            if: { $eq: ['$tipo_usuario', 'Estudiante'] },
                            then: {
                                $reduce: { // Concatenar nombres de grupos
                                    input: '$studentMemberships.groupInfo.nombre',
                                    initialValue: '',
                                    in: {
                                        $cond: {
                                            if: { $eq: ['$$value', ''] },
                                            then: '$$this',
                                            else: { $concat: ['$$value', ', ', '$$this'] }
                                        }
                                    }
                                }
                            },
                            else: null
                        }
                    }
                }
            }
        ]);

        // Lógica de post-procesamiento para truncar nombre_grupo y mensajes por defecto
        usersWithDetails.forEach(user => {
            if (user.tipo_usuario === 'Estudiante') {
                if (user.nombre_grupo && user.nombre_grupo.length > 0) {
                    if (user.nombre_grupo.length > 70) {
                        user.nombre_grupo = user.nombre_grupo.substring(0, 67) + "...";
                    }
                } else {
                    user.nombre_grupo = 'No asignado a grupos';
                }
            }
        });

        // --- Calcular metadatos de paginación ---
        const totalPages = Math.ceil(totalUsers / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;
        const nextPage = hasNextPage ? pageNumber + 1 : null;
        const prevPage = hasPrevPage ? pageNumber - 1 : null;

        // --- Responder con los datos paginados y los metadatos ---
        res.status(200).json({
            data: usersWithDetails,
            pagination: {
                totalItems: totalUsers,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: nextPage,
                prevPage: prevPage
            }
        });

    } catch (error) {
        console.error('Error al obtener todos los usuarios (paginado con agregación):', error);
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
        // Lógica para filtrar por nombre de docente (modifica el 'filter' antes de la agregación)
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
                filter.docente_id = { $in: [] }; // No groups if no teachers match
            }
        }

        // Contar el total de grupos que coinciden con el filtro (antes de la agregación de detalles)
        const totalGroups = await Group.countDocuments(filter);

        // Configurar ordenamiento
        const sortField = sortBy || 'nombre'; // Default sort by group name
        const sortOrderValue = sortOrder === 'desc' ? -1 : 1;
        const sort = { [sortField]: sortOrderValue };

        // Pipeline de agregación
        const groupsWithDetails = await Group.aggregate([
            { $match: filter },
            { $sort: sort },
            { $skip: skip },
            { $limit: limitNumber },
            { // Lookup para detalles del docente
                $lookup: {
                    from: 'users', // colección de usuarios
                    localField: 'docente_id',
                    foreignField: '_id',
                    as: 'docenteDetails'
                }
            },
            { $unwind: { path: '$docenteDetails', preserveNullAndEmptyArrays: true } },
            { // Lookup para contar miembros aprobados
                $lookup: {
                    from: 'memberships', // colección de membresías
                    let: { groupId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$grupo_id', '$$groupId'] }, estado_solicitud: 'Aprobado' } },
                        { $count: 'count' }
                    ],
                    as: 'approvedMembersCountArr'
                }
            },
            { $unwind: { path: '$approvedMembersCountArr', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    // Campos originales del grupo
                    nombre: 1, descripcion: 1, codigo_acceso: 1, activo: 1, limite_estudiantes: 1,
                    fecha_creacion: 1, archivedAt: 1, learning_path_ids: 1, estudiantes_ids: 1,
                    // Campos poblados/calculados
                    docente_id: { // Reconstruir el objeto docente_id como se esperaba del populate
                        _id: '$docenteDetails._id',
                        nombre: '$docenteDetails.nombre',
                        apellidos: '$docenteDetails.apellidos',
                        email: '$docenteDetails.email'
                    },
                    approvedMemberCount: { $ifNull: ['$approvedMembersCountArr.count', 0] }
                }
            }
        ]);

        // Calcular daysArchived después de la agregación
        groupsWithDetails.forEach(group => {
            let daysArchived = null;
            if (group.activo === false && group.archivedAt) {
                const now = new Date();
                const archivedDate = new Date(group.archivedAt);
                if (!isNaN(archivedDate.getTime())) {
                    daysArchived = Math.floor((now - archivedDate) / (1000 * 60 * 60 * 24));
                } else {
                    // console.warn(`Fecha 'archivedAt' inválida para el grupo ID: ${group._id}`);
                }
            }
            group.daysArchived = daysArchived;
        });

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
        console.error('Error al obtener todos los grupos para admin (con agregación):', error);
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

        if (!group) {
            return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
        }

        // --- DECREMENT USAGE COUNTER FOR THE TEACHER OWNER ---
        // This should happen when admin permanently deletes the group.
        // The teacher effectively loses a group slot that was previously counted.
        if (group.docente_id) {
            const teacherOwner = await User.findOne({ _id: group.docente_id, tipo_usuario: 'Docente' });
            if (teacherOwner) {
                // Decrement regardless of group.activo status, because archival no longer decrements.
                // The slot is freed upon permanent deletion by admin.
                await User.findByIdAndUpdate(group.docente_id, { $inc: { 'usage.groupsCreated': -1 } });
                console.log(`Usage counter groupsCreated decremented for teacher ${group.docente_id} due to admin permanently deleting group ${groupId}.`);
            }
        }
        // --- END DECREMENT USAGE COUNTER ---

        // Original conditions for permanent deletion regarding how long it's been archived can remain if desired,
        // but they are separate from the counter logic.
        // For example:
        // if (group.activo === true) { /* This might be relevant if policy allows admins to delete active groups directly */ }
        // if (!group.archivedAt && group.activo === false) { /* Group was made inactive by means other than standard archival */ }
        // const daysArchived = group.archivedAt ? Math.floor((new Date() - new Date(group.archivedAt)) / (1000 * 60 * 60 * 24)) : 0;
        // if (daysArchived <= 15 && group.activo === false && group.archivedAt) { // Example: only delete if archived > 15 days
        //     return res.status(403).json({
        //         success: false,
        //         message: `El grupo debe estar archivado por más de 15 días para ser eliminado permanentemente. Actualmente: ${daysArchived} días.`
        //     });
        // }
        // The above policy checks are distinct from ensuring the counter is correct.
        // The main point for the counter is: if an admin deletes it, the teacher gets the slot back.

        await Membership.deleteMany({ grupo_id: groupId });
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({
            success: true,
            message: 'Grupo eliminado permanentemente junto con sus membresías.',
        });

    } catch (error) {
        console.error('Error al eliminar grupo (admin):', error);
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

// --- Plan Management Functions ---

// @desc    Create a new plan
// @route   POST /api/admin/plans
// @access  Privado/Admin
const createPlan = async (req, res) => {
    const { name, duration, price, limits, isDefaultFree, isActive } = req.body;

    // Basic validation
    if (!name || !duration || !limits) {
        return res.status(400).json({ message: 'Nombre, duración y límites son obligatorios para el plan.' });
    }
    if (name !== 'Free' && (price === undefined || price === null)) {
        return res.status(400).json({ message: 'El precio es obligatorio para planes que no son "Free".' });
    }
    if (name === 'Free' && price) {
        // Ensure free plan does not have a price, or handle it as per specific requirements
        // For now, let's assume Free plan should not have a price set via this field.
    }


    try {
        // Check if a plan with the same name already exists
        const existingPlan = await Plan.findOne({ name });
        if (existingPlan) {
            return res.status(400).json({ message: `Un plan con el nombre "${name}" ya existe.` });
        }

        const planData = {
            name,
            duration,
            limits,
            isActive,
        };

        if (name !== 'Free') {
            planData.price = price;
        }

        if (isDefaultFree !== undefined) {
            planData.isDefaultFree = isDefaultFree;
        }

        const newPlan = new Plan(planData);
        await newPlan.save();

        res.status(201).json({
            success: true,
            message: 'Plan creado exitosamente.',
            data: newPlan
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al crear el plan.', errors: messages });
        }
        console.error('Error al crear plan:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear el plan.', error: error.message });
    }
};

// @desc    Get all plans
// @route   GET /api/admin/plans
// @access  Privado/Admin
const getPlans = async (req, res) => {
    try {
        const plans = await Plan.find({});
        res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        console.error('Error al obtener planes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener planes.', error: error.message });
    }
};

// @desc    Get a single plan by ID
// @route   GET /api/admin/plans/:planId
// @access  Privado/Admin
const getPlanById = async (req, res) => {
    const { planId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
        return res.status(400).json({ message: 'ID de plan inválido.' });
    }

    try {
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }
        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        console.error('Error al obtener plan por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el plan.', error: error.message });
    }
};

// @desc    Update a plan
// @route   PUT /api/admin/plans/:planId
// @access  Privado/Admin
const updatePlan = async (req, res) => {
    const { planId } = req.params;
    const { name, duration, price, limits, isDefaultFree, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
        return res.status(400).json({ message: 'ID de plan inválido.' });
    }

    try {
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }

        // Check if name is being changed and if it conflicts with an existing plan
        if (name && name !== plan.name) {
            const existingPlanWithName = await Plan.findOne({ name });
            if (existingPlanWithName) {
                return res.status(400).json({ message: `Otro plan con el nombre "${name}" ya existe.` });
            }
            plan.name = name;
        }

        if (duration) plan.duration = duration;
        // Handle price carefully, especially if changing a plan to/from 'Free'
        if (price !== undefined) {
             if (plan.name === 'Free' && price > 0) {
                return res.status(400).json({ message: 'El plan "Free" no puede tener un precio.'});
             }
            plan.price = price;
        } else if (plan.name !== 'Free' && plan.price === undefined) {
            // If updating a non-Free plan and price is not provided, it might be an issue
            // Or ensure price is explicitly set to null/0 if that's intended
        }


        if (limits) {
            // Ensure all limit subfields are validated if necessary
            plan.limits = { ...plan.limits, ...limits };
        }
        if (isDefaultFree !== undefined) {
            plan.isDefaultFree = isDefaultFree;
        }
        if (isActive !== undefined) {
            plan.isActive = isActive;
        }

        const updatedPlan = await plan.save();

        res.status(200).json({
            success: true,
            message: 'Plan actualizado exitosamente.',
            data: updatedPlan
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar el plan.', errors: messages });
        }
        console.error('Error al actualizar plan:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el plan.', error: error.message });
    }
};

// @desc    Delete a plan
// @route   DELETE /api/admin/plans/:planId
// @access  Privado/Admin
const deletePlan = async (req, res) => {
    const { planId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
        return res.status(400).json({ message: 'ID de plan inválido.' });
    }

    try {
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado.' });
        }

        // Prevent deletion of default free plan (or handle reassignment)
        if (plan.isDefaultFree) {
            return res.status(400).json({ message: 'No se puede eliminar el plan gratuito predeterminado.' });
        }

        // Check if any users are currently assigned to this plan
        const usersOnPlan = await User.countDocuments({ planId: plan._id });
        if (usersOnPlan > 0) {
            return res.status(400).json({
                message: `No se puede eliminar el plan porque ${usersOnPlan} usuario(s) están actualmente asignados a él. Por favor, reasigne estos usuarios a otro plan antes de eliminarlo.`
            });
        }

        await plan.deleteOne(); // or plan.remove() for older mongoose versions

        res.status(200).json({
            success: true,
            message: 'Plan eliminado exitosamente.'
        });

    } catch (error) {
        console.error('Error al eliminar plan:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el plan.', error: error.message });
    }
};



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
    markMessageAsResolved, // Added
    // --- Add these ---
    createPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deletePlan
};
