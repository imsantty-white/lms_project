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
const AppError = require('../utils/appError');
const { isApprovedGroupMember, isTeacherOfContentAssignment, isTeacherOfSubmission } = require('../utils/permissionUtils');
const NotificationService = require('../services/NotificationService'); // Adjust path if necessary

// Helper function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// @desc    Obtener los detalles de una Actividad asignada para que un estudiante la inicie
// @route   GET /api/activities/student/:assignmentId/start
// @access  Privado/Estudiante (miembro aprobado del grupo de la ruta de la asignación)
const getStudentActivityForAttempt = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    try {
        const { assignmentId } = req.params;
        const studentId = req.user._id;
        const userType = req.user.tipo_usuario;

        // Verificar que el usuario es un estudiante (mantener)
        if (userType !== 'Estudiante') {
            return res.status(403).json({ message: 'Acceso denegado. Solo estudiantes pueden acceder a actividades asignadas.' });
        }

        // Encontrar la asignación y popular los detalles necesarios
        const assignmentDetails = await ContentAssignment.findById(assignmentId)
            .populate({
                path: 'activity_id', // Necesitamos la Actividad base
                // --- CAMBIO CLAVE AQUÍ ---
                // Incluye explícitamente los campos que SÍ quieres de quiz_questions y cuestionario_questions
                select: 'type title description ' +
                        'quiz_questions.text quiz_questions.options quiz_questions._id ' +
                        'cuestionario_questions.text cuestionario_questions.options cuestionario_questions._id'
            })
            .populate({ // Necesitamos la jerarquía para permisos/grupo
                path: 'theme_id',
                select: 'nombre', // Select only name for theme
                populate: {
                    path: 'module_id',
                    select: 'nombre', // Select only name for module
                    populate: {
                        path: 'learning_path_id',
                        select: 'nombre', // Select only name for learning path
                        populate: {
                            path: 'group_id',
                            select: '_id' // Select only _id for group membership check
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
             return res.status(403).json({ message: `Esta actividad asignada no está actualmente disponible (Estado: ${assignmentDetails.status}).` });
        }
        // *** Fin Nueva Verificación de Estado ***

        const activityDetails = assignmentDetails.activity_id;

        // --- ESTE BLOQUE YA NO ES NECESARIO SI LA SOLUCIÓN DEL POPULATE FUNCIONA CORRECTAMENTE ---
        // Pero no hace daño dejarlo como respaldo si prefieres la eliminación manual por alguna razón,
        // aunque el select en populate es más eficiente.
        /*
        if (activityDetails && activityDetails.type === 'Quiz' && activityDetails.quiz_questions && Array.isArray(activityDetails.quiz_questions)) {
            activityDetails.quiz_questions.forEach(question => {
                delete question.correct_answer;
            });
        }
        */

        // Verificar que el estudiante es miembro aprobado del grupo (mantener)
        let group = null;
        if (assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id) {
            group = assignmentDetails.theme_id.module_id.learning_path_id.group_id;
            const isMember = await isApprovedGroupMember(studentId, group._id);
            if (!isMember) {
                return res.status(403).json({ message: 'No tienes permiso para acceder a esta actividad. No eres miembro aprobado del grupo.' });
            }
        } else {
            // Esto indica que la asignación existe pero su estructura de datos está incompleta
            return next(new AppError('La estructura de la asignación está incompleta y no se pudo verificar el grupo.', 404));
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

        // Shuffle questions if they exist
        if (activityDetails.quiz_questions && Array.isArray(activityDetails.quiz_questions) && activityDetails.quiz_questions.length > 0) {
            shuffleArray(activityDetails.quiz_questions);
            // Now, shuffle options for each quiz question
            activityDetails.quiz_questions.forEach(question => {
                if (question.options && Array.isArray(question.options) && question.options.length > 0) {
                    shuffleArray(question.options);
                }
            });
        }
        if (activityDetails.cuestionario_questions && Array.isArray(activityDetails.cuestionario_questions) && activityDetails.cuestionario_questions.length > 0) {
            shuffleArray(activityDetails.cuestionario_questions);
        }

        // Enviar los detalles de la asignación, la actividad base, los intentos usados y la última entrega
        res.status(200).json({
            assignmentDetails: assignmentDetails, // Esto incluye el estado y activity_id ya filtrado
            activityDetails: activityDetails, // Este también tendrá quiz_questions sin correct_answer
            attemptsUsed: attemptsUsed,
            lastSubmission: lastSubmission
        });

    } catch (error) {
        console.error('Error fetching student activity for attempt:', error);
        next(error);
    }
};



// @desc    Registrar la entrega de respuestas de un estudiante para una asignación de actividad
// @route   POST /api/activities/student/:assignmentId/submit-attempt
// @access  Privado/Estudiante (miembro aprobado del grupo de la ruta de la asignación)
const submitStudentActivityAttempt = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    try {
        // *** Añadir verificación explícita para req.user ***
        if (!req.user || !req.user._id || !req.user.tipo_usuario) {
            console.error('Authentication failed: req.user is not set.');
            return res.status(401).json({ message: 'No autorizado. Por favor, inicia sesión.' });
        }

        const { assignmentId } = req.params;
        const studentId = req.user._id;
        const userType = req.user.tipo_usuario;

        // MODIFIED: Extraer studentAnswers, trabajoLink, AND isAutoSaveDueToClosure del body
        const { studentAnswers, trabajoLink, isAutoSaveDueToClosure } = req.body;
        // ************************************************************

        // MODIFIED: Validar si se recibieron datos de entrega (answers O link)
        // For auto-save, it's possible that neither is present if student didn't interact yet,
        // but the frontend might send empty answers. For now, we keep this validation.
        // If auto-save implies saving even with no interaction, this might need adjustment.
        if (!studentAnswers && !trabajoLink && !isAutoSaveDueToClosure) { // Allow empty if auto-saving
            return res.status(400).json({ message: 'No se recibieron datos de entrega válidos (respuestas o enlace de trabajo).' });
        }
        // If it's an auto-save, studentAnswers or trabajoLink might be null/empty if the student hasn't interacted.
        // The current logic for processing Quiz/Cuestionario/Trabajo should handle null/empty studentAnswers/trabajoLink gracefully.
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
            .populate({
                path: 'activity_id',
                select: 'type quiz_questions cuestionario_questions' // Select necessary fields for activity
            })
            .populate({
                path: 'theme_id',
                select: 'nombre', // Select only name for theme
                populate: {
                    path: 'module_id',
                    select: 'nombre', // Select only name for module
                    populate: {
                        path: 'learning_path_id',
                        select: 'nombre', // Select only name for learning path
                        populate: {
                            path: 'group_id',
                            select: '_id docente_id nombre' // Select _id, docente_id, and nombre for group
                        }
                    }
                }
            });

        // *** Este check de assignment ahora se hace después de la población ***
        if (!assignment) {
            console.error(`Assignment ${assignmentId} not found after populate.`);
            return res.status(404).json({ message: 'Asignación no encontrada después de poblar.' });
        }

        // Check assignment status - MODIFIED
        if (assignment.status === 'Closed' && !isAutoSaveDueToClosure) {
            return res.status(403).json({ message: 'No se pueden realizar entregas para actividades cerradas.' });
        }
        // If isAutoSaveDueToClosure is true, proceed even if assignment.status is 'Closed'.

        if (assignment.status === 'Draft') { // This check remains as is
            return res.status(403).json({ message: 'Esta actividad aún no está abierta para entregas.' });
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
                // Refactor: Use isApprovedGroupMember
                const isMember = await isApprovedGroupMember(studentId, groupId);
                if (!isMember) { // Si NO es miembro aprobado
                    console.error(`Student ${studentId} is not an approved member of group ${groupId} for assignment ${assignmentId}.`);
                    return res.status(403).json({ message: 'No tienes permiso para enviar esta entrega. No eres miembro aprobado del grupo.' });
                }
            } else { // Si no se pudo obtener el groupId de la asignación
                console.error(`Could not get groupId from assignment ${assignmentId} for student ${studentId}.`);
                return next(new AppError('La estructura de la asignación es incompleta y no se pudo obtener el ID del grupo.', 404));
            }
        } else { // Si la jerarquía de la asignación no contiene la información del grupo
            console.error(`Assignment ${assignmentId} hierarchy does not contain group information for student ${studentId}.`);
            return next(new AppError('La estructura de la asignación es incompleta y no se pudo verificar la información del grupo.', 404));
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
        let computedCalificacion = null; // Using computed prefix
        let computedEstadoEnvio = 'Enviado'; // Default state

        if (activity.type === 'Quiz') {
            if (!studentAnswers && !isAutoSaveDueToClosure) { // Allow empty answers if auto-saving (student might not have answered yet)
                console.warn(`Quiz submission for assignment ${assignmentId} received no studentAnswers.`);
                return res.status(400).json({ message: 'Respuestas de Quiz esperadas pero no recibidas.' });
            }

            let quizAnswersFormatted = [];
            let correctAnswersCount = 0;
            if (!activity.quiz_questions || !Array.isArray(activity.quiz_questions)) {
                console.error(`Activity ${activity._id} of type Quiz is missing or has invalid quiz_questions array.`);
                return res.status(500).json({ message: 'Error interno del servidor al procesar las preguntas del Quiz.' });
            }
            const totalQuizQuestions = activity.quiz_questions.length;

            // Ensure studentAnswers is an object even if null/undefined, to prevent errors in forEach
            const currentStudentAnswers = studentAnswers || {};

            activity.quiz_questions.forEach((q, index) => {
                if (!q || !q._id) {
                    console.warn(`Skipping invalid question element at index ${index} in Quiz questions for activity ${activity._id}.`);
                    return;
                }
                const studentAnswerValue = currentStudentAnswers[q._id] !== undefined ? String(currentStudentAnswers[q._id]).trim() : null;
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
                computedCalificacion = (correctAnswersCount / totalQuizQuestions) * assignment.puntos_maximos;
                computedEstadoEnvio = 'Calificado';
            } else {
                computedEstadoEnvio = 'Enviado'; // Default if not auto-graded
            }
            submissionData = { quiz_answers: quizAnswersFormatted };

        } else if (activity.type === 'Cuestionario') {
            if (!studentAnswers && !isAutoSaveDueToClosure) {
                console.warn(`Cuestionario submission for assignment ${assignmentId} received no studentAnswers.`);
                return res.status(400).json({ message: 'Respuestas de Cuestionario esperadas pero no recibidas.' });
            }
            let cuestionarioAnswersFormatted = [];
            if (!activity.cuestionario_questions || !Array.isArray(activity.cuestionario_questions)) {
                console.error(`Activity ${activity._id} of type Cuestionario is missing or has invalid cuestionario_questions array.`);
                return res.status(500).json({ message: 'Error interno del servidor al procesar las preguntas del Cuestionario.' });
            }

            const currentStudentAnswers = studentAnswers || {};

            activity.cuestionario_questions.forEach((q, index) => {
                if (!q || !q._id) {
                    console.warn(`Skipping invalid question element at index ${index} in Cuestionario questions for activity ${activity._id}.`);
                    return;
                }
                const studentAnswerValue = currentStudentAnswers[q._id] !== undefined ? String(currentStudentAnswers[q._id]).trim() : null;
                cuestionarioAnswersFormatted.push({
                    question_index: index,
                    student_answer: studentAnswerValue
                });
            });
            computedEstadoEnvio = 'Enviado';
            computedCalificacion = null;
            submissionData = { cuestionario_answers: cuestionarioAnswersFormatted };

        } else if (activity.type === 'Trabajo') {
            // For Trabajo, trabajoLink is required unless it's an auto-save where the student hasn't provided it yet.
            if ((!trabajoLink || trabajoLink.trim() === '') && !isAutoSaveDueToClosure) {
                console.warn(`Trabajo submission for assignment ${assignmentId} received no trabajoLink.`);
                return res.status(400).json({ message: 'El enlace de entrega del trabajo es obligatorio.' });
            }
            computedEstadoEnvio = 'Enviado';
            computedCalificacion = null;
            submissionData = { link_entrega: trabajoLink ? trabajoLink.trim() : null }; // Handle potentially null trabajoLink
        }

        // Override for auto-save due to teacher closing
        if (isAutoSaveDueToClosure) {
            computedEstadoEnvio = 'Pendiente'; // Indicates it's an auto-saved, incomplete submission
            computedCalificacion = null;      // Auto-saved progress is not graded at this point
        }
        // *** Fin Procesamiento de respuestas/entrega ***

        // 6. Crear y guardar el documento de Submission
        const newSubmission = new Submission({
            assignment_id: assignmentId,
            student_id: studentId,
            group_id: assignment.theme_id?.module_id?.learning_path_id?.group_id?._id || null,
            docente_id: assignment.theme_id?.module_id?.learning_path_id?.group_id?.docente_id || null,
            fecha_envio: new Date(),
            estado_envio: computedEstadoEnvio, // Use computed value
            is_late: assignment.fecha_fin && new Date() > new Date(assignment.fecha_fin),
            attempt_number: currentAttempts + 1,
            calificacion: computedCalificacion, // Use computed value
            respuesta: submissionData,
            is_auto_save: isAutoSaveDueToClosure || false // Add a flag to mark auto-saved submissions
        });

        const savedSubmission = await newSubmission.save();

        console.log(`Entrega #${savedSubmission.attempt_number} guardada para la asignación ${assignmentId} por el estudiante ${studentId}. Tipo: ${activity.type}. Estado: ${savedSubmission.estado_envio}. Tarde: ${savedSubmission.is_late}. AutoGuardado: ${savedSubmission.is_auto_save}`);

        try {
            // The 'assignment' variable is populated at the beginning of the function.
            // req.user contains the student details.
            const student = req.user; // Student who is making the submission

            if (assignment && 
                assignment.activity_id && 
                assignment.theme_id?.module_id?.learning_path_id?.group_id &&
                assignment.theme_id.module_id.learning_path_id.group_id.docente_id) {

                const activityTitle = assignment.activity_id.title || 'the assignment';
                const groupFromAssignment = assignment.theme_id.module_id.learning_path_id.group_id;
                const teacherId = groupFromAssignment.docente_id; // This is the recipient
                
                // groupName should be available as 'nombre' was added to select for group_id population
                const groupName = groupFromAssignment.nombre || 'the group'; 

                const studentName = `${student.nombre} ${student.apellidos || ''}`.trim();
                
                const message = `${studentName} submitted work for '${activityTitle}' in group '${groupName}'.`;
                
                // Link for the teacher to view this specific submission.
                // assignment._id is ContentAssignment ID.
                const link = `/teacher/assignments/${assignment._id}/submissions/student/${student._id}`; 

                await NotificationService.createNotification({
                    recipient: teacherId,
                    sender: student._id, // Student who submitted
                    type: 'NEW_SUBMISSION',
                    message: message,
                    link: link
                });

            } else {
                console.error(`Could not gather necessary details (teacherId, activityTitle, studentName, groupName) for assignment ${savedSubmission.assignment_id} to send new submission notification.`);
            }
        } catch (notificationError) {
            console.error('Failed to send new submission notification:', notificationError);
            // Do not let notification errors break the main response
        }

        // 7. Opcional: Actualizar el progreso general (modelo Progress)
        // ...

        // 8. Responder al frontend
        // For auto-saves, the message could be different, but for now, it's generic.
        // The client might not even show a message for auto-saves if they are background.
        res.status(201).json({
            message: isAutoSaveDueToClosure ? 'Progreso guardado automáticamente.' : 'Entrega registrada con éxito.',
            submission: savedSubmission // Use newSubmission (which is savedSubmission after .save())
        });

    } catch (error) {
        console.error('Error al registrar la entrega de la actividad:', error);
        next(error);
    }
};

// @desc    Obtener la ÚLTIMA entrega de cada estudiante para una asignación (Vista Docente/Admin)
// @route   GET /api/activities/assignments/:assignmentId/submissions
// @access  Privado/Docente, Admin
const getAssignmentSubmissions = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query; // Valores por defecto
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    try {
        const userId = req.user._id;
        const userType = req.user.tipo_usuario;
        const { assignmentId } = req.params;

        if (userType !== 'Docente' && userType !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden ver las entregas.' });
        }

        if (userType === 'Docente') {
            const isTeacher = await isTeacherOfContentAssignment(userId, assignmentId);
            if (!isTeacher) {
                return res.status(403).json({ message: 'Acceso denegado. No eres el docente de esta asignación.' });
            }
        }

        const facetPipeline = [
            { $match: { assignment_id: new mongoose.Types.ObjectId(assignmentId) } },
            { $sort: { student_id: 1, fecha_envio: -1 } },
            {
                $group: {
                    _id: "$student_id",
                    latestSubmissionDoc: { $first: "$$ROOT" }
                }
            },
            // En este punto, tenemos un documento por estudiante con su última entrega
            {
                $facet: {
                    metadata: [{ $count: "totalItems" }],
                    data: [
                        { $skip: (pageNumber - 1) * limitNumber },
                        { $limit: limitNumber },
                        { $replaceRoot: { newRoot: "$latestSubmissionDoc" } }, // Volver al documento de la entrega
                        // Lookups y Projections para poblar los datos necesarios
                        { $lookup: { from: "users", localField: "student_id", foreignField: "_id", as: "student_id_populated" } },
                        { $unwind: { path: "$student_id_populated", preserveNullAndEmptyArrays: true } }, // preserve para no perder entregas si el usuario fue eliminado
                        { $lookup: { from: "contentassignments", localField: "assignment_id", foreignField: "_id", as: "assignment_id_populated" } },
                        { $unwind: { path: "$assignment_id_populated", preserveNullAndEmptyArrays: true } }, // preserve por si la asignación fue eliminada
                        { $lookup: { from: "activities", localField: "assignment_id_populated.activity_id", foreignField: "_id", as: "activity_details" } },
                        { $unwind: { path: "$activity_details", preserveNullAndEmptyArrays: true } }, // preserve por si la actividad base fue eliminada
                        {
                            $project: {
                                _id: 1,
                                student_id: {
                                    _id: "$student_id_populated._id",
                                    nombre: "$student_id_populated.nombre",
                                    apellidos: "$student_id_populated.apellidos",
                                    email: "$student_id_populated.email"
                                },
                                assignment_id: { // Devuelve el objeto assignment_id original, ya que los detalles de la actividad están en activity_details
                                    _id: "$assignment_id_populated._id",
                                    puntos_maximos: "$assignment_id_populated.puntos_maximos",
                                    // activity_id ahora se refiere al ID, los detalles están en activity_details
                                    activity_id: "$assignment_id_populated.activity_id"
                                },
                                activity_details: { // Incluir los detalles de la actividad aquí
                                     _id: "$activity_details._id",
                                     type: "$activity_details.type",
                                     title: "$activity_details.title",
                                     quiz_questions: "$activity_details.quiz_questions",
                                     cuestionario_questions: "$activity_details.cuestionario_questions"
                                },
                                fecha_envio: 1,
                                estado_envio: 1,
                                is_late: 1,
                                attempt_number: 1,
                                calificacion: 1,
                                respuesta: 1
                            }
                        }
                    ]
                }
            }
        ];

        const result = await Submission.aggregate(facetPipeline);

        const latestSubmissions = result[0].data;
        const totalItems = result[0].metadata.length > 0 ? result[0].metadata[0].totalItems : 0;
        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: latestSubmissions,
            pagination: {
                totalItems: totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages: totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null
            }
        });

    } catch (error) {
        console.error('Error fetching latest assignment submissions per student:', error);
        next(error);
    }
};


// @desc    Obtener la lista de asignaciones de actividades para un docente/admin
// @route   GET /api/activities/teacher/assignments
// @access  Privado/Docente, Admin
const getTeacherAssignments = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query; // Valores por defecto
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    try {
        const userId = req.user._id; // ID del usuario autenticado
        const userType = req.user.tipo_usuario;

        if (userType !== 'Docente' && userType !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden ver esta lista de asignaciones.' });
        }

        let assignments = [];
        let totalAssignments = 0;
        let baseQueryConditions = {};

        if (userType === 'Docente') {
            const groups = await Group.find({ docente_id: userId });
            const groupIds = groups.map(group => group._id);
            if (groupIds.length === 0) {
                return res.status(200).json({ data: [], pagination: { totalItems: 0, currentPage: 1, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null } });
            }
            const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } });
            const learningPathIds = learningPaths.map(lp => lp._id);
            if (learningPathIds.length === 0) {
                return res.status(200).json({ data: [], pagination: { totalItems: 0, currentPage: 1, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null } });
            }
            const modules = await Module.find({ learning_path_id: { $in: learningPathIds } });
            const moduleIds = modules.map(module => module._id);
            if (moduleIds.length === 0) {
                return res.status(200).json({ data: [], pagination: { totalItems: 0, currentPage: 1, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null } });
            }
            const themes = await Theme.find({ module_id: { $in: moduleIds } });
            const themeIds = themes.map(theme => theme._id);
            if (themeIds.length === 0) {
                return res.status(200).json({ data: [], pagination: { totalItems: 0, currentPage: 1, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null } });
            }
            baseQueryConditions = { theme_id: { $in: themeIds }, type: 'Activity' };
        } else { // Administrador
            baseQueryConditions = { type: 'Activity' };
        }

        totalAssignments = await ContentAssignment.countDocuments(baseQueryConditions);

        assignments = await ContentAssignment.find(baseQueryConditions)
            .populate({ path: 'activity_id', select: 'title type' })
            .populate({
                path: 'theme_id',
                select: 'nombre',
                populate: {
                    path: 'module_id',
                    select: 'nombre',
                    populate: {
                        path: 'learning_path_id',
                        select: 'nombre',
                        populate: { path: 'group_id', select: 'nombre' }
                    }
                }
            })
            .sort({ fecha_inicio: 1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const plainAssignments = assignments; // Ya son plain objects por .lean()

        if (plainAssignments.length === 0) {
            return res.status(200).json({
                data: [],
                pagination: {
                    totalItems: totalAssignments,
                    currentPage: pageNumber,
                    itemsPerPage: limitNumber,
                    totalPages: Math.ceil(totalAssignments / limitNumber),
                    hasNextPage: pageNumber < Math.ceil(totalAssignments / limitNumber),
                    hasPrevPage: pageNumber > 1,
                    nextPage: pageNumber < Math.ceil(totalAssignments / limitNumber) ? pageNumber + 1 : null,
                    prevPage: pageNumber > 1 ? pageNumber - 1 : null
                }
            });
        }

        const relevantAssignmentIds = plainAssignments.map(a => new mongoose.Types.ObjectId(a._id));

        const submissionStats = await Submission.aggregate([
            {
                $match: {
                    assignment_id: { $in: relevantAssignmentIds }
                }
            },
            {
                $sort: {
                    student_id: 1,
                    fecha_envio: -1 // Más reciente primero para cada estudiante
                }
            },
            {
                $group: {
                    _id: { assignment_id: "$assignment_id", student_id: "$student_id" },
                    lastSubmissionStatus: { $first: "$estado_envio" }
                }
            },
            {
                $group: {
                    _id: "$_id.assignment_id", // Agrupar por assignment_id
                    totalStudentsSubmitted: { $sum: 1 }, // Cada grupo aquí es un estudiante único por asignación
                    pendingGradingSubmissions: {
                        $sum: {
                            $cond: [{ $eq: ["$lastSubmissionStatus", "Enviado"] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Mapear estadísticas a las asignaciones
        const statsMap = new Map(submissionStats.map(stat => [stat._id.toString(), stat]));

        const assignmentsWithEnhancedCounts = plainAssignments.map(assignment => {
            const stats = statsMap.get(assignment._id.toString());
            let pendingGradingCount = stats ? stats.pendingGradingSubmissions : 0;

            // Ajustar pendingGradingCount si el tipo de actividad no es Cuestionario ni Trabajo
            if (assignment.activity_id?.type !== 'Cuestionario' && assignment.activity_id?.type !== 'Trabajo') {
                pendingGradingCount = 0;
            }

            return {
                ...assignment,
                total_students_submitted: stats ? stats.totalStudentsSubmitted : 0,
                pending_grading_count: pendingGradingCount
            };
        });

        // Enviar la lista de asignaciones con los nuevos conteos basados en estudiantes
        const totalPages = Math.ceil(totalAssignments / limitNumber);
        res.status(200).json({
            data: assignmentsWithEnhancedCounts,
            pagination: {
                totalItems: totalAssignments,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages: totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null
            }
        });

    } catch (error) {
        console.error('Error fetching teacher assignments with counts:', error);
        next(error);
    }
};

// @desc    Guardar la calificación manual para una entrega (Cuestionario/Trabajo)
// @route   PUT /api/submissions/:submissionId/grade
// @access  Privado/Docente, Admin
const gradeSubmission = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.submissionId)) {
        return next(new AppError('El ID de la entrega no tiene un formato válido.', 400));
    }
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
        if (userType === 'Docente') {
            // Refactor: Use isTeacherOfSubmission
            // This helper assumes `docente_id` is directly on the Submission model.
            const isSubmissionTeacher = await isTeacherOfSubmission(userId, submissionId);
            if (!isSubmissionTeacher) {
                 return res.status(403).json({ message: 'Acceso denegado. No eres el docente asignado para calificar esta entrega.' });
            }
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
            .populate({
                path: 'assignment_id',
                select: 'activity_id', // Select only activity_id to chain populate
                populate: {
                    path: 'activity_id',
                    model: 'Activity',
                    select: 'type' // Select only type from Activity
                }
            });

        if (!submissionWithActivity || !submissionWithActivity.assignment_id?.activity_id?.type) {
             return res.status(500).json({ message: 'No se pudo determinar el tipo de actividad para esta entrega.' });
        }

        const activityType = submissionWithActivity.assignment_id.activity_id.type;

        if (!activityType) { // Si activityType es null o undefined porque la cadena de populate falló en algun punto
             return next(new AppError('No se pudo determinar el tipo de actividad para esta entrega debido a datos referenciales incompletos en la asignación o actividad base.', 400));
        }

        if (activityType !== 'Cuestionario' && activityType !== 'Trabajo') {
            return res.status(400).json({ message: `Las entregas de tipo ${activityType} no se califican manualmente.` });
        }


        // 6. Actualizar la calificación y el estado de la entrega
        submission.calificacion = gradeValue;
        submission.estado_envio = 'Calificado'; // O el estado que uses para 'calificado'

        // 7. Guardar la entrega actualizada
        const updatedSubmission = await submission.save();

        try {
            // Populate necessary details from the updated submission for the notification message and link
            const populatedSubmission = await Submission.findById(updatedSubmission._id)
                .populate({
                    path: 'assignment_id', // From Submission, populate the ContentAssignment
                    select: 'activity_id puntos_maximos', // Select activity_id and puntos_maximos from ContentAssignment
                    populate: {
                        path: 'activity_id', // From ContentAssignment, populate the base Activity
                        model: 'Activity',   // Explicitly state model name if not automatically inferred
                        select: 'title'      // Select title from Activity
                    }
                });

            if (populatedSubmission && populatedSubmission.assignment_id && populatedSubmission.student_id) {
                const activityTitle = populatedSubmission.assignment_id.activity_id?.title || 'your assignment';
                const studentId = populatedSubmission.student_id; // This is already on the submission, no need to populate user
                const score = populatedSubmission.calificacion;
                const maxPoints = populatedSubmission.assignment_id.puntos_maximos;
                
                let message = `Your submission for '${activityTitle}' has been graded. Score: ${score}`;
                if (maxPoints !== undefined && maxPoints !== null) {
                    message += `/${maxPoints}`;
                }
                message += '.';

                // TODO: Confirm actual frontend URL structure for student's graded work view.
                // Using a generic link to a submissions page or specific submission.
                const link = `/student/assignments/${populatedSubmission.assignment_id._id}/submissions/${populatedSubmission._id}`;

                await NotificationService.createNotification({
                    recipient: studentId,
                    sender: req.user._id, // Teacher who graded
                    type: 'GRADED_WORK',
                    message: message,
                    link: link
                });
            } else {
                console.error(`Could not gather details for submission ${updatedSubmission._id} to send grade notification. Missing student_id, assignment_id, or activity title.`);
            }
        } catch (notificationError) {
            console.error('Failed to send graded work notification:', notificationError);
            // Do not let notification errors break the main response
        }

        // 8. Responder con la entrega actualizada
        res.status(200).json({
            message: 'Calificación guardada con éxito.',
            submission: updatedSubmission // O podrías poblar campos adicionales antes de responder si el frontend los necesita
        });

    } catch (error) {
        console.error('Error grading submission:', error);
        next(error);
    }
};

// Obtener una asignación por ID
const getAssignmentById = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
      return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
  }
  try {
    const { assignmentId } = req.params;
    const assignment = await ContentAssignment.findById(assignmentId)
      .populate({ path: 'activity_id', select: 'title type' });
    if (!assignment) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
};

const getMyPendingActivities = async (req, res) => {
    const studentId = req.user._id;
    const limit = parseInt(req.query.limit) || 3; // Límite de actividades a mostrar
    const now = new Date();

    try {
        const memberships = await Membership.find({ usuario_id: studentId, estado_solicitud: 'Aprobado' }).select('grupo_id');
        const groupIds = memberships.map(m => m.grupo_id);

        if (groupIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Buscar asignaciones de actividad abiertas en los grupos del estudiante
        const openAssignments = await ContentAssignment.find({
            group_id: { $in: groupIds },
            type: 'Activity',
            status: 'Open',
            // Opcional: filtrar solo las que no han vencido o están próximas a vencer
            // fecha_fin: { $gte: now } // Solo actividades cuya fecha límite no ha pasado
        })
        .populate('activity_id', 'title type') // Título y tipo de la actividad base
        .populate({ // Para obtener el nombre de la ruta de aprendizaje
            path: 'theme_id', 
            select: 'nombre module_id',
            populate: {
                path: 'module_id',
                select: 'nombre learning_path_id',
                populate: {
                    path: 'learning_path_id',
                    select: 'nombre _id' // Necesitamos el _id para el enlace
                }
            }
        })
        .sort({ fecha_fin: 1 }); // Más urgentes primero

        let pendingActivitiesList = [];
        for (const assignment of openAssignments) {
            if (pendingActivitiesList.length >= limit) break;

            // Verificar si ya hay una entrega calificada para esta asignación por este estudiante
            const gradedSubmission = await Submission.findOne({
                assignment_id: assignment._id,
                student_id: studentId,
                estado_envio: 'Calificado'
            });

            if (!gradedSubmission) { // Si no hay entrega calificada, se considera pendiente
                let activityLink = '#'; // Fallback
                const learningPathId = assignment.theme_id?.module_id?.learning_path_id?._id;
                const themeId = assignment.theme_id?._id; // Ya tienes theme_id
                const assignmentIdForLink = assignment._id; // ID de ContentAssignment

                if (learningPathId) {
                    // Opción A: Enlace general a la vista de la ruta de aprendizaje.
                    // El usuario tendría que navegar hasta la actividad dentro de la ruta.
                    activityLink = `/student/learning-paths/${learningPathId}/view`;

                    // Opción B: Enlace más específico si tu frontend lo soporta (ej. con hash para scroll)
                    // activityLink = `/student/learning-paths/${learningPathId}/view#theme-${themeId}-assignment-${assignmentIdForLink}`;
                    // O si tienes una ruta directa al tema:
                    // activityLink = `/student/learning-paths/${learningPathId}/themes/${themeId}`;
                }

                pendingActivitiesList.push({
                    _id: assignment._id,
                    title: assignment.activity_id?.title || 'Actividad sin título',
                    type: assignment.activity_id?.type || 'N/A',
                    dueDate: assignment.fecha_fin,
                    learningPathName: assignment.theme_id?.module_id?.learning_path_id?.nombre || 'Ruta Desconocida',
                    // No necesitas theme_id y learning_path_id aquí si el link ya los usa o no son necesarios para el display
                    link: activityLink 
                });
            }
        }
        res.json({ success: true, data: pendingActivitiesList });
    } catch (error) {
        console.error("Error obteniendo actividades pendientes del estudiante:", error);
        res.status(500).json({ success: false, message: 'Error al obtener actividades pendientes.' });
    }
};


// @desc    Actualizar el estado de una asignación (Open/Closed)
// @route   PATCH /api/activities/assignments/:assignmentId/status
// @access  Privado/Docente, Administrador
const updateAssignmentStatus = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
      return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
  }
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;
    const { _id: userId, tipo_usuario: userType } = req.user;

    // 1. Validar el nuevo estado
    if (!['Open', 'Closed'].includes(status)) {
      return res.status(400).json({ message: "Estado inválido. Debe ser 'Open' o 'Closed'." });
    }

    // 2. Permisos: Solo Docentes o Administradores
    if (userType !== 'Docente' && userType !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden cambiar el estado de una asignación.' });
    }

    // 3. Encontrar la asignación y popular campos necesarios para notificaciones y verificación
    const assignment = await ContentAssignment.findById(assignmentId)
      .populate('activity_id', 'title') // Para el título en la notificación
      .populate('group_id', '_id docente_id'); // Para encontrar estudiantes del grupo y verificar docente_id de la asignación directa

    if (!assignment) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }

    // 4. Verificación de propiedad para Docentes
    // Un docente solo puede modificar asignaciones que le pertenecen (directamente o a través del grupo)
    if (userType === 'Docente') {
      const isOwner = assignment.docente_id && assignment.docente_id.toString() === userId.toString();
      // Si la asignación tiene group_id y group_id.docente_id, también verificar ese docente
      const isGroupTeacher = assignment.group_id && assignment.group_id.docente_id && assignment.group_id.docente_id.toString() === userId.toString();

      if (!isOwner && !isGroupTeacher) {
         // Adicionalmente, verificar si el docente es el profesor del grupo al que pertenece la ruta de aprendizaje de la asignación
         // Esta lógica puede ser más compleja si la asignación no tiene group_id directamente.
         // Para este ejemplo, nos basamos en `assignment.docente_id` o `assignment.group_id.docente_id`.
         // Si `docente_id` no está en ContentAssignment, o group_id no está poblado con docente_id, esta verificación necesitaría ser más profunda.
         // Asumiendo que ContentAssignment puede tener un docente_id o un group_id con docente_id.

        // Fallback: Check through the hierarchy if not directly assigned or via group_id
        let isTeacherViaHierarchy = false;
        if (assignment.theme_id) {
            const theme = await Theme.findById(assignment.theme_id)
                .populate({
                    path: 'module_id',
                    populate: {
                        path: 'learning_path_id',
                        populate: {
                            path: 'group_id',
                            select: 'docente_id'
                        }
                    }
                });
            if (theme?.module_id?.learning_path_id?.group_id?.docente_id?.toString() === userId.toString()) {
                isTeacherViaHierarchy = true;
            }
        }

        if (!isOwner && !isGroupTeacher && !isTeacherViaHierarchy) {
            return res.status(403).json({ message: 'Acceso denegado. No eres el docente de esta asignación.' });
        }
      }
    }

    // 5. Actualizar el estado
    assignment.status = status;
    await assignment.save();

    // 6. Notificación WebSocket si el estado cambia a 'Closed'
    if (status === 'Closed' && assignment.group_id?._id) {
      const memberships = await Membership.find({
        grupo_id: assignment.group_id._id,
        estado_solicitud: 'Aprobado'
      }).select('usuario_id');

      const studentIds = memberships.map(m => m.usuario_id);

      studentIds.forEach(studentId => {
        if (global.io) {
          global.io.to(studentId.toString()).emit('assignmentClosed', {
            assignmentId: assignment._id,
            title: assignment.activity_id ? assignment.activity_id.title : 'Activity',
            // Podrías añadir más detalles si el frontend los necesita
          });
        }
      });
    }

    // 7. Responder con la asignación actualizada
    res.status(200).json(assignment);

  } catch (error) {
    console.error('Error updating assignment status:', error);
    next(error);
  }
};


module.exports = { 
    getStudentActivityForAttempt,
    submitStudentActivityAttempt,
    getAssignmentSubmissions,
    getTeacherAssignments,
    gradeSubmission,
    getAssignmentById,
    getMyPendingActivities,
    updateAssignmentStatus
};