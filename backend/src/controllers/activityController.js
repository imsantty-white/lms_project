// src/controllers/activityController.js


const Activity = require('../models/ActivityModel');
const ContentAssignment = require('../models/ContentAssignmentModel');
const Membership = require('../models/MembershipModel');
const LearningPath = require('../models/LearningPathModel');
const Module = require('../models/ModuleModel');
const Theme = require('../models/ThemeModel');
const Group = require('../models/GroupModel');
const Submission = require('../models/SubmissionModel'); 
const Progress = require('../models/ProgressModel'); 
const User = require('../models/UserModel'); 
const mongoose = require('mongoose');


// @desc    Obtener los detalles de una Actividad asignada para que un estudiante la inicie
// @route   GET /api/activities/student/:assignmentId/start
// @access  Privado/Estudiante (miembro aprobado del grupo de la ruta de la asignación)
const getStudentActivityForAttempt = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const studentId = req.user._id;
        const userType = req.user.tipo_usuario;

        // Verificar que el usuario es un estudiante (mantener)
        if (userType !== 'Estudiante') {
            return res.status(403).json({ message: 'Acceso denegado. Solo estudiantes pueden acceder a actividades asignadas.' });
        }

        // Encontrar la asignación y popular los detalles necesarios (mantener)
        const assignmentDetails = await ContentAssignment.findById(assignmentId)
            .populate('activity_id') // Necesitamos la Actividad base
            .populate({ // Necesitamos la jerarquía para permisos/grupo
                path: 'theme_id',
                populate: {
                    path: 'module_id',
                    populate: {
                        path: 'learning_path_id',
                        populate: {
                            path: 'group_id'
                        }
                    }
                }
            });

        if (!assignmentDetails) {
            return res.status(404).json({ message: 'Asignación de contenido no encontrada.' });
        }

        if (assignmentDetails.type !== 'Activity' || !assignmentDetails.activity_id) {
            return res.status(400).json({ message: 'La asignación no es de un tipo de actividad soportado.' });
        }

        // *** NUEVA VERIFICACIÓN DE ESTADO: Solo permitir acceso si la asignación está 'Open' ***
        if (assignmentDetails.status !== 'Open') {
             // Usamos 403 Forbidden o 410 Gone para indicar que no está disponible
             return res.status(403).json({ message: `Esta actividad asignada no está actualmente disponible (Estado: ${assignmentDetails.status}).` });
        }
        // *** Fin Nueva Verificación de Estado ***

        const activityDetails = assignmentDetails.activity_id;


        // Verificar que el estudiante es miembro aprobado del grupo (mantener)
        let group = null;
        if (assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id) {
            group = assignmentDetails.theme_id.module_id.learning_path_id.group_id;
            const approvedMembership = await Membership.findOne({
                usuario_id: studentId,
                grupo_id: group._id,
                estado_solicitud: 'Aprobado'
            });
            if (!approvedMembership) {
                return res.status(403).json({ message: 'No tienes permiso para acceder a esta actividad. No eres miembro aprobado del grupo.' });
            }
        } else {
            return res.status(500).json({ message: 'Error interno del servidor al obtener la información del grupo.' });
        }


        // Contar intentos previos (mantener)
        const attemptsUsed = await Submission.countDocuments({
            assignment_id: assignmentId,
            student_id: studentId
        });

        // Buscar la última entrega (mantener tu lógica)
        const lastSubmission = await Submission.findOne({
            assignment_id: assignmentId,
            student_id: studentId
        })
        .sort({ fecha_envio: -1 })
        .limit(1);


        // Verificar si la actividad es de un tipo que permite visualización (mantener)
        if (activityDetails.type !== 'Quiz' && activityDetails.type !== 'Cuestionario' && activityDetails.type !== 'Trabajo') {
            return res.status(400).json({ message: `Tipo de actividad (${activityDetails.type}) no soportado para visualización en esta página.` });
        }


        // Enviar los detalles de la asignación, la actividad base, los intentos usados y la última entrega (mantener)
        res.status(200).json({
            assignmentDetails: assignmentDetails, // Esto incluye el estado
            activityDetails: activityDetails,
            attemptsUsed: attemptsUsed,
            lastSubmission: lastSubmission
        });

    } catch (error) {
        console.error('Error fetching student activity for attempt:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación no válido.' });
        }
        next(error);
    }
};



// @desc    Registrar la entrega de respuestas de un estudiante para una asignación de actividad
// @route   POST /api/activities/student/:assignmentId/submit-attempt
// @access  Privado/Estudiante (miembro aprobado del grupo de la ruta de la asignación)
const submitStudentActivityAttempt = async (req, res, next) => {
    try {
        // *** Añadir verificación explícita para req.user ***
        if (!req.user || !req.user._id || !req.user.tipo_usuario) {
            console.error('Authentication failed: req.user is not set.');
            return res.status(401).json({ message: 'No autorizado. Por favor, inicia sesión.' });
        }

        const { assignmentId } = req.params;
        const studentId = req.user._id;
        const userType = req.user.tipo_usuario;

        // *** MODIFICACIÓN: Extraer studentAnswers Y trabajoLink del body ***
        const { studentAnswers, trabajoLink } = req.body;
        // ************************************************************

        // *** MODIFICACIÓN: Validar si se recibieron datos de entrega (answers O link) ***
        if (!studentAnswers && !trabajoLink) {
            return res.status(400).json({ message: 'No se recibieron datos de entrega válidos (respuestas o enlace de trabajo).' });
        }
        // ***********************************************************

        // Ahora, la verificación de tipo_usuario
        if (userType !== 'Estudiante') {
            console.error('Access denied: User is not a student.');
            return res.status(403).json({ message: 'Acceso denegado. Solo estudiantes pueden enviar entregas.' });
        }

        // 2. Encontrar la asignación (mantienes la doble búsqueda)
        const rawAssignment = await ContentAssignment.findById(assignmentId);

        if (!rawAssignment) {
            console.error(`Assignment ${assignmentId} not found before populate.`);
            return res.status(404).json({ message: 'Asignación no encontrada antes de poblar.' });
        }

        //  Ahora poblar los detalles necesarios (Activity y jerarquía)
        const assignment = await ContentAssignment.findById(assignmentId)
            .populate('activity_id')
            .populate({
                path: 'theme_id',
                populate: {
                    path: 'module_id',
                    populate: {
                        path: 'learning_path_id',
                        populate: {
                            path: 'group_id'
                        }
                    }
                }
            });

        // *** Este check de assignment ahora se hace después de la población ***
        if (!assignment) {
            console.error(`Assignment ${assignmentId} not found after populate.`);
            return res.status(404).json({ message: 'Asignación no encontrada después de poblar.' });
        }

        // *** MODIFICACIÓN: Incluir 'Trabajo' en los tipos soportados ***
        if (assignment.type !== 'Activity' || !assignment.activity_id || (assignment.activity_id.type !== 'Quiz' && assignment.activity_id.type !== 'Cuestionario' && assignment.activity_id.type !== 'Trabajo')) {
            console.error(`Assignment ${assignmentId} is not a supported activity type for submission.`);
            return res.status(400).json({ message: `Esta asignación no es una actividad interactivable del tipo correcto (${assignment.activity_id?.type}).` });
        }
        // *****************************************************************************

        const activity = assignment.activity_id; // La actividad base


        // 3. Verificar que el estudiante es miembro aprobado del grupo asociado a la ruta (mantienes esta lógica)
        let groupId = null;
        let docenteId = null;

        if (assignment.theme_id?.module_id?.learning_path_id?.group_id) {
            // Verificar más específicamente (mantienes esta lógica)
            if (assignment.theme_id.module_id.learning_path_id.group_id._id) {
                groupId = assignment.theme_id.module_id.learning_path_id.group_id._id;
            }

            if (assignment.theme_id.module_id.learning_path_id.group_id.docente_id) {
                docenteId = assignment.theme_id.module_id.learning_path_id.group_id.docente_id;
            }

            // Solo buscar membresía si tenemos un groupId válido (mantienes esta lógica)
            if (groupId) {
                // No necesitamos la variable isStudentMember antes de este check,
                // podemos devolver el error 403 directamente si no se encuentra la membresía aprobada.
                const approvedMembership = await Membership.findOne({
                    usuario_id: studentId,
                    grupo_id: groupId,
                    estado_solicitud: 'Aprobado'
                });

                if (!approvedMembership) { // Si NO es miembro aprobado
                    console.error(`Student ${studentId} is not an approved member of group ${groupId} for assignment ${assignmentId}.`);
                    return res.status(403).json({ message: 'No tienes permiso para enviar esta entrega. No eres miembro aprobado del grupo.' });
                }
            } else { // Si no se pudo obtener el groupId de la asignación
                console.error(`Could not get groupId from assignment ${assignmentId} for student ${studentId}.`);
                return res.status(500).json({ message: 'Error interno del servidor al verificar permisos del grupo.' });
            }
        } else { // Si la jerarquía de la asignación no contiene la información del grupo
            console.error(`Assignment ${assignmentId} hierarchy does not contain group information for student ${studentId}.`);
            return res.status(500).json({ message: 'Error interno del servidor al verificar la asignación.' });
        }
        // *** Fin verificación y asignación ***

        // 4. Contar intentos y verificar límite (HACERLO AQUI UNA VEZ)
        const currentAttempts = await Submission.countDocuments({
            assignment_id: assignmentId,
            student_id: studentId
        });

        if (assignment.intentos_permitidos !== undefined && assignment.intentos_permitidos !== null && currentAttempts >= assignment.intentos_permitidos) {
            console.warn(`Student ${studentId} exceeded attempt limit (${assignment.intentos_permitidos}) during submission for assignment ${assignmentId}.`);
            return res.status(400).json({ message: `Has alcanzado el número máximo de intentos (${assignment.intentos_permitidos}) para esta actividad.` });
        }
        // *** FIN Contar intentos y verificar límite ***


        const now = new Date();
        const isLate = assignment.fecha_fin && now > new Date(assignment.fecha_fin);

        // 5. Procesar y guardar la respuesta/entrega según el tipo de actividad
        let submissionData = {};
        let calificacion = null;
        let estado_envio = 'Enviado'; // Estado por defecto después de enviar

        if (activity.type === 'Quiz') {
            if (!studentAnswers) {
                console.warn(`Quiz submission for assignment ${assignmentId} received no studentAnswers.`);
                return res.status(400).json({ message: 'Respuestas de Quiz esperadas pero no recibidas.' });
            }

            let quizAnswersFormatted = [];
            let correctAnswersCount = 0;
            // *** Añadir check si quiz_questions existe y es array (añadido para robustez) ***
            if (!activity.quiz_questions || !Array.isArray(activity.quiz_questions)) {
                console.error(`Activity ${activity._id} of type Quiz is missing or has invalid quiz_questions array.`);
                return res.status(500).json({ message: 'Error interno del servidor al procesar las preguntas del Quiz.' });
            }
            const totalQuizQuestions = activity.quiz_questions.length;


            activity.quiz_questions.forEach((q, index) => {
                if (!q || !q._id) {
                    console.warn(`Skipping invalid question element at index ${index} in Quiz questions for activity ${activity._id}.`);
                    return;
                }

                const studentAnswerValue = studentAnswers[q._id] !== undefined ? String(studentAnswers[q._id]).trim() : null;

                quizAnswersFormatted.push({
                    question_index: index,
                    student_answer: studentAnswerValue
                });

                if (studentAnswerValue !== null && q.correct_answer !== undefined && q.correct_answer !== null) {
                    if (studentAnswerValue === String(q.correct_answer).trim()) {
                        correctAnswersCount++;
                    }
                }
            });

            if (totalQuizQuestions > 0 && assignment.puntos_maximos !== undefined && assignment.puntos_maximos !== null && assignment.puntos_maximos >= 0) {
                calificacion = (correctAnswersCount / totalQuizQuestions) * assignment.puntos_maximos;
                estado_envio = 'Calificado';
            } else {
                estado_envio = 'Enviado';
            }
            submissionData = { quiz_answers: quizAnswersFormatted };


        } else if (activity.type === 'Cuestionario') {
            if (!studentAnswers) {
                console.warn(`Cuestionario submission for assignment ${assignmentId} received no studentAnswers.`);
                return res.status(400).json({ message: 'Respuestas de Cuestionario esperadas pero no recibidas.' });
            }

            let cuestionarioAnswersFormatted = [];
            // *** Añadir check si cuestionario_questions existe y es array (añadido para robustez) ***
            if (!activity.cuestionario_questions || !Array.isArray(activity.cuestionario_questions)) {
                console.error(`Activity ${activity._id} of type Cuestionario is missing or has invalid cuestionario_questions array.`);
                return res.status(500).json({ message: 'Error interno del servidor al procesar las preguntas del Cuestionario.' });
            }
            const totalCuestionarioQuestions = activity.cuestionario_questions.length;

            activity.cuestionario_questions.forEach((q, index) => {
                if (!q || !q._id) {
                    console.warn(`Skipping invalid question element at index ${index} in Cuestionario questions for activity ${activity._id}.`);
                    return;
                }

                const studentAnswerValue = studentAnswers[q._id] !== undefined ? String(studentAnswers[q._id]).trim() : null; // Obtener respuesta por ID de pregunta

                cuestionarioAnswersFormatted.push({
                    question_index: index,
                    student_answer: studentAnswerValue
                });
            });
            estado_envio = 'Enviado';
            calificacion = null;
            submissionData = { cuestionario_answers: cuestionarioAnswersFormatted };


        // *** NUEVO BLOQUE PARA TRABAJO ***
        } else if (activity.type === 'Trabajo') {
            if (!trabajoLink || trabajoLink.trim() === '') {
                console.warn(`Trabajo submission for assignment ${assignmentId} received no trabajoLink.`);
                return res.status(400).json({ message: 'El enlace de entrega del trabajo es obligatorio.' });
            }

            estado_envio = 'Enviado';
            calificacion = null;
            submissionData = { link_entrega: trabajoLink.trim() };

        }
        // *** Fin Procesamiento de respuestas/entrega ***


        // 6. Crear y guardar el documento de Submission
        // Contar intentos *justo antes* de crear la submission para el número de intento
        // *** CORRECCIÓN: Esta declaración de currentAttempts está duplicada y causa el error. Ya la contamos arriba. ***
        // const currentAttempts = await Submission.countDocuments({...}); // <-- ELIMINAR O COMENTAR ESTA LÍNEA
        // Re-verificar límite de intentos por si acaso algo cambió entre la carga de la página y el envío
        // *** La verificación del límite ya se hizo arriba, pero se puede dejar esta por seguridad si se desea,
        // pero usando la variable currentAttempts contada al principio. ***
        // if (assignment.intentos_permitidos !== undefined && assignment.intentos_permitidos !== null && currentAttempts >= assignment.intentos_permitidos) {
        //     console.warn(...);
        //     return res.status(400).json({ message: ... });
        // }
        // ***********************************************************************************

        const newSubmission = new Submission({
            assignment_id: assignmentId,
            student_id: studentId,
            // *** Usar los IDs del objeto assignment populado (mantienes esta lógica) ***
            group_id: assignment.theme_id?.module_id?.learning_path_id?.group_id?._id || null,
            docente_id: assignment.theme_id?.module_id?.learning_path_id?.group_id?.docente_id || null,
            // ****************************************************************
            fecha_envio: new Date(),
            estado_envio: estado_envio,
            is_late: assignment.fecha_fin && new Date() > new Date(assignment.fecha_fin),
            // *** CORRECCIÓN: Usar la variable currentAttempts contada al principio ***
            attempt_number: currentAttempts + 1, // Este es el siguiente intento disponible
            // ***********************************************************************
            calificacion: calificacion,
            respuesta: submissionData // Asignar el objeto de datos de respuesta construido
        });

        const savedSubmission = await newSubmission.save();

        console.log(`Entrega #${savedSubmission.attempt_number} guardada para la asignación ${assignmentId} por el estudiante ${studentId}. Tipo: ${activity.type}. Estado: ${savedSubmission.estado_envio}. Tarde: ${savedSubmission.is_late}`);

        // 7. Opcional: Actualizar el progreso general (modelo Progress)
        // ...

        // 8. Responder al frontend
        res.status(201).json({
            message: 'Entrega registrada con éxito.',
            submission: savedSubmission
        });

    } catch (error) {
        console.error('Error al registrar la entrega de la actividad:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación no válido.' });
        }
        next(error);
    }
};

// @desc    Obtener la ÚLTIMA entrega de cada estudiante para una asignación (Vista Docente/Admin)
// @route   GET /api/activities/assignments/:assignmentId/submissions
// @access  Privado/Docente, Admin
const getAssignmentSubmissions = async (req, res, next) => {
    try {
        const userId = req.user._id; // ID del usuario autenticado
        const userType = req.user.tipo_usuario;
        const { assignmentId } = req.params;

        // Verificar si el usuario es Docente o Administrador
        if (userType !== 'Docente' && userType !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden ver las entregas.' });
        }

        // Opcional (pero recomendado por seguridad): Verificar que el Docente está relacionado con la asignación/grupo
        // (Mantenemos esta lógica si es Docente)
         if (userType === 'Docente') {
             const assignmentCheck = await ContentAssignment.findById(assignmentId)
                .populate({ // Poblar hasta el grupo para verificar el docente_id
                    path: 'theme_id',
                    populate: {
                        path: 'module_id',
                        populate: {
                            path: 'learning_path_id',
                            populate: {
                                path: 'group_id'
                            }
                        }
                    }
                });

            if (!assignmentCheck) {
                 return res.status(404).json({ message: 'Asignación no encontrada para verificación de docente.' });
            }

            const assignmentTeacherId = assignmentCheck.theme_id?.module_id?.learning_path_id?.group_id?.docente_id;

            if (!assignmentTeacherId || assignmentTeacherId.toString() !== userId.toString()) {
                 return res.status(403).json({ message: 'Acceso denegado. No eres el docente de esta asignación.' });
            }
            // Si es Administrador, no necesita esta verificación específica del docente
        }


        // *** USAR AGREGACIÓN para encontrar la última entrega por cada estudiante ***
        const latestSubmissions = await Submission.aggregate([
            {
                $match: { // 1. Filtrar por el ID de la asignación
                    assignment_id: new mongoose.Types.ObjectId(assignmentId) // Asegúrate de convertir a ObjectId
                }
            },
            {
                $sort: { // 2. Ordenar por estudiante y luego por fecha de envío (descendente)
                    student_id: 1, // Ordenar por estudiante
                    fecha_envio: -1 // El más reciente primero para cada estudiante
                    // O podrías usar attempt_number: -1 si confías en que el número de intento siempre es incremental
                }
            },
            {
                $group: { // 3. Agrupar por estudiante y tomar el PRIMER documento (que es el último intento por el sort anterior)
                    _id: "$student_id", // Agrupar por el ID del estudiante
                    latestSubmissionId: { $first: "$_id" }, // Capturar el ID del documento del último intento
                    // Capturar otros campos si necesitas usarlos directamente en el $project o $lookup posterior
                    // Por ahora, solo necesitamos el ID del documento
                }
            },
            {
                 // 4. Re-obtener el documento completo del último intento usando el ID capturado
                 // Esto es necesario porque $group nos dio solo el ID del último intento, no el documento completo
                $lookup: {
                    from: "submissions", // Nombre de la colección de entregas
                    localField: "latestSubmissionId", // Campo en los resultados de $group (_id del último intento)
                    foreignField: "_id", // Campo en la colección submissions (_id del documento)
                    as: "latestSubmission" // Nombre del array donde se pondrá el documento (será un array de 1 elemento)
                }
            },
            {
                $unwind: "$latestSubmission" // Desestructurar el array latestSubmission (sabemos que solo tiene 1 elemento)
            },
             {
                // 5. Reemplazar el documento raíz con el documento del último intento
                $replaceRoot: { newRoot: "$latestSubmission" }
             },
            {
                 // 6. Poblar los campos necesarios (student_id y assignment_id.activity_id)
                 // Esto simula el populate() después de la agregación
                $lookup: {
                    from: "users", // Nombre de la colección de usuarios
                    localField: "student_id",
                    foreignField: "_id",
                    as: "student_id"
                }
            },
            {
                 $unwind: "$student_id" // Desestructurar el estudiante populado
            },
             {
                $lookup: {
                    from: "contentassignments", // Nombre de la colección de asignaciones de contenido
                    localField: "assignment_id",
                    foreignField: "_id",
                    as: "assignment_id"
                }
            },
             {
                $unwind: "$assignment_id" // Desestructurar la asignación populada
            },
             {
                $lookup: {
                    from: "activities", // Nombre de la colección de actividades
                    localField: "assignment_id.activity_id",
                    foreignField: "_id",
                    as: "assignment_id.activity_id" // Poblar la actividad dentro de la asignación
                }
            },
            {
                $unwind: "$assignment_id.activity_id" // Desestructurar la actividad populada
            }
            // Opcional: $project para seleccionar y renombrar campos si es necesario
            // {
            //     $project: {
            //         _id: 1,
            //         student_id: { _id: 1, nombre: 1, apellido: 1, email: 1 }, // Seleccionar solo campos del estudiante
            //         assignment_id: { // Seleccionar campos de la asignación y su actividad
            //             _id: 1,
            //             puntos_maximos: 1,
            //             activity_id: {
            //                 _id: 1,
            //                 type: 1,
            //                 title: 1,
            //                 description: 1,
            //                 quiz_questions: 1, // Incluir preguntas si las necesitas en el frontend (Quiz/Cuestionario)
            //                 cuestionario_questions: 1
            //             }
            //         },
            //         fecha_envio: 1,
            //         estado_envio: 1,
            //         is_late: 1,
            //         attempt_number: 1,
            //         calificacion: 1,
            //         respuesta: 1 // Incluir las respuestas del estudiante
            //     }
            // }
        ]);
        // *** FIN AGREGACIÓN ***


        // Enviar la lista de las últimas entregas (una por estudiante)
        res.status(200).json(latestSubmissions);

    } catch (error) {
        console.error('Error fetching latest assignment submissions per student:', error);
         if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación no válido.' });
        }
        next(error);
    }
};


// @desc    Obtener la lista de asignaciones de actividades para un docente/admin
// @route   GET /api/activities/teacher/assignments
// @access  Privado/Docente, Admin
const getTeacherAssignments = async (req, res, next) => {
    try {
        const userId = req.user._id; // ID del usuario autenticado
        const userType = req.user.tipo_usuario;

        // Verificar si el usuario es Docente o Administrador
        if (userType !== 'Docente' && userType !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden ver esta lista de asignaciones.' });
        }

        let assignments = [];

        if (userType === 'Docente') {
            // 1. Encontrar los grupos donde este usuario es el docente
            const groups = await Group.find({ docente_id: userId });
            const groupIds = groups.map(group => group._id);

            if (groupIds.length === 0) {
                return res.status(200).json([]); // Docente no enseña en ningún grupo, devuelve lista vacía
            }

            // 2. Encontrar rutas de aprendizaje dentro de esos grupos
            const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } });
            const learningPathIds = learningPaths.map(lp => lp._id);

             if (learningPathIds.length === 0) {
                return res.status(200).json([]); // No hay rutas en sus grupos, devuelve lista vacía
            }

            // 3. Encontrar módulos dentro de esas rutas
            const modules = await Module.find({ learning_path_id: { $in: learningPathIds } });
             const moduleIds = modules.map(module => module._id);

             if (moduleIds.length === 0) {
                return res.status(200).json([]); // No hay módulos en sus rutas, devuelve lista vacía
            }

            // 4. Encontrar temas dentro de esos módulos
             const themes = await Theme.find({ module_id: { $in: moduleIds } });
              const themeIds = themes.map(theme => theme._id);

              if (themeIds.length === 0) {
                return res.status(200).json([]); // No hay temas en sus módulos, devuelve lista vacía
            }


            // 5. Encontrar asignaciones de contenido dentro de esos temas
            // Queremos solo las asignaciones de tipo 'Activity'
            assignments = await ContentAssignment.find({
                theme_id: { $in: themeIds },
                type: 'Activity' // Asegurarnos de que solo sean asignaciones de actividades interactivas
            })
            .populate('activity_id', 'title type') // Poblar solo el título y tipo de la actividad base
            // Podemos poblar un poco de la jerarquía para mostrar a dónde pertenece la asignación
            .populate({
                path: 'theme_id',
                select: 'nombre', // Solo el título del tema
                populate: {
                    path: 'module_id',
                    select: 'nombre', // Solo el título del módulo
                     populate: {
                         path: 'learning_path_id',
                         select: 'nombre', // Solo el nombre de la ruta
                          populate: {
                              path: 'group_id',
                               select: 'nombre' // Solo el nombre del grupo
                          }
                     }
                }
            })
            .sort({ fecha_inicio: 1 }); // Opcional: Ordenar por fecha de inicio


        } else if (userType === 'Administrador') {
            // Un administrador podría ver todas las asignaciones de actividades (o filtrarlas de alguna manera)
            // Por simplicidad, el admin puede ver todas las asignaciones de tipo 'Activity'
             assignments = await ContentAssignment.find({ type: 'Activity' })
                .populate('activity_id', 'title type')
                .populate({
                    path: 'theme_id',
                    select: 'nombre',
                    populate: {
                        path: 'module_id',
                        select: 'nombre',
                        populate: {
                            path: 'learning_path_id',
                            select: 'nombre',
                             populate: {
                                 path: 'group_id',
                                 select: 'nombre'
                             }
                         }
                    }
                })
                .sort({ fecha_inicio: 1 });
        }

        // *** REEMPLAZAR LÓGICA DE CONTEO BASADA EN INTENTOS POR LÓGICA BASADA EN ESTUDIANTES Y ÚLTIMO INTENTO ***

        const assignmentsWithStudentCounts = await Promise.all(assignments.map(async (assignment) => {

            // 1. Contar el número de estudiantes que han enviado al menos un intento
            const studentsWithSubmissions = await Submission.aggregate([
                {
                    $match: { // Filtrar por la asignación actual
                        assignment_id: new mongoose.Types.ObjectId(assignment._id)
                    }
                },
                {
                    $group: { // Agrupar por student_id para obtener estudiantes únicos
                        _id: "$student_id"
                    }
                },
                {
                    $count: "totalStudentsSubmitted" // Contar los grupos (estudiantes únicos)
                }
            ]);

            const totalStudentsSubmitted = studentsWithSubmissions.length > 0 ? studentsWithSubmissions[0].totalStudentsSubmitted : 0;


            // 2. Contar el número de estudiantes cuya ÚLTIMA entrega está pendiente de calificación
            let pendingGradingCount = 0;
            // Solo tiene sentido contar pendientes de calificación manual para Cuestionario y Trabajo
            if (assignment.activity_id?.type === 'Cuestionario' || assignment.activity_id?.type === 'Trabajo') {

                 const studentsWithLatestPendingSubmission = await Submission.aggregate([
                    {
                        $match: { // Filtrar por la asignación actual
                            assignment_id: new mongoose.Types.ObjectId(assignment._id)
                        }
                    },
                    {
                        $sort: { // Ordenar por estudiante y fecha/intento descendente para encontrar el último
                            student_id: 1,
                            fecha_envio: -1
                        }
                    },
                    {
                        $group: { // Agrupar por estudiante y tomar el ÚLTIMO intento
                            _id: "$student_id",
                            latestSubmission: { $first: "$$ROOT" } // Capturar el documento completo del último intento
                        }
                    },
                    {
                         $replaceRoot: { newRoot: "$latestSubmission" } // Reemplazar el documento raíz con el último intento
                    },
                    {
                        $match: { // Filtrar por el estado de la ÚLTIMA entrega
                             estado_envio: 'Enviado' // Pendiente de calificación manual
                        }
                    },
                    {
                        $count: "studentsPendingGrading" // Contar los estudiantes que cumplen la condición
                    }
                 ]);

                pendingGradingCount = studentsWithLatestPendingSubmission.length > 0 ? studentsWithLatestPendingSubmission[0].studentsPendingGrading : 0;
            }


            return {
                ...assignment.toObject(), // Mantener los datos originales de la asignación
                total_students_submitted: totalStudentsSubmitted, // Nuevo campo para el conteo de estudiantes
                pending_grading_count: pendingGradingCount // Conteo de estudiantes con última entrega pendiente
            };
        }));


        // Enviar la lista de asignaciones con los nuevos conteos basados en estudiantes
        res.status(200).json(assignmentsWithStudentCounts);

    } catch (error) {
        console.error('Error fetching teacher assignments with counts:', error);
        next(error);
    }
};

// @desc    Guardar la calificación manual para una entrega (Cuestionario/Trabajo)
// @route   PUT /api/submissions/:submissionId/grade
// @access  Privado/Docente, Admin
const gradeSubmission = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userType = req.user.tipo_usuario;
        const { submissionId } = req.params;
        const { calificacion } = req.body; // Recibir la calificación del cuerpo de la solicitud

        // 1. Verificar si el usuario es Docente o Administrador
        if (userType !== 'Docente' && userType !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden calificar entregas.' });
        }

        // 2. Validar la calificación recibida
        const gradeValue = parseFloat(calificacion);
        if (isNaN(gradeValue) || gradeValue < 0) {
            return res.status(400).json({ message: 'Por favor, ingresa una calificación numérica válida y positiva.' });
        }
        // Opcional: Podrías añadir una validación aquí para asegurar que la calificación no supera los puntos_maximos de la asignación.
        // Para ello, necesitarías poblar assignment_id o hacer una búsqueda adicional de la asignación.
        // const submission = await Submission.findById(submissionId).populate('assignment_id');
        // if (submission.assignment_id && gradeValue > submission.assignment_id.puntos_maximos) {
        //      return res.status(400).json({ message: `La calificación no puede superar los puntos máximos de la asignación (${submission.assignment_id.puntos_maximos}).` });
        // }


        // 3. Encontrar la entrega por su ID
        const submission = await Submission.findById(submissionId);

        if (!submission) {
            return res.status(404).json({ message: 'Entrega no encontrada.' });
        }

        // 4. Opcional (pero recomendado por seguridad): Verificar que el docente está autorizado para calificar esta entrega
        // Esto evita que un docente califique entregas de asignaciones en grupos donde no enseña.
        // Si el campo docente_id está en el modelo Submission y se llena correctamente al crear la entrega:
        if (userType === 'Docente' && submission.docente_id && submission.docente_id.toString() !== userId.toString()) {
             return res.status(403).json({ message: 'Acceso denegado. No eres el docente asignado para calificar esta entrega.' });
        }
        // Si el campo docente_id no está en Submission, necesitarías poblar assignment_id.theme_id.module_id.learning_path_id.group_id.docente_id
        // como lo hicimos en getAssignmentSubmissions para verificar.
        // const submissionWithAssignment = await Submission.findById(submissionId)
        //     .populate({ path: 'assignment_id', populate: { path: 'theme_id', populate: { path: 'module_id', populate: { path: 'learning_path_id', populate: { path: 'group_id' } } } } });
        // const assignmentTeacherId = submissionWithAssignment.assignment_id?.theme_id?.module_id?.learning_path_id?.group_id?.docente_id;
        // if (userType === 'Docente' && assignmentTeacherId && assignmentTeacherId.toString() !== userId.toString()) { ... }


        // 5. Verificar que el tipo de actividad de la entrega es calificable manualmente (Cuestionario o Trabajo)
         // Necesitas el tipo de actividad. Si no está en Submission, necesitas poblar assignment_id.activity_id.type
         const submissionWithActivity = await Submission.findById(submissionId)
            .populate('assignment_id', 'activity_id') // Solo poblar lo necesario
            .populate({ path: 'assignment_id.activity_id', model: 'Activity', select: 'type' }); // Poblar el tipo de actividad base

        if (!submissionWithActivity || !submissionWithActivity.assignment_id?.activity_id?.type) {
             return res.status(500).json({ message: 'No se pudo determinar el tipo de actividad para esta entrega.' });
        }

        const activityType = submissionWithActivity.assignment_id.activity_id.type;

        if (activityType !== 'Cuestionario' && activityType !== 'Trabajo') {
            return res.status(400).json({ message: `Las entregas de tipo ${activityType} no se califican manualmente.` });
        }


        // 6. Actualizar la calificación y el estado de la entrega
        submission.calificacion = gradeValue;
        submission.estado_envio = 'Calificado'; // O el estado que uses para 'calificado'

        // 7. Guardar la entrega actualizada
        const updatedSubmission = await submission.save();

        // 8. Responder con la entrega actualizada
        res.status(200).json({
            message: 'Calificación guardada con éxito.',
            submission: updatedSubmission // O podrías poblar campos adicionales antes de responder si el frontend los necesita
        });

    } catch (error) {
        console.error('Error grading submission:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de entrega no válido.' });
        }
        next(error);
    }
};

module.exports = { 
    getStudentActivityForAttempt,
    submitStudentActivityAttempt,
    getAssignmentSubmissions,
    getTeacherAssignments,
    gradeSubmission,
};