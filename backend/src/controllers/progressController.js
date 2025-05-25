// src/controllers/progressController.js

const Progress = require('../models/ProgressModel'); // Modelo de Progreso
const LearningPath = require('../models/LearningPathModel'); // Necesario para verificar la ruta y obtener grupo
const Theme = require('../models/ThemeModel'); // Necesario para verificar que el tema existe y pertenece a la ruta
const Module = require('../models/ModuleModel'); // Necesario para popular el módulo del tema
const Membership = require('../models/MembershipModel'); // Necesario para verificar la membresía del estudiante
const Group = require('../models/GroupModel'); // Necesario para verificación de propiedad del grupo por docente
const User = require('../models/UserModel');   // Necesario para poblar detalles del estudiante
const mongoose = require('mongoose'); // Para validación y comparación de ObjectIds


// @desc    Actualizar el progreso del estudiante para un tema específico
// @route   POST /api/progress/update-theme
// @access  Privado/Estudiante
const updateThemeProgress = async (req, res) => {
    // Obtiene los IDs de la ruta, el tema y el estado del cuerpo de la petición
    const { learningPathId, themeId, status } = req.body;
    const studentId = req.user._id; // ID del estudiante autenticado
    const userType = req.user.tipo_usuario; // Tipo de usuario

    // --- Verificación de Permiso: Solo estudiantes pueden actualizar su progreso ---
    if (userType !== 'Estudiante') {
        return res.status(403).json({ message: 'Solo los estudiantes pueden actualizar su progreso' });
    }
    // --- Fin Verificación de Permiso ---

    // --- Validación básica de entrada ---
    if (!learningPathId || !themeId || !status) {
        return res.status(400).json({ message: 'IDs de ruta y tema, y status son obligatorios' });
    }
    // Validar que los IDs sean ObjectIds válidos
    if (!mongoose.Types.ObjectId.isValid(learningPathId) || !mongoose.Types.ObjectId.isValid(themeId)) {
         return res.status(400).json({ message: 'IDs de ruta de aprendizaje o tema inválidos' });
    }
     // Validar que el estado proporcionado sea uno de los permitidos en el enum del modelo Progress
    const allowedStatuses = ['Visto', 'Completado']; // Debe coincidir con el enum en ProgressModel
    if (!allowedStatuses.includes(status)) {
         return res.status(400).json({ message: `Estado inválido proporcionado. Debe ser uno de: ${allowedStatuses.join(', ')}` });
    }
    // --- Fin Validación básica ---


    try {
        // --- Verificaciones de Existencia y Permiso ---
        // 1. Verificar que la ruta de aprendizaje existe y obtener su ID de grupo
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');
        if (!learningPath || !learningPath.group_id) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada o incompleta.' });
        }
        const groupId = learningPath.group_id._id; // ID del grupo de la ruta

        // 2. Verificar que el estudiante es miembro APROBADO del grupo donde está la ruta
        const approvedMembership = await Membership.findOne({
            usuario_id: studentId,
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        });
        if (!approvedMembership) {
             return res.status(403).json({ message: 'No eres miembro aprobado del grupo donde se encuentra esta ruta de aprendizaje.' });
        }

        // 3. Verificar que el tema existe Y pertenece a esta ruta de aprendizaje
        // Buscamos el tema y poblamos su módulo para verificar su ruta asociada
        const theme = await Theme.findById(themeId).populate('module_id');
        // Verificamos si el tema existe, si tiene un módulo asociado, y si el learning_path_id del módulo coincide con el learningPathId de la petición
        if (!theme || !theme.module_id || !theme.module_id.learning_path_id.equals(learningPathId)) {
             return res.status(404).json({ message: 'Tema no encontrado o no pertenece a la ruta de aprendizaje especificada.' });
        }
        // --- Fin Verificaciones de Existencia y Permiso ---


        // --- Encontrar o Crear el Documento de Progreso del Estudiante para esta Ruta ---
        // Intentamos encontrar el documento de progreso existente para este estudiante en esta ruta
        let progress = await Progress.findOne({
            student_id: studentId,
            learning_path_id: learningPathId
        });

        if (!progress) {
            // Si no existe un documento de progreso, creamos uno nuevo
            progress = new Progress({
                student_id: studentId,
                learning_path_id: learningPathId,
                group_id: groupId, // Usamos el ID del grupo obtenido antes
                path_status: 'En Progreso', // Al iniciar el progreso (primer tema), la ruta pasa a 'En Progreso'
                completed_themes: [], // Inicializamos el array de temas completados/vistos
                completed_modules: [] // Inicializamos el array de módulos completados
            });
        } else {
            // --- Prevent Updates if Path is Completed ---
            if (progress.path_status === 'Completado') {
                return res.status(403).json({ message: 'La ruta de aprendizaje ya está completada y no se puede modificar.' });
            }
            // --- End Prevent Updates if Path is Completed ---

             // Si el documento de progreso ya existe, y el estado de la ruta era 'No Iniciado', lo cambiamos a 'En Progreso'
             if (progress.path_status === 'No Iniciado') {
                 progress.path_status = 'En Progreso';
             }
        }
        // --- Fin Encontrar o Crear Documento de Progreso ---


        // --- Actualizar o Añadir la Entrada de Progreso del Tema en el array completed_themes ---
        // Buscamos si ya existe una entrada para este tema en el array
        const themeEntryIndex = progress.completed_themes.findIndex(entry => entry.theme_id.equals(themeId));

         // Bandera para saber si el estado del tema cambió A 'Completado' en esta actualización (antes no lo estaba)
         let themeJustCompleted = false; // Renamed for clarity


        if (themeEntryIndex > -1) {
            // Si la entrada para el tema ya existe, la actualizamos
            const themeEntry = progress.completed_themes[themeEntryIndex];
            const previousStatus = themeEntry.status; // Estado antes de la posible actualización


            // Solo actualizamos el estado del tema si el nuevo estado es 'Completado'
            // O si el estado actual es 'Visto' y el nuevo también es 'Visto' (para actualizar la fecha de visualización)
            // No permitimos "deshacer" el estado de 'Completado' a 'Visto'
            if (status === 'Completado' || (themeEntry.status === 'Visto' && status === 'Visto')) {
                themeEntry.status = status; // Actualiza el estado del tema
                themeEntry.completion_date = new Date(); // Actualiza la fecha de finalización/visualización

                // Verificar si el estado cambió A 'Completado' en esta acción (antes no lo estaba)
                 if (previousStatus !== 'Completado' && status === 'Completado') {
                      themeJustCompleted = true;
                 }
            }
            // Si el estado actual es 'Completado' y el nuevo es 'Visto', simplemente no hacemos nada.


        } else {
            // Si no existe una entrada para este tema, añadimos una nueva al array
             // Si es una nueva entrada y el estado es 'Completado', marcamos la bandera
             if (status === 'Completado') {
                  themeJustCompleted = true;
             }
            progress.completed_themes.push({
                theme_id: themeId,
                status: status, // Puede ser 'Visto' o 'Completado'
                completion_date: new Date() // Registra la fecha actual
            });
        }
        // --- Fin Actualizar o Añadir Entrada de Tema ---


        // --- Guardar el Documento de Progreso con la actualización del tema (Guardado intermedio) ---
        await progress.save();
        // --- Fin Guardar (intermedio) ---

        let moduleStatusChangedToCompleted = false;

        // --- Implementar Lógica de Completado de Módulo ---
        if (themeJustCompleted && theme.module_id) { // Asegurarse que el tema tiene un módulo asociado
            const parentModuleId = theme.module_id._id;

            // Obtener todos los temas que pertenecen a este módulo
            const themesInModule = await Theme.find({ module_id: parentModuleId }).select('_id');
            const allThemeIdsInModule = themesInModule.map(t => t._id.toString());

            // Obtener los IDs de los temas 'Completado' por el estudiante DENTRO DE ESTE MÓDULO
            const completedThemeIdsByStudentInModule = progress.completed_themes
                .filter(entry => entry.status === 'Completado' && allThemeIdsInModule.includes(entry.theme_id.toString()))
                .map(entry => entry.theme_id.toString());

            // Verificar si todos los temas del módulo están completados
            const allThemesInModuleCompleted = allThemeIdsInModule.length > 0 &&
                                               completedThemeIdsByStudentInModule.length === allThemeIdsInModule.length &&
                                               allThemeIdsInModule.every(tId => completedThemeIdsByStudentInModule.includes(tId));

            if (allThemesInModuleCompleted) {
                const moduleEntryIndex = progress.completed_modules.findIndex(entry => entry.module_id.equals(parentModuleId));
                const previousModuleStatus = moduleEntryIndex > -1 ? progress.completed_modules[moduleEntryIndex].status : null;

                if (moduleEntryIndex > -1) {
                    // Si la entrada para el módulo ya existe, la actualizamos
                    progress.completed_modules[moduleEntryIndex].status = 'Completado';
                    progress.completed_modules[moduleEntryIndex].completion_date = new Date();
                } else {
                    // Si no existe una entrada para este módulo, añadimos una nueva
                    progress.completed_modules.push({
                        module_id: parentModuleId,
                        status: 'Completado',
                        completion_date: new Date()
                    });
                }
                if (previousModuleStatus !== 'Completado') {
                    moduleStatusChangedToCompleted = true;
                }
                await progress.save(); // Guardar progreso después de actualizar el módulo
                console.log(`Módulo ${parentModuleId} marcado como completado para estudiante ${studentId}`);
            }
        }
        // --- Fin Lógica de Completado de Módulo ---


        // --- Actualizar Lógica de Completado de Ruta Automático ---
        // Esta verificación se realiza si un tema acaba de ser marcado como 'Completado' O un módulo acaba de cambiar a 'Completado'
        // Y si la ruta no estaba ya marcada como 'Completado' anteriormente
        if ((themeJustCompleted || moduleStatusChangedToCompleted) && progress.path_status !== 'Completado') {
            // 1. Obtener todos los IDs de todos los módulos que pertenecen a esta ruta de aprendizaje
            const modulesInPath = await Module.find({ learning_path_id: learningPathId }).select('_id');
            const allModuleIdsInPath = modulesInPath.map(m => m._id.toString());

            // 2. Obtener los IDs de los módulos que el estudiante SÍ ha marcado como 'Completado'
            const completedModuleIdsByStudent = progress.completed_modules
                .filter(entry => entry.status === 'Completado')
                .map(entry => entry.module_id.toString());

            // 3. Comparar los conjuntos de IDs: ¿Todos los módulos de la ruta están en la lista de módulos 'Completado' del estudiante?
            const allModulesInPathCompletedByStudent = allModuleIdsInPath.length > 0 &&
                                                       completedModuleIdsByStudent.length === allModuleIdsInPath.length &&
                                                       allModuleIdsInPath.every(moduleId => completedModuleIdsByStudent.includes(moduleId));

            // 4. Si TODOS los módulos de la ruta están completados por el estudiante
            if (allModulesInPathCompletedByStudent) {
                progress.path_status = 'Completado';
                progress.path_completion_date = new Date();
                await progress.save();
                console.log(`Ruta de aprendizaje ${learningPathId} marcada como completada automáticamente para estudiante ${studentId}`);
            }
        }
        // --- Fin Lógica de Completado de Ruta Automático ---


        // Responde con el documento de progreso (potencialmente actualizado)
        res.status(200).json(progress);

    } catch (error) {
         // Manejo de errores de validación de Mongoose u otros errores
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar progreso', errors: messages });
        }
        console.error('Error al actualizar progreso del tema:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar progreso del tema', error: error.message });
    }
};

// @desc    Obtener el progreso de UN estudiante autenticado para una ruta de aprendizaje específica
// @route   GET /api/progress/my/:learningPathId
// Acceso: Privado/Estudiante
const getStudentProgressForPath = async (req, res) => {
    const { learningPathId } = req.params; // ID de la ruta de la URL
    const studentId = req.user._id; // ID del estudiante autenticado (del token)
    // authorize('Estudiante') en la ruta ya verificó el tipo de usuario

    // Validación básica del ID de la ruta
    if (!mongoose.Types.ObjectId.isValid(learningPathId)) {
         return res.status(400).json({ message: 'ID de ruta de aprendizaje inválido' });
    }

    try {
        // --- Buscar el documento de progreso del estudiante para esta ruta ---
        // Se busca por el ID del estudiante autenticado y el ID de la ruta.
        // Se pueblan los IDs de los temas completados/vistos para mostrar su nombre.
        const progress = await Progress.findOne({
            student_id: studentId,
            learning_path_id: learningPathId
        })
        .populate('completed_themes.theme_id', 'nombre orden module_id'); // Poblar nombre, orden y module_id del tema

        // --- Verificación de Permiso Adicional (Opcional pero robusto) ---
        // Aunque si existe un documento de progreso, implica que el estudiante interactuó
        // con la ruta (y debió ser miembro). Podemos añadir una verificación
        // explícita de membresía aprobada actual para mayor seguridad.
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');
         if (!learningPath || !learningPath.group_id) {
             // Esto no debería pasar si el progress doc existe, pero salvaguarda
             console.error(`Error: Progreso existe para ruta incompleta ${learningPathId}`);
             return res.status(500).json({ message: 'Error interno del servidor: ruta incompleta.' });
         }
        const approvedMembership = await Membership.findOne({
             usuario_id: studentId,
             grupo_id: learningPath.group_id._id,
             estado_solicitud: 'Aprobado'
         });
         // Si no es miembro aprobado actual, no puede ver el progreso (incluso si tuvo un doc de progreso antes)
         if (!approvedMembership) {
             return res.status(403).json({ message: 'No tienes permiso para ver el progreso de esta ruta (no eres miembro aprobado del grupo).' });
         }
        // --- Fin Verificación Adicional ---


        if (!progress) {
            // Si no se encuentra un documento de progreso, significa que el estudiante no ha iniciado esta ruta.
            // Devolvemos 200 OK con un mensaje indicando que no ha iniciado y progress: null o un estado inicial.
             return res.status(200).json({ message: 'Progreso no iniciado para esta ruta de aprendizaje', progress: { path_status: 'No Iniciado', completed_themes: [] } });
        }

        // Si se encontró el progreso, se devuelve
        res.status(200).json(progress);

    } catch (error) {
        console.error('Error al obtener progreso del estudiante para ruta:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener tu progreso en la ruta', error: error.message });
    }
};


// @desc    Obtener el resumen del progreso de TODOS los estudiantes para una ruta en un grupo (para el docente dueño)
// @route   GET /api/progress/group/:groupId/path/:learningPathId/docente
// Acceso: Privado/Docente
const getAllStudentProgressForPathForDocente = async (req, res) => {
    const { groupId, learningPathId } = req.params; // IDs de Grupo y Ruta de la URL
    const docenteId = req.user._id; // ID del docente autenticado
    // authorize('Docente') en la ruta ya verificó el tipo de usuario

    // Validación básica de IDs
     if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId(learningPathId)) {
         return res.status(400).json({ message: 'IDs de grupo o ruta de aprendizaje inválidos' });
    }


    try {
        // --- Verificación de Permiso: Verificar que el Docente es dueño del Grupo ---
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
        if (!group) {
            // Si el grupo no existe o no pertenece a este docente
            return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece.' });
        }
        // --- Fin Verificación Permiso Grupo ---

        // --- Verificar que la Ruta de Aprendizaje existe y pertenece a este Grupo ---
        const learningPath = await LearningPath.findOne({ _id: learningPathId, group_id: groupId });
        if (!learningPath) {
            // Si la ruta no existe o no está asociada a este grupo
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada en este grupo.' });
        }
        // --- Fin Verificación Ruta ---


        // --- Obtener el progreso de TODOS los estudiantes APROBADO en este grupo para esta ruta ---
        // Es más útil para el docente ver a todos los estudiantes del grupo, indicando si tienen progreso o no.
        // 1. Obtener todos los miembros APROBADO del grupo
        const approvedMemberships = await Membership.find({
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).populate('usuario_id', 'nombre apellidos email'); // Poblar detalles del estudiante miembro

        // Obtener los IDs de los estudiantes aprobados
        const approvedStudentIds = approvedMemberships.map(membership => membership.usuario_id._id);

        // 2. Encontrar los documentos de progreso para ESTOS estudiantes aprobados y para esta ruta
        const progressesForApprovedStudents = await Progress.find({
            student_id: { $in: approvedStudentIds }, // Filtra solo por los estudiantes aprobados
            learning_path_id: learningPathId
        })
        .populate('student_id', 'nombre apellidos email') // Poblar detalles del estudiante (si no se hizo ya)
        .populate('completed_themes.theme_id', 'nombre orden module_id'); // Poblar nombre, orden y module_id del tema


        // 3. Estructurar la respuesta para mostrar a todos los estudiantes aprobados, incluyendo su progreso (o indicando que no han iniciado)
        const studentProgressSummary = approvedMemberships.map(membership => {
            const student = membership.usuario_id; // Obtiene el objeto estudiante del populate
            // Busca el documento de progreso correspondiente a este estudiante en el array de progresos encontrados
            const progress = progressesForApprovedStudents.find(p => p.student_id.equals(student._id));

            // Construye el objeto resumen para este estudiante
            return {
                 student: { // Detalles del estudiante
                     _id: student._id,
                     nombre: student.nombre,
                     apellidos: student.apellidos,
                     email: student.email
                     // Puedes añadir más campos si necesitas (ej: foto de perfil)
                 },
                 // Detalles del progreso (si existe), o un estado inicial si no ha iniciado
                 // Usamos .toObject() para convertir el documento Mongoose a un objeto JS plano antes de manipularlo
                 progress: progress ? progress.toObject() : { path_status: 'No Iniciado', completed_themes: [] }
            };
        });

        // Limpiar cualquier campo sensible del objeto de progreso si se pobló (ej: student_id que ya está en el nivel superior)
        studentProgressSummary.forEach(item => {
            if(item.progress && item.progress.student_id) {
                 // Si el campo student_id existe en el objeto de progreso (porque se populó o está ahí por defecto), lo eliminamos para evitar redundancia
                 delete item.progress.student_id; // El estudiante ya está en item.student
                 // Si hay otros campos que no quieres exponer en el progreso (ej: hashes, secretos), elimínalos aquí
            }
        });
        // --- Fin Obtener y Estructurar Progreso ---


        // Se responde con el array de resúmenes de progreso por estudiante
        res.status(200).json(studentProgressSummary);

    } catch (error) {
        console.error('Error al obtener progreso de estudiantes para ruta (Docente):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el progreso de los estudiantes', error: error.message });
    }
};


// @desc    Obtener el progreso detallado de UN estudiante específico para una ruta (para el docente dueño)
// @route   GET /api/progress/student/:studentId/path/:learningPathId/docente
// Acceso: Privado/Docente
const getSpecificStudentProgressForPathForDocente = async (req, res) => {
    const { studentId, learningPathId } = req.params; // IDs de Estudiante y Ruta de la URL
    const docenteId = req.user._id; // ID del docente autenticado
    // authorize('Docente') en la ruta ya verificó el tipo de usuario

    // Validación básica de IDs
     if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(learningPathId)) {
         return res.status(400).json({ message: 'IDs de estudiante o ruta de aprendizaje inválidos' });
    }

    try {
        // --- Verificación de Permiso: Docente dueño del grupo y Estudiante miembro aprobado del grupo ---
        // 1. Busca la ruta y puebla el grupo para verificar la propiedad del docente
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');
        // Si la ruta no existe, no tiene grupo asociado, o el docente no es el dueño del grupo
        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId)) {
             return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada en uno de tus grupos o no te pertenece.' });
        }
        const groupId = learningPath.group_id._id; // ID del grupo de la ruta

        // 2. Verifica que el estudiante objetivo es miembro APROBADO de este grupo
        // (Esto también verifica que el estudiante existe en el contexto del grupo)
        const approvedMembership = await Membership.findOne({
            usuario_id: studentId,
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).populate('usuario_id', 'nombre apellidos email'); // Poblar detalles del estudiante miembro

        // Si el estudiante no es miembro aprobado del grupo
        if (!approvedMembership) {
             // Mensaje genérico para no revelar si el estudiante existe o no, solo que no está en el grupo como miembro aprobado.
             return res.status(404).json({ message: 'Estudiante no encontrado en este grupo o no es miembro aprobado.' });
        }
        // --- Fin Verificación Permiso ---


        // --- Obtener el documento de progreso específico para este estudiante y ruta ---
        const progress = await Progress.findOne({
            student_id: studentId,
            learning_path_id: learningPathId
        })
        .populate('student_id', 'nombre apellidos email') // Poblar detalles del estudiante
        .populate('completed_themes.theme_id', 'nombre orden module_id'); // Poblar nombre, orden y module_id del tema


        if (!progress) {
            // Si no se encuentra un documento de progreso, el estudiante no ha iniciado esta ruta.
            // Devolvemos una representación de un progreso "No Iniciado" para este estudiante.
             const student = approvedMembership.usuario_id; // Obtener el objeto estudiante del populate de membresía
             return res.status(200).json({
                 message: 'Progreso no iniciado para este estudiante en esta ruta de aprendizaje',
                 student: { // Incluye los detalles del estudiante
                     _id: student._id,
                     nombre: student.nombre,
                     apellidos: student.apellidos,
                     email: student.email
                 },
                 progress: { // Representación del progreso no iniciado
                     path_status: 'No Iniciado',
                     completed_themes: []
                     // Puedes añadir otros campos del modelo Progress con sus valores por defecto si quieres
                 }
            });
        }

        // Si se encontró el progreso, lo devolvemos.
        // Opcional: Limpiar campos sensibles del objeto de progreso si se populó student_id (ya está al inicio)
        // if(progress.student_id) delete progress.student_id; // Ya no es necesario si el populate inicial selecciona student_id

        res.status(200).json(progress); // Responde con el documento de progreso detallado

    } catch (error) {
        console.error('Error al obtener progreso específico de estudiante (Docente):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el progreso del estudiante', error: error.message });
    }
};


module.exports = {
    updateThemeProgress,
    getStudentProgressForPath, // Exporta la nueva función
    getAllStudentProgressForPathForDocente, // Exporta la nueva función
    getSpecificStudentProgressForPathForDocente // Exporta la nueva función
};