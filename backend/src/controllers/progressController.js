// src/controllers/progressController.js

const Progress = require('../models/ProgressModel'); // Modelo de Progreso
const LearningPath = require('../models/LearningPathModel'); // Necesario para verificar la ruta y obtener grupo
const Theme = require('../models/ThemeModel'); // Necesario para verificar que el tema existe y pertenece a la ruta
const Module = require('../models/ModuleModel'); // Necesario para popular el módulo del tema
const ContentAssignment = require('../models/ContentAssignmentModel'); // Para obtener actividades
const Activity = require('../models/ActivityModel'); // Para obtener detalles de actividades
const Submission = require('../models/SubmissionModel'); // Para obtener envíos de actividades
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
                completed_themes: [] // Inicializamos el array de temas completados/vistos
            });
        } else {
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
         let themeStatusJustCompleted = false;


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
                      themeStatusJustCompleted = true;
                 }
            }
            // Si el estado actual es 'Completado' y el nuevo es 'Visto', simplemente no hacemos nada.


        } else {
            // Si no existe una entrada para este tema, añadimos una nueva al array
             // Si es una nueva entrada y el estado es 'Completado', marcamos la bandera
             if (status === 'Completado') {
                  themeStatusJustCompleted = true;
             }
            progress.completed_themes.push({
                theme_id: themeId,
                status: status, // Puede ser 'Visto' o 'Completado'
                completion_date: new Date() // Registra la fecha actual
            });
        }
        // --- Fin Actualizar o Añadir Entrada de Tema ---


        // --- Guardar el Documento de Progreso ---
        // El path_status general ('En Progreso', 'Completado') se recalcula ahora
        // principalmente a través de getStudentProgressForPath basado en actividades.
        // Aquí, solo nos aseguramos de que si estaba 'No Iniciado', pase a 'En Progreso'.
        // Si ya estaba 'Completado' (por actividades), ver un tema no debería cambiarlo a 'En Progreso'.
        if (progress.path_status === 'No Iniciado') {
            progress.path_status = 'En Progreso';
        }
        // No hay lógica de completado automático por temas aquí.
        // El estado 'Completado' de la ruta se determinará por la completitud de actividades
        // y se actualizará en la base de datos por getStudentProgressForPath o un proceso similar
        // cuando se califique una actividad.

        await progress.save();
        // --- Fin Guardar ---

        // Responde con el documento de progreso actualizado
        // Es importante notar que este 'progress' devuelto aquí podría no tener el path_status
        // más actualizado si una calificación de actividad acaba de ocurrir en paralelo.
        // El frontend debería confiar más en getStudentProgressForPath para el estado general.
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
// @route   GET /api/progress/:learningPathId/:groupId/student
// Acceso: Privado/Estudiante
const getStudentProgressForPath = async (req, res) => {
    // CAMBIO CLAVE: Extraer groupId de req.params también
    const { learningPathId, groupId } = req.params;
    const studentId = req.user._id;

    // Validación básica de IDs
    if (!mongoose.Types.ObjectId.isValid(learningPathId) || !mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'IDs de ruta de aprendizaje o grupo inválidos' });
    }

    try {
        // --- Verificación de Permiso y Existencia de Ruta/Grupo ---
        // 1. Verificar que la ruta de aprendizaje existe y está asociada al grupo
        const learningPath = await LearningPath.findOne({ _id: learningPathId, group_id: groupId });
        if (!learningPath) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada o no asignada a este grupo.' });
        }

        // 2. Verificar que el estudiante es un miembro aprobado de ESE grupo
        const approvedMembership = await Membership.findOne({
            usuario_id: studentId,
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        });
        if (!approvedMembership) {
            return res.status(403).json({ message: 'No tienes permiso para ver el progreso de esta ruta (no eres miembro aprobado del grupo especificado).' });
        }
        // --- Fin Verificación Adicional ---

        // Llamar a la función helper para calcular y obtener los datos de progreso más recientes
        // Estos datos (path_status, total_activities, graded_activities) son dinámicos
        const calculated_data = await _calculateAndUpdatePathProgress(studentId, learningPathId, groupId);

        // Opcional: Recuperar el documento de progreso de la DB si se necesita para otros campos
        // como completed_themes, ya que _calculateAndUpdatePathProgress lo actualiza pero no lo devuelve completo.
        let progressDocFromDB = await Progress.findOne({ student_id: studentId, learning_path_id: learningPathId, group_id: groupId });

        // Devolver el documento de progreso de la DB (podría contener completed_themes)
        // y los datos calculados dinámicamente para la UI.
        res.status(200).json({
            success: true,
            progress: progressDocFromDB, // Documento de progreso de la DB
            calculated_data: calculated_data // Datos calculados dinámicamente
        });

    } catch (error) {
        console.error('Error al obtener progreso del estudiante para ruta y grupo:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener tu progreso en la ruta', error: error.message });
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


// --- Helper Function para Calcular y Actualizar el Progreso del Estudiante en una Ruta ---
// Esta función se encarga de calcular el progreso del estudiante en una ruta de aprendizaje específica
// y actualizar el documento de progreso en la base de datos.
const _calculateAndUpdatePathProgress = async (studentId, learningPathId, groupIdFromPath) => {
    // Validaciones básicas de IDs
    if (!mongoose.Types.ObjectId.isValid(studentId) ||
        !mongoose.Types.ObjectId.isValid(learningPathId) ||
        !mongoose.Types.ObjectId.isValid(groupIdFromPath)) {
        console.error('Error en _calculateAndUpdatePathProgress: IDs inválidos proporcionados.', { studentId, learningPathId, groupIdFromPath });
        throw new Error('IDs inválidos para calcular el progreso.');
    }

    console.log(`_calculateAndUpdatePathProgress iniciado para studentId: ${studentId}, learningPathId: ${learningPathId}, groupId: ${groupIdFromPath}`);

    // --- REVISIÓN CLAVE AQUÍ: CÓMO ENCONTRAR LAS ACTIVIDADES ASIGNADAS ---
    // Paso 1: Encontrar todos los Módulos que pertenecen a esta Ruta de Aprendizaje
    const modulesInPath = await Module.find({ learning_path_id: learningPathId }).select('_id');
    const moduleIds = modulesInPath.map(m => m._id);

    if (moduleIds.length === 0) {
        console.log(`No se encontraron módulos para la ruta ${learningPathId}. Total de actividades: 0.`);
        return {
            path_status: 'No Iniciada',
            total_activities: 0,
            graded_activities: 0,
            // ... otros campos si los devuelves
        };
    }

    // Paso 2: Encontrar todos los Temas que pertenecen a estos Módulos
    const themesInModules = await Theme.find({ module_id: { $in: moduleIds } }).select('_id');
    const themeIds = themesInModules.map(t => t._id);

    if (themeIds.length === 0) {
        console.log(`No se encontraron temas para los módulos de la ruta ${learningPathId}. Total de actividades: 0.`);
        return {
            path_status: 'No Iniciada',
            total_activities: 0,
            graded_activities: 0,
            // ... otros campos si los devuelves
        };
    }

    // Paso 3: Encontrar todas las ContentAssignment de tipo 'Activity' que pertenecen a estos Temas
    // y al Grupo específico.
    const relevantActivityAssignments = await ContentAssignment.find({
        theme_id: { $in: themeIds }, // Filtrar por los temas de la ruta
        group_id: groupIdFromPath,    // Filtrar por el grupo
        type: 'Activity',             // Asegurarse de que sea una Actividad (sensible a mayúsculas/minúsculas)
        // Puedes añadir 'status: { $ne: "Draft" }' si no quieres contar borradores
        // Pero no 'status: "Open"' o 'status: "Closed"' si quieres contar todas las asignadas.
    }).select('_id');
    
    const total_activities = relevantActivityAssignments.length;
    let graded_activities = 0;
    let path_status = 'No Iniciado'; // Estado por defecto

    console.log(`Total de actividades relevantes para esta ruta/grupo: ${total_activities}`);

    // --- Obtener el documento de progreso existente ---
    let progressDoc = await Progress.findOne({
        student_id: studentId,
        learning_path_id: learningPathId,
        group_id: groupIdFromPath
    }).populate('completed_themes.theme_id', 'nombre orden module_id'); 

    // --- Lógica de cálculo del path_status ---
    if (total_activities > 0) {
        const contentAssignmentIds = relevantActivityAssignments.map(ca => ca._id);
        
        // --- 1. Agregación para encontrar la ÚLTIMA entrega CALIFICADA por asignación ---
        const lastGradedSubmissions = await Submission.aggregate([
            {
                $match: {
                    student_id: studentId,
                    assignment_id: { $in: contentAssignmentIds },
                    estado_envio: 'Calificado'
                }
            },
            {
                $sort: { fecha_envio: -1 } // Ordenar de más reciente a más antigua
            },
            {
                $group: {
                    _id: '$assignment_id', // Agrupar por el ID de la asignación
                    lastSubmission: { $first: '$$ROOT' } // Tomar el primer documento (el más reciente) de cada grupo
                }
            },
            {
                $project: {
                    _id: '$lastSubmission._id', 
                    assignment_id: '$lastSubmission.assignment_id'
                }
            }
        ]);
        
        graded_activities = lastGradedSubmissions.length; 

        console.log(`Actividades calificadas (último intento calificado) para el estudiante en esta ruta/grupo: ${graded_activities}`);

        // --- 2. Agregación para encontrar la ÚLTIMA entrega NO CALIFICADA por asignación ---
        // Excluye las asignaciones que ya tienen un intento calificado para evitar contarlos dos veces.
        const alreadyGradedAssignmentIds = lastGradedSubmissions.map(s => s.assignment_id);

        const lastPendingOrUnsubmittedSubmissions = await Submission.aggregate([
            {
                $match: {
                    student_id: studentId,
                    assignment_id: { 
                        $in: contentAssignmentIds,
                        $nin: alreadyGradedAssignmentIds // NO incluir asignaciones ya calificadas
                    },
                    estado_envio: { $ne: 'Calificado' } // Considera cualquier estado que no sea 'Calificado'
                }
            },
            {
                $sort: { fecha_envio: -1 } // Ordenar de más reciente a más antigua
            },
            {
                $group: {
                    _id: '$assignment_id', // Agrupar por el ID de la asignación
                    lastSubmission: { $first: '$$ROOT' } // Tomar el primer documento (el más reciente) de cada grupo
                }
            },
            {
                $project: {
                    _id: '$lastSubmission._id',
                    assignment_id: '$lastSubmission.assignment_id'
                }
            }
        ]);

        const submittedButNotGradedCount = lastPendingOrUnsubmittedSubmissions.length;
        
        console.log(`Actividades con el último intento NO CALIFICADO: ${submittedButNotGradedCount}`);


        if (graded_activities === total_activities) {
            path_status = 'Completado';
        } else if (graded_activities > 0 || submittedButNotGradedCount > 0) { 
            path_status = 'En Progreso';
        } else {
            path_status = 'No Iniciado';
        }
    }

    // Lógica para el progreso basado en temas completados si no hay actividades evaluables
    // o si el progreso se basa también en temas.
    // Esta sección solo se ejecuta si 'total_activities' es 0, o si se necesita un estado 'En Progreso' por temas
    if (progressDoc && progressDoc.completed_themes && progressDoc.completed_themes.length > 0) {
        if (path_status !== 'Completado') {
             path_status = 'En Progreso'; 
            if (total_activities === 0) { 
                const allThemesInPath = await Theme.find({ module_id: { $in: moduleIds } }).select('_id');
                const allThemeIdsInPath = allThemesInPath.map(t => t._id.toString());
                
                const viewedOrCompletedThemeIdsByStudent = progressDoc.completed_themes
                    .filter(entry => entry.status === 'Visto' || entry.status === 'Completado')
                    .map(entry => entry.theme_id._id.toString());
                
                const allThemesViewedOrCompleted = allThemeIdsInPath.length > 0 &&
                    allThemeIdsInPath.every(themeId => viewedOrCompletedThemeIdsByStudent.includes(themeId));

                if (allThemesViewedOrCompleted) {
                    path_status = 'Completado';
                }
            }
        }
    }
    
    console.log(`Estado de ruta calculado: ${path_status}`);

    // --- Actualizar o crear el documento de progreso en la BD ---
    if (progressDoc) {
        const shouldUpdate = progressDoc.path_status !== path_status || 
                             (path_status === 'Completado' && !progressDoc.path_completion_date) ||
                             (path_status !== 'Completado' && progressDoc.path_completion_date);

        if (shouldUpdate) {
            progressDoc.path_status = path_status;
            if (path_status === 'Completado') {
                progressDoc.path_completion_date = progressDoc.path_completion_date || new Date();
            } else {
                progressDoc.path_completion_date = null;
            }
            await progressDoc.save();
            console.log(`Documento de progreso actualizado: ${progressDoc._id}`);
        } else {
            console.log(`Documento de progreso ${progressDoc._id} no necesita actualización de estado.`);
        }
    } else {
        if (path_status !== 'No Iniciado' || total_activities > 0) { // Crear si el estado no es "No Iniciado" o si hay actividades
            progressDoc = new Progress({ 
                student_id: studentId,
                learning_path_id: learningPathId,
                group_id: groupIdFromPath,
                path_status: path_status,
                completed_themes: [],
                path_completion_date: path_status === 'Completado' ? new Date() : null
            });
            await progressDoc.save();
            console.log(`Nuevo documento de progreso creado: ${progressDoc._id}`);
        } else {
            console.log('No se creó documento de progreso: estado inicial "No Iniciado" sin temas completados y sin actividades asignadas.');
        }
    }

    return {
        path_status: progressDoc ? progressDoc.path_status : path_status,
        total_activities: total_activities,
        graded_activities: graded_activities,
        completed_themes: progressDoc ? progressDoc.completed_themes.length : 0,
        _id: progressDoc ? progressDoc._id : null,
        student_id: studentId,
        learning_path_id: learningPathId,
        group_id: groupIdFromPath,
        path_completion_date: progressDoc ? progressDoc.path_completion_date : null
    };
};

// --- Función de Trigger Exportada ---
// Esta función será llamada desde otros controladores (ej: submissionController, themeController)
// Es importante que reciba el groupId, no solo la learningPathId, si el progreso es por grupo.
// Si triggerActivityBasedProgressUpdate se llama desde un contexto donde ya se sabe el groupId,
// puedes pasarlo directamente. Si no, necesitarás obtenerlo aquí.
const triggerActivityBasedProgressUpdate = async (studentId, learningPathId, groupId) => { // AÑADIR groupId aquí
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(learningPathId) || !mongoose.Types.ObjectId.isValid(groupId)) {
        console.error('triggerActivityBasedProgressUpdate: IDs inválidos.', { studentId, learningPathId, groupId });
        return { success: false, message: 'IDs inválidos.' };
    }

    try {
        // En este punto, asumimos que groupId ya está disponible si el trigger es por una Submission
        // o Theme completion que ya conoce el grupo.
        // Si no es el caso, necesitarías obtener el group_id de la asignación/ruta/membresía aquí.
        // Por ahora, lo pasamos como parámetro directo para simplificar.

        // Llama a la función helper principal para calcular y actualizar el progreso.
        const progressResult = await _calculateAndUpdatePathProgress(studentId, learningPathId, groupId);
        
        console.log(`Progreso actualizado para estudiante ${studentId} en ruta ${learningPathId} (grupo ${groupId}). Nuevo estado: ${progressResult.path_status}`);
        return { success: true, data: progressResult };

    } catch (error) {
        console.error(`Error en triggerActivityBasedProgressUpdate para estudiante ${studentId}, ruta ${learningPathId}, grupo ${groupId}:`, error);
        return { success: false, message: 'Error interno al actualizar el progreso.', error: error.message };
    }
};

// @desc    Marcar un tema como completado/visto para un estudiante
// @route   PUT /api/progress/mark-theme-completed
// @access  Privado/Estudiante
const markThemeAsCompleted = async (req, res) => {
    const { themeId, learningPathId, groupId } = req.body; // Asegúrate de que el frontend envíe groupId
    const studentId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(themeId) || 
        !mongoose.Types.ObjectId.isValid(learningPathId) ||
        !mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'IDs de tema, ruta de aprendizaje o grupo inválidos' });
    }

    try {
        let progressDoc = await Progress.findOne({
            student_id: studentId,
            learning_path_id: learningPathId,
            group_id: groupId // Filtrar por grupo aquí
        });

        if (!progressDoc) {
            progressDoc = new Progress({
                student_id: studentId,
                learning_path_id: learningPathId,
                group_id: groupId,
                path_status: 'En Progreso', // Inicia en progreso al completar el primer tema
                completed_themes: []
            });
        }

        // Verificar si el tema ya está en la lista de temas completados/vistos
        const existingThemeEntry = progressDoc.completed_themes.find(entry => 
            entry.theme_id.equals(themeId)
        );

        if (existingThemeEntry) {
            if (existingThemeEntry.status !== 'Visto') { // Solo actualiza si no es 'Visto'
                existingThemeEntry.status = 'Visto';
                existingThemeEntry.completion_date = new Date();
                console.log(`Tema ${themeId} actualizado a 'Visto' para estudiante ${studentId}`);
            } else {
                return res.status(200).json({ message: 'El tema ya ha sido marcado como visto.', progress: progressDoc });
            }
        } else {
            // Añadir el nuevo tema como 'Visto'
            progressDoc.completed_themes.push({
                theme_id: themeId,
                status: 'Visto',
                completion_date: new Date()
            });
            console.log(`Tema ${themeId} añadido como 'Visto' para estudiante ${studentId}`);
        }

        await progressDoc.save();

        // Disparar la actualización general del progreso de la ruta después de marcar un tema
        // ¡¡IMPORTANTE!! Pasa el groupId a triggerActivityBasedProgressUpdate
        triggerActivityBasedProgressUpdate(studentId, learningPathId, groupId)
            .then(result => {
                if (result && result.success) {
                    console.log(`Progress update triggered successfully for student ${studentId}, path ${learningPathId}, group ${groupId} after theme completion.`);
                } else {
                    console.error(`Progress update trigger failed for student ${studentId}, path ${learningPathId}, group ${groupId} after theme completion: ${result ? result.message : 'Unknown error'}`);
                }
            })
            .catch(err => {
                console.error('Error calling triggerActivityBasedProgressUpdate after theme completion:', err);
            });

        res.status(200).json({ 
            message: 'Tema marcado como visto y progreso de ruta actualizado', 
            progress: progressDoc 
        });

    } catch (error) {
        console.error('Error al marcar tema como completado/visto:', error);
        res.status(500).json({ message: 'Error interno del servidor al marcar tema como completado/visto', error: error.message });
    }
};


module.exports = {
    updateThemeProgress,
    getStudentProgressForPath,
    getAllStudentProgressForPathForDocente,
    getSpecificStudentProgressForPathForDocente,
    _calculateAndUpdatePathProgress, // Exportar para testing si es necesario, o solo internamente
    triggerActivityBasedProgressUpdate,
    markThemeAsCompleted,
};