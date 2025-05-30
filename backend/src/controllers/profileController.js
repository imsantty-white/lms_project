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
    const user = await User.findById(req.user._id).select('-contrasena_hash');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user.toObject());
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
// @route   GET /api/profile/admin/:userId (Asegúrate que esta ruta corresponda a la de tu router)
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
    res.json(user.toObject());

  } catch (error) {
    console.error('Error en getUserProfileForAdmin:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario', error: error.message });
  }
};

// Único bloque de exportación al final del archivo
module.exports = {
    getProfile,
    updateProfile,
    getStudentProfileForTeacher,
    getUserProfileForAdmin,
};