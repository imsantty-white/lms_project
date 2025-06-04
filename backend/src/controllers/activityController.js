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
const NotificationService = require('../services/NotificationService');

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// @desc    Obtener los detalles de una Actividad asignada para que un estudiante la visualice (SIN iniciar intento)
// @route   GET /api/activities/student/:assignmentId/details
// @access  Privado/Estudiante
const getStudentActivityForAttempt = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    try {
        const { assignmentId } = req.params;
        const studentId = req.user._id;

        if (req.user.tipo_usuario !== 'Estudiante') {
            return next(new AppError('Acceso denegado. Solo estudiantes pueden acceder a esta información.', 403));
        }

        const assignmentDetails = await ContentAssignment.findById(assignmentId)
            .populate({
                path: 'activity_id',
                select: 'type title description quiz_questions.text quiz_questions.options quiz_questions._id cuestionario_questions.text cuestionario_questions.options cuestionario_questions._id'
            })
            .populate({
                path: 'theme_id',
                select: 'nombre',
                populate: {
                    path: 'module_id',
                    select: 'nombre',
                    populate: {
                        path: 'learning_path_id',
                        select: 'nombre',
                        populate: { path: 'group_id', select: '_id' }
                    }
                }
            })
            .lean();

        if (!assignmentDetails) {
            return next(new AppError('Asignación de contenido no encontrada.', 404));
        }
        if (assignmentDetails.type !== 'Activity' || !assignmentDetails.activity_id) {
            return next(new AppError('La asignación no es de un tipo de actividad válido.', 400));
        }
        if (assignmentDetails.status !== 'Open') {
             return next(new AppError(`Esta actividad asignada no está actualmente disponible (Estado: ${assignmentDetails.status}).`, 403));
        }

        const activityDetails = assignmentDetails.activity_id;

        if (assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id) {
            const groupId = assignmentDetails.theme_id.module_id.learning_path_id.group_id._id;
            const isMember = await isApprovedGroupMember(studentId, groupId);
            if (!isMember) {
                return next(new AppError('No tienes permiso para acceder a esta actividad. No eres miembro aprobado del grupo.', 403));
            }
        } else {
            return next(new AppError('La estructura de la asignación es incompleta y no se pudo verificar el grupo.', 400));
        }

        const attemptsUsed = await Submission.countDocuments({
            assignment_id: assignmentId,
            student_id: studentId
        });

        const lastSubmission = await Submission.findOne({
            assignment_id: assignmentId,
            student_id: studentId
        })
        .sort({ attempt_number: -1 })
        .lean();

        let activityDataForStudent = { ...activityDetails };
        if (activityDataForStudent.quiz_questions && Array.isArray(activityDataForStudent.quiz_questions)) {
            activityDataForStudent.quiz_questions = [...activityDataForStudent.quiz_questions];
            shuffleArray(activityDataForStudent.quiz_questions);
            activityDataForStudent.quiz_questions.forEach(q => {
                if(q.options) {
                    q.options = [...q.options];
                    shuffleArray(q.options);
                }
                delete q.correct_answer;
            });
        }
        if (activityDataForStudent.cuestionario_questions && Array.isArray(activityDataForStudent.cuestionario_questions)) {
            activityDataForStudent.cuestionario_questions = [...activityDataForStudent.cuestionario_questions];
            shuffleArray(activityDataForStudent.cuestionario_questions);
        }

        res.status(200).json({
            assignmentDetails,
            activityDetails: activityDataForStudent,
            attemptsUsed,
            lastSubmission
        });

    } catch (error) {
        console.error('Error fetching student activity details:', error);
        next(error);
    }
};

// @desc    Iniciar o reanudar un intento de actividad (especialmente para actividades con tiempo)
// @route   POST /api/activities/student/:assignmentId/begin-attempt
// @access  Privado/Estudiante
const beginStudentActivityAttempt = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }

    try {
        const { assignmentId } = req.params;
        const studentId = req.user._id;

        const assignmentDetails = await ContentAssignment.findById(assignmentId)
            .populate('activity_id')
            .populate({
                path: 'theme_id',
                select: 'module_id',
                populate: {
                    path: 'module_id',
                    select: 'learning_path_id',
                    populate: {
                        path: 'learning_path_id',
                        select: 'group_id docente_id',
                        populate: { path: 'group_id', select: '_id docente_id' }
                    }
                }
            });

        if (!assignmentDetails) {
            return next(new AppError('Asignación de contenido no encontrada.', 404));
        }
        if (assignmentDetails.type !== 'Activity' || !assignmentDetails.activity_id) {
            return next(new AppError('La asignación no es de un tipo de actividad válido.', 400));
        }
        if (assignmentDetails.status !== 'Open') {
            return next(new AppError(`Esta actividad asignada no está actualmente disponible (Estado: ${assignmentDetails.status}).`, 403));
        }

        const activityDetails = assignmentDetails.activity_id;

        const groupId = assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id?._id;
        if (!groupId) {
             return next(new AppError('La estructura de la asignación es incompleta, no se pudo verificar el grupo.', 400));
        }
        const isMember = await isApprovedGroupMember(studentId, groupId);
        if (!isMember) {
            return next(new AppError('No tienes permiso para iniciar esta actividad. No eres miembro aprobado del grupo.', 403));
        }

        if (!((activityDetails.type === 'Quiz' || activityDetails.type === 'Cuestionario') &&
              assignmentDetails.tiempo_limite && assignmentDetails.tiempo_limite > 0)) {
            return next(new AppError('Esta actividad no requiere un inicio de intento formal con tiempo límite.', 400));
        }

        let currentSubmission = await Submission.findOne({
            assignment_id: assignmentId,
            student_id: studentId,
            estado_intento: 'en_progreso'
        }); // No .lean() aquí si vamos a guardarlo después, aunque para este flujo específico, se podría.

        if (currentSubmission) {
            return res.status(200).json({
                message: 'Intento en progreso recuperado.',
                submission: currentSubmission.toObject(),
                tiempo_limite_minutos: assignmentDetails.tiempo_limite
            });
        }

        const completedAttemptsCount = await Submission.countDocuments({
            assignment_id: assignmentId,
            student_id: studentId,
            estado_intento: { $in: ['completado_usuario', 'completado_tiempo', 'auto_guardado_cierre'] }
        });

        if (assignmentDetails.intentos_permitidos !== undefined &&
            assignmentDetails.intentos_permitidos !== null &&
            completedAttemptsCount >= assignmentDetails.intentos_permitidos) {
            return next(new AppError('Has alcanzado el número máximo de intentos permitidos para esta actividad.', 403));
        }

        const docenteIdForSubmission = assignmentDetails.docente_id ||
                                     assignmentDetails.theme_id?.module_id?.learning_path_id?.group_id?.docente_id ||
                                     assignmentDetails.theme_id?.module_id?.learning_path_id?.docente_id;

         if (!docenteIdForSubmission) {
            console.error(`No se pudo determinar docenteId para la asignación ${assignmentId} al crear submission.`);
            return next(new AppError('No se pudo determinar el docente para el intento.', 500));
        }

        const newSubmission = new Submission({
            assignment_id: assignmentId,
            student_id: studentId,
            group_id: groupId,
            docente_id: docenteIdForSubmission,
            attempt_number: completedAttemptsCount + 1,
            fecha_inicio_intento: Date.now(),
            estado_intento: 'en_progreso',
            estado_envio: 'Pendiente',
        });
        await newSubmission.save();

        res.status(201).json({
            message: 'Nuevo intento iniciado con éxito.',
            submission: newSubmission.toObject(),
            tiempo_limite_minutos: assignmentDetails.tiempo_limite
        });

    } catch (error) {
        console.error('Error al iniciar intento de actividad:', error);
        next(error);
    }
};

const submitStudentActivityAttempt = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }

    const { studentAnswers, trabajoLink, isAutoSaveDueToClosure, submissionId } = req.body;
    const { assignmentId } = req.params;
    const studentId = req.user._id;

    try {
        const assignment = await ContentAssignment.findById(assignmentId)
            .populate('activity_id')
            .populate({
                path: 'theme_id', select: 'module_id',
                populate: { path: 'module_id', select: 'learning_path_id',
                    populate: { path: 'learning_path_id', select: 'group_id docente_id',
                        populate: { path: 'group_id', select: '_id docente_id nombre' }
                    }
                }
            });

        if (!assignment) {
            return next(new AppError('Asignación no encontrada.', 404));
        }
        if (assignment.type !== 'Activity' || !assignment.activity_id) {
            return next(new AppError('La asignación no es una actividad válida.', 400));
        }

        const activity = assignment.activity_id;

        if (!isAutoSaveDueToClosure && !submissionId && activity.type !== 'Trabajo' && !studentAnswers ) {
             return next(new AppError('No se recibieron respuestas para la actividad.', 400));
        }
        if (!isAutoSaveDueToClosure && !submissionId && activity.type === 'Trabajo' && !trabajoLink) {
             return next(new AppError('No se recibió un enlace para la entrega del trabajo.', 400));
        }
        if (req.user.tipo_usuario !== 'Estudiante') {
            return next(new AppError('Acceso denegado. Solo estudiantes pueden enviar entregas.', 403));
        }

        let finalEstadoIntento;
        let finalEstadoEnvio = 'Enviado';
        let savedSubmission;
        let resStatus;
        let submissionToUpdate; // Declarada aquí para que esté en el scope correcto
        const now = new Date();
        const isLate = assignment.fecha_fin && now > new Date(assignment.fecha_fin);

        const groupId = assignment.theme_id?.module_id?.learning_path_id?.group_id?._id;
        const docenteId = assignment.docente_id ||
                          assignment.theme_id?.module_id?.learning_path_id?.group_id?.docente_id ||
                          assignment.theme_id?.module_id?.learning_path_id?.docente_id;

        if (!groupId || !docenteId) {
            console.error(`No se pudo determinar groupId o docenteId para la asignación ${assignmentId}. GroupId: ${groupId}, DocenteId: ${docenteId}`);
            return next(new AppError('Error de configuración de la asignación, no se puede procesar la entrega.', 500));
        }

        if (submissionId && mongoose.Types.ObjectId.isValid(submissionId)) {
            submissionToUpdate = await Submission.findById(submissionId);
            if (!submissionToUpdate) {
                return next(new AppError('La entrega especificada para actualizar no fue encontrada.', 404));
            }
            if (submissionToUpdate.student_id.toString() !== studentId.toString() ||
                submissionToUpdate.assignment_id.toString() !== assignmentId.toString()) {
                return next(new AppError('Esta entrega no pertenece al usuario o asignación actual.', 403));
            }
            if (submissionToUpdate.estado_intento !== 'en_progreso' && !isAutoSaveDueToClosure) {
                return next(new AppError('Este intento ya fue finalizado y no puede ser modificado.', 400));
            }
             if (submissionToUpdate.estado_intento === 'en_progreso' && assignment.status === 'Closed' && !isAutoSaveDueToClosure) {
                 isAutoSaveDueToClosure = true;
                 console.warn(`La actividad ${assignmentId} fue cerrada mientras el intento ${submissionId} estaba en progreso. Forzando auto-guardado.`);
            }

            let tiempoRealmenteAgotado = false;
            if (!isAutoSaveDueToClosure &&
                (activity.type === 'Quiz' || activity.type === 'Cuestionario') &&
                assignment.tiempo_limite && assignment.tiempo_limite > 0 &&
                submissionToUpdate.fecha_inicio_intento) {

                const tiempoExpiracion = new Date(submissionToUpdate.fecha_inicio_intento).getTime() + (assignment.tiempo_limite * 60000);
                if (Date.now() > tiempoExpiracion) {
                    tiempoRealmenteAgotado = true;
                }
            }

            submissionToUpdate.fecha_envio = now;
            submissionToUpdate.is_late = isLate;

            if (isAutoSaveDueToClosure) {
                submissionToUpdate.estado_intento = 'auto_guardado_cierre';
                submissionToUpdate.is_auto_save = true;
            } else if (tiempoRealmenteAgotado) {
                submissionToUpdate.estado_intento = 'completado_tiempo';
                submissionToUpdate.tiempo_agotado = true;
            } else {
                submissionToUpdate.estado_intento = 'completado_usuario';
            }
        } else {
            const completedAttemptsCount = await Submission.countDocuments({
                assignment_id: assignmentId,
                student_id: studentId,
                estado_intento: { $in: ['completado_usuario', 'completado_tiempo', 'auto_guardado_cierre'] }
            });

            if (assignment.intentos_permitidos !== undefined &&
                assignment.intentos_permitidos !== null &&
                completedAttemptsCount >= assignment.intentos_permitidos) {
                return next(new AppError(`Has alcanzado el número máximo de intentos (${assignment.intentos_permitidos}) para esta actividad.`, 400));
            }

            submissionToUpdate = new Submission({
                assignment_id: assignmentId,
                student_id: studentId,
                group_id: groupId,
                docente_id: docenteId,
                attempt_number: completedAttemptsCount + 1,
                fecha_inicio_intento: now,
                fecha_envio: now,
                estado_intento: isAutoSaveDueToClosure ? 'auto_guardado_cierre' : 'completado_usuario',
                is_late: isLate,
                is_auto_save: isAutoSaveDueToClosure || false,
                tiempo_agotado: false
            });
        }

        let calculatedScore = null;
        let responseDataForSubmission = {};

        if (activity.type === 'Quiz') {
            let correctAnswers = 0;
            const studentQuizAnswers = studentAnswers || [];
            const activityQuestions = activity.quiz_questions || [];
            responseDataForSubmission.quiz_answers = activityQuestions.map((q, index) => {
                const answerObj = studentQuizAnswers.find(sa => sa.question_id === q._id.toString() || sa.question_index === index);
                const student_answer = answerObj ? (answerObj.student_answer || null) : null;
                if (student_answer && q.correct_answer === student_answer) {
                    correctAnswers++;
                }
                return { question_index: index, student_answer: student_answer };
            });
            if (activityQuestions.length > 0 && assignment.puntos_maximos != null) {
                calculatedScore = (correctAnswers / activityQuestions.length) * assignment.puntos_maximos;
            }
            finalEstadoEnvio = 'Calificado';
        } else if (activity.type === 'Cuestionario') {
            const studentCuestionarioAnswers = studentAnswers || [];
            const activityQuestions = activity.cuestionario_questions || [];
            responseDataForSubmission.cuestionario_answers = activityQuestions.map((q, index) => {
                 const answerObj = studentCuestionarioAnswers.find(sa => sa.question_id === q._id.toString() || sa.question_index === index);
                 return { question_index: index, student_answer: answerObj ? (answerObj.student_answer || null) : null };
            });
            finalEstadoEnvio = 'Enviado';
        } else if (activity.type === 'Trabajo') {
            if (trabajoLink) responseDataForSubmission.link_entrega = trabajoLink;
            finalEstadoEnvio = 'Enviado';
        }

        if (isAutoSaveDueToClosure) {
            submissionToUpdate.estado_envio = submissionToUpdate.estado_envio === 'Calificado' ? 'Calificado' : 'Pendiente';
            if (submissionToUpdate.estado_envio === 'Pendiente') calculatedScore = null;
        } else {
            submissionToUpdate.estado_envio = finalEstadoEnvio;
        }
        submissionToUpdate.respuesta = responseDataForSubmission;
        submissionToUpdate.calificacion = calculatedScore;

        savedSubmission = await submissionToUpdate.save();
        resStatus = submissionId ? 200 : 201;

        console.log(`Entrega #${savedSubmission.attempt_number} guardada/actualizada para ${assignmentId} por ${studentId}. Estado Intento: ${savedSubmission.estado_intento}. Estado Envío: ${savedSubmission.estado_envio}.`);

        if (savedSubmission.estado_intento === 'completado_usuario' || savedSubmission.estado_intento === 'completado_tiempo') {
            try {
                const student = req.user;
                if (assignment && activity && docenteId) {
                    const activityTitle = activity.title || 'la actividad';
                    const groupName = assignment.theme_id?.module_id?.learning_path_id?.group_id?.nombre || 'el grupo';
                    const studentName = `${student.nombre} ${student.apellidos || ''}`.trim();
                    const message = `${studentName} ha completado un intento para '${activityTitle}' en el grupo '${groupName}'.`;
                    const link = `/teacher/assignments/${assignment._id}/submissions/student/${student._id}`;
                    await NotificationService.createNotification({ recipient: docenteId, sender: student._id, type: 'NEW_SUBMISSION', message, link });
                }
            } catch (notificationError) {
                console.error('Failed to send new submission notification:', notificationError);
            }
        }

        res.status(resStatus).json({
            message: isAutoSaveDueToClosure ? 'Progreso guardado automáticamente.' : 'Entrega registrada con éxito.',
            submission: savedSubmission
        });

    } catch (error) {
        console.error('Error al registrar la entrega de la actividad:', error);
        next(error);
    }
};

const getAssignmentSubmissions = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    try {
        const userId = req.user._id;
        const userType = req.user.tipo_usuario;
        const { assignmentId } = req.params;

        if (userType !== 'Docente' && userType !== 'Administrador') {
            return next(new AppError('Acceso denegado. Solo Docentes o Administradores pueden ver las entregas.', 403));
        }

        if (userType === 'Docente') {
            const isTeacher = await isTeacherOfContentAssignment(userId, assignmentId);
            if (!isTeacher) {
                return next(new AppError('Acceso denegado. No eres el docente de esta asignación.', 403));
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
            {
                $facet: {
                    metadata: [{ $count: "totalItems" }],
                    data: [
                        { $skip: (pageNumber - 1) * limitNumber },
                        { $limit: limitNumber },
                        { $replaceRoot: { newRoot: "$latestSubmissionDoc" } },
                        { $lookup: { from: "users", localField: "student_id", foreignField: "_id", as: "student_id_populated" } },
                        { $unwind: { path: "$student_id_populated", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "contentassignments", localField: "assignment_id", foreignField: "_id", as: "assignment_id_populated" } },
                        { $unwind: { path: "$assignment_id_populated", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "activities", localField: "assignment_id_populated.activity_id", foreignField: "_id", as: "activity_details" } },
                        { $unwind: { path: "$activity_details", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 1,
                                student_id: {
                                    _id: "$student_id_populated._id",
                                    nombre: "$student_id_populated.nombre",
                                    apellidos: "$student_id_populated.apellidos",
                                    email: "$student_id_populated.email"
                                },
                                assignment_id: {
                                    _id: "$assignment_id_populated._id",
                                    puntos_maximos: "$assignment_id_populated.puntos_maximos",
                                    activity_id: "$assignment_id_populated.activity_id"
                                },
                                activity_details: {
                                     _id: "$activity_details._id",
                                     type: "$activity_details.type",
                                     title: "$activity_details.title"
                                },
                                fecha_envio: 1,
                                estado_envio: 1,
                                is_late: 1,
                                attempt_number: 1,
                                calificacion: 1,
                                link_entrega: "$respuesta.link_entrega"
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

const getTeacherAssignments = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }

    try {
        const userId = req.user._id;
        const userType = req.user.tipo_usuario;

        if (userType !== 'Docente' && userType !== 'Administrador') {
            return next(new AppError('Acceso denegado. Solo Docentes o Administradores pueden ver esta lista de asignaciones.', 403));
        }

        let assignments = [];
        let totalAssignments = 0;
        let baseQueryConditions = {};
        const defaultPagination = { totalItems: 0, currentPage: pageNumber, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null };


        if (userType === 'Docente') {
            const groups = await Group.find({ docente_id: userId }).select('_id').lean();
            const groupIds = groups.map(group => group._id);
            if (groupIds.length === 0) {
                return res.status(200).json({ data: [], pagination: defaultPagination });
            }
            const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } }).select('_id').lean();
            const learningPathIds = learningPaths.map(lp => lp._id);
            if (learningPathIds.length === 0) {
                return res.status(200).json({ data: [], pagination: defaultPagination });
            }
            const modules = await Module.find({ learning_path_id: { $in: learningPathIds } }).select('_id').lean();
            const moduleIds = modules.map(module => module._id);
            if (moduleIds.length === 0) {
                return res.status(200).json({ data: [], pagination: defaultPagination });
            }
            const themes = await Theme.find({ module_id: { $in: moduleIds } }).select('_id').lean();
            const themeIds = themes.map(theme => theme._id);
            if (themeIds.length === 0) {
                return res.status(200).json({ data: [], pagination: defaultPagination });
            }
            baseQueryConditions = { theme_id: { $in: themeIds }, type: 'Activity' };
        } else {
            baseQueryConditions = { type: 'Activity' };
        }

        totalAssignments = await ContentAssignment.countDocuments(baseQueryConditions);

        if (totalAssignments === 0) {
             return res.status(200).json({ data: [], pagination: { ...defaultPagination, totalItems: 0, totalPages: 0} });
        }

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

        const plainAssignments = assignments;

        if (plainAssignments.length === 0 && pageNumber > 1) {
             return res.status(200).json({
                data: [],
                pagination: {
                    totalItems: totalAssignments,
                    currentPage: pageNumber,
                    itemsPerPage: limitNumber,
                    totalPages: Math.ceil(totalAssignments / limitNumber),
                    hasNextPage: pageNumber < Math.ceil(totalAssignments / limitNumber),
                    hasPrevPage: true,
                    nextPage: pageNumber < Math.ceil(totalAssignments / limitNumber) ? pageNumber + 1 : null,
                    prevPage: pageNumber -1
                }
            });
        }
         if (plainAssignments.length === 0) {
             return res.status(200).json({ data: [], pagination: { ...defaultPagination, totalItems: totalAssignments, totalPages: Math.ceil(totalAssignments / limitNumber) } });
        }


        const relevantAssignmentIds = plainAssignments.map(a => new mongoose.Types.ObjectId(a._id));

        const submissionStats = await Submission.aggregate([
            { $match: { assignment_id: { $in: relevantAssignmentIds } } },
            { $sort: { student_id: 1, fecha_envio: -1 } },
            { $group: { _id: { assignment_id: "$assignment_id", student_id: "$student_id" }, lastSubmissionStatus: { $first: "$estado_envio" }}},
            { $group: { _id: "$_id.assignment_id", totalStudentsSubmitted: { $sum: 1 }, pendingGradingSubmissions: { $sum: { $cond: [{ $eq: ["$lastSubmissionStatus", "Enviado"] }, 1, 0] }}}}
        ]);

        const statsMap = new Map(submissionStats.map(stat => [stat._id.toString(), stat]));
        const assignmentsWithEnhancedCounts = plainAssignments.map(assignment => {
            const stats = statsMap.get(assignment._id.toString());
            let pendingGradingCount = stats ? stats.pendingGradingSubmissions : 0;
            if (assignment.activity_id?.type !== 'Cuestionario' && assignment.activity_id?.type !== 'Trabajo') {
                pendingGradingCount = 0;
            }
            return {
                ...assignment,
                total_students_submitted: stats ? stats.totalStudentsSubmitted : 0,
                pending_grading_count: pendingGradingCount
            };
        });

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

const gradeSubmission = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.submissionId)) {
        return next(new AppError('El ID de la entrega no tiene un formato válido.', 400));
    }
    try {
        const userId = req.user._id;
        const userType = req.user.tipo_usuario;
        const { submissionId } = req.params;
        const { calificacion } = req.body;

        if (userType !== 'Docente' && userType !== 'Administrador') {
            return next(new AppError('Acceso denegado. Solo Docentes o Administradores pueden calificar entregas.', 403));
        }

        const gradeValue = parseFloat(calificacion);
        if (isNaN(gradeValue) || gradeValue < 0) {
            return next(new AppError('Por favor, ingresa una calificación numérica válida y positiva.', 400));
        }

        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return next(new AppError('Entrega no encontrada.', 404));
        }

        if (userType === 'Docente') {
            const isSubmissionTeacher = await isTeacherOfSubmission(userId, submissionId);
            if (!isSubmissionTeacher) {
                 return next(new AppError('Acceso denegado. No eres el docente asignado para calificar esta entrega.', 403));
            }
        }

         const submissionWithActivity = await Submission.findById(submissionId)
            .populate({
                path: 'assignment_id',
                select: 'activity_id',
                populate: {
                    path: 'activity_id',
                    model: 'Activity',
                    select: 'type'
                }
            });

        if (!submissionWithActivity || !submissionWithActivity.assignment_id?.activity_id) {
             return next(new AppError('No se pudo determinar el tipo de actividad para esta entrega debido a datos referenciales incompletos.', 500));
        }
        const activityType = submissionWithActivity.assignment_id.activity_id.type;
        if (!activityType) {
             return next(new AppError('No se pudo determinar el tipo de actividad para esta entrega debido a datos referenciales incompletos en la asignación o actividad base.', 400));
        }
        if (activityType !== 'Cuestionario' && activityType !== 'Trabajo') {
            return next(new AppError(`Las entregas de tipo ${activityType} no se califican manualmente.`, 400));
        }

        submission.calificacion = gradeValue;
        submission.estado_envio = 'Calificado';
        const updatedSubmission = await submission.save();

        try {
            const populatedSubmission = await Submission.findById(updatedSubmission._id)
                .populate({
                    path: 'assignment_id',
                    select: 'activity_id puntos_maximos',
                    populate: {
                        path: 'activity_id',
                        model: 'Activity',
                        select: 'title'
                    }
                });

            if (populatedSubmission && populatedSubmission.assignment_id && populatedSubmission.student_id) {
                const activityTitle = populatedSubmission.assignment_id.activity_id?.title || 'your assignment';
                const studentId = populatedSubmission.student_id;
                const score = populatedSubmission.calificacion;
                const maxPoints = populatedSubmission.assignment_id.puntos_maximos;
                let message = `Your submission for '${activityTitle}' has been graded. Score: ${score}`;
                if (maxPoints !== undefined && maxPoints !== null) {
                    message += `/${maxPoints}`;
                }
                message += '.';
                const link = `/student/assignments/${populatedSubmission.assignment_id._id}/submissions/${populatedSubmission._id}`;
                await NotificationService.createNotification({
                    recipient: studentId,
                    sender: req.user._id,
                    type: 'GRADED_WORK',
                    message: message,
                    link: link
                });
            } else {
                console.error(`Could not gather details for submission ${updatedSubmission._id} to send grade notification.`);
            }
        } catch (notificationError) {
            console.error('Failed to send graded work notification:', notificationError);
        }

        res.status(200).json({
            message: 'Calificación guardada con éxito.',
            submission: updatedSubmission
        });
    } catch (error) {
        console.error('Error grading submission:', error);
        next(error);
    }
};

const getAssignmentById = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
      return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
  }
  try {
    const { assignmentId } = req.params;
    const assignment = await ContentAssignment.findById(assignmentId)
      .populate({ path: 'activity_id', select: 'title type' });
    if (!assignment) {
      return next(new AppError('Asignación no encontrada.', 404));
    }
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
};

const getMyPendingActivities = async (req, res, next) => {
    const studentId = req.user._id;
    const limit = parseInt(req.query.limit) || 3;
    const now = new Date();
    try {
        const memberships = await Membership.find({ usuario_id: studentId, estado_solicitud: 'Aprobado' }).select('grupo_id');
        const groupIds = memberships.map(m => m.grupo_id);
        if (groupIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const openAssignments = await ContentAssignment.find({
            group_id: { $in: groupIds },
            type: 'Activity',
            status: 'Open',
        })
        .populate('activity_id', 'title type')
        .populate({
            path: 'theme_id', 
            select: 'nombre module_id',
            populate: {
                path: 'module_id',
                select: 'nombre learning_path_id',
                populate: {
                    path: 'learning_path_id',
                    select: 'nombre _id'
                }
            }
        })
        .sort({ fecha_fin: 1 });

        let pendingActivitiesList = [];
        for (const assignment of openAssignments) {
            if (pendingActivitiesList.length >= limit) break;
            const gradedSubmission = await Submission.findOne({
                assignment_id: assignment._id,
                student_id: studentId,
                estado_envio: 'Calificado'
            });
            if (!gradedSubmission) {
                let activityLink = '#';
                const learningPathId = assignment.theme_id?.module_id?.learning_path_id?._id;
                if (learningPathId) {
                    activityLink = `/student/learning-paths/${learningPathId}/view`;
                }
                pendingActivitiesList.push({
                    _id: assignment._id,
                    title: assignment.activity_id?.title || 'Actividad sin título',
                    type: assignment.activity_id?.type || 'N/A',
                    dueDate: assignment.fecha_fin,
                    learningPathName: assignment.theme_id?.module_id?.learning_path_id?.nombre || 'Ruta Desconocida',
                    link: activityLink 
                });
            }
        }
        res.json({ success: true, data: pendingActivitiesList });
    } catch (error) {
        console.error("Error obteniendo actividades pendientes del estudiante:", error);
        next(new AppError('Error al obtener actividades pendientes.', 500));
    }
};

const updateAssignmentStatus = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
      return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
  }
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;
    const { _id: userId, tipo_usuario: userType } = req.user;

    if (!['Open', 'Closed'].includes(status)) {
      return next(new AppError("Estado inválido. Debe ser 'Open' o 'Closed'.", 400));
    }

    if (userType !== 'Docente' && userType !== 'Administrador') {
      return next(new AppError('Acceso denegado. Solo Docentes o Administradores pueden cambiar el estado de una asignación.', 403));
    }

    const assignment = await ContentAssignment.findById(assignmentId)
      .populate('activity_id', 'title')
      .populate('group_id', '_id docente_id');

    if (!assignment) {
      return next(new AppError('Asignación no encontrada.', 404));
    }

    if (userType === 'Docente') {
      const isOwner = assignment.docente_id && assignment.docente_id.toString() === userId.toString();
      const isGroupTeacher = assignment.group_id && assignment.group_id.docente_id && assignment.group_id.docente_id.toString() === userId.toString();
      let isTeacherViaHierarchy = false;
      if (!isOwner && !isGroupTeacher && assignment.theme_id) {
            const theme = await Theme.findById(assignment.theme_id)
                .populate({
                    path: 'module_id',
                    populate: {
                        path: 'learning_path_id',
                        populate: { path: 'group_id', select: 'docente_id' }
                    }
                }).lean();
            if (theme?.module_id?.learning_path_id?.group_id?.docente_id?.toString() === userId.toString()) {
                isTeacherViaHierarchy = true;
            }
        }
        if (!isOwner && !isGroupTeacher && !isTeacherViaHierarchy) {
            return next(new AppError('Acceso denegado. No eres el docente de esta asignación.', 403));
        }
    }

    if (assignment.status === status) {
        return res.status(200).json({ message: `La asignación ya se encuentra en estado "${status}".`, assignment });
    }

    const oldStatus = assignment.status;
    assignment.status = status;
    await assignment.save();

    if (status === 'Open' && oldStatus !== 'Open') {
        try {
            const detailedAssignment = await ContentAssignment.findById(assignment._id)
                .populate('activity_id', 'title')
                .populate('resource_id', 'title')
                .populate({
                    path: 'theme_id', select: 'nombre module_id',
                    populate: {
                        path: 'module_id', select: 'nombre learning_path_id',
                        populate: {
                            path: 'learning_path_id', select: 'nombre group_id',
                            populate: { path: 'group_id', select: '_id' }
                        }
                    }
                }).lean();

            if (detailedAssignment && detailedAssignment.theme_id?.module_id?.learning_path_id?.group_id?._id) {
                const groupIdForNotification = detailedAssignment.theme_id.module_id.learning_path_id.group_id._id;
                const assignmentTitle = detailedAssignment.activity_id?.title || detailedAssignment.resource_id?.title || 'Unnamed Assignment';
                const learningPathName = detailedAssignment.theme_id.module_id.learning_path_id.nombre;

                const approvedMembers = await Membership.find({
                    grupo_id: groupIdForNotification,
                    estado_solicitud: 'Aprobado'
                }).populate('usuario_id', 'tipo_usuario _id').lean();

                const io = global.io;
                for (const member of approvedMembers) {
                    if (member.usuario_id && member.usuario_id.tipo_usuario === 'Estudiante') {
                        const message = `New assignment '${assignmentTitle}' in '${learningPathName}' is now open.`;
                        const link = `/student/learning-paths/${detailedAssignment.theme_id.module_id.learning_path_id._id}/themes/${detailedAssignment.theme_id._id}/assignments/${detailedAssignment._id}`;
                        const newNotification = await NotificationService.createNotification({
                            recipient: member.usuario_id._id,
                            sender: req.user._id,
                            type: 'NEW_ASSIGNMENT',
                            message: message,
                            link: link
                        });
                        if (io) {
                            io.to(member.usuario_id._id.toString()).emit('new_notification', newNotification);
                        } else {
                            console.warn('Socket.IO instance (global.io) not available.');
                        }
                    }
                }
            } else {
                console.error(`Could not populate details for assignment ${assignment._id} to send notifications.`);
            }
        } catch (notificationError) {
            console.error('Failed to send new assignment notifications:', notificationError);
        }
    }
    res.status(200).json(assignment);
  } catch (error) {
    console.error('Error updating assignment status:', error);
    next(error);
  }
};

module.exports = { 
    getStudentActivityForAttempt,
    beginStudentActivityAttempt, // Añadido
    submitStudentActivityAttempt,
    getAssignmentSubmissions,
    getTeacherAssignments,
    gradeSubmission,
    getAssignmentById,
    getMyPendingActivities,
    updateAssignmentStatus
};
```
