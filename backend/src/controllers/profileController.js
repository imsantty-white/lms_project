const User = require('../models/UserModel');

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