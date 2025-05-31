// src/controllers/profileController.js

const User = require('../models/UserModel');
const Group = require('../models/GroupModel');
const Membership = require('../models/MembershipModel');
const mongoose = require('mongoose');

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/profile
// @access  Privado
const getProfile = async (req, res) => {
  try {
    // MODIFICACIÓN: Solo excluir contrasena_hash. numero_identificacion SÍ se enviará.
    const user = await User.findById(req.user._id).select('-contrasena_hash');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const userObject = user.toObject();

    if (userObject.tipo_usuario === 'Estudiante') {
        try {
            const count = await Membership.countDocuments({
                usuario_id: userObject._id,
                estado_solicitud: 'Aprobado'
            });
            userObject.numero_grupos_unidos = count;
        } catch (countError) {
            console.error(`Error al contar grupos para el propio estudiante ${userObject._id}:`, countError);
        }
    }

    // numero_identificacion estará presente en userObject si existe en el documento y no se excluyó.
    res.json(userObject);

  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
  }
};

// @desc    Actualizar perfil del usuario autenticado
// @route   PUT /api/profile
// @access  Privado
const updateProfile = async (req, res) => {
  try {
    const { nombre, apellidos, telefono, institucion, fecha_nacimiento, tipo_identificacion, numero_identificacion } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (nombre !== undefined) user.nombre = nombre;
    if (apellidos !== undefined) user.apellidos = apellidos;
    if (telefono !== undefined) user.telefono = telefono;
    if (institucion !== undefined) user.institucion = institucion;
    if (fecha_nacimiento !== undefined) user.fecha_nacimiento = fecha_nacimiento;
    if (tipo_identificacion !== undefined) user.tipo_identificacion = tipo_identificacion;
    if (numero_identificacion !== undefined) user.numero_identificacion = numero_identificacion;

    await user.save();
    res.json({ 
        success: true,
        message: 'Perfil actualizado correctamente', 
        user: user.toObject() 
    });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil', error: error.message });
  }
};

// @desc    Obtener perfil de un estudiante específico por parte de un docente
// @route   GET /api/profile/:userId  (Asegúrate que esta ruta corresponda a la de tu router)
// @access  Privado (Docente)
const getStudentProfileForTeacher = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const studentIdToView = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(studentIdToView)) {
        return res.status(400).json({ message: 'ID de estudiante inválido.' });
    }

    if (req.user.tipo_usuario !== 'Docente') {
      return res.status(403).json({ message: 'Acceso denegado. Solo los docentes pueden realizar esta acción.' });
    }

    const studentUser = await User.findById(studentIdToView).select('-contrasena_hash');
    if (!studentUser) {
      return res.status(404).json({ message: 'Estudiante no encontrado.' });
    }
    if (studentUser.tipo_usuario !== 'Estudiante') {
        return res.status(403).json({ message: 'El perfil solicitado no pertenece a un estudiante.' });
    }

    const teacherGroups = await Group.find({ docente_id: teacherId }).select('_id');
    if (!teacherGroups.length) {
      return res.status(403).json({ message: 'No estás autorizado para ver este perfil (no tienes grupos).' });
    }

    const teacherGroupIds = teacherGroups.map(group => group._id);

    const membership = await Membership.findOne({
      grupo_id: { $in: teacherGroupIds },
      usuario_id: studentIdToView,
      estado_solicitud: { $in: ['Aprobado', 'Pendiente'] },
    });

    if (!membership) {
      return res.status(403).json({ message: 'No estás autorizado para ver el perfil de este estudiante o no pertenece a tus grupos aprobados/pendientes.' });
    }

    res.json(studentUser.toObject());

  } catch (error) {
    console.error('Error en getStudentProfileForTeacher:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del estudiante', error: error.message });
  }
};

// @desc    Obtener perfil de cualquier usuario por parte de un administrador
// @route   GET /api/profile/admin/:userId
// @access  Privado (Administrador)
const getUserProfileForAdmin = async (req, res) => {
  try {
    const userIdToView = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userIdToView)) {
        return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    if (req.user.tipo_usuario !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.' });
    }

    const user = await User.findById(userIdToView).select('-contrasena_hash');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Convertir a objeto plano para poder modificarlo antes de enviar
    const userObject = user.toObject(); 

    // --- INICIO DE LA MODIFICACIÓN ---
    if (userObject.tipo_usuario === 'Estudiante') {
        try {
            const count = await Membership.countDocuments({
                usuario_id: userObject._id, // Usar el _id del perfil que se está viendo
                estado_solicitud: 'Aprobado'
            });
            userObject.numero_grupos_unidos = count;
        } catch (countError) {
            console.error(`Error al contar grupos para estudiante ${userObject._id}:`, countError);
            // No necesariamente hacer fallar la petición, pero el campo no estará.
            // Podrías asignar null o un mensaje de error si prefieres:
            // userObject.numero_grupos_unidos = 'Error al contar'; 
        }
    }
    // --- FIN DE LA MODIFICACIÓN ---

    res.json(userObject); // Enviar el objeto modificado

  } catch (error) {
    console.error('Error en getUserProfileForAdmin:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario', error: error.message });
  }
};

// @desc    Verificar el estado de completitud del perfil del usuario autenticado
// @route   GET /api/profile/completion-status
// @access  Privado (para cualquier usuario autenticado)
const getProfileCompletionStatus = async (req, res) => {
    try {
        // Obtener el usuario directamente desde req.user, ya que está protegido y el perfil ya está cargado
        // o hacer una nueva búsqueda si quieres los campos más actualizados o específicos.
        // Por simplicidad y rendimiento si req.user ya tiene los campos, úsalo.
        // Si no, busca de nuevo:
        const user = await User.findById(req.user._id).select(
            'nombre apellidos institucion tipo_identificacion numero_identificacion fecha_nacimiento telefono tipo_usuario'
        ); // Selecciona solo los campos relevantes para la verificación

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.', isComplete: false });
        }

        let isComplete = true;
        const missingFields = []; // Opcional, para dar más detalle al frontend si lo necesitas

        // Define tus criterios de "perfil completo" aquí
        // Estos son ejemplos, ajústalos a TUS requerimientos
        if (!user.nombre || user.nombre.trim() === '') { isComplete = false; missingFields.push('nombre'); }
        if (!user.apellidos || user.apellidos.trim() === '') { isComplete = false; missingFields.push('apellidos'); }
        
        // Campos que podrían ser opcionales para algunos roles pero no para otros,
        // o que simplemente quieres que estén llenos para considerar el perfil "completo".
        if (!user.institucion || user.institucion.trim() === '') { isComplete = false; missingFields.push('institucion');}
        if (!user.tipo_identificacion) { isComplete = false; missingFields.push('tipo_identificacion');}
        if (!user.numero_identificacion || user.numero_identificacion.trim() === '') { isComplete = false; missingFields.push('numero_identificacion');}
        if (!user.fecha_nacimiento) { isComplete = false; missingFields.push('fecha_nacimiento');}
        
        // El teléfono es obligatorio para docentes en el registro, 
        // podrías considerarlo obligatorio para perfil completo de docente aquí también.
        if (user.tipo_usuario === 'Docente' && (!user.telefono || user.telefono.trim() === '')) {
            isComplete = false;
            missingFields.push('telefono');
        }
        // Para estudiantes, el teléfono es opcional según tu modelo actual. Si también lo quieres para ellos:
        // if (user.tipo_usuario === 'Estudiante' && (!user.telefono || user.telefono.trim() === '')) {
        //     isComplete = false; missingFields.push('telefono');
        // }


        res.json({ isComplete, missingFields }); // missingFields es opcional

    } catch (error) {
        console.error("Error verificando completitud del perfil:", error);
        res.status(500).json({ message: 'Error al verificar el estado del perfil', isComplete: false }); // Asumir incompleto en caso de error del servidor
    }
};

// Único bloque de exportación al final del archivo
module.exports = {
    getProfile,
    updateProfile,
    getStudentProfileForTeacher,
    getUserProfileForAdmin,
    getProfileCompletionStatus
};