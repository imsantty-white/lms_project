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

// --- Helper Function to Update Dependent Statuses ---
async function updateDependentStatuses(progressDoc, learningPathId) {
    if (!progressDoc || !learningPathId) {
        console.error("updateDependentStatuses: Missing progressDoc or learningPathId");
        return; // Or throw error
    }

    try {
        // Fetch all modules and their themes for the given learning path
        const modulesInPath = await Module.find({ learning_path_id: learningPathId }).populate('themes');
        if (!modulesInPath || modulesInPath.length === 0) {
            // If path has no modules, its status depends on whether it was explicitly set or remains 'No Iniciado'
            // This function primarily deals with dependencies, so if no modules, no dependent updates to make here.
            // However, if a path has no modules, it could be considered 'Completado' if tasks were only at path level (not modeled here)
            // or 'No Iniciado' if progress is only tracked via modules/themes.
            // For now, if no modules, we don't auto-complete the path unless it has no themes either.
             if (progressDoc.path_status === 'En Progreso' && modulesInPath.length === 0) {
                 // This case is ambiguous. A path with no modules could be 'No Iniciado' or 'Completado' by default.
                 // Let's assume if it was 'En Progreso' and has no modules, it might be an anomaly or needs specific business rule.
                 // For safety, we won't auto-complete it here without more specific rules.
             }
            // If a path has no modules, its themes are also empty in this context.
            // If there are no themes at all in the path (via modules), path completion is tricky.
            // The current logic below assumes themes are within modules.
            // For a path with no modules, its status might remain as is or be set based on other criteria.
            // Let's ensure completed_modules is empty if no modules in path.
            progressDoc.completed_modules = []; 
            // If no modules, path completion logic below will likely result in 'Completado' if path_status was 'En Progreso'.
            // This might be okay if an empty path is considered complete once touched.
        }


        let allModulesCompleted = modulesInPath.length > 0; // Assume true if path has modules, else false

        for (const module of modulesInPath) {
            const moduleThemeIds = module.themes.map(t => t._id.toString());
            let themesCompletedCount = 0;
            let themesSeenCount = 0;

            if (moduleThemeIds.length > 0) {
                progressDoc.completed_themes.forEach(ct => {
                    if (moduleThemeIds.includes(ct.theme_id.toString())) {
                        if (ct.status === 'Completado') {
                            themesCompletedCount++;
                        }
                        if (ct.status === 'Visto' || ct.status === 'Completado') {
                            themesSeenCount++;
                        }
                    }
                });

                const moduleEntryIndex = progressDoc.completed_modules.findIndex(cm => cm.module_id.equals(module._id));
                let currentModuleStatusInDb = moduleEntryIndex > -1 ? progressDoc.completed_modules[moduleEntryIndex].status : 'No Iniciado';

                if (themesCompletedCount === moduleThemeIds.length) { // All themes in module completed
                    if (moduleEntryIndex > -1) {
                        progressDoc.completed_modules[moduleEntryIndex].status = 'Completado';
                        progressDoc.completed_modules[moduleEntryIndex].completion_date = new Date();
                    } else {
                        progressDoc.completed_modules.push({ module_id: module._id, status: 'Completado', completion_date: new Date() });
                    }
                } else if (themesSeenCount > 0) { // Some themes seen/completed, but not all
                    if (moduleEntryIndex > -1) {
                        progressDoc.completed_modules[moduleEntryIndex].status = 'En Progreso';
                        progressDoc.completed_modules[moduleEntryIndex].completion_date = undefined; // Clear completion date
                    } else {
                        progressDoc.completed_modules.push({ module_id: module._id, status: 'En Progreso' });
                    }
                    allModulesCompleted = false; 
                } else { // No themes seen or completed in this module
                    // Only remove/demote if it wasn't explicitly set to 'En Progreso' by a teacher (and saved before this helper)
                    if (currentModuleStatusInDb !== 'En Progreso') {
                         progressDoc.completed_modules = progressDoc.completed_modules.filter(cm => !cm.module_id.equals(module._id));
                    } else {
                        // If it was 'En Progreso' (e.g. by teacher override), and no themes are active, it remains 'En Progreso'.
                        // No change to allModulesCompleted here, it depends on this module's state.
                        // If it remains 'En Progreso', then allModulesCompleted should be false.
                        allModulesCompleted = false; 
                    }
                    // If currentModuleStatusInDb was 'No Iniciado' or 'Completado' (and themesSeenCount is 0), it's now effectively 'No Iniciado'
                    // by being filtered out, or if it was 'Completado' and themes became 0, it's 'No Iniciado'.
                    // This ensures allModulesCompleted is false unless it was already 'En Progreso'.
                     if (currentModuleStatusInDb !== 'En Progreso') {
                        allModulesCompleted = false;
                     }
                }
            } else { // Module has no themes
                // An empty module can be considered 'Completado' by default if it's part of a path.
                const moduleEntryIndex = progressDoc.completed_modules.findIndex(cm => cm.module_id.equals(module._id));
                if (moduleEntryIndex > -1) {
                    if(progressDoc.completed_modules[moduleEntryIndex].status !== 'Completado'){
                        progressDoc.completed_modules[moduleEntryIndex].status = 'Completado';
                        progressDoc.completed_modules[moduleEntryIndex].completion_date = new Date();
                    }
                } else {
                     progressDoc.completed_modules.push({ module_id: module._id, status: 'Completado', completion_date: new Date() });
                }
                // If it was previously 'En Progreso' or 'No Iniciado', it's now 'Completado'.
                // 'allModulesCompleted' remains true if this empty module is now 'Completado'.
            }
        }
        
        // Path status update
        if (allModulesCompleted && modulesInPath.length > 0) { // Ensure path has modules to be completed
            if(progressDoc.path_status !== 'Completado'){
                progressDoc.path_status = 'Completado';
                progressDoc.path_completion_date = new Date();
            }
        } else {
            // Check if any module is 'En Progreso' or 'Completado', or any theme is 'Visto' or 'Completado'
            const anyModuleInProgressOrCompleted = progressDoc.completed_modules.some(m => m.status === 'En Progreso' || m.status === 'Completado');
            const anyThemeActive = progressDoc.completed_themes.some(t => t.status === 'Visto' || t.status === 'Completado');

            if (anyModuleInProgressOrCompleted || anyThemeActive) {
                 if(progressDoc.path_status !== 'En Progreso' && progressDoc.path_status !== 'Completado'){ // Don't revert from 'Completado' by this logic
                    progressDoc.path_status = 'En Progreso';
                    progressDoc.path_completion_date = undefined; // Remove completion date if not completed
                 } else if (progressDoc.path_status === 'Completado' && !allModulesCompleted) {
                     // If path was 'Completado' but now not all modules are, it should become 'En Progreso'
                     progressDoc.path_status = 'En Progreso';
                     progressDoc.path_completion_date = undefined;
                 }
            } else {
                // If no modules are active and no themes are active, path is 'No Iniciado'
                // unless it was already 'Completado' (e.g. an empty path marked complete by teacher)
                if(progressDoc.path_status !== 'Completado'){
                    progressDoc.path_status = 'No Iniciado';
                    progressDoc.path_completion_date = undefined;
                }
            }
        }
        // No explicit save here, expect calling function to save.
    } catch (error) {
        console.error("Error in updateDependentStatuses:", error);
        // Decide if to throw or handle. For now, log and let it continue.
        // throw error; // Or handle more gracefully
    }
}


// @desc    Set status for a specific module for all students in a group by Teacher/Admin
// @route   POST /api/progress/teacher/set-module-status
// @access  Privado/Docente/Administrador
const setModuleStatusByTeacher = async (req, res) => {
    const { moduleId, learningPathId, status, groupId } = req.body; // groupId explicitly from body for clarity
    const teacherId = req.user._id;

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(moduleId) || 
        !mongoose.Types.ObjectId.isValid(learningPathId) ||
        !mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'IDs de módulo, ruta de aprendizaje y grupo inválidos.' });
    }
    const allowedStatuses = ['No Iniciado', 'En Progreso', 'Completado'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Estado inválido. Permitidos: ${allowedStatuses.join(', ')}.` });
    }

    try {
        // --- Authorization ---
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');
        if (!learningPath) return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada.' });
        if (!learningPath.group_id || !learningPath.group_id._id.equals(groupId)) {
            return res.status(403).json({ message: 'La ruta de aprendizaje no pertenece al grupo especificado.'});
        }
        // Check if teacher owns the group associated with the learning path
        if (req.user.tipo_usuario === 'Docente' && !learningPath.group_id.docente_id.equals(teacherId)) {
            return res.status(403).json({ message: 'No tienes permiso para modificar el progreso de esta ruta de aprendizaje.' });
        }

        const module = await Module.findById(moduleId);
        if (!module) return res.status(404).json({ message: 'Módulo no encontrado.' });
        if (!module.learning_path_id.equals(learningPathId)) {
            return res.status(403).json({ message: 'El módulo no pertenece a la ruta de aprendizaje especificada.' });
        }

        // --- Operations ---
        const approvedMembers = await Membership.find({
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).select('usuario_id');

        if (approvedMembers.length === 0) {
            return res.status(404).json({ message: 'No hay estudiantes aprobados en este grupo.' });
        }
        const studentIds = approvedMembers.map(m => m.usuario_id);
        
        let updatedCount = 0;

        for (const studentId of studentIds) {
            let progress = await Progress.findOne({ student_id: studentId, learning_path_id: learningPathId });

            if (!progress) {
                progress = new Progress({
                    student_id: studentId,
                    learning_path_id: learningPathId,
                    group_id: groupId, // Set group_id from the validated learning path
                    path_status: 'No Iniciado',
                    completed_themes: [],
                    completed_modules: []
                });
            }
            
            // Prevent changes if path is 'Completado' by student, unless teacher overrides
            // For bulk updates, teacher override is implicit. We will allow changing sub-elements.
            // The final path status will be re-evaluated by updateDependentStatuses.

            const moduleEntryIndex = progress.completed_modules.findIndex(cm => cm.module_id.equals(moduleId));

            if (status === 'Completado') {
                if (moduleEntryIndex > -1) {
                    progress.completed_modules[moduleEntryIndex].status = 'Completado';
                    progress.completed_modules[moduleEntryIndex].completion_date = new Date();
                } else {
                    progress.completed_modules.push({ module_id: moduleId, status: 'Completado', completion_date: new Date() });
                }
                // Mark all themes of this module as 'Completado'
                const themesInModule = await Theme.find({ module_id: moduleId }).select('_id');
                themesInModule.forEach(theme => {
                    const themeEntryIndex = progress.completed_themes.findIndex(ct => ct.theme_id.equals(theme._id));
                    if (themeEntryIndex > -1) {
                        progress.completed_themes[themeEntryIndex].status = 'Completado';
                        progress.completed_themes[themeEntryIndex].completion_date = new Date();
                    } else {
                        progress.completed_themes.push({ theme_id: theme._id, status: 'Completado', completion_date: new Date() });
                    }
                });
            } else if (status === 'En Progreso') {
                if (moduleEntryIndex > -1) {
                    progress.completed_modules[moduleEntryIndex].status = 'En Progreso';
                    // Ensure completion_date is removed or not set if it was 'Completado'
                     progress.completed_modules[moduleEntryIndex].completion_date = undefined; 
                } else {
                    progress.completed_modules.push({ module_id: moduleId, status: 'En Progreso' });
                }
                // Themes under this module are NOT automatically changed to 'Visto' by this direct setting.
                // Path status might become 'En Progreso'
                if (progress.path_status === 'No Iniciado') {
                    progress.path_status = 'En Progreso';
                    progress.path_completion_date = undefined; // Ensure no completion date for 'En Progreso'
                }
                // Save the progress explicitly set by the teacher before recalculating dependencies.
                // This ensures updateDependentStatuses respects the teacher's direct 'En Progreso' setting for THIS module.
                await progress.save(); 

            } else if (status === 'No Iniciado') {
                progress.completed_modules = progress.completed_modules.filter(cm => !cm.module_id.equals(moduleId));
                // Also mark all themes of this module as 'No Iniciado' (i.e., remove them from completed_themes)
                const themesInModule = await Theme.find({ module_id: moduleId }).select('_id');
                const themeIdsToRemove = themesInModule.map(t => t._id.toString());
                progress.completed_themes = progress.completed_themes.filter(ct => !themeIdsToRemove.includes(ct.theme_id.toString()));
            }
            
            // Update path_status if it's 'No Iniciado' and we are making progress (for 'Completado' case mainly now)
            if (progress.path_status === 'No Iniciado' && status === 'Completado') {
                progress.path_status = 'En Progreso';
                progress.path_completion_date = undefined;
            }
            // For 'No Iniciado', path_status will be re-evaluated by updateDependentStatuses.

            await updateDependentStatuses(progress, learningPathId); // Recalculate all statuses
            await progress.save(); // Persist changes from updateDependentStatuses
            updatedCount++;
        }

        res.status(200).json({ message: `Progreso del módulo actualizado para ${updatedCount} estudiante(s).` });

    } catch (error) {
        console.error('Error en setModuleStatusByTeacher:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Error de validación.', errors: error.errors });
        }
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// @desc    Set status for a specific theme for all students in a group by Teacher/Admin
// @route   POST /api/progress/teacher/set-theme-status
// @access  Privado/Docente/Administrador
const setThemeStatusByTeacher = async (req, res) => {
    const { themeId, learningPathId, status, groupId } = req.body;
    const teacherId = req.user._id;

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(themeId) || 
        !mongoose.Types.ObjectId.isValid(learningPathId) ||
        !mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'IDs de tema, ruta de aprendizaje y grupo inválidos.' });
    }
    const allowedStatuses = ['No Iniciado', 'Visto', 'Completado'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Estado inválido. Permitidos: ${allowedStatuses.join(', ')}.` });
    }
    
    try {
        // --- Authorization ---
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');
        if (!learningPath) return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada.' });
         if (!learningPath.group_id || !learningPath.group_id._id.equals(groupId)) {
            return res.status(403).json({ message: 'La ruta de aprendizaje no pertenece al grupo especificado.'});
        }
        if (req.user.tipo_usuario === 'Docente' && !learningPath.group_id.docente_id.equals(teacherId)) {
            return res.status(403).json({ message: 'No tienes permiso para modificar el progreso de esta ruta.' });
        }

        const theme = await Theme.findById(themeId).populate('module_id');
        if (!theme) return res.status(404).json({ message: 'Tema no encontrado.' });
        if (!theme.module_id || !theme.module_id.learning_path_id.equals(learningPathId)) {
            return res.status(403).json({ message: 'El tema no pertenece a la ruta de aprendizaje especificada.' });
        }
        
        // --- Operations ---
        const approvedMembers = await Membership.find({
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).select('usuario_id');

        if (approvedMembers.length === 0) {
            return res.status(404).json({ message: 'No hay estudiantes aprobados en este grupo.' });
        }
        const studentIds = approvedMembers.map(m => m.usuario_id);
        let updatedCount = 0;

        for (const studentId of studentIds) {
            let progress = await Progress.findOne({ student_id: studentId, learning_path_id: learningPathId });
            if (!progress) {
                 progress = new Progress({
                    student_id: studentId,
                    learning_path_id: learningPathId,
                    group_id: groupId,
                    path_status: 'No Iniciado',
                    completed_themes: [],
                    completed_modules: []
                });
            }

            const themeEntryIndex = progress.completed_themes.findIndex(ct => ct.theme_id.equals(themeId));

            if (status === 'Completado' || status === 'Visto') {
                if (themeEntryIndex > -1) {
                    progress.completed_themes[themeEntryIndex].status = status;
                    progress.completed_themes[themeEntryIndex].completion_date = new Date();
                } else {
                    progress.completed_themes.push({ theme_id: themeId, status: status, completion_date: new Date() });
                }
            } else if (status === 'No Iniciado') {
                progress.completed_themes = progress.completed_themes.filter(ct => !ct.theme_id.equals(themeId));
            }
            
            if (progress.path_status === 'No Iniciado' && (status === 'Visto' || status === 'Completado')) {
                progress.path_status = 'En Progreso';
            }

            await updateDependentStatuses(progress, learningPathId);
            await progress.save();
            updatedCount++;
        }
        
        res.status(200).json({ message: `Progreso del tema actualizado para ${updatedCount} estudiante(s).` });

    } catch (error) {
        console.error('Error en setThemeStatusByTeacher:', error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Error de validación.', errors: error.errors });
        }
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


module.exports = {
    updateThemeProgress,
    getStudentProgressForPath,
    getAllStudentProgressForPathForDocente,
    getSpecificStudentProgressForPathForDocente,
    setModuleStatusByTeacher,
    setThemeStatusByTeacher
};