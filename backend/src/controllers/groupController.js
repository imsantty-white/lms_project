// src/controllers/groupController.js

const dotenv = require('dotenv'); // Necesario si no estás seguro de que dotenv se carga al inicio
dotenv.config();
const mongoose = require('mongoose'); 
const Group = require('../models/GroupModel'); // Importamos el modelo de Grupo
const { generateUniqueCode } = require('../utils/codeGenerator'); // Importamos nuestra utilidad para códigos
const Membership = require('../models/MembershipModel'); // Importamos el modelo de Membresía
const User = require('../models/UserModel');

const MAX_GROUPS_PER_DOCENTE = parseInt(process.env.MAX_GROUPS_PER_DOCENTE, 3) || 3; // Límite por defecto: 3

// @desc    Crear un nuevo grupo
// @route   POST /api/groups/create
// @access  Privado/Docente
const createGroup = async (req, res) => {
  // Aceptar nombre y limite_estudiantes del cuerpo de la petición
  const { nombre, limite_estudiantes } = req.body;
  const docenteId = req.user._id;

  // --- Validación básica ---
  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del grupo es obligatorio' });
  }
  // Opcional: Validar que limite_estudiantes si se proporciona sea un número no negativo
  if (limite_estudiantes !== undefined) {
      if (typeof limite_estudiantes !== 'number' || limite_estudiantes < 0) {
          return res.status(400).json({ message: 'El límite de estudiantes debe ser un número no negativo' });
      }
  }
  // --- Fin Validación básica ---


  // *** INICIO del ÚNICO bloque try ***
  try {

    // --- Implementación Limitación: Número Máximo de Grupos por Docente ---
    const groupCount = await Group.countDocuments({ docente_id: docenteId });

    if (groupCount >= MAX_GROUPS_PER_DOCENTE) {
        return res.status(400).json({ message: `Has alcanzado el límite máximo de grupos (${MAX_GROUPS_PER_DOCENTE}) que puedes crear.` });
    }
    // --- Fin Implementación Limitación ---


    // --- Generar un código de acceso único ---
    let uniqueCodeFound = false;
    let codigo_acceso;
    const maxAttempts = 10;
    let attempts = 0;

    while (!uniqueCodeFound && attempts < maxAttempts) {
        codigo_acceso = generateUniqueCode();
        // Esta operación de BD está dentro del try
        const existingGroup = await Group.findOne({ codigo_acceso });
        if (!existingGroup) {
            uniqueCodeFound = true;
        }
        attempts++;
    }

    // Si no se encontró un código único después de varios intentos, devolvemos el error desde aquí.
    // Este return sale de la función dentro del try.
    if (!uniqueCodeFound) {
        console.error('Error al generar código de acceso único después de varios intentos.');
        return res.status(500).json({ message: 'No se pudo generar un código de acceso único para el grupo. Por favor, inténtalo de nuevo.' });
    }
    // --- Fin Generar código ---


    // --- Crear el nuevo grupo ---
    // Esta operación de BD también está dentro del try
    const group = await Group.create({
      nombre,
      codigo_acceso,
      docente_id: docenteId,
      limite_estudiantes: limite_estudiantes !== undefined ? limite_estudiantes : 0 // Usar el límite proporcionado o 0 por defecto
    });
    // --- Fin Crear grupo ---


    // --- Respuesta exitosa ---
    res.status(201).json(group);
    // --- Fin Respuesta ---

  } catch (error) { // *** INICIO del ÚNICO bloque catch para manejar cualquier excepción en el try ***
    // Este catch atrapará errores de las operaciones de BD (findOne, create)
    console.error('Error creando grupo:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear el grupo', error: error.message });
  } // *** FIN del bloque catch ***
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
      const group = await Group.findOne({ codigo_acceso: codigo_acceso.toUpperCase() }); // Buscar usando el código en mayúsculas

      // Si el grupo no existe
      if (!group) {
          return res.status(404).json({ message: 'Grupo no encontrado con ese código de acceso' });
      }
      // --- Fin Buscar grupo ---


      // --- Verificar si el estudiante ya es miembro o ya envió una solicitud pendiente ---
      const existingMembership = await Membership.findOne({
          usuario_id: userId,
          grupo_id: group._id,
          // Podemos verificar por cualquier estado (Pendiente, Aprobado) para evitar duplicados,
          // o solo por Pendiente/Aprobado si permitimos reenviar después de rechazo.
          // Para empezar, verifiquemos Pendiente o Aprobado:
          estado_solicitud: { $in: ['Pendiente', 'Aprobado'] }
      });

      if (existingMembership) {
          let message = 'Ya eres miembro de este grupo.';
          if (existingMembership.estado_solicitud === 'Pendiente') {
              message = 'Ya enviaste una solicitud a este grupo y está pendiente de aprobación.';
          }
          return res.status(400).json({ message: message });
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
      // Comparamos el ID del docente autenticado con el ID del docente creador del grupo asociado a la membresía
      if (!membership.grupo_id || !membership.grupo_id.docente_id.equals(docenteId)) {
           // Usamos .equals() para comparar ObjectIds de Mongoose
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
    const group = await Group.findOne({ _id: groupId, docente_id: docenteId });

    if (!group) {
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
    .populate('grupo_id', 'nombre codigo_acceso docente_id'); // 'Poblar' la información del grupo

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

    const groupsWithStudentCount = await Group.aggregate([
      { $match: { docente_id: docenteId } },
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
  const userId = req.user._id; // Obtenemos el ID del usuario autenticado del objeto req.user (gracias al middleware protect)

  try {
    // 1. Buscar todas las membresías asociadas a este usuario, sin filtrar por estado
    // 2. Poblar la información completa del grupo asociado (grupo_id)
    // 3. Dentro del grupo, poblar también la información del docente (si necesitas el nombre del docente, por ejemplo)
    const membershipsWithGroups = await Membership.find({ usuario_id: userId })
      .populate({
        path: 'grupo_id', // El campo en Membership que referencia al Grupo
        select: 'nombre codigo_acceso docente_id', // Campos del Grupo que queremos incluir
        populate: { // Anidar población: dentro del grupo, poblar el docente
          path: 'docente_id', // El campo en Grupo que referencia al Docente
          select: 'nombre apellidos' // Campos del Docente que queremos incluir (ej: solo el nombre)
        }
      });

    // 4. Mapear los resultados para construir la respuesta para el frontend
    const studentGroups = membershipsWithGroups.map(membership => ({
      // Incluye los detalles del grupo poblado
      _id: membership.grupo_id._id, // ID del grupo
      nombre: membership.grupo_id.nombre, // Nombre del grupo
      codigo_acceso: membership.grupo_id.codigo_acceso, // Código de acceso del grupo
      // Información del docente poblado (si existe)
      docente: membership.grupo_id.docente_id ? {
          _id: membership.grupo_id.docente_id._id,
          nombre: membership.grupo_id.docente_id.nombre, // Nombre del docente
          apellidos: membership.grupo_id.docente_id.apellidos
      } : null,
      // Incluye el estado de la solicitud de la membresía actual
      student_status: membership.estado_solicitud, // Mapeamos el nombre backend 'estado_solicitud' a frontend 'student_status'
      // Incluye el ID de la membresía por si es necesario para acciones futuras (ej: cancelar solicitud)
      membership_id: membership._id
      // Puedes añadir otras propiedades del grupo desde membership.grupo_id si las necesitas
    }));

    // 5. Enviar la respuesta con la lista de grupos y sus estados
    res.status(200).json(studentGroups);

  } catch (error) {
    console.error('Error al obtener las membresías del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener tus grupos y estados.', error: error.message });
  }
};

// @desc    Actualizar detalles del grupo (nombre, limite_estudiantes)
// @route   PUT /api/groups/:groupId
// @access  Privado/Docente
const updateGroup = async (req, res) => {
  const { groupId } = req.params; // ID del grupo a actualizar de la URL
  // Campos permitidos para actualizar desde el cuerpo de la petición
  const { nombre, limite_estudiantes } = req.body;
  const docenteId = req.user._id; // ID del docente autenticado
  const userType = req.user.tipo_usuario; // Tipo de usuario

  // Verificación de Permiso: Solo docentes pueden usar esta ruta (redundante si la ruta usa authorize)
  if (userType !== 'Docente') {
      return res.status(403).json({ message: 'Solo los docentes pueden actualizar grupos' });
  }

   // Validación básica del ID del grupo
   if (!mongoose.Types.ObjectId.isValid(groupId)) {
       return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  // Validación de los campos a actualizar si se proporcionaron
  // Si nombre está definido, debe ser string y no vacío
  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
       return res.status(400).json({ message: 'El nombre debe ser un texto no vacío si se proporciona' });
  }
   // Si limite_estudiantes está definido, debe ser un número no negativo
   if (limite_estudiantes !== undefined) {
       if (typeof limite_estudiantes !== 'number' || limite_estudiantes < 0) {
           return res.status(400).json({ message: 'El límite de estudiantes debe ser un número no negativo si se proporciona' });
       }
   }
   // Si no se proporcionó ni nombre ni limite_estudiantes en el cuerpo
   if (nombre === undefined && limite_estudiantes === undefined) {
        return res.status(400).json({ message: 'Se debe proporcionar al menos el nombre o el límite de estudiantes para actualizar' });
   }


  try {
      // Buscar el grupo por ID y verificar que pertenece al docente autenticado
      const group = await Group.findOne({ _id: groupId, docente_id: docenteId });

      // Si el grupo no existe o no es propiedad de este docente
      if (!group) {
          // Se usa 404 para no revelar si el grupo existe pero pertenece a otro
          return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece' });
      }

      // Actualizar los campos permitidos solo si se proporcionaron en el cuerpo de la petición
      if (nombre !== undefined) {
          group.nombre = nombre.trim(); // Eliminar espacios en blanco alrededor del nombre
      }
       if (limite_estudiantes !== undefined) {
           group.limite_estudiantes = limite_estudiantes;
       }
      // Nota: Campos como docente_id, codigo_acceso, activo no se cambian aquí.

      // Guardar los cambios en la base de datos
      await group.save();

      // Responder con el grupo actualizado
      res.status(200).json(group);

  } catch (error) {
      // Manejo de errores de validación de Mongoose u otros errores
      if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors).map(val => val.message);
          return res.status(400).json({ message: 'Error de validación al actualizar grupo', errors: messages });
      }
      console.error('Error actualizando grupo:', error);
      res.status(500).json({ message: 'Error interno del servidor al actualizar el grupo', error: error.message });
  }
};


// @desc    Eliminar un grupo
// @route   DELETE /api/groups/:groupId
// @access  Privado/Docente
const deleteGroup = async (req, res) => {
  const { groupId } = req.params; // ID del grupo a eliminar de la URL
  const docenteId = req.user._id; // ID del docente autenticado
  const userType = req.user.tipo_usuario; // Tipo de usuario

  // Verificación de Permiso: Solo docentes pueden usar esta ruta
  if (userType !== 'Docente') {
      return res.status(403).json({ message: 'Solo los docentes pueden eliminar grupos' });
  }

   // Validación básica del ID del grupo
   if (!mongoose.Types.ObjectId.isValid(groupId)) {
       return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
      // Buscar el grupo por ID y verificar que pertenece al docente autenticado
      const group = await Group.findOne({ _id: groupId, docente_id: docenteId });

      // Si el grupo no existe o no es propiedad de este docente
      if (!group) {
           // Se usa 404 para no revelar si el grupo existe pero pertenece a otro
          return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece' });
      }

      // --- Verificación para EVITAR eliminar si hay datos relacionados ---
      // Para simplificar y evitar la complejidad de la "eliminación en cascada" (borrar membresías, asignaciones, entregas, progresos),
      // vamos a impedir la eliminación del grupo si tiene CUALQUIER membresía asociada (pendiente o aprobada).
      // Si hay miembros, significa que hay estudiantes que podrían tener asignaciones, entregas, etc.
      const relatedMembershipCount = await Membership.countDocuments({ grupo_id: groupId });

      if (relatedMembershipCount > 0) {
           // Si se encuentra al menos una membresía asociada a este grupo, no se permite eliminar.
           // Se usa 409 Conflict para indicar que la petición no puede ser completada debido a un conflicto con el estado actual del recurso.
           return res.status(409).json({ message: 'No se puede eliminar el grupo porque tiene estudiantes o solicitudes de unión asociadas. Elimina primero a todos los miembros y solicitudes pendientes.' });
      }

      // NOTA: En un sistema más robusto, podrías necesitar verificar también:
      // - Si hay ContentAssignment asociados a este grupo
      // - Si hay Submission asociadas a este grupo
      // - Si hay Progress asociados a este grupo
      // O implementar una lógica de "eliminación suave" (ej: marcar el grupo como inactivo en lugar de borrarlo).
      // Para esta etapa, impedir la eliminación si hay miembros es una salvaguarda razonable.


      // Si no hay miembros asociados, procedemos con la eliminación del documento del grupo
      // Usamos findByIdAndDelete para encontrar y eliminar en una sola operación
      await Group.findByIdAndDelete(groupId);

      // En un escenario con eliminación en cascada, aquí también borrarías:
      // - Todas las Membership donde grupo_id = groupId
      // - Todas las ContentAssignment donde group_id = groupId
      // - Todas las Submission donde group_id = groupId
      // - Todos los Progress donde group_id = groupId
      // Esto es complejo y no se implementa aquí para mantener el foco,
      // por eso impedimos la eliminación si hay miembros.


      // Respuesta de éxito
      res.status(200).json({ message: 'Grupo eliminado exitosamente' });

  } catch (error) {
       console.error('Error eliminando grupo:', error);
       res.status(500).json({ message: 'Error interno del servidor al eliminar el grupo', error: error.message });
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
      const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
      // Si el grupo no existe o no pertenece a este docente
      if (!group) {
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

    // 1. Buscar el grupo por su ID
    const group = await Group.findById(groupId);

    // 2. Si el grupo no existe, enviar respuesta 404
    if (!group) {
      return res.status(404).json({ message: `Grupo no encontrado con ID ${groupId}` });
      // Si usas ErrorResponse: return next(new ErrorResponse(`Grupo no encontrado con ID ${groupId}`, 404));
    }

    // 3. Verificar que el usuario logueado es el dueño de este grupo
    // Es importante comparar los ObjectIds de forma segura, aunque .equals() es una buena práctica
     if (!group.docente_id.equals(docenteId)) {
       // Si no es el dueño, enviar respuesta 403 (Prohibido)
       return res.status(403).json({ message: 'No tienes permiso para acceder a este grupo.' });
       // Si usas ErrorResponse: return next(new ErrorResponse('No tienes permiso para acceder a este grupo.', 403));
     }
     // Alternativa con toString (menos Mongoose-idiomática pero funciona):
     // if (group.docente_id.toString() !== docenteId.toString()) { ... }


    // 4. Si todo es correcto (grupo existe y el docente es el dueño), responder con el objeto del grupo
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
        const group = await Group.findById(groupId);

        if (!group) {
             return res.status(404).json({ message: `Grupo no encontrado con ID ${groupId}` });
             // Si usas ErrorResponse: return next(new ErrorResponse(`Grupo no encontrado con ID ${groupId}`, 404));
        }

         if (!group.docente_id.equals(docenteId)) {
             return res.status(403).json({ message: 'No tienes permiso para ver las membresías de este grupo.' });
             // Si usas ErrorResponse: return next(new ErrorResponse('No tienes permiso para ver las membresías de este grupo.', 403));
         }
         // Alternativa con toString:
         // if (group.docente_id.toString() !== docenteId.toString()) { ... }


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


// ... exportación de todas las funciones del controlador ...

module.exports = {
  createGroup,
  requestJoinGroup,
  getMyJoinRequests,
  respondJoinRequest,
  getGroupStudents,
  getMyApprovedGroups,
  updateGroup,
  deleteGroup,
  removeStudentFromGroup,
  getMyOwnedGroups,
  getMyMembershipsWithStatus,
  getGroupById,
  getGroupMemberships
};