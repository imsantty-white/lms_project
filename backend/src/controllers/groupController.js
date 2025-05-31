// src/controllers/groupController.js

const dotenv = require('dotenv'); // Necesario si no estás seguro de que dotenv se carga al inicio
dotenv.config();
const mongoose = require('mongoose'); 
const Group = require('../models/GroupModel'); // Importamos el modelo de Grupo
const { generateUniqueCode } = require('../utils/codeGenerator'); // Importamos nuestra utilidad para códigos
const Membership = require('../models/MembershipModel'); // Importamos el modelo de Membresía
const User = require('../models/UserModel');
const Plan = require('../models/PlanModel'); // <--- ADD THIS
const SubscriptionService = require('../services/SubscriptionService'); // <--- ADD THIS
const { isTeacherOfGroup } = require('../utils/permissionUtils');
const NotificationService = require('../services/NotificationService'); // Adjust path if necessary

// Es una buena práctica tener la constante cerca o importarla si es global
const MAX_GROUPS_PER_DOCENTE = parseInt(process.env.MAX_GROUPS_PER_DOCENTE, 10) || 3;

// @desc    Crear un nuevo grupo
// @route   POST /api/groups/create
// @access  Privado/Docente
const createGroup = async (req, res) => {
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
            if (!user) { // Should not happen if protect middleware works
                return res.status(404).json({ message: 'Usuario docente no encontrado.' });
            }

            const subscription = await SubscriptionService.checkSubscriptionStatus(docenteId);
            if (!subscription.isActive) {
                return res.status(403).json({ message: `No se puede crear el grupo: ${subscription.message}` });
            }

            if (user.planId && user.planId.limits && user.planId.limits.maxGroups !== undefined) {
                if (user.usage.groupsCreated >= user.planId.limits.maxGroups) {
                    return res.status(403).json({ message: `Has alcanzado el límite de ${user.planId.limits.maxGroups} grupos permitidos por tu plan "${user.planId.name}".` });
                }
            } else {
                // Fallback or error if plan details/limits are missing, though checkSubscriptionStatus should catch inactive plans
                console.warn(`Plan o límites no definidos para el docente ${docenteId} al crear grupo.`);
                return res.status(403).json({ message: 'No se pudieron verificar los límites de tu plan para crear grupos.' });
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
            return res.status(500).json({ message: 'No se pudo generar un código de acceso único para el grupo. Por favor, inténtalo de nuevo.' });
        }
        // --- Fin Generar código ---

        // --- Crear el nuevo grupo (Lógica preservada) ---
        const newGroup = await Group.create({
            nombre: nombre.trim(),
            descripcion: descripcion || '',
            codigo_acceso,
            docente_id: docenteId,
            limite_estudiantes: limite_estudiantes !== undefined ? limite_estudiantes : 0,
            // activo: true is default in model
        });

        // --- BEGIN INCREMENT USAGE COUNTER ---
        if (req.user.tipo_usuario === 'Docente') {
            const userToUpdate = await User.findById(docenteId); // Re-fetch or use the one from above if still in scope and not modified
            if (userToUpdate) {
                userToUpdate.usage.groupsCreated = (userToUpdate.usage.groupsCreated || 0) + 1;
                await userToUpdate.save();
            }
        }
        // --- END INCREMENT USAGE COUNTER ---

        res.status(201).json(newGroup);

    } catch (error) {
        console.error('Error creando grupo:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear el grupo', error: error.message });
    }
};



// Controlador para que un usuario solicite unirse a un grupo
const requestJoinGroup = async (req, res) => {
  const { codigo_acceso } = req.body; // Obtenemos el código de acceso del cuerpo de la petición
  const userId = req.user._id; // Obtenemos el ID del usuario autenticado
  const userType = req.user.tipo_usuario; // Obtenemos el tipo de usuario

  // --- Validación: Solo Estudiantes pueden solicitar unirse ---
  if (userType !== 'Estudiante') {
      return res.status(403).json({ message: 'Solo los estudiantes pueden solicitar unirse a grupos' }); // 403 Forbidden
  }
  // --- Fin Validación ---

  // --- Validación básica de entrada ---
  if (!codigo_acceso) {
      return res.status(400).json({ message: 'Por favor, ingresa el código de acceso del grupo' });
  }
  // --- Fin Validación ---

  try {
      // --- Buscar el grupo por código de acceso ---
      const group = await Group.findOne({ codigo_acceso: codigo_acceso.toUpperCase(), activo: true }); // Buscar usando el código en mayúsculas

      // Si el grupo no existe
      if (!group) {
          return res.status(404).json({ message: 'Grupo no encontrado con ese código de acceso' });
      }
      // --- Fin Buscar grupo ---


      // --- Verificar si el estudiante ya tiene cualquier membresía en este grupo ---
      const existingMembership = await Membership.findOne({
          usuario_id: userId,
          grupo_id: group._id
      });

      if (existingMembership) {
          return res.status(400).json({
              message: 'Ya tienes una solicitud o membresía para este grupo. No puedes enviar otra hasta que sea eliminada.'
          });
      }
      // --- Fin Verificar membresía existente ---

      // --- Verificar límite de estudiantes en el grupo (Futura Implementación de Limitaciones) ---
      // Esto lo implementaríamos más adelante, consultando el 'limite_estudiantes' del grupo
      // y contando los miembros 'Aprobado'.
      // if (group.limite_estudiantes > 0) { ... }
      // --- Fin Límite estudiantes ---


      // --- Crear la nueva solicitud de membresía (Estado Pendiente) ---
      const membershipRequest = await Membership.create({
          usuario_id: userId,
          grupo_id: group._id,
          estado_solicitud: 'Pendiente' // Estado por defecto
      });
      // --- Fin Crear solicitud ---

      try {
          // 'group' is already fetched and available.
          // 'req.user' (student) is available.
          if (group && group.docente_id && req.user) {
              const student = req.user; // student making the request
              const teacherId = group.docente_id; // Recipient of the notification
              const groupName = group.nombre || 'the group';
              const studentName = `${student.nombre} ${student.apellidos || ''}`.trim();

              const message = `${studentName} has requested to join your group '${groupName}'.`;
              // TODO: Confirm teacher's link to manage join requests for this specific group.
              // Assuming a route like /teacher/groups/:groupId/manage or similar where requests are listed.
              const link = `/teacher/groups/${group._id}/manage`; // Link to member management page

              await NotificationService.createNotification({
                  recipient: teacherId,
                  sender: student._id, // Student who sent the request
                  type: 'JOIN_REQUEST',
                  message: message,
                  link: link
              });
          } else {
              console.error('Could not send join request notification: Missing group details, teacher ID, or student details.');
          }
      } catch (notificationError) {
          console.error('Failed to send join request notification:', notificationError);
          // Do not let notification errors break the main response
      }

      // --- Respuesta exitosa ---
      res.status(201).json({
          message: 'Solicitud para unirse al grupo enviada exitosamente',
          membership: membershipRequest // Opcional: enviar los datos de la solicitud creada
      });
      // --- Fin Respuesta ---

  } catch (error) {
      console.error('Error al procesar solicitud de unión a grupo:', error);
      res.status(500).json({ message: 'Error interno del servidor al procesar la solicitud', error: error.message });
  }
};




// Controlador para que un Docente vea las solicitudes pendientes de sus grupos
const getMyJoinRequests = async (req, res) => {
  const docenteId = req.user._id; // Obtenemos el ID del docente autenticado

  try {
      // --- Encontrar todos los grupos creados por este docente ---
      const docentesGroups = await Group.find({ docente_id: docenteId });

      // Si el docente no tiene grupos, no hay solicitudes pendientes para él
      if (docentesGroups.length === 0) {
          return res.status(200).json([]); // Devuelve un array vacío
      }

      // Obtener los IDs de esos grupos
      const docentesGroupIds = docentesGroups.map(group => group._id);

      // --- Buscar solicitudes de membresía pendientes para esos grupos ---
      const pendingRequests = await Membership.find({
          grupo_id: { $in: docentesGroupIds }, // Buscar solicitudes donde el grupo_id esté en la lista de IDs del docente
          estado_solicitud: 'Pendiente' // Filtrar solo las solicitudes pendientes
      })
      .populate('usuario_id', 'nombre apellidos email'); // 'Poblar' la información del usuario (estudiante) que hizo la solicitud
      // El segundo argumento de populate ('nombre apellidos email') especifica qué campos del usuario traer


      // --- Respuesta exitosa ---
      res.status(200).json(pendingRequests); // Envía la lista de solicitudes pendientes
      // --- Fin Respuesta ---

  } catch (error) {
      console.error('Error al obtener solicitudes pendientes del docente:', error);
      res.status(500).json({ message: 'Error interno del servidor al obtener solicitudes pendientes', error: error.message });
  }
};


// Controlador para que un Docente apruebe o rechace una solicitud de unión
const respondJoinRequest = async (req, res) => {
  const { membershipId } = req.params; // Obtenemos el ID de la membresía de los parámetros de la URL
  const { responseStatus } = req.body; // Obtenemos el estado deseado ('Aprobado' o 'Rechazado') del cuerpo de la petición
  const docenteId = req.user._id; // Obtenemos el ID del docente autenticado

  // --- Validación de la respuesta ---
  if (!responseStatus || !['Aprobado', 'Rechazado'].includes(responseStatus)) {
      return res.status(400).json({ message: 'Estado de respuesta inválido. Debe ser "Aprobado" o "Rechazado".' });
  }
  // --- Fin Validación ---

  try {
      // --- Buscar la solicitud de membresía por ID ---
      // Usamos populate para traer la información del grupo asociado
      const membership = await Membership.findById(membershipId).populate('grupo_id');

      // Si la solicitud de membresía no existe
      if (!membership) {
          return res.status(404).json({ message: 'Solicitud de membresía no encontrada' });
      }

      // Si la solicitud ya no está Pendiente (ya fue respondida)
      if (membership.estado_solicitud !== 'Pendiente') {
          return res.status(400).json({ message: `Esta solicitud ya fue ${membership.estado_solicitud.toLowerCase()}` });
      }
      // --- Fin Buscar y validar estado ---


      // --- VERIFICAR SEGURIDAD: Asegurarse de que el grupo pertenece a este docente ---
      // Refactor: Use isTeacherOfGroup
      if (!membership.grupo_id || !(await isTeacherOfGroup(docenteId, membership.grupo_id._id))) {
           return res.status(403).json({ message: 'No tienes permiso para responder esta solicitud. El grupo no te pertenece.' }); // 403 Forbidden
      }
       // --- Fin Verificación de Seguridad ---


      // --- Actualizar el estado de la solicitud ---
      membership.estado_solicitud = responseStatus;
      // Si la solicitud es aprobada, registramos la fecha de aprobación
      if (responseStatus === 'Aprobado') {
          membership.fecha_aprobacion = Date.now();
      }
      // Si es rechazada, podemos dejar fecha_aprobacion como null o no modificarla

      // Guardar los cambios en la base de datos
          await membership.save();
          // --- Fin Actualizar estado ---

          // --- Obtener la membresía actualizada CON usuario poblado para la respuesta ---
          // Volvemos a buscar la membresía por ID y la poblamos antes de responder
          const updatedPopulatedMembership = await Membership.findById(membershipId)
              .populate('usuario_id', 'nombre apellidos email'); // <-- Pobla usuario_id con los campos necesarios

          // Si por alguna razón la membresía desapareció después de guardarla (muy improbable, pero por seguridad)
          if (!updatedPopulatedMembership) {
               // Puedes manejar esto como un error, aunque ya se guardó
               console.error('Error interno: Membresía guardada pero no encontrada inmediatamente después.');
               return res.status(500).json({ message: 'Error al obtener la membresía actualizada para responder.' });
          }

          // --- Respuesta exitosa ---
          res.status(200).json({
               message: `Solicitud de membresía ${responseStatus.toLowerCase()} exitosamente`,
               membership: updatedPopulatedMembership // <-- Envía el objeto de membresía recién poblado
          });
          // --- Fin Respuesta ---

          try {
              // 'updatedPopulatedMembership' contains the student (usuario_id) and group (grupo_id) details.
              // 'req.user' is the teacher responding.
              // 'responseStatus' holds 'Aprobado' or 'Rechazado'. (currentStatus from membership is more reliable)

              if (updatedPopulatedMembership && updatedPopulatedMembership.usuario_id && updatedPopulatedMembership.grupo_id) {
                  const studentId = updatedPopulatedMembership.usuario_id._id; // Student is the recipient
                  const teacherId = req.user._id; // Teacher is the sender
                  const groupName = updatedPopulatedMembership.grupo_id.nombre || 'the group';
                  const currentStatus = updatedPopulatedMembership.estado_solicitud; // This is the new status ('Aprobado' or 'Rechazado')

                  let notifType = '';
                  let message = '';
                  let link = '';

                  if (currentStatus === 'Aprobado') {
                      notifType = 'GROUP_INVITE_ACCEPTED'; // Using existing type, fits the context
                      message = `Your request to join group '${groupName}' has been approved.`;
                      // TODO: Confirm student's link to the specific group page
                      link = `/student/learning-paths/group/${updatedPopulatedMembership.grupo_id._id}`; 
                  } else if (currentStatus === 'Rechazado') {
                      notifType = 'GROUP_INVITE_DECLINED'; // Using existing type, fits the context
                      message = `Your request to join group '${groupName}' has been rejected.`;
                      // TODO: Confirm student's link to their list of groups or join group page
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

                      // Actualizar el grupo_id del estudiante en UserModel
                      try {
                          const studentToUpdate = await User.findById(studentId);
                          if (studentToUpdate) {
                              studentToUpdate.grupo_id = updatedPopulatedMembership.grupo_id._id; // Asignar el ID del grupo
                              await studentToUpdate.save();
                              console.log(`Campo grupo_id actualizado para el estudiante ${studentId} al grupo ${updatedPopulatedMembership.grupo_id._id}`);
                          } else {
                              console.error(`Estudiante con ID ${studentId} no encontrado, no se pudo actualizar su grupo_id.`);
                          }
                      } catch (userUpdateError) {
                          console.error(`Error al actualizar el grupo_id para el estudiante ${studentId}:`, userUpdateError);
                          // No fallar la operación principal por esto, pero es importante registrarlo.
                      }
                  }
              } else {
                  console.error('Could not send join request response notification: Missing details from populated membership.');
              }
          } catch (notificationError) {
              console.error('Failed to send join request response notification:', notificationError);
              // Do not let notification errors break the main response
          }

  } catch (error) {
      console.error('Error al responder solicitud de membresía:', error);
      res.status(500).json({ message: 'Error interno del servidor al responder la solicitud', error: error.message });
  }
};

// Controlador para que un Docente vea la lista de estudiantes aprobados en uno de sus grupos
const getGroupStudents = async (req, res) => {
  const { groupId } = req.params; // Obtenemos el ID del grupo de los parámetros de la URL
  const docenteId = req.user._id; // Obtenemos el ID del docente autenticado

  try {
    // --- VERIFICAR SEGURIDAD: Asegurarse de que el grupo existe y pertenece a este docente ---
    // Refactor: Use isTeacherOfGroup
    const isOwner = await isTeacherOfGroup(docenteId, groupId);
    if (!isOwner) {
      // Si el grupo no se encuentra con ese ID *y* asociado a este docente
      return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece' });
    }
    // --- Fin Verificación de Seguridad ---


    // --- Buscar membresías 'Aprobado' para este grupo ---
    const approvedMemberships = await Membership.find({
      grupo_id: groupId,
      estado_solicitud: 'Aprobado' // Filtrar solo estudiantes aprobados
    })
    .populate('usuario_id', 'nombre apellidos email tipo_identificacion numero_identificacion'); // 'Poblar' la información del usuario (estudiante)

    // Extraer solo los objetos de usuario (estudiante) de las membresías encontradas
    // Esto devuelve un array de objetos de usuario
    const students = approvedMemberships.map(membership => membership.usuario_id);

    // --- Respuesta ---
    res.status(200).json(students); // Envía la lista de estudiantes

  } catch (error) {
    console.error('Error al obtener estudiantes del grupo:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener estudiantes del grupo', error: error.message });
  }
};


// Controlador para que un usuario (Estudiante) vea la lista de grupos a los que pertenece (aprobado)
const getMyApprovedGroups = async (req, res) => {
  const userId = req.user._id; // Obtenemos el ID del usuario autenticado
  // No necesitamos el tipo de usuario aquí, ya que cualquier usuario puede ser miembro de un grupo (aunque en este LMS solo estudiantes solicitan unirse)

  try {
    // --- Buscar membresías 'Aprobado' para este usuario ---
    const approvedMemberships = await Membership.find({
      usuario_id: userId,
      estado_solicitud: 'Aprobado' // Filtrar solo membresías aprobadas
    })
    .populate('grupo_id', 'nombre codigo_acceso docente_id activo'); // 'Poblar' la información del grupo

    // Extraer solo los objetos de grupo de las membresías encontradas
    const groups = approvedMemberships.map(membership => membership.grupo_id);

    // --- Respuesta ---
    res.status(200).json(groups); // Envía la lista de grupos a los que pertenece el usuario

  } catch (error) {
    console.error('Error al obtener grupos del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener tus grupos', error: error.message });
  }
};


// @desc    Obtener grupos creados por el docente autenticado
// @route   GET /api/groups/docente/me
// Acceso:  Privado/Docente
const getMyOwnedGroups = async (req, res) => {
  try {
    const docenteId = new mongoose.Types.ObjectId(req.user._id);
    const { status } = req.query; // Get status from query parameters

    const matchCriteria = { docente_id: docenteId };

    if (status === 'archived') {
      matchCriteria.activo = false;
    } else { // Default to active if status is 'active', undefined, or any other value
      matchCriteria.activo = true;
    }

    const groupsWithStudentCount = await Group.aggregate([
      { $match: matchCriteria },
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
          _id: 1,
          nombre: 1,
          codigo_acceso: 1,
          docente_id: 1,
          activo: 1,
          limite_estudiantes: 1,
          fecha_creacion: 1,
          approvedStudentCount: 1,
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: groupsWithStudentCount.length,
      data: groupsWithStudentCount
    });

  } catch (error) {
    console.error('Error en getMyOwnedGroups:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los grupos del docente.'
    });
  }
};

// @desc    Obtener todas las membresías de un usuario autenticado con detalles del grupo y estado
// @route   GET /api/groups/my-memberships
// Acceso: Privado
const getMyMembershipsWithStatus = async (req, res) => {
    const userId = req.user._id;

    try {
        // 1. Buscar todas las membresías asociadas a este usuario y poblar el grupo y el docente.
        // Es crucial seleccionar el campo 'activo' del grupo.
        const membershipsWithGroups = await Membership.find({ usuario_id: userId })
            .populate({
                path: 'grupo_id',
                select: 'nombre codigo_acceso docente_id activo', // <-- Asegúrate de incluir 'activo'
                populate: {
                    path: 'docente_id',
                    model: 'User',
                    select: 'nombre apellidos'
                }
            })
            .sort({ createdAt: -1 });

        // 2. Filtrar las membresías:
        //    a) Asegurarse de que el grupo se populó correctamente.
        //    b) Asegurarse de que el grupo esté activo (no archivado).
        const activeMemberships = membershipsWithGroups.filter(membership =>
            membership.grupo_id && membership.grupo_id.activo // <-- Filtra solo grupos activos
        );

        // 3. Filtrar para dejar solo la membresía más reciente por grupo (si el estudiante se unió y salió varias veces)
        //    Esto se mantiene para tu lógica de "uniqueGroups", pero ahora solo con grupos activos.
        const uniqueGroups = new Map();
        for (const membership of activeMemberships) { // <-- Iterar sobre las membresías activas
            const groupId = membership.grupo_id?._id?.toString();
            if (groupId && !uniqueGroups.has(groupId)) {
                uniqueGroups.set(groupId, membership);
            }
        }

        // 4. Mapear la respuesta final
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
            // Opcional: Puedes incluir el estado 'activo' del grupo en la respuesta
            // para que el frontend lo pueda usar, aunque ya esté filtrado.
            is_group_active: membership.grupo_id.activo
        }));

        res.status(200).json(studentGroups);

    } catch (error) {
        console.error('Error al obtener las membresías del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener tus grupos y estados.', error: error.message });
    }
};

// @desc    Actualizar detalles del grupo (nombre, descripcion)
// @route   PUT /api/groups/:groupId
// @access  Privado/Docente
const updateGroup = async (req, res) => {
    const { groupId } = req.params; // ID del grupo a actualizar de la URL
    // Campos permitidos para actualizar: nombre y descripcion
    const { nombre, descripcion } = req.body;
    const docenteId = req.user._id; // ID del docente autenticado

    // Validación básica del ID del grupo
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'ID de grupo inválido' });
    }

    // --- Validación de los campos a actualizar ---

    // Si nombre está definido, debe ser un texto no vacío
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
        return res.status(400).json({ message: 'El nombre, si se proporciona, debe ser un texto no vacío.' });
    }
    // Si descripcion está definida, debe ser un texto. Se permite texto vacío.
    if (descripcion !== undefined && typeof descripcion !== 'string') {
        return res.status(400).json({ message: 'La descripción, si se proporciona, debe ser un texto.' });
    }
    // Si no se proporcionó ni nombre ni descripcion
    if (nombre === undefined && descripcion === undefined) {
        return res.status(400).json({ message: 'Se debe proporcionar al menos el nombre o la descripción para actualizar.' });
    }

    try {
        // Buscar el grupo por ID y verificar que pertenece al docente autenticado
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId });

        if (!group) {
            // Se usa 404 para no revelar si el grupo existe pero pertenece a otro docente
            return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece.' });
        }
        
        // El grupo debe estar activo para ser modificado
        if (!group.activo) {
            return res.status(403).json({ message: 'No se puede modificar un grupo que ha sido desactivado.'});
        }

        // Actualizar los campos permitidos solo si se proporcionaron
        if (nombre !== undefined) {
            group.nombre = nombre.trim(); // Eliminar espacios en blanco alrededor del nombre
        }
        if (descripcion !== undefined) {
            group.descripcion = descripcion;
        }
        // Nota: Campos como limite_estudiantes, codigo_acceso, etc., no se modifican.

        // Guardar los cambios en la base de datos
        const updatedGroup = await group.save();

        // Responder con el grupo actualizado
        res.status(200).json(updatedGroup);

    } catch (error) {
        // Manejo de errores de validación de Mongoose u otros errores
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar el grupo.', errors: messages });
        }
        console.error('Error actualizando grupo:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el grupo.', error: error.message });
    }
};


// @desc    Eliminar un grupo (Soft Delete - Archivar)
// @route   DELETE /api/groups/:groupId
// @access  Privado/Docente
const deleteGroup = async (req, res) => { // ¡Ya no se necesita 'io' aquí!
    const { groupId } = req.params;
    const docenteId = req.user._id; // El docente que archiva el grupo es el 'sender' de la notificación
    const userType = req.user.tipo_usuario;

    if (userType !== 'Docente') {
        return res.status(403).json({ message: 'Solo los docentes pueden archivar grupos.' });
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'ID de grupo inválido.' });
    }

    try {
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId });

        if (!group) {
            return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece.' });
        }

        if (!group.activo) {
            return res.status(200).json({ message: 'El grupo ya se encuentra archivado.' });
        }

        group.activo = false;
        group.archivedAt = new Date(); // Asegúrate de que tu modelo Group tenga este campo
        await group.save();

        // *** GENERAR LA NOTIFICACIÓN PARA LOS ESTUDIANTES USANDO TU NotificationService ***

        // 1. Obtener los IDs de los estudiantes que eran miembros aprobados de este grupo
        const approvedMemberships = await Membership.find({
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).select('usuario_id');

        const studentUserIds = approvedMemberships.map(m => m.usuario_id.toString());

        // 2. Crear notificaciones individuales para cada estudiante afectado
        const notificationPromises = studentUserIds.map(async (studentId) => {
            try {
                await NotificationService.createNotification({
                    recipient: studentId,
                    sender: docenteId, // El docente que archivó el grupo
                    type: 'GROUP_ARCHIVED', // Nuevo tipo de notificación. Asegúrate de definir este tipo en tu frontend para manejar el mensaje adecuado.
                    message: `El grupo "${group.nombre}" al que pertenecías ha sido archivado y ya no está activo.`,
                    link: '/student/groups' // Link a la página donde verán sus grupos (ahora sin el archivado)
                    // No necesitas pasar 'ioInstance' aquí, NotificationService lo obtiene de 'global.io'
                });
            } catch (notifError) {
                console.error(`Error al enviar notificación de archivado al estudiante ${studentId}:`, notifError);
            }
        });

        // Espera a que todas las promesas de notificación se resuelvan (o fallen)
        await Promise.allSettled(notificationPromises);


        res.status(200).json({ message: 'Grupo archivado exitosamente.' });

    } catch (error) {
        console.error('Error archivando el grupo:', error);
        res.status(500).json({ message: 'Error interno del servidor al archivar el grupo', error: error.message });
    }
};

// @desc    Eliminar un estudiante de un grupo (eliminar membresía aprobada)
// @route   DELETE /api/groups/:groupId/students/:studentId
// @access  Privado/Docente
const removeStudentFromGroup = async (req, res) => {
  // Obtiene los IDs del grupo y del estudiante de los parámetros de la URL
  const { groupId, studentId } = req.params;
  const docenteId = req.user._id; // ID del docente autenticado
  const userType = req.user.tipo_usuario; // Tipo de usuario

  // Verificación de Permiso (redundante si la ruta usa authorize)
  if (userType !== 'Docente') {
      return res.status(403).json({ message: 'Solo los docentes pueden eliminar estudiantes de los grupos' });
  }

   // Validación básica de los IDs
   if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(studentId)) {
       return res.status(400).json({ message: 'IDs de grupo o estudiante inválidos' });
  }

  try {
      // --- Verificación de Propiedad: Verificar que el Docente es dueño del Grupo ---
      // Refactor: Use isTeacherOfGroup
      const isOwner = await isTeacherOfGroup(docenteId, groupId);
      if (!isOwner) {
           // Se usa 404 para no revelar si el grupo existe pero pertenece a otro
          return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece' });
      }
      // --- Fin Verificación de Propiedad ---


      // --- Encontrar y Eliminar la Membresía Aprobada ---
      // Buscamos la membresía específica para este grupo y estudiante,
      // asegurándonos de que su estado_solicitud sea 'Aprobado'.
      // Usamos findOneAndDelete para encontrar y eliminar en una sola operación.
      const membership = await Membership.findOneAndDelete({
           grupo_id: groupId, // La membresía es de este grupo
           usuario_id: studentId, // La membresía es de este estudiante
           estado_solicitud: 'Aprobado' // Solo eliminamos membresías que estén 'Aprobado'
      });

      // Si no se encontró una membresía aprobada para este estudiante en este grupo
      if (!membership) {
           // Esto puede significar que el estudiante no está en el grupo, o está pero no ha sido aprobado.
           // Se usa 404 para no revelar el estado exacto.
           return res.status(404).json({ message: 'Estudiante no encontrado en este grupo como miembro aprobado.' });
      }

      // --- Considerar Impacto en Progreso y Entregas ---
      // Nota: Al eliminar la membresía, el estudiante ya no está vinculado al grupo.
      // Los documentos de Submission y Progress relacionados con este grupo/ruta por este estudiante
      // seguirán existiendo en la base de datos, pero ahora están vinculados a un usuario
      // cuya membresía para ese grupo ha sido eliminada.
      // Para esta implementación básica, NO eliminamos ni modificamos submissions/progress.
      // Un sistema más avanzado podría archivar el progreso/entregas, notificar, o preguntar al docente cómo proceder.
      console.log(`Membresía aprobada de estudiante ${studentId} eliminada del grupo ${groupId}. Submissions/Progress relacionados no fueron eliminados.`);
      // --- Fin Consideración de Impacto ---


      // Respuesta de éxito
      res.status(200).json({ message: 'Estudiante eliminado exitosamente del grupo.' });

  } catch (error) {
       console.error('Error al eliminar estudiante del grupo:', error);
       res.status(500).json({ message: 'Error interno del servidor al eliminar el estudiante del grupo', error: error.message });
  }
};

// @desc    Obtener detalles de un grupo por su ID
// @route   GET /api/groups/:groupId
// Acceso: Privado/Docente (dueño del grupo)
const getGroupById = async (req, res, next) => {
  try {
    const groupId = req.params.groupId; // Obtiene el ID del grupo de los parámetros de la URL
    const docenteId = req.user._id; // Obtiene el ID del docente logueado del objeto req.user

    // 1. Verificar que el usuario logueado es el dueño de este grupo
    // Refactor: Use isTeacherOfGroup
    const isOwner = await isTeacherOfGroup(docenteId, groupId);
    if (!isOwner) {
      // No revelar si el grupo existe pero no pertenece, o no existe en absoluto.
      return res.status(403).json({ message: 'No tienes permiso para acceder a este grupo o el grupo no existe.' });
    }

    // 2. Si es el dueño, buscar el grupo por su ID para devolverlo
    const group = await Group.findOne({ _id: groupId, docente_id: docenteId }); // Eliminamos 'activo: true' de esta búsqueda inicial
    // Esta segunda búsqueda es necesaria porque isTeacherOfGroup solo devuelve boolean.
    // Debería existir si isOwner es true, pero es una buena práctica verificar.
    if (!group) {
        // Esto podría indicar un problema de consistencia de datos si isOwner fue true.
        console.error(`Error de consistencia: Grupo ${groupId} no encontrado después de confirmar propiedad para docente ${docenteId}.`);
        return res.status(404).json({ message: `Grupo no encontrado con ID ${groupId}.` });
    }

    // Nueva verificación para el estado 'activo'
    if (group.activo !== true) {
        return res.status(400).json({ message: "Tu grupo no está activo, seguramente está archivado y no puedes ver los detalles." });
    }

    // 3. Si todo es correcto, responder con el objeto del grupo
    res.status(200).json(group);

  } catch (error) {
    console.error('Error al obtener grupo por ID:', error);
    // 5. Manejar error si el ID proporcionado no es un formato válido de ObjectId (CastError)
     if (error.name === 'CastError') {
         return res.status(400).json({ message: `ID de grupo no válido.` });
         // Si usas ErrorResponse: return next(new ErrorResponse(`ID de grupo no válido.`, 400));
     }
    // 6. Manejar otros errores internos del servidor
    res.status(500).json({ message: 'Error interno del servidor al obtener el grupo.', error: error.message });
    // Si usas ErrorResponse: next(error);
  }
};


// @desc    Obtener todas las membresías (estudiantes y estado) de un grupo específico
// @route   GET /api/groups/:groupId/memberships
// Acceso: Privado/Docente (dueño del grupo)
const getGroupMemberships = async (req, res, next) => {
    try {
        const groupId = req.params.groupId; // Obtiene el ID del grupo de los parámetros de la URL
        const docenteId = req.user._id; // Obtiene el ID del docente logueado

        // 1. Primero, verificar que el usuario logueado es el dueño del grupo
        // Es crucial hacer esta verificación ANTES de buscar las membresías para evitar exponer datos.
        // Refactor: Use isTeacherOfGroup
        const isOwner = await isTeacherOfGroup(docenteId, groupId);
        if (!isOwner) {
            // No revelar si el grupo existe pero no pertenece, o no existe en absoluto.
            return res.status(403).json({ message: 'No tienes permiso para ver las membresías de este grupo o el grupo no existe.' });
        }

        // 2. Si el docente es el dueño, buscar todas las membresías para este grupo
        // No filtramos por estado aquí; queremos TODAS las membresías asociadas a este grupo.
        // 3. Poblar la información del usuario (estudiante) asociado a cada membresía.
        // Seleccionamos los campos nombre, apellidos y email para mostrar en el frontend.
        const memberships = await Membership.find({ grupo_id: groupId })
            .populate('usuario_id', 'nombre apellidos email'); // <-- Pobla el campo 'usuario_id'


        // 4. Responder con la lista de documentos de membresía.
        // Cada documento de membresía en este array incluirá:
        // - _id (de la membresía)
        // - usuario_id (el objeto del estudiante poblado, con _id, nombre, apellidos, email)
        // - grupo_id (ObjectId del grupo)
        // - estado_solicitud (el estado de la membresía)
        // - etc (otros campos de la membresía)
        res.status(200).json(memberships); // Envía el array de documentos de membresía con usuario poblado

    } catch (error) {
        console.error('Error al obtener membresías del grupo:', error);
        // 5. Manejar error si el ID de grupo no es válido
         if (error.name === 'CastError') {
             return res.status(400).json({ message: `ID de grupo no válido.` });
             // Si usas ErrorResponse: return next(new ErrorResponse(`ID de grupo no válido.`, 400));
         }
        // 6. Manejar otros errores internos del servidor
        res.status(500).json({ message: 'Error interno del servidor al obtener las membresías.', error: error.message });
        // Si usas ErrorResponse: next(error);
    }
};


// @desc    Eliminar una membresía de estudiante de un grupo por ID de membresía
// @route   DELETE /api/groups/:groupId/memberships/:membershipId
// @access  Privado/Docente
const removeMembershipById = async (req, res) => {
  const { groupId, membershipId } = req.params;
  const docenteId = req.user._id;

  // Validación básica de los IDs
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ message: 'ID de grupo inválido.' });
  }
  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
    return res.status(400).json({ message: 'ID de membresía inválido.' });
  }

  try {
    // 1. Verificar que el docente es dueño del grupo
    const isOwner = await isTeacherOfGroup(docenteId, groupId);
    if (!isOwner) {
      // Usar 403 para indicar prohibido si el grupo existe pero no le pertenece,
      // o 404 si queremos ocultar la existencia del grupo. Para consistencia con otros endpoints, 403 es apropiado si el grupo existe.
      // Sin embargo, isTeacherOfGroup no diferencia entre "no encontrado" y "no pertenece".
      // Si isTeacherOfGroup devuelve false porque el grupo no existe, un 404 sería más preciso.
      // Asumamos que isTeacherOfGroup implica que el grupo existe si devuelve true.
      // Si el grupo no existe, Group.findById(groupId) dentro de isTeacherOfGroup fallaría o devolvería null.
      // Para simplificar, si no es dueño, puede ser que el grupo no exista o no le pertenezca.
      return res.status(403).json({ message: 'No tienes permiso para modificar este grupo o el grupo no existe.' });
    }

    // 2. Encontrar la membresía por su ID
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res.status(404).json({ message: 'Membresía no encontrada.' });
    }

    // 3. Verificar que la membresía pertenece al grupo especificado
    if (membership.grupo_id.toString() !== groupId) {
      // Esto indica una inconsistencia o un intento de usar una membresía de otro grupo.
      return res.status(400).json({ message: 'La membresía no pertenece al grupo especificado.' });
    }
    
    // (Opcional) Verificar el estado de la membresía.
    // La tarea del frontend es remover estudiantes (generalmente 'Aprobado' o 'Pendiente').
    // Si se quisiera restringir a solo 'Aprobado', se añadiría:
    // if (membership.estado_solicitud !== 'Aprobado') {
    //   return res.status(400).json({ message: 'Solo se pueden remover membresías aprobadas. Esta membresía está ' + membership.estado_solicitud });
    // }
    // Para el caso de uso actual, cualquier estado de membresía puede ser eliminado por el docente.

    // 4. Eliminar la membresía
    await Membership.findByIdAndDelete(membershipId);

    // Notificar al estudiante (opcional, pero buena práctica)
    try {
        if (membership.usuario_id && membership.grupo_id) {
            const group = await Group.findById(membership.grupo_id); // Fetch group name
            const groupName = group ? group.nombre : 'un grupo';
            const studentId = membership.usuario_id;
            
            await NotificationService.createNotification({
                recipient: studentId,
                sender: docenteId, // Teacher who performed the action
                type: 'MEMBERSHIP_REMOVED', // A new type for this action
                message: `Has sido removido del grupo '${groupName}' por el docente.`,
                // link: '/student/groups/my-groups' // Link to student's group page or dashboard
            });
        }
    } catch (notificationError) {
        console.error('Error al enviar notificación de remoción de membresía:', notificationError);
        // No detener la operación principal por error de notificación
    }


    res.status(200).json({ message: 'Membresía eliminada exitosamente del grupo.' });

  } catch (error) {
    console.error('Error al eliminar membresía del grupo:', error);
    // Manejar otros errores, como problemas de conexión a la BD
    res.status(500).json({ message: 'Error interno del servidor al eliminar la membresía.', error: error.message });
  }
};


// @desc    Restaurar un grupo archivado (marcarlo como activo)
// @route   PUT /api/groups/:groupId/restore
// @access  Privado/Docente
const restoreGroup = async (req, res) => {
  const { groupId } = req.params;
  const docenteId = req.user._id;

  // Validación básica del ID del grupo
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
    // Buscar el grupo por ID y verificar que pertenece al docente autenticado
    // No filtramos por activo: true aquí, ya que queremos encontrarlo incluso si está archivado.
    const group = await Group.findOne({ _id: groupId, docente_id: docenteId });

    if (!group) {
      // Si no encuentra el grupo con ese ID Y que pertenezca a este docente
      return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece.' });
    }

    // Si el grupo ya está activo, simplemente devolverlo o un mensaje específico
    if (group.activo) {
      return res.status(200).json({ message: 'El grupo ya está activo.', group });
    }

    // Restaurar el grupo
    group.activo = true;
    group.archivedAt = null; // Clear archive date
    await group.save();

    res.status(200).json({ message: 'Grupo restaurado exitosamente.', group });

  } catch (error) {
    console.error('Error restaurando grupo:', error);
    res.status(500).json({ message: 'Error interno del servidor al restaurar el grupo.', error: error.message });
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