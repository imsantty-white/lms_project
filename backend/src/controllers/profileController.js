const User = require('../models/UserModel');
const Group = require('../models/GroupModel'); // Added GroupModel
const Membership = require('../models/MembershipModel'); // Added MembershipModel

// Obtener perfil del usuario autenticado
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-contrasena_hash');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
  }
};

// Actualizar perfil del usuario autenticado
exports.updateProfile = async (req, res) => {
  try {
    const { nombre, apellidos, telefono, institucion, fecha_nacimiento, tipo_identificacion, numero_identificacion } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Solo actualiza los campos permitidos
    if (nombre !== undefined) user.nombre = nombre;
    if (apellidos !== undefined) user.apellidos = apellidos;
    if (telefono !== undefined) user.telefono = telefono;
    if (institucion !== undefined) user.institucion = institucion;
    if (fecha_nacimiento !== undefined) user.fecha_nacimiento = fecha_nacimiento;
    if (tipo_identificacion !== undefined) user.tipo_identificacion = tipo_identificacion;
    if (numero_identificacion !== undefined) user.numero_identificacion = numero_identificacion;

    await user.save();
    res.json({ message: 'Perfil actualizado correctamente', user: user.toObject() });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el perfil', error: error.message });
  }
};

// Obtener perfil de un estudiante específico por parte de un docente
exports.getStudentProfileForTeacher = async (req, res) => {
  try {
    // 1. Autenticación: Verificar que el usuario es un Docente
    if (req.user.tipo_usuario !== 'Docente') {
      return res.status(403).json({ message: 'Acceso denegado. Solo los docentes pueden realizar esta acción.' });
    }

    const teacherId = req.user._id;
    const studentIdToView = req.params.userId;

    // 2. Fetch Target User (Estudiante)
    const studentUser = await User.findById(studentIdToView).select('-contrasena_hash');
    if (!studentUser) {
      return res.status(404).json({ message: 'Estudiante no encontrado.' });
    }
    // Adicionalmente, asegurarse que el usuario encontrado es un Estudiante
    if (studentUser.tipo_usuario !== 'Estudiante') {
        return res.status(403).json({ message: 'El perfil solicitado no pertenece a un estudiante.' });
    }

    // 3. Autorización: Verificar la relación Docente-Estudiante
    // Encontrar los grupos donde el docente es el creador
    const teacherGroups = await Group.find({ docente_id: teacherId }).select('_id');
    if (!teacherGroups.length) {
      // El docente no tiene grupos, por lo tanto no puede tener estudiantes aprobados.
      return res.status(403).json({ message: 'No estás autorizado para ver el perfil de este estudiante.' });
    }

    const teacherGroupIds = teacherGroups.map(group => group._id);

    // Verificar si el estudiante es miembro APROBADO o PENDIENTE de alguno de los grupos del docente
    const membership = await Membership.findOne({
      grupo_id: { $in: teacherGroupIds },
      usuario_id: studentIdToView,
      estado_solicitud: { $in: ['Aprobado', 'Pendiente'] }, // <-- permite ambos estados
    });

    if (!membership) {
      // Si no se encuentra una membresía que cumpla con los criterios, el docente no está autorizado.
      return res.status(403).json({ message: 'No estás autorizado para ver el perfil de este estudiante o el estudiante no está aprobado en tus grupos.' });
    }

    // 4. Return Profile
    res.json(studentUser);

  } catch (error) {
    console.error('Error en getStudentProfileForTeacher:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del estudiante', error: error.message });
  }
};

// Obtener perfil de cualquier usuario por parte de un administrador
exports.getUserProfileForAdmin = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.' });
    }
    const userIdToView = req.params.userId;
    const user = await User.findById(userIdToView).select('-contrasena_hash');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil del usuario', error: error.message });
  }
};