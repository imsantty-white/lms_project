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
                select: 'type title description quiz_questions.text quiz_questions.options quiz_questions._id cuestionario_questions.text cuestionario_questions.options cuestionario_questions._id'
            })
            .populate({ // Necesitamos la jerarquía para permisos/grupo y docente_id
                path: 'theme_id',
                select: 'nombre module_id',
                populate: {
                    path: 'module_id',
                    select: 'nombre learning_path_id',
                    populate: {
                        path: 'learning_path_id',
                        select: 'nombre group_id',
                        populate: {
                            path: 'group_id',
                            select: '_id docente_id' // Asegurar que docente_id se popula aquí
                        }
                    }
                }
            })
            .populate('docente_id', 'nombre apellidos email'); // Poblar docente_id directamente en ContentAssignment

        if (!assignmentDetails) {
            return res.status(404).json({ message: 'Asignación de contenido no encontrada.' });
        }

        // Asegurar que tiempo_limite se recupera, incluso si es null o undefined.
        const tiempo_limite = assignmentDetails.tiempo_limite;

        if (assignmentDetails.type !== 'Activity' || !assignmentDetails.activity_id) {
            return res.status(400).json({ message: 'La asignación no es de un tipo de actividad soportado.' });
        }

        if (assignmentDetails.status !== 'Open') {
             return res.status(403).json({ message: `Esta actividad asignada no está actualmente disponible (Estado: ${assignmentDetails.status}).` });
        }

        const activityDetails = assignmentDetails.activity_id;

        let group = null;
        if (assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id) {
            group = assignmentDetails.theme_id.module_id.learning_path_id.group_id;
            const isMember = await isApprovedGroupMember(studentId, group._id);
            if (!isMember) {
                return res.status(403).json({ message: 'No tienes permiso para acceder a esta actividad. No eres miembro aprobado del grupo.' });
            }
        } else {
            return res.status(500).json({ message: 'Error interno del servidor al obtener la información del grupo.' });
        }

        let submissionId = null;
        let attempt_start_time = null;

        if (tiempo_limite && tiempo_limite > 0) {
            let EnProgresoSubmission = await Submission.findOne({
                assignment_id: assignmentId,
                student_id: studentId,
                estado_envio: 'EnProgreso'
            });

            if (EnProgresoSubmission) {
                submissionId = EnProgresoSubmission._id;
                attempt_start_time = EnProgresoSubmission.attempt_start_time;
            } else {
                const existingSubmissionsCount = await Submission.countDocuments({
                    assignment_id: assignmentId,
                    student_id: studentId,
                    estado_envio: { $ne: 'EnProgreso' }
                });
                const attempt_number = existingSubmissionsCount + 1;

                // Derivar group_id y docente_id correctamente
                const groupIdForSubmission = assignmentDetails.group_id || group?._id; // Prioritize direct assignment group_id
                let docenteIdForSubmission = assignmentDetails.docente_id?._id; // Docente directo de la asignación

                if (!docenteIdForSubmission && group) {
                     // Si no hay docente directo en la asignación, usar el del grupo de la ruta de aprendizaje
                    docenteIdForSubmission = group.docente_id;
                }

                // Fallback si docente_id sigue sin estar disponible
                if (!docenteIdForSubmission && assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id?.docente_id) {
                    docenteIdForSubmission = assignmentDetails.theme_id.module_id.learning_path_id.group_id.docente_id;
                }


                if (!groupIdForSubmission) {
                    console.error(`Error crítico: No se pudo determinar group_id para la nueva Submission en la asignación ${assignmentId}`);
                    return res.status(500).json({ message: 'Error interno: No se pudo determinar el group_id para la entrega.' });
                }
                if (!docenteIdForSubmission) {
                    // Considera si esto debe ser un error crítico o si puede haber un docente "sistema" o similar.
                    // Por ahora, lo hacemos crítico si no se puede determinar.
                    console.error(`Error crítico: No se pudo determinar docente_id para la nueva Submission en la asignación ${assignmentId}`);
                    return res.status(500).json({ message: 'Error interno: No se pudo determinar el docente_id para la entrega.' });
                }


                const newSubmission = new Submission({
                    assignment_id: assignmentDetails._id,
                    student_id: studentId,
                    group_id: groupIdForSubmission,
                    docente_id: docenteIdForSubmission,
                    attempt_start_time: new Date(),
                    estado_envio: 'EnProgreso',
                    attempt_number: attempt_number,
                    is_late: false
                });
                await newSubmission.save();
                submissionId = newSubmission._id;
                attempt_start_time = newSubmission.attempt_start_time;
            }
        }

        const attemptsUsed = await Submission.countDocuments({
            assignment_id: assignmentId,
            student_id: studentId,
            estado_envio: { $ne: 'EnProgreso' } // No contar 'EnProgreso' como un intento usado finalizado
        });

        const lastSubmission = await Submission.findOne({
            assignment_id: assignmentId,
            student_id: studentId,
            estado_envio: { $ne: 'EnProgreso' } // No considerar 'EnProgreso' como la última entrega finalizada
        })
        .sort({ fecha_envio: -1 })
        .limit(1);

        if (activityDetails.type !== 'Quiz' && activityDetails.type !== 'Cuestionario' && activityDetails.type !== 'Trabajo') {
            return res.status(400).json({ message: `Tipo de actividad (${activityDetails.type}) no soportado para visualización en esta página.` });
        }

        if (activityDetails.quiz_questions && Array.isArray(activityDetails.quiz_questions) && activityDetails.quiz_questions.length > 0) {
            shuffleArray(activityDetails.quiz_questions);
            activityDetails.quiz_questions.forEach(question => {
                if (question.options && Array.isArray(question.options) && question.options.length > 0) {
                    shuffleArray(question.options);
                }
            });
        }
        if (activityDetails.cuestionario_questions && Array.isArray(activityDetails.cuestionario_questions) && activityDetails.cuestionario_questions.length > 0) {
            shuffleArray(activityDetails.cuestionario_questions);
        }

        let responseJson = {
            assignmentDetails: assignmentDetails,
            activityDetails: activityDetails,
            attemptsUsed: attemptsUsed,
            lastSubmission: lastSubmission
        };

        if (tiempo_limite && tiempo_limite > 0) {
            responseJson.submissionId = submissionId;
            responseJson.attempt_start_time = attempt_start_time;
            responseJson.tiempo_limite = tiempo_limite;
        }

        res.status(200).json(responseJson);

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

        // MODIFIED: Extraer studentAnswers, trabajoLink, submissionId, AND isAutoSaveDueToClosure del body
        const { studentAnswers, trabajoLink, submissionId, isAutoSaveDueToClosure } = req.body;
        // ************************************************************

        // MODIFIED: Validar si se recibieron datos de entrega (answers O link) o si es un guardado automático con submissionId
        // For auto-save, it's possible that neither is present if student didn't interact yet, or if it's a timed auto-submit.
        if (!studentAnswers && !trabajoLink && !isAutoSaveDueToClosure && !submissionId) {
            return res.status(400).json({ message: 'No se recibieron datos de entrega válidos (respuestas, enlace de trabajo o ID de entrega existente).' });
        }
        // ***********************************************************

        // Ahora, la verificación de tipo_usuario (se mantiene)
        if (userType !== 'Estudiante') {
            console.error('Access denied: User is not a student.');
            return res.status(403).json({ message: 'Acceso denegado. Solo estudiantes pueden enviar entregas.' });
        }

        // 2. Encontrar la asignación y poblar detalles necesarios (Activity, jerarquía, y tiempo_limite)
        // Esta búsqueda es crucial y debe incluir tiempo_limite para ambas ramas lógicas.
        const assignment = await ContentAssignment.findById(assignmentId)
            .populate({
                path: 'activity_id',
                select: 'type title quiz_questions cuestionario_questions' // Incluir title para notificaciones
            })
            .populate({
                path: 'theme_id',
                select: 'nombre module_id', // Incluir module_id para la jerarquía
                populate: {
                    path: 'module_id',
                    select: 'nombre learning_path_id', // Incluir learning_path_id para la jerarquía
                    populate: {
                        path: 'learning_path_id',
                        select: 'nombre group_id', // Incluir group_id para la jerarquía
                        populate: {
                            path: 'group_id',
                            select: '_id docente_id nombre'
                        }
                    }
                }
            })
            .populate('docente_id', 'nombre apellidos email'); // Poblar docente_id directamente en ContentAssignment


        if (!assignment) {
            return res.status(404).json({ message: 'Asignación no encontrada.' });
        }

        if (assignment.status === 'Closed' && !isAutoSaveDueToClosure && !(submissionId && assignment.tiempo_limite && assignment.tiempo_limite > 0) ) {
            return res.status(403).json({ message: 'No se pueden realizar entregas para actividades cerradas.' });
        }

        if (assignment.status === 'Draft') {
            return res.status(403).json({ message: 'Esta actividad aún no está abierta para entregas.' });
        }

        if (assignment.type !== 'Activity' || !assignment.activity_id || (assignment.activity_id.type !== 'Quiz' && assignment.activity_id.type !== 'Cuestionario' && assignment.activity_id.type !== 'Trabajo')) {
            return res.status(400).json({ message: `Esta asignación no es una actividad interactivable del tipo correcto (${assignment.activity_id?.type}).` });
        }

        const activity = assignment.activity_id;
        let savedSubmission; // Para almacenar la entrega guardada/actualizada

        // ----- NÚCLEO DE LA LÓGICA CONDICIONAL -----
        if (submissionId) {
            // --- RAMA: ACTUALIZAR ENTREGA EN CURSO (submissionId proporcionado) ---
            let existingSubmission = await Submission.findById(submissionId);

            if (!existingSubmission) {
                return res.status(404).json({ message: 'Entrega en curso no encontrada.' });
            }
            if (existingSubmission.student_id.toString() !== studentId.toString() || existingSubmission.assignment_id.toString() !== assignmentId.toString()) {
                return res.status(403).json({ message: 'No tienes permiso para modificar esta entrega.' });
            }
            if (existingSubmission.estado_envio !== 'EnProgreso') {
                return res.status(400).json({ message: 'Este intento ya fue enviado o no se inició correctamente.' });
            }

            if (assignment.tiempo_limite && assignment.tiempo_limite > 0 && existingSubmission.attempt_start_time) {
                const elapsedTimeMinutes = (new Date() - new Date(existingSubmission.attempt_start_time)) / (1000 * 60);
                if (elapsedTimeMinutes > assignment.tiempo_limite) {
                    existingSubmission.is_timed_auto_submit = true;
                }
            }

            let updateSubmissionData = {};
            let computedCalificacion = existingSubmission.calificacion;
            let computedEstadoEnvio = existingSubmission.estado_envio;

            if (activity.type === 'Quiz') {
                let quizAnswersFormatted = [];
                let correctAnswersCount = 0;
                const totalQuizQuestions = activity.quiz_questions.length;
                const currentStudentAnswers = studentAnswers || {};
                activity.quiz_questions.forEach((q, index) => {
                    const studentAnswerValue = currentStudentAnswers[q._id] !== undefined ? String(currentStudentAnswers[q._id]).trim() : null;
                    quizAnswersFormatted.push({ question_index: index, student_answer: studentAnswerValue });
                    if (studentAnswerValue !== null && q.correct_answer !== undefined && String(studentAnswerValue) === String(q.correct_answer).trim()) {
                        correctAnswersCount++;
                    }
                });
                if (totalQuizQuestions > 0 && assignment.puntos_maximos >= 0) {
                    computedCalificacion = (correctAnswersCount / totalQuizQuestions) * assignment.puntos_maximos;
                    computedEstadoEnvio = 'Calificado';
                } else {
                     computedEstadoEnvio = 'Enviado';
                }
                updateSubmissionData = { quiz_answers: quizAnswersFormatted };
            } else if (activity.type === 'Cuestionario') {
                let cuestionarioAnswersFormatted = [];
                const currentStudentAnswers = studentAnswers || {};
                 activity.cuestionario_questions.forEach((q, index) => {
                    const studentAnswerValue = currentStudentAnswers[q._id] !== undefined ? String(currentStudentAnswers[q._id]).trim() : null;
                    cuestionarioAnswersFormatted.push({ question_index: index, student_answer: studentAnswerValue });
                });
                computedEstadoEnvio = 'Enviado';
                computedCalificacion = null;
                updateSubmissionData = { cuestionario_answers: cuestionarioAnswersFormatted };
            } else if (activity.type === 'Trabajo') {
                computedEstadoEnvio = 'Enviado';
                computedCalificacion = null;
                updateSubmissionData = { link_entrega: trabajoLink ? trabajoLink.trim() : null };
            }

            if (isAutoSaveDueToClosure && !existingSubmission.is_timed_auto_submit) {
                computedEstadoEnvio = 'Pendiente';
                computedCalificacion = null;
            }

            existingSubmission.fecha_envio = new Date();
            existingSubmission.respuesta = updateSubmissionData;
            existingSubmission.is_late = assignment.fecha_fin && new Date() > new Date(assignment.fecha_fin);
            existingSubmission.calificacion = computedCalificacion;
            existingSubmission.estado_envio = computedEstadoEnvio;
            if (isAutoSaveDueToClosure) {
                existingSubmission.is_auto_save = true;
            }

            savedSubmission = await existingSubmission.save();
            console.log(`Entrega #${savedSubmission.attempt_number} actualizada para la asignación ${assignmentId} por el estudiante ${studentId}. Estado: ${savedSubmission.estado_envio}. Tarde: ${savedSubmission.is_late}. AutoSubmit por tiempo: ${savedSubmission.is_timed_auto_submit}.`);

        } else {
            // --- RAMA: CREAR NUEVA ENTREGA (sin submissionId) ---

            // NUEVA VERIFICACIÓN: Prevenir creación redundante si es auto-guardado por cierre Y actividad cronometrada
            if (isAutoSaveDueToClosure && assignment.tiempo_limite && assignment.tiempo_limite > 0) {
                const recentTimedSubmission = await Submission.findOne({
                    assignment_id: assignmentId,
                    student_id: studentId,
                    $or: [
                        { is_timed_auto_submit: true },
                        { fecha_envio: { $gte: new Date(Date.now() - 15000) } } // Dentro de los últimos 15 segundos
                    ],
                    estado_envio: { $in: ['Calificado', 'Enviado'] }
                }).sort({ fecha_envio: -1 });

                if (recentTimedSubmission) {
                    console.log(`Llamada de auto-guardado redundante para la asignación ${assignmentId} por el estudiante ${studentId} ignorada debido a una entrega reciente por tiempo límite o cierre.`);
                    return res.status(200).json({
                        message: 'Progreso ya guardado por tiempo límite o cierre.',
                        submission: recentTimedSubmission
                    });
                }
            }
            // FIN NUEVA VERIFICACIÓN

            let groupId, docenteId;
            if (assignment.theme_id?.module_id?.learning_path_id?.group_id) {
                groupId = assignment.theme_id.module_id.learning_path_id.group_id._id;
                docenteId = assignment.theme_id.module_id.learning_path_id.group_id.docente_id;
                const isMember = await isApprovedGroupMember(studentId, groupId);
                if (!isMember) {
                    return res.status(403).json({ message: 'No tienes permiso para enviar esta entrega. No eres miembro aprobado del grupo.' });
                }
            } else if (assignment.group_id) {
                groupId = assignment.group_id._id;
                docenteId = assignment.docente_id?._id || (await Group.findById(groupId))?.docente_id;
                const isMember = await isApprovedGroupMember(studentId, groupId);
                 if (!isMember) {
                    return res.status(403).json({ message: 'No tienes permiso para enviar esta entrega. No eres miembro aprobado del grupo.' });
                }
            }
             else {
                return res.status(500).json({ message: 'Error interno del servidor al verificar la asignación (falta grupo).' });
            }
            if (!docenteId && assignment.docente_id) {
                docenteId = assignment.docente_id._id;
            }
            if (!docenteId) {
                console.error(`Error crítico: No se pudo determinar docente_id para la nueva Submission en la asignación ${assignmentId} (rama nueva entrega)`);
                return res.status(500).json({ message: 'Error interno: No se pudo determinar el docente_id para la entrega.' });
            }

            const currentAttempts = await Submission.countDocuments({
                assignment_id: assignmentId,
                student_id: studentId,
                estado_envio: { $ne: 'EnProgreso' } // No contar 'EnProgreso' como un intento finalizado
            });

            if (assignment.intentos_permitidos !== undefined && assignment.intentos_permitidos !== null && currentAttempts >= assignment.intentos_permitidos) {
                return res.status(400).json({ message: `Has alcanzado el número máximo de intentos (${assignment.intentos_permitidos}) para esta actividad.` });
            }

            let newSubmissionData = {};
            let computedCalificacion = null;
            let computedEstadoEnvio = 'Enviado';

            if (activity.type === 'Quiz') {
                let quizAnswersFormatted = [];
                let correctAnswersCount = 0;
                const totalQuizQuestions = activity.quiz_questions.length;
                const currentStudentAnswers = studentAnswers || {};
                activity.quiz_questions.forEach((q, index) => {
                    const studentAnswerValue = currentStudentAnswers[q._id] !== undefined ? String(currentStudentAnswers[q._id]).trim() : null;
                    quizAnswersFormatted.push({ question_index: index, student_answer: studentAnswerValue });
                    if (studentAnswerValue !== null && q.correct_answer !== undefined && String(studentAnswerValue) === String(q.correct_answer).trim()) {
                        correctAnswersCount++;
                    }
                });
                if (totalQuizQuestions > 0 && assignment.puntos_maximos >= 0) {
                    computedCalificacion = (correctAnswersCount / totalQuizQuestions) * assignment.puntos_maximos;
                    computedEstadoEnvio = 'Calificado';
                } else {
                    computedEstadoEnvio = 'Enviado';
                }
                newSubmissionData = { quiz_answers: quizAnswersFormatted };
            } else if (activity.type === 'Cuestionario') {
                let cuestionarioAnswersFormatted = [];
                const currentStudentAnswers = studentAnswers || {};
                 activity.cuestionario_questions.forEach((q, index) => {
                    const studentAnswerValue = currentStudentAnswers[q._id] !== undefined ? String(currentStudentAnswers[q._id]).trim() : null;
                    cuestionarioAnswersFormatted.push({ question_index: index, student_answer: studentAnswerValue });
                });
                computedEstadoEnvio = 'Enviado';
                newSubmissionData = { cuestionario_answers: cuestionarioAnswersFormatted };
            } else if (activity.type === 'Trabajo') {
                 if ((!trabajoLink || trabajoLink.trim() === '') && !isAutoSaveDueToClosure) {
                    return res.status(400).json({ message: 'El enlace de entrega del trabajo es obligatorio.' });
                }
                computedEstadoEnvio = 'Enviado';
                newSubmissionData = { link_entrega: trabajoLink ? trabajoLink.trim() : null };
            }

            if (isAutoSaveDueToClosure) {
                computedEstadoEnvio = 'Pendiente';
                computedCalificacion = null;
            }

            const newSubmissionDoc = new Submission({
                assignment_id: assignmentId,
                student_id: studentId,
                group_id: groupId,
                docente_id: docenteId,
                fecha_envio: new Date(),
                estado_envio: computedEstadoEnvio,
                is_late: assignment.fecha_fin && new Date() > new Date(assignment.fecha_fin),
                attempt_number: currentAttempts + 1,
                calificacion: computedCalificacion,
                respuesta: newSubmissionData,
                is_auto_save: isAutoSaveDueToClosure || false,
            });
            savedSubmission = await newSubmissionDoc.save();
            console.log(`Nueva entrega #${savedSubmission.attempt_number} creada para la asignación ${assignmentId} por el estudiante ${studentId}. Estado: ${savedSubmission.estado_envio}.`);
        }

        try {
            const student = req.user;
            if (assignment && savedSubmission &&
                assignment.activity_id && // activity_id ya está en assignment
                (assignment.theme_id?.module_id?.learning_path_id?.group_id?.docente_id || assignment.docente_id) ) {

                const activityTitle = assignment.activity_id.title || 'the assignment';
                // Determinar el docente para la notificación
                let teacherIdForNotification = assignment.docente_id?._id; // Priorizar docente directo de la asignación
                let groupNameForNotification = "the group";

                if (assignment.theme_id?.module_id?.learning_path_id?.group_id) {
                    const groupFromPath = assignment.theme_id.module_id.learning_path_id.group_id;
                    if (!teacherIdForNotification) teacherIdForNotification = groupFromPath.docente_id;
                    groupNameForNotification = groupFromPath.nombre || groupNameForNotification;
                } else if (assignment.group_id) { // Si group_id está directamente en la asignación
                    const directGroup = await Group.findById(assignment.group_id).select('docente_id nombre');
                    if(directGroup){
                        if (!teacherIdForNotification) teacherIdForNotification = directGroup.docente_id;
                        groupNameForNotification = directGroup.nombre || groupNameForNotification;
                    }
                }


                if(teacherIdForNotification){
                    const studentName = `${student.nombre} ${student.apellidos || ''}`.trim();
                    const message = `${studentName} hizo una entrega de '${activityTitle}' del Grupo '${groupNameForNotification}'.`;
                    const link = `/teacher/assignments`;

                    await NotificationService.createNotification({
                        recipient: teacherIdForNotification,
                        sender: student._id,
                        type: 'NEW_SUBMISSION',
                        message: message,
                        link: link
                    });
                } else {
                     console.error(`Could not determine teacherId for notification for assignment ${savedSubmission.assignment_id}.`);
                }
            } else {
                console.error(`Could not gather necessary details for assignment ${savedSubmission?.assignment_id} to send new submission notification.`);
            }
        } catch (notificationError) {
            console.error('Failed to send new submission notification:', notificationError);
        }


        // Responder al frontend
        res.status(submissionId ? 200 : 201).json({ // 200 para actualización, 201 para creación
            message: isAutoSaveDueToClosure ? 'Progreso guardado automáticamente.' : (savedSubmission.is_timed_auto_submit ? 'Entrega registrada automáticamente por tiempo límite.' : 'Entrega registrada con éxito.'),
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
            // Refactor: Use isTeacherOfContentAssignment
            // Note: This helper assumes `docente_id` is directly on ContentAssignment or can be populated.
            // The current ContentAssignmentModel has `docente_id` directly.
            const isTeacher = await isTeacherOfContentAssignment(userId, assignmentId);
            if (!isTeacher) {
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
            },
            // Proyectar para seleccionar y renombrar campos necesarios
            {
                $project: {
                    _id: 1, // ID de la Submission
                    student_id: { _id: "$student_id._id", nombre: "$student_id.nombre", apellidos: "$student_id.apellidos", email: "$student_id.email" },
                    assignment_id: { // Campos de la asignación y su actividad
                        _id: "$assignment_id._id",
                        puntos_maximos: "$assignment_id.puntos_maximos",
                        activity_id: {
                            _id: "$assignment_id.activity_id._id",
                            type: "$assignment_id.activity_id.type",
                            title: "$assignment_id.activity_id.title",
                            // Incluir preguntas solo si son realmente necesarias para la vista de entregas del docente
                            // A menudo, solo el tipo y título son suficientes aquí, y las preguntas se ven al calificar/ver detalle.
                            quiz_questions: "$assignment_id.activity_id.quiz_questions", 
                            cuestionario_questions: "$assignment_id.activity_id.cuestionario_questions"
                        }
                    },
                    fecha_envio: 1,
                    estado_envio: 1,
                    is_late: 1,
                    attempt_number: 1,
                    calificacion: 1,
                    respuesta: 1 // Incluir las respuestas del estudiante
                }
            }
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
        const userId = req.user._id;
        const userType = req.user.tipo_usuario;

        if (userType !== 'Docente' && userType !== 'Administrador') {
            return res.status(403).json({ message: 'Acceso denegado. Solo Docentes o Administradores pueden ver esta lista de asignaciones.' });
        }

        let assignmentFilter = { type: 'Activity' };

        if (userType === 'Docente') {
            const groups = await Group.find({ docente_id: userId }).select('_id');
            const groupIds = groups.map(group => group._id);
            if (groupIds.length === 0) return res.status(200).json([]);

            const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } }).select('_id');
            const learningPathIds = learningPaths.map(lp => lp._id);
            if (learningPathIds.length === 0) return res.status(200).json([]);

            const modules = await Module.find({ learning_path_id: { $in: learningPathIds } }).select('_id');
            const moduleIds = modules.map(module => module._id);
            if (moduleIds.length === 0) return res.status(200).json([]);

            const themes = await Theme.find({ module_id: { $in: moduleIds } }).select('_id');
            const themeIds = themes.map(theme => theme._id);
            if (themeIds.length === 0) return res.status(200).json([]);

            assignmentFilter.theme_id = { $in: themeIds };
        }
        // Para Admin, assignmentFilter sigue siendo solo { type: 'Activity' } para obtener todas.

        const assignmentsWithStats = await ContentAssignment.aggregate([
            { $match: assignmentFilter },
            { $sort: { fecha_inicio: 1 } }, // Opcional: Ordenar como antes
            // Lookup para poblar activity_id (solo título y tipo)
            {
                $lookup: {
                    from: 'activities', // Nombre de la colección de actividades
                    localField: 'activity_id',
                    foreignField: '_id',
                    as: 'activity_details'
                }
            },
            { $unwind: { path: '$activity_details', preserveNullAndEmptyArrays: true } }, // preserve si alguna asignación no tiene actividad (no debería pasar)

            // Lookup para poblar la jerarquía del tema (theme -> module -> learning_path -> group)
            {
                $lookup: {
                    from: 'themes',
                    localField: 'theme_id',
                    foreignField: '_id',
                    as: 'theme_details'
                }
            },
            { $unwind: { path: '$theme_details', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'modules',
                    localField: 'theme_details.module_id',
                    foreignField: '_id',
                    as: 'module_details'
                }
            },
            { $unwind: { path: '$module_details', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'learningpaths', // Nombre de la colección de rutas de aprendizaje
                    localField: 'module_details.learning_path_id',
                    foreignField: '_id',
                    as: 'learning_path_details'
                }
            },
            { $unwind: { path: '$learning_path_details', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'groups', // Nombre de la colección de grupos
                    localField: 'learning_path_details.group_id',
                    foreignField: '_id',
                    as: 'group_details'
                }
            },
            { $unwind: { path: '$group_details', preserveNullAndEmptyArrays: true } },

            // Lookup para estadísticas de entregas
            {
                $lookup: {
                    from: 'submissions', // Nombre de la colección de submissions
                    let: { assignmentId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$assignment_id', '$$assignmentId'] } } },
                        {
                            $facet: {
                                "totalStudentsSubmittedFacet": [
                                    { $group: { _id: "$student_id" } },
                                    { $count: "count" }
                                ],
                                "pendingGradingFacet": [
                                    { $sort: { student_id: 1, fecha_envio: -1 } },
                                    { $group: { _id: "$student_id", latestSubmission: { $first: "$$ROOT" } } },
                                    { $replaceRoot: { newRoot: "$latestSubmission" } },
                                    { $match: { estado_envio: 'Enviado' } },
                                    { $count: "count" }
                                ]
                            }
                        }
                    ],
                    as: 'submissionStatsArray'
                }
            },
            { $unwind: { path: '$submissionStatsArray', preserveNullAndEmptyArrays: true } },

            // Proyección final
            {
                $project: {
                    // Campos de ContentAssignment
                    _id: 1, type: 1, orden: 1, status: 1, fecha_inicio: 1, fecha_fin: 1,
                    puntos_maximos: 1, intentos_permitidos: 1, tiempo_limite: 1,
                    // Campos de Activity poblada
                    activity_id: {
                        _id: '$activity_details._id',
                        title: '$activity_details.title',
                        type: '$activity_details.type'
                    },
                    // Jerarquía poblada (similar a como estaba en .populate)
                    theme_id: {
                        _id: '$theme_details._id',
                        nombre: '$theme_details.nombre',
                        module_id: {
                            _id: '$module_details._id',
                            nombre: '$module_details.nombre',
                            learning_path_id: {
                                _id: '$learning_path_details._id',
                                nombre: '$learning_path_details.nombre',
                                group_id: {
                                    _id: '$group_details._id',
                                    nombre: '$group_details.nombre'
                                }
                            }
                        }
                    },
                    // Estadísticas de entregas
                    total_students_submitted: {
                        $ifNull: [ { $arrayElemAt: ['$submissionStatsArray.totalStudentsSubmittedFacet.count', 0] }, 0 ]
                    },
                    pending_grading_count: {
                        $cond: {
                            if: {
                                $in: ['$activity_details.type', ['Cuestionario', 'Trabajo']]
                            },
                            then: { $ifNull: [ { $arrayElemAt: ['$submissionStatsArray.pendingGradingFacet.count', 0] }, 0 ] },
                            else: 0
                        }
                    }
                }
            }
        ]);

        res.status(200).json(assignmentsWithStats);

    } catch (error) {
        console.error('Error fetching teacher assignments with stats (aggregation):', error);
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
                
                let message = `Tu entrega para '${activityTitle}' ha sido calificada. Puntuación: ${score}`;
                if (maxPoints !== undefined && maxPoints !== null) {
                    message += `/${maxPoints}`;
                }
                message += '.';

                // TODO: Confirm actual frontend URL structure for student's graded work view.
                // Using a generic link to a submissions page or specific submission.
                const link = `/student/progress`;

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
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de entrega no válido.' });
        }
        next(error);
    }
};

// Obtener una asignación por ID
const getAssignmentById = async (req, res, next) => {
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
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'ID de asignación no válido.' });
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
    getAssignmentById,
    getMyPendingActivities,
    updateAssignmentStatus
};