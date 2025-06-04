// src/controllers/groupController.js
const AppError = require('../utils/appError');
const dotenv = require('dotenv'); // Necesario si no estás seguro de que dotenv se carga al inicio
dotenv.config();
const mongoose = require('mongoose'); 
const Group = require('../models/GroupModel'); // Importamos el modelo de Grupo
const { generateUniqueCode } = require('../utils/codeGenerator'); // Importamos nuestra utilidad para códigos
const Membership = require('../models/MembershipModel'); // Importamos el modelo de Membresía
const User = require('../models/UserModel');
const Plan = require('../models/PlanModel');
const SubscriptionService = require('../services/SubscriptionService');
const { isTeacherOfGroup } = require('../utils/permissionUtils');
const NotificationService = require('../services/NotificationService');

// Es una buena práctica tener la constante cerca o importarla si es global
const MAX_GROUPS_PER_DOCENTE = parseInt(process.env.MAX_GROUPS_PER_DOCENTE, 10) || 3;

// @desc    Crear un nuevo grupo
// @route   POST /api/groups/create
// @access  Privado/Docente
const createGroup = async (req, res, next) => {
    // Aceptar nombre y limite_estudiantes del cuerpo de la petición
    const { nombre, descripcion, limite_estudiantes } = req.body;
    const docenteId = req.user._id;

    // --- Validación de campos de entrada ---
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ message: 'El nombre del grupo es obligatorio' });
    }
    if (limite_estudiantes !== undefined && (typeof limite_estudiantes !== 'number' || limite_estudiantes < 0)) {
        return res.status(400).json({ message: 'El límite de estudiantes debe ser un número no negativo' });
    }
    // --- Fin Validación ---

    try {
        // --- BEGIN PLAN AND USAGE LIMIT CHECK ---
        if (req.user.tipo_usuario === 'Docente') {
            const user = await User.findById(docenteId).populate('planId');
            if (!user) {
                return next(new AppError('Usuario docente no encontrado.', 404));
            }

            const subscription = await SubscriptionService.checkSubscriptionStatus(docenteId);
            if (!subscription.isActive) {
                 return next(new AppError(`No se puede crear el grupo: ${subscription.message}`, 403));
            }

            if (user.planId && user.planId.limits && user.planId.limits.maxGroups !== undefined) {
                if (user.usage.groupsCreated >= user.planId.limits.maxGroups) {
                    return next(new AppError(`Has alcanzado el límite de ${user.planId.limits.maxGroups} grupos permitidos por tu plan "${user.planId.name}".`, 403));
                }
            } else {
                console.warn(`Plan o límites no definidos para el docente ${docenteId} al crear grupo.`);
                return next(new AppError('No se pudieron verificar los límites de tu plan para crear grupos.', 403));
            }
        }
        // --- END PLAN AND USAGE LIMIT CHECK ---

        let uniqueCodeFound = false;
        let codigo_acceso;
        const maxAttempts = 10;
        let attempts = 0;

        while (!uniqueCodeFound && attempts < maxAttempts) {
            codigo_acceso = generateUniqueCode();
            const existingGroup = await Group.findOne({ codigo_acceso });
            if (!existingGroup) {
                uniqueCodeFound = true;
            }
            attempts++;
        }

        if (!uniqueCodeFound) {
            console.error('Error al generar código de acceso único después de varios intentos.');
            return next(new AppError('No se pudo generar un código de acceso único para el grupo. Por favor, inténtalo de nuevo.', 500));
        }

        const newGroup = await Group.create({
            nombre: nombre.trim(),
            descripcion: descripcion || '',
            codigo_acceso,
            docente_id: docenteId,
            limite_estudiantes: limite_estudiantes !== undefined ? limite_estudiantes : 0,
        });

        if (req.user.tipo_usuario === 'Docente') {
            const userToUpdate = await User.findById(docenteId);
            if (userToUpdate) {
                userToUpdate.usage.groupsCreated = (userToUpdate.usage.groupsCreated || 0) + 1;
                await userToUpdate.save();
            }
        }
        res.status(201).json(newGroup);
    } catch (error) {
        console.error('Error creando grupo:', error);
        next(error);
    }
};

// Controlador para que un usuario solicite unirse a un grupo
const requestJoinGroup = async (req, res, next) => {
  const { codigo_acceso } = req.body;
  const userId = req.user._id;
  const userType = req.user.tipo_usuario;

  if (userType !== 'Estudiante') {
      return next(new AppError('Solo los estudiantes pueden solicitar unirse a grupos', 403));
  }
  if (!codigo_acceso) {
      return next(new AppError('Por favor, ingresa el código de acceso del grupo', 400));
  }

  try {
      const group = await Group.findOne({ codigo_acceso: codigo_acceso.toUpperCase(), activo: true });
      if (!group) {
          return next(new AppError('Grupo no encontrado con ese código de acceso', 404));
      }

      const existingMembership = await Membership.findOne({
          usuario_id: userId,
          grupo_id: group._id
      });

      if (existingMembership) {
          return next(new AppError('Ya tienes una solicitud o membresía para este grupo. No puedes enviar otra hasta que sea eliminada.', 400));
      }

      const membershipRequest = await Membership.create({
          usuario_id: userId,
          grupo_id: group._id,
          estado_solicitud: 'Pendiente'
      });

      try {
          if (group && group.docente_id && req.user) {
              const student = req.user;
              const teacherId = group.docente_id;
              const groupName = group.nombre || 'the group';
              const studentName = `${student.nombre} ${student.apellidos || ''}`.trim();
              const message = `${studentName} has requested to join your group '${groupName}'.`;
              const link = `/teacher/groups/${group._id}/manage`;

              await NotificationService.createNotification({
                  recipient: teacherId,
                  sender: student._id,
                  type: 'JOIN_REQUEST',
                  message: message,
                  link: link
              });
          } else {
              console.error('Could not send join request notification: Missing group details, teacher ID, or student details.');
          }
      } catch (notificationError) {
          console.error('Failed to send join request notification:', notificationError);
      }

      res.status(201).json({
          message: 'Solicitud para unirse al grupo enviada exitosamente',
          membership: membershipRequest
      });
  } catch (error) {
      console.error('Error al procesar solicitud de unión a grupo:', error);
      next(error);
  }
};

// Controlador para que un Docente vea las solicitudes pendientes de sus grupos
const getMyJoinRequests = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    const skip = (pageNumber - 1) * limitNumber;
    const docenteId = req.user._id;

    try {
        const docentesGroups = await Group.find({ docente_id: docenteId }).select('_id').lean();
        const docentesGroupIds = docentesGroups.map(group => group._id);

        const defaultPagination = { totalItems: 0, currentPage: pageNumber, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null };

        if (docentesGroupIds.length === 0) {
            return res.status(200).json({ data: [], pagination: defaultPagination });
        }

        const filter = {
            grupo_id: { $in: docentesGroupIds },
            estado_solicitud: 'Pendiente'
        };

        const totalItems = await Membership.countDocuments(filter);
        const pendingRequests = await Membership.find(filter)
            .populate('usuario_id', 'nombre apellidos email')
            .populate('grupo_id', 'nombre')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: pendingRequests,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });
    } catch (error) {
        console.error('Error al obtener solicitudes pendientes del docente:', error);
        next(error);
    }
};

// Controlador para que un Docente apruebe o rechace una solicitud de unión
const respondJoinRequest = async (req, res, next) => {
  const { membershipId } = req.params;
  const { responseStatus } = req.body;
  const respondingTeacherId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      return next(new AppError('ID de membresía inválido.', 400));
  }
  if (!responseStatus || !['Aprobado', 'Rechazado'].includes(responseStatus)) {
      return next(new AppError('Estado de respuesta inválido. Debe ser "Aprobado" o "Rechazado".', 400));
  }

  try {
      const membership = await Membership.findById(membershipId).populate('grupo_id');

      if (!membership) {
          return next(new AppError('Solicitud de membresía no encontrada', 404));
      }
      if (membership.estado_solicitud !== 'Pendiente') {
          return next(new AppError(`Esta solicitud ya fue ${membership.estado_solicitud.toLowerCase()}`, 400));
      }

      const group = membership.grupo_id;
      if (!group) {
          return next(new AppError('Grupo asociado a la membresía no encontrado.', 404));
      }

      if (!group.docente_id || group.docente_id.toString() !== respondingTeacherId.toString()) {
           return next(new AppError('No tienes permiso para responder esta solicitud. El grupo no te pertenece.', 403));
      }

      if (responseStatus === 'Aprobado') {
        const groupOwner = await User.findById(group.docente_id).populate('planId');
        if (!groupOwner) {
            return next(new AppError('No se encontró al docente propietario del grupo.', 404));
        }

        if (groupOwner.tipo_usuario === 'Docente') {
            const subscription = await SubscriptionService.checkSubscriptionStatus(groupOwner._id);
            if (!subscription.isActive) {
                return next(new AppError(`No se puede aprobar la solicitud: La suscripción del propietario del grupo (${subscription.message || 'no está activa'}).`, 403));
            }

            if (groupOwner.planId && groupOwner.planId.limits && groupOwner.planId.limits.maxStudentsPerGroup !== undefined) {
                const maxStudentsAllowed = groupOwner.planId.limits.maxStudentsPerGroup;
                const currentStudentCount = await Membership.countDocuments({
                    grupo_id: group._id,
                    estado_solicitud: 'Aprobado'
                });

                if (currentStudentCount >= maxStudentsAllowed) {
                    return next(new AppError(`No se puede aprobar al estudiante. El grupo ha alcanzado el límite de ${maxStudentsAllowed} estudiantes permitidos por el plan "${groupOwner.planId.name}" del propietario del grupo.`, 403));
                }
            } else {
                console.warn(`Detalles del plan o límite maxStudentsPerGroup no definidos para el docente ${groupOwner._id} al aprobar solicitud en grupo ${group._id}.`);
            }
        }
      }

      membership.estado_solicitud = responseStatus;
      if (responseStatus === 'Aprobado') {
          membership.fecha_aprobacion = Date.now();
      }
      await membership.save();

      const updatedPopulatedMembership = await Membership.findById(membershipId)
          .populate('usuario_id', 'nombre apellidos email')
          .populate({
              path: 'grupo_id',
              select: 'nombre docente_id'
          });

      if (!updatedPopulatedMembership) {
           return next(new AppError('Error al obtener la membresía actualizada para responder.', 500));
      }

      res.status(200).json({
           message: `Solicitud de membresía ${responseStatus.toLowerCase()} exitosamente`,
           membership: updatedPopulatedMembership
      });

      try {
          if (updatedPopulatedMembership && updatedPopulatedMembership.usuario_id && updatedPopulatedMembership.grupo_id) {
              const studentId = updatedPopulatedMembership.usuario_id._id;
              const teacherId = respondingTeacherId;
              const groupName = updatedPopulatedMembership.grupo_id.nombre || 'el grupo';
              const currentStatus = updatedPopulatedMembership.estado_solicitud;
              let notifType = '';
              let message = '';
              let link = '';

              if (currentStatus === 'Aprobado') {
                  notifType = 'GROUP_INVITE_ACCEPTED';
                  message = `Tu solicitud para unirte al grupo '${groupName}' ha sido aprobada.`;
                  link = `/student/learning-paths/group/${updatedPopulatedMembership.grupo_id._id}`;
              } else if (currentStatus === 'Rechazado') {
                  notifType = 'GROUP_INVITE_DECLINED';
                  message = `Tu solicitud para unirte al grupo '${groupName}' ha sido rechazada.`;
                  link = '/student/groups/my-groups';
              }

              if (notifType && message) {
                  await NotificationService.createNotification({
                      recipient: studentId,
                      sender: teacherId,
                      type: notifType,
                      message: message,
                      link: link
                  });
              }
          }
      } catch (notificationError) {
          console.error('Failed to send join request response notification:', notificationError);
      }
  } catch (error) {
      console.error('Error al responder solicitud de membresía:', error);
      next(error);
  }
};

// Controlador para que un Docente vea la lista de estudiantes aprobados en uno de sus grupos
const getGroupStudents = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    const skip = (pageNumber - 1) * limitNumber;
    const { groupId } = req.params;
    const docenteId = req.user._id;

    try {
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
             return next(new AppError('El ID del grupo no tiene un formato válido.', 400));
        }
        const isOwner = await isTeacherOfGroup(docenteId, groupId);
        if (!isOwner) {
            return next(new AppError('Grupo no encontrado o no te pertenece', 404));
        }

        const filter = {
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        };

        const totalItems = await Membership.countDocuments(filter);
        const approvedMemberships = await Membership.find(filter)
            .populate('usuario_id', 'nombre apellidos email tipo_identificacion numero_identificacion')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const students = approvedMemberships.map(membership => membership.usuario_id);
        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: students,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });
    } catch (error) {
        console.error('Error al obtener estudiantes del grupo:', error);
        next(error);
    }
};

// Controlador para que un usuario (Estudiante) vea la lista de grupos a los que pertenece (aprobado)
const getMyApprovedGroups = async (req, res, next) => {
  const userId = req.user._id;
  try {
    const approvedMemberships = await Membership.find({
      usuario_id: userId,
      estado_solicitud: 'Aprobado'
    })
    .populate('grupo_id', 'nombre codigo_acceso docente_id activo');

    const groups = approvedMemberships.map(membership => membership.grupo_id);
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error al obtener grupos del usuario:', error);
    next(error);
  }
};

// @desc    Obtener grupos creados por el docente autenticado
// @route   GET /api/groups/docente/me
// Acceso:  Privado/Docente
const getMyOwnedGroups = async (req, res, next) => {
    const { page = 1, limit = 10, status } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    const skip = (pageNumber - 1) * limitNumber;

    try {
        const docenteId = new mongoose.Types.ObjectId(req.user._id);
        const matchCriteria = { docente_id: docenteId };

        if (status === 'archived') {
            matchCriteria.activo = false;
        } else {
            matchCriteria.activo = true;
        }

        const baseAggregationPipeline = [{ $match: matchCriteria }];

        const dataAggregationPipeline = [
            ...baseAggregationPipeline,
            { $sort: { fecha_creacion: -1 } },
            { $skip: skip },
            { $limit: limitNumber },
            {
                $lookup: {
                    from: 'memberships',
                    localField: '_id',
                    foreignField: 'grupo_id',
                    as: 'memberships'
                }
            },
            {
                $addFields: {
                    approvedStudentCount: {
                        $size: {
                            $filter: {
                                input: '$memberships',
                                as: 'membership',
                                cond: { $eq: ['$$membership.estado_solicitud', 'Aprobado'] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1, nombre: 1, descripcion: 1, codigo_acceso: 1, docente_id: 1,
                    activo: 1, limite_estudiantes: 1, fecha_creacion: 1, approvedStudentCount: 1,
                }
            }
        ];

        const results = await Group.aggregate([
            {
                $facet: {
                    metadata: [...baseAggregationPipeline, { $count: "totalItems" }],
                    data: dataAggregationPipeline
                }
            }
        ]);

        const data = results[0].data;
        const totalItems = results[0].metadata.length > 0 ? results[0].metadata[0].totalItems : 0;
        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });

    } catch (error) {
        console.error('Error en getMyOwnedGroups:', error);
        next(error);
    }
};

// @desc    Obtener todas las membresías de un usuario autenticado con detalles del grupo y estado
// @route   GET /api/groups/my-memberships
// Acceso: Privado
const getMyMembershipsWithStatus = async (req, res, next) => {
    const userId = req.user._id;
    try {
        const membershipsWithGroups = await Membership.find({ usuario_id: userId })
            .populate({
                path: 'grupo_id',
                select: 'nombre codigo_acceso docente_id activo',
                populate: {
                    path: 'docente_id',
                    model: 'User',
                    select: 'nombre apellidos'
                }
            })
            .sort({ createdAt: -1 });

        const activeMemberships = membershipsWithGroups.filter(membership =>
            membership.grupo_id && membership.grupo_id.activo
        );

        const uniqueGroups = new Map();
        for (const membership of activeMemberships) {
            const groupId = membership.grupo_id?._id?.toString();
            if (groupId && !uniqueGroups.has(groupId)) {
                uniqueGroups.set(groupId, membership);
            }
        }

        const studentGroups = Array.from(uniqueGroups.values()).map(membership => ({
            _id: membership.grupo_id._id,
            nombre: membership.grupo_id.nombre,
            codigo_acceso: membership.grupo_id.codigo_acceso,
            docente: membership.grupo_id.docente_id ? {
                _id: membership.grupo_id.docente_id._id,
                nombre: membership.grupo_id.docente_id.nombre,
                apellidos: membership.grupo_id.docente_id.apellidos
            } : null,
            student_status: membership.estado_solicitud,
            membership_id: membership._id,
            is_group_active: membership.grupo_id.activo
        }));

        res.status(200).json(studentGroups);
    } catch (error) {
        console.error('Error al obtener las membresías del usuario:', error);
        next(error);
    }
};

// @desc    Actualizar detalles del grupo (nombre, descripcion)
// @route   PUT /api/groups/:groupId
// @access  Privado/Docente
const updateGroup = async (req, res, next) => {
    const { groupId } = req.params;
    const { nombre, descripcion } = req.body;
    const docenteId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return next(new AppError('ID de grupo inválido', 400));
    }
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
        return next(new AppError('El nombre, si se proporciona, debe ser un texto no vacío.', 400));
    }
    if (descripcion !== undefined && typeof descripcion !== 'string') {
        return next(new AppError('La descripción, si se proporciona, debe ser un texto.', 400));
    }
    if (nombre === undefined && descripcion === undefined) {
        return next(new AppError('Se debe proporcionar al menos el nombre o la descripción para actualizar.', 400));
    }

    try {
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
        if (!group) {
            return next(new AppError('Grupo no encontrado o no te pertenece.', 404));
        }
        if (!group.activo) {
            return next(new AppError('No se puede modificar un grupo que ha sido desactivado.', 403));
        }

        if (nombre !== undefined) {
            group.nombre = nombre.trim();
        }
        if (descripcion !== undefined) {
            group.descripcion = descripcion;
        }

        const updatedGroup = await group.save();
        res.status(200).json(updatedGroup);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next(new AppError(`Error de validación al actualizar el grupo. ${messages.join('. ')}`, 400));
        }
        console.error('Error actualizando grupo:', error);
        next(error);
    }
};

// @desc    Eliminar un grupo (Soft Delete - Archivar)
// @route   DELETE /api/groups/:groupId
// @access  Privado/Docente
const deleteGroup = async (req, res, next) => {
    const { groupId } = req.params;
    const docenteId = req.user._id;
    const userType = req.user.tipo_usuario;

    if (userType !== 'Docente') {
        return next(new AppError('Solo los docentes pueden archivar grupos.', 403));
    }
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return next(new AppError('ID de grupo inválido.', 400));
    }

    try {
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
        if (!group) {
            return next(new AppError('Grupo no encontrado o no te pertenece.', 404));
        }
        if (!group.activo) {
            return res.status(200).json({ message: 'El grupo ya se encuentra archivado.' });
        }

        group.activo = false;
        group.archivedAt = new Date();
        await group.save();

        console.log(`Group ${groupId} archived by teacher ${docenteId}. Usage counter NOT decremented at this stage.`);

        const approvedMemberships = await Membership.find({
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).select('usuario_id');

        const studentUserIds = approvedMemberships.map(m => m.usuario_id.toString());
        const notificationPromises = studentUserIds.map(async (studentId) => {
            try {
                await NotificationService.createNotification({
                    recipient: studentId,
                    sender: docenteId,
                    type: 'GROUP_ARCHIVED',
                    message: `El grupo "${group.nombre}" al que pertenecías ha sido archivado y ya no está activo.`,
                    link: '/student/groups'
                });
            } catch (notifError) {
                console.error(`Error al enviar notificación de archivado al estudiante ${studentId}:`, notifError);
            }
        });
        await Promise.allSettled(notificationPromises);

        res.status(200).json({ message: 'Grupo archivado exitosamente.' });
    } catch (error) {
        console.error('Error archivando el grupo:', error);
        next(error);
    }
};

// @desc    Eliminar un estudiante de un grupo (eliminar membresía aprobada)
// @route   DELETE /api/groups/:groupId/students/:studentId
// @access  Privado/Docente
const removeStudentFromGroup = async (req, res, next) => {
  const { groupId, studentId } = req.params;
  const docenteId = req.user._id;
  const userType = req.user.tipo_usuario;

  if (userType !== 'Docente') {
      return next(new AppError('Solo los docentes pueden eliminar estudiantes de los grupos', 403));
  }
   if (!mongoose.Types.ObjectId.isValid(groupId)) {
       return next(new AppError('ID de grupo inválido', 400));
   }
   if (!mongoose.Types.ObjectId.isValid(studentId)) {
       return next(new AppError('ID de estudiante inválido', 400));
   }

  try {
      const isOwner = await isTeacherOfGroup(docenteId, groupId);
      if (!isOwner) {
          return next(new AppError('Grupo no encontrado o no te pertenece', 404));
      }

      const membership = await Membership.findOneAndDelete({
           grupo_id: groupId,
           usuario_id: studentId,
           estado_solicitud: 'Aprobado'
      });

      if (!membership) {
           return next(new AppError('Estudiante no encontrado en este grupo como miembro aprobado.', 404));
      }

      console.log(`Membresía aprobada de estudiante ${studentId} eliminada del grupo ${groupId}. Submissions/Progress relacionados no fueron eliminados.`);
      res.status(200).json({ message: 'Estudiante eliminado exitosamente del grupo.' });
  } catch (error) {
       console.error('Error al eliminar estudiante del grupo:', error);
       next(error);
  }
};

// @desc    Obtener detalles de un grupo por su ID
// @route   GET /api/groups/:groupId
// Acceso: Privado/Docente (dueño del grupo)
const getGroupById = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    const docenteId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) { // Validación de ObjectId para groupId
        return next(new AppError('El ID del grupo no tiene un formato válido.', 400));
    }

    const isOwner = await isTeacherOfGroup(docenteId, groupId);
    if (!isOwner) {
      return next(new AppError('No tienes permiso para acceder a este grupo o el grupo no existe.', 403));
    }

    const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
    if (!group) {
        console.error(`Error de consistencia: Grupo ${groupId} no encontrado después de confirmar propiedad para docente ${docenteId}.`);
        return next(new AppError(`Grupo no encontrado con ID ${groupId}.`, 404));
    }
    if (group.activo !== true) {
        return next(new AppError("Tu grupo no está activo, seguramente está archivado y no puedes ver los detalles.", 400));
    }
    res.status(200).json(group);
  } catch (error) {
    console.error('Error al obtener grupo por ID:', error);
    next(error);
  }
};

// @desc    Obtener todas las membresías (estudiantes y estado) de un grupo específico
// @route   GET /api/groups/:groupId/memberships
// Acceso: Privado/Docente (dueño del grupo)
const getGroupMemberships = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
        return next(new AppError('El ID del grupo no tiene un formato válido.', 400));
    }

    const skip = (pageNumber - 1) * limitNumber;
    const groupId = req.params.groupId;
    const docenteId = req.user._id;

    try {
        const isOwner = await isTeacherOfGroup(docenteId, groupId);
        if (!isOwner) {
            return next(new AppError('No tienes permiso para ver las membresías de este grupo o el grupo no existe.', 403));
        }

        const filter = { grupo_id: groupId };
        const totalItems = await Membership.countDocuments(filter);
        const memberships = await Membership.find(filter)
            .populate('usuario_id', 'nombre apellidos email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: memberships,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });
    } catch (error) {
        console.error('Error al obtener membresías del grupo:', error);
        next(error);
    }
};

// @desc    Eliminar una membresía de estudiante de un grupo por ID de membresía
// @route   DELETE /api/groups/:groupId/memberships/:membershipId
// @access  Privado/Docente
const removeMembershipById = async (req, res, next) => {
  const { groupId, membershipId } = req.params;
  const docenteId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return next(new AppError('ID de grupo inválido.', 400));
  }
  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
    return next(new AppError('ID de membresía inválido.', 400));
  }

  try {
    const isOwner = await isTeacherOfGroup(docenteId, groupId);
    if (!isOwner) {
      return next(new AppError('No tienes permiso para modificar este grupo o el grupo no existe.', 403));
    }

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return next(new AppError('Membresía no encontrada.', 404));
    }
    if (membership.grupo_id.toString() !== groupId) {
      return next(new AppError('La membresía no pertenece al grupo especificado.', 400));
    }
    
    await Membership.findByIdAndDelete(membershipId);

    try {
        if (membership.usuario_id && membership.grupo_id) {
            const group = await Group.findById(membership.grupo_id);
            const groupName = group ? group.nombre : 'un grupo';
            const studentId = membership.usuario_id;
            
            await NotificationService.createNotification({
                recipient: studentId,
                sender: docenteId,
                type: 'MEMBERSHIP_REMOVED',
                message: `Has sido removido del grupo '${groupName}' por el docente.`,
            });
        }
    } catch (notificationError) {
        console.error('Error al enviar notificación de remoción de membresía:', notificationError);
    }
    res.status(200).json({ message: 'Membresía eliminada exitosamente del grupo.' });
  } catch (error) {
    console.error('Error al eliminar membresía del grupo:', error);
    next(error);
  }
};

// @desc    Restaurar un grupo archivado (marcarlo como activo)
// @route   PUT /api/groups/:groupId/restore
// @access  Privado/Docente
const restoreGroup = async (req, res, next) => {
  const { groupId } = req.params;
  const docenteId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return next(new AppError('ID de grupo inválido', 400));
  }

  try {
    const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
    if (!group) {
      return next(new AppError('Grupo no encontrado o no te pertenece.', 404));
    }
    if (group.activo) {
      return res.status(200).json({ message: 'El grupo ya está activo.', group });
    }

    group.activo = true;
    group.archivedAt = null;
    await group.save();

    res.status(200).json({ message: 'Grupo restaurado exitosamente.', group });
  } catch (error) {
    console.error('Error restaurando grupo:', error);
    next(error);
  }
};

module.exports = {
  createGroup,
  requestJoinGroup,
  getMyJoinRequests,
  respondJoinRequest,
  getGroupStudents,
  getMyApprovedGroups,
  updateGroup,
  deleteGroup,
  restoreGroup,
  removeStudentFromGroup,
  getMyOwnedGroups,
  getMyMembershipsWithStatus,
  getGroupById,
  getGroupMemberships,
  removeMembershipById,
};