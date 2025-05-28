// src/controllers/submissionController.js

const Submission = require('../models/SubmissionModel'); // Modelo de Entrega
const ContentAssignment = require('../models/ContentAssignmentModel'); // Para obtener detalles de la asignación
const Activity = require('../models/ActivityModel'); // Para obtener detalles de la actividad (preguntas)
const Membership = require('../models/MembershipModel'); // Para verificar membresía del estudiante
const mongoose = require('mongoose'); // Para comparación de ObjectIds
const LearningPath = require('../models/LearningPathModel');
const Module = require('../models/ModuleModel');
const Theme = require('../models/ThemeModel');
const Group = require('../models/GroupModel'); // Necesario para verificar propiedad del grupo
const { triggerActivityBasedProgressUpdate } = require('./progressController'); // Import progress update function


// @desc    Crear una nueva entrega para una actividad asignada
// @route   POST /api/submissions
// @access  Privado/Estudiante
const createSubmission = async (req, res) => {
    const { assignmentId, respuesta } = req.body; // Obtiene el ID de la asignación y la respuesta del estudiante
    const studentId = req.user._id; // ID del estudiante autenticado
    const userType = req.user.tipo_usuario; // Tipo de usuario autenticado

    // --- Verificación de Permiso: Solo estudiantes pueden enviar (mantener) ---
    if (userType !== 'Estudiante') {
        return res.status(403).json({ message: 'Solo los estudiantes pueden enviar actividades' });
    }
    // --- Fin Verificación de Permiso ---

    // --- Validación básica de entrada (mantener) ---
    if (!assignmentId || respuesta === undefined) {
        return res.status(400).json({ message: 'ID de asignación y respuesta son obligatorios' });
    }
    // --- Fin Validación básica ---

    try {
        // --- Verificar Existencia de la Asignación y Obtener Detalles (Mantenido y mejorado) ---
        // Necesitamos poblar la asignación para obtener la actividad linked (y su tipo y preguntas)
        // el grupo (para verificar la membresía del estudiante)
        // Y AHORA: el theme_id, module_id, y learning_path_id para el trigger de progreso
        const assignment = await ContentAssignment.findById(assignmentId)
            .populate('activity_id') // Poblar la actividad (incluye preguntas para Quiz/Cuestionario)
            .populate('group_id')    // Poblar el grupo (para verificar membresía)
            .populate({              // Deep populate para obtener learning_path_id
                path: 'theme_id',
                select: 'module_id',
                populate: {
                    path: 'module_id',
                    select: 'learning_path_id'
                }
            });

        // Verificar si la asignación existe y tiene referencias válidas
        if (!assignment || !assignment.activity_id || !assignment.group_id ||
            !assignment.theme_id || !assignment.theme_id.module_id || !assignment.theme_id.module_id.learning_path_id) {
            console.error(`Asignación incompleta para el ID: ${assignmentId}. Faltan referencias a activity_id, group_id, theme_id, module_id, o learning_path_id.`);
            return res.status(404).json({ message: 'Asignación no encontrada o incompleta. No se pudo determinar la ruta de aprendizaje.' });
        }
        
        // Asegurarse de que la asignación es efectivamente de una Actividad
        if (assignment.type !== 'Activity') {
            return res.status(400).json({ message: 'Esta asignación no corresponde a una actividad evaluable' });
        }
        // --- Fin Verificación Asignación ---

        // *** NUEVA VERIFICACIÓN DE ESTADO: La asignación debe estar 'Open' para permitir la entrega ***
        if (assignment.status !== 'Open') {
            return res.status(403).json({ message: `Esta actividad asignada no está actualmente disponible para entregas (Estado: ${assignment.status}).` });
        }
        // *** Fin Nueva Verificación de Estado ***

        // --- Verificar Membresía Aprobada del Estudiante en el Grupo (mantener) ---
        const approvedMembership = await Membership.findOne({
            usuario_id: studentId,
            grupo_id: assignment.group_id._id,
            estado_solicitud: 'Aprobado'
        });

        if (!approvedMembership) {
            return res.status(403).json({ message: 'No eres miembro aprobado del grupo de esta asignación, por lo tanto no puedes entregarla.' });
        }
        // --- Fin Verificar Membresía ---

        // --- Control de Intentos (mantener) ---
        const existingSubmissionsCount = await Submission.countDocuments({
            assignment_id: assignmentId,
            student_id: studentId
        });

        const attemptNumber = existingSubmissionsCount + 1;

        const intentosPermitidos = assignment.intentos_permitidos;
        if (intentosPermitidos === undefined || typeof intentosPermitidos !== 'number' || intentosPermitidos < 1) {
            console.error(`Advertencia: Asignación ${assignmentId} tiene un valor inválido para intentos_permitidos: ${intentosPermitidos}`);
            return res.status(500).json({ message: 'Error en la configuración de la asignación: intentos permitidos inválidos.' });
        }

        if (attemptNumber > intentosPermitidos) {
            return res.status(400).json({ message: `Has excedido el número máximo de intentos (${intentosPermitidos}) para esta actividad asignada.` });
        }
        // --- Fin Control de Intentos ---

        // --- Validar y Estructurar la Data de Respuesta según el Tipo de Actividad (mantener tu lógica) ---
        const activityType = assignment.activity_id.type;
        const submissionResponseData = {};

        if (activityType === 'Cuestionario') {
            if (!respuesta.cuestionario_answers || !Array.isArray(respuesta.cuestionario_answers)) {
                return res.status(400).json({ message: 'La respuesta para un Cuestionario debe contener un array llamado "cuestionario_answers"' });
            }
            const originalQuestions = assignment.activity_id.cuestionario_questions || [];
            const originalQuestionsCount = originalQuestions.length;

            for (const answer of respuesta.cuestionario_answers) {
                if (answer.question_index === undefined || answer.student_answer === undefined) {
                    return res.status(400).json({ message: 'Cada objeto en "cuestionario_answers" debe incluir "question_index" y "student_answer"' });
                }
                if (typeof answer.question_index !== 'number' || answer.question_index < 0 || answer.question_index >= originalQuestionsCount) {
                    return res.status(400).json({ message: `question_index inválido (${answer.question_index}) en las respuestas del cuestionario.` });
                }
                if (typeof answer.student_answer !== 'string') {
                    return res.status(400).json({ message: `student_answer debe ser texto para las respuestas del cuestionario.` });
                }
            }
            submissionResponseData.cuestionario_answers = respuesta.cuestionario_answers;

        } else if (activityType === 'Trabajo') {
            if (!respuesta.link_entrega || typeof respuesta.link_entrega !== 'string' || respuesta.link_entrega.trim() === '') {
                return res.status(400).json({ message: 'La respuesta para un Trabajo debe contener un link de entrega válido llamado "link_entrega"' });
            }
            submissionResponseData.link_entrega = respuesta.link_entrega;

        } else if (activityType === 'Quiz') {
            if (!respuesta.quiz_answers || !Array.isArray(respuesta.quiz_answers)) {
                return res.status(400).json({ message: 'La respuesta para un Quiz debe contener un array llamado "quiz_answers"' });
            }
            const originalQuestions = assignment.activity_id.quiz_questions || [];
            const totalQuestions = originalQuestions.length;

            if (respuesta.quiz_answers.length !== totalQuestions) {
                return res.status(400).json({ message: `Se esperaban ${totalQuestions} respuestas para este quiz` });
            }

            for (const studentAnswer of respuesta.quiz_answers) {
                if (studentAnswer.question_index === undefined || studentAnswer.student_answer === undefined) {
                    return res.status(400).json({ message: 'Cada objeto en "quiz_answers" debe incluir "question_index" y "student_answer"' });
                }
                if (typeof studentAnswer.question_index !== 'number' || studentAnswer.question_index < 0 || studentAnswer.question_index >= totalQuestions) {
                    return res.status(400).json({ message: `question_index inválido (${studentAnswer.question_index}) en las respuestas del quiz.` });
                }
                if (typeof studentAnswer.student_answer !== 'string') {
                    return res.status(400).json({ message: `student_answer debe ser texto para las respuestas del quiz.` });
                }
                const originalQuestion = originalQuestions[studentAnswer.question_index];
                if (!originalQuestion || !originalQuestion.options || !Array.isArray(originalQuestion.options) || !originalQuestion.options.includes(studentAnswer.student_answer)) {
                    return res.status(400).json({ message: `La respuesta proporcionada ("${studentAnswer.student_answer}") para la pregunta en el índice ${studentAnswer.question_index} no es una opción válida.` });
                }
            }
            submissionResponseData.quiz_answers = respuesta.quiz_answers;

        } else {
            return res.status(500).json({ message: 'Tipo de actividad desconocido en la asignación. No se puede procesar la entrega.' });
        }
        // --- Fin Validar Data de Respuesta ---

        // --- Crear el Documento de Entrega Inicial ---
        const submissionDate = new Date();
        const assignmentDeadline = assignment.fecha_fin;

        const isLate = assignmentDeadline && submissionDate > assignmentDeadline;

        const submission = new Submission({
            assignment_id: assignmentId,
            student_id: studentId,
            group_id: assignment.group_id._id,
            docente_id: assignment.docente_id, // Asumo que docente_id está en ContentAssignment
            fecha_envio: submissionDate,
            estado_envio: 'Enviado',
            is_late: isLate,
            attempt_number: attemptNumber,
            respuesta: submissionResponseData
        });

        await submission.save();
        // --- Fin Crear Entrega Inicial ---

        // --- Calificación Automática para Quiz (mantener y optimizar) ---
        if (activityType === 'Quiz') {
            let correctAnswersCount = 0;
            const originalQuestions = assignment.activity_id.quiz_questions || [];
            const totalQuestions = originalQuestions.length;

            for (const studentAnswer of submissionResponseData.quiz_answers) {
                const questionIndex = studentAnswer.question_index;
                if (questionIndex >= 0 && questionIndex < totalQuestions) {
                    const originalQuestion = originalQuestions[questionIndex];
                    if (originalQuestion && studentAnswer.student_answer === originalQuestion.correct_answer) {
                        correctAnswersCount++;
                    }
                }
            }

            const maxAssignmentPoints = assignment.puntos_maximos;
            let calculatedScore = 0;
            if (totalQuestions > 0 && maxAssignmentPoints !== undefined && maxAssignmentPoints >= 0) {
                calculatedScore = (correctAnswersCount / totalQuestions) * maxAssignmentPoints;
                calculatedScore = parseFloat(calculatedScore.toFixed(2));
            }

            submission.calificacion = calculatedScore;
            submission.estado_envio = 'Calificado';

            await submission.save();

            // --- Trigger progress update after auto-grading a Quiz (OPTIMIZADO) ---
            try {
                // Ya tenemos la learningPathId de la población inicial de `assignment`
                const learningPathIdForProgress = assignment.theme_id.module_id.learning_path_id;
                
                // No necesitamos volver a consultar `ContentAssignment` para el trigger
                triggerActivityBasedProgressUpdate(studentId, learningPathIdForProgress)
                    .then(result => {
                        if (result && result.success) {
                            console.log(`Progreso actualizado exitosamente para estudiante ${studentId}, ruta ${learningPathIdForProgress} después de autocalificar Quiz.`);
                        } else {
                            console.error(`Fallo al disparar actualización de progreso para estudiante ${studentId}, ruta ${learningPathIdForProgress} después de autocalificar Quiz: ${result ? result.message : 'Error desconocido'}`);
                        }
                    })
                    .catch(err => {
                        console.error(`Error llamando a triggerActivityBasedProgressUpdate para estudiante ${studentId}, ruta ${learningPathIdForProgress} después de autocalificar Quiz:`, err);
                    });
            } catch (progressError) {
                console.error('Error al intentar disparar la actualización de progreso después de autocalificar Quiz:', progressError);
            }
            // --- Fin Trigger progress update ---

            res.status(200).json(submission); // Quiz is created and auto-graded

        } else {
            // Para actividades que no son Quiz, solo devuelve la entrega creada (estado 201)
            res.status(201).json(submission);
        }
        // --- Fin Calificación Automática ---

    } catch (error) {
        // Manejo de errores generales
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al crear la entrega', errors: messages });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Parece que ya existe una entrega similar. Error de duplicado.' });
        }
        console.error('Error creando entrega:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la entrega', error: error.message });
    }
};

// @desc    Obtener las entregas de UN estudiante para una asignación específica
// @route   GET /api/submissions/my/:assignmentId
// Acceso: Privado/Estudiante
const getStudentSubmissionsForAssignment = async (req, res) => {
    const { assignmentId } = req.params; // ID de la asignación de la URL
    const studentId = req.user._id; // ID del estudiante autenticado (del token)
    // No necesitamos verificar userType aquí, authorize('Estudiante') en la ruta ya lo hizo.

    // Validación básica del ID de la asignación si es necesario
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
         return res.status(400).json({ message: 'ID de asignación inválido' });
    }

    try {
        // Buscar todas las entregas para esta asignación hechas por este estudiante específico
        const submissions = await Submission.find({
            assignment_id: assignmentId,
            student_id: studentId
        })
        // Opcional: Poblar información relevante de la asignación o el estudiante si se necesita en la respuesta
        .populate('assignment_id', 'fecha_limite puntuacion_maxima intentos_permitidos') // Ejemplo: Poblar algunos campos de la asignación
        // .populate('student_id', 'nombre apellidos'); // El estudiante ya conoce sus propios datos, pero podría ser útil poblarlo


        if (!submissions || submissions.length === 0) {
             // Usamos 404 si no encuentra entregas, no necesariamente un error de permiso
             return res.status(404).json({ message: 'No se encontraron entregas para esta asignación por parte de este estudiante' });
        }

        res.status(200).json(submissions); // Responde con el array de entregas

    } catch (error) {
        console.error('Error al obtener entregas del estudiante para asignación:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener tus entregas para la asignación', error: error.message });
    }
};


// @desc    Obtener TODAS las entregas para una asignación específica (para el docente dueño)
// @route   GET /api/submissions/assignment/:assignmentId/docente
// Acceso: Privado/Docente
const getAssignmentSubmissionsForDocente = async (req, res) => {
    const { assignmentId } = req.params; // ID de la asignación de la URL
    const docenteId = req.user._id; // ID del docente autenticado
    // No necesitamos verificar userType aquí, authorize('Docente') en la ruta ya lo hizo.

    // Validación básica del ID de la asignación
     if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
         return res.status(400).json({ message: 'ID de asignación inválido' });
    }


    try {
        // --- Verificación de Propiedad de la Asignación (a través del grupo) ---
        // Busca la asignación y puebla el grupo para verificar la propiedad del docente
        const assignment = await ContentAssignment.findById(assignmentId).populate('group_id');

        // Si la asignación no existe o no pertenece a un grupo de este docente
        if (!assignment || !assignment.group_id || !assignment.group_id.docente_id.equals(docenteId)) {
            // Mensaje genérico por seguridad: no confirma si la asignación existe pero no le pertenece.
            return res.status(404).json({ message: 'Asignación no encontrada o no pertenece a uno de tus grupos' });
        }
        // --- Fin Verificación de Propiedad ---


        // Buscar todas las entregas asociadas a esta asignación
        const submissions = await Submission.find({ assignment_id: assignmentId })
             // Poblar información relevante del estudiante que hizo la entrega
             .populate('student_id', 'nombre apellidos email')
             // Opcional: Poblar algunos campos de la asignación si son útiles en esta lista
             .populate('assignment_id', 'fecha_limite puntuacion_maxima');


        res.status(200).json(submissions); // Responde con el array de todas las entregas para esta asignación

    } catch (error) {
        console.error('Error al obtener entregas para asignación (Docente):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener entregas para la asignación', error: error.message });
    }
};


// @desc    Obtener una entrega específica por ID (para el docente dueño)
// @route   GET /api/submissions/:submissionId
// Acceso: Privado/Docente
const getSubmissionByIdForDocente = async (req, res) => {
    const { submissionId } = req.params; // ID de la entrega de la URL
    const docenteId = req.user._id; // ID del docente autenticado
    // No necesitamos verificar userType aquí.

    // Validación básica del ID de la entrega
     if (!mongoose.Types.ObjectId.isValid(submissionId)) {
         return res.status(400).json({ message: 'ID de entrega inválido' });
    }

    try {
        // --- Verificación de Propiedad de la Entrega (a través de asignación y grupo) ---
        // Busca la entrega y puebla su asignación, y dentro de la asignación, puebla el grupo.
        const submission = await Submission.findById(submissionId)
            .populate({ // Pobla la asignación asociada a la entrega
                path: 'assignment_id',
                populate: { // Dentro de la asignación, puebla el grupo
                    path: 'group_id',
                    select: 'docente_id' // Solo necesitamos el ID del docente del grupo para verificar
                }
            })
             // Pobla también el estudiante que hizo la entrega
             .populate('student_id', 'nombre apellidos email')
             // Opcional: Si necesitas los detalles completos del Recurso/Actividad asignado, puedes hacer otro populate:
             // .populate('assignment_id.resource_id')
             // .populate('assignment_id.activity_id');


        if (!submission) {
            return res.status(404).json({ message: 'Entrega no encontrada' });
        }

        // Comprueba si el grupo de la asignación de esta entrega pertenece al docente autenticado
        if (!submission.assignment_id || !submission.assignment_id.group_id || !submission.assignment_id.group_id.docente_id.equals(docenteId)) {
             // Si la asignación o su grupo no existen, o el docente no es el dueño del grupo.
             return res.status(403).json({ message: 'No tienes permiso para ver esta entrega. No pertenece a uno de tus grupos.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad ---

        res.status(200).json(submission); // Responde con los detalles de la entrega

    } catch (error) {
        console.error('Error al obtener entrega por ID (Docente):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la entrega', error: error.message });
    }
};


// @desc    Calificar una entrega específica (manual para Cuestionario/Trabajo)
// @route   PUT /api/submissions/:submissionId/grade
// Acceso: Privado/Docente
const gradeSubmission = async (req, res) => {
    const { submissionId } = req.params; // ID de la entrega de la URL
    // Obtiene la calificación y retroalimentación del cuerpo de la petición
    const { calificacion, retroalimentacion } = req.body;
    const docenteId = req.user._id; // ID del docente autenticado

    // --- Validación de entrada ---
    // Validar que el ID de la entrega sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
        return res.status(400).json({ message: 'ID de entrega inválido' });
    }
    // Validar que la calificación sea un número no negativo. 0 es una calificación válida.
    // Se permite `null` para calificaciones vacías o descalificadas
    if (calificacion !== null && (typeof calificacion !== 'number' || calificacion < 0)) {
        return res.status(400).json({ message: 'La calificación proporcionada es inválida. Debe ser un número no negativo o null.' });
    }
    // La retroalimentación es opcional, no necesita validación de obligatoriedad aquí.
    if (retroalimentacion !== undefined && retroalimentacion !== null && typeof retroalimentacion !== 'string') {
        return res.status(400).json({ message: 'La retroalimentación debe ser texto' });
    }
    // --- Fin Validación de entrada ---

    try {
        // --- Buscar la entrega y verificar Propiedad (a través de asignación y grupo) ---
        // Necesitamos poblar la entrega -> asignación -> grupo para verificar la propiedad del docente
        // También necesitamos la asignación para obtener la puntuación máxima y el tipo de actividad
        // Y AHORA POBLAREMOS TAMBIÉN EL STUDENT_ID
        const submission = await Submission.findById(submissionId)
            .populate({ // Pobla la asignación asociada a la entrega
                path: 'assignment_id',
                select: 'puntos_maximos type activity_id group_id', // Asegúrate de que es 'puntos_maximos' si así se llama en tu modelo
                populate: { // Dentro de la asignación, puebla el grupo y la actividad
                    path: 'group_id activity_id', // Poblar group_id y activity_id
                    select: 'docente_id type' // Del grupo solo necesitamos docente_id, de la actividad solo type
                }
            })
            .populate({ // **Añade este populate para el student_id**
                path: 'student_id',
                select: 'nombre apellidos' // Selecciona los campos que necesitas del estudiante
            });


        if (!submission) {
            return res.status(404).json({ message: 'Entrega no encontrada' });
        }

        // Comprueba si el grupo de la asignación de esta entrega pertenece al docente autenticado
        if (!submission.assignment_id || !submission.assignment_id.group_id || !submission.assignment_id.group_id.docente_id.equals(docenteId)) {
            // Si la asignación o su grupo no existen, o el docente no es el dueño del grupo.
            return res.status(403).json({ message: 'No tienes permiso para calificar esta entrega. No pertenece a uno de tus grupos.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad ---

        // --- Verificar Tipo de Actividad: No se puede calificar manualmente un Quiz ---
        const activityType = submission.assignment_id.activity_id ? submission.assignment_id.activity_id.type : null;
        if (activityType === 'Quiz') {
            // Si la actividad es Quiz, se califica automáticamente. No permitimos calificación manual.
            return res.status(400).json({ message: 'Las entregas de tipo Quiz se califican automáticamente y no pueden ser calificadas manualmente.' });
        }
        // Si activityType es null, algo salió mal al poblar, es un error interno
        if (!activityType) {
            console.error(`Error: No se pudo obtener el tipo de actividad para la asignación ${submission.assignment_id._id} en la entrega ${submissionId}`);
            return res.status(500).json({ message: 'Error interno: No se pudo determinar el tipo de actividad.' });
        }
        // --- Fin Verificación Tipo de Actividad ---

        // --- Validar Calificación contra Puntuación Máxima ---
        const maxAssignmentPoints = submission.assignment_id.puntos_maximos; // Usar 'puntos_maximos'
        // Validar que la calificación proporcionada no exceda la puntuación máxima si está definida y la calificación no es null.
        if (calificacion !== null && maxAssignmentPoints !== undefined && typeof maxAssignmentPoints === 'number' && calificacion > maxAssignmentPoints) {
            return res.status(400).json({ message: `La calificación (${calificacion}) no puede ser mayor que la puntuación máxima permitida (${maxAssignmentPoints}) para esta asignación.` });
        }
        // --- Fin Validar Calificación ---

        // --- Actualizar la Entrega con Calificación y Retroalimentación ---
        submission.calificacion = calificacion; // Establece la calificación
        submission.retroalimentacion = retroalimentacion; // Establece la retroalimentación (puede ser null si no se proporciona)
        submission.estado_envio = (calificacion === null || calificacion === undefined || calificacion === '') ? 'Enviado' : 'Calificado'; // Cambia el estado a 'Calificado' si hay calificación, de lo contrario 'Enviado'

        await submission.save(); // Guarda los cambios en la base de datos
        // --- Fin Actualizar Entrega ---

        // --- Trigger progress update after manual grading ---
        if (submission.estado_envio === 'Calificado') {
            try {
                const studentIdForProgress = submission.student_id._id; // submission.student_id is populated
                // Need to get learningPathId from assignment -> theme -> module -> learningPath
                // submission.assignment_id is populated, and inside it, activity_id and group_id are populated.
                // We need theme_id from assignment_id.
                const assignmentForProgress = await ContentAssignment.findById(submission.assignment_id._id)
                    .populate({
                        path: 'theme_id',
                        select: 'module_id',
                        populate: {
                            path: 'module_id',
                            select: 'learning_path_id'
                        }
                    });

                if (assignmentForProgress && assignmentForProgress.theme_id && assignmentForProgress.theme_id.module_id && assignmentForProgress.theme_id.module_id.learning_path_id) {
                    const learningPathIdForProgress = assignmentForProgress.theme_id.module_id.learning_path_id;
                    
                    triggerActivityBasedProgressUpdate(studentIdForProgress, learningPathIdForProgress)
                        .then(result => {
                            if (result && result.success) {
                                console.log(`Progress update triggered successfully for student ${studentIdForProgress}, path ${learningPathIdForProgress} after manual grade.`);
                            } else {
                                console.error(`Progress update trigger failed for student ${studentIdForProgress}, path ${learningPathIdForProgress} after manual grade: ${result ? result.message : 'Unknown error'}`);
                            }
                        })
                        .catch(err => {
                            console.error(`Error calling triggerActivityBasedProgressUpdate for student ${studentIdForProgress}, path ${learningPathIdForProgress} after manual grade:`, err);
                        });
                } else {
                    console.error(`Could not find learningPathId for assignment ${submission.assignment_id._id} to trigger progress update after manual grading.`);
                }
            } catch (progressError) {
                console.error('Error trying to trigger progress update after manual grading:', progressError);
                // Do not let this error affect the main response for grading
            }
        }
        // --- End Trigger progress update ---

        res.status(200).json(submission); // Responde con la entrega actualizada (calificada)

    } catch (error) {
        // Manejo de errores de validación de Mongoose (aunque ya validamos antes de guardar)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al calificar la entrega', errors: messages });
        }
        console.error('Error calificando entrega:', error);
        res.status(500).json({ message: 'Error interno del servidor al calificar la entrega', error: error.message });
    }
};

// @desc    Eliminar una entrega de estudiante específica (para el docente dueño)
// @route   DELETE /api/submissions/:submissionId/docente
// @access  Privado/Docente
const deleteSubmissionByDocente = async (req, res) => {
    const { submissionId } = req.params; // ID de la Entrega de la URL
    const docenteId = req.user._id; // ID del docente autenticado
    const userType = req.user.tipo_usuario; // Tipo de usuario

    // Verificación de Permiso (redundante si la ruta usa authorize)
    if (userType !== 'Docente') {
        return res.status(403).json({ message: 'Solo los docentes pueden eliminar entregas.' });
    }

     // Validación básica del ID de la Entrega
     if (!mongoose.Types.ObjectId.isValid(submissionId)) {
         return res.status(400).json({ message: 'ID de entrega inválido' });
    }

    try {
        // --- Verificación de Propiedad: Verificar que el Docente es dueño de la entrega (a través de su asignación -> ruta -> grupo) ---
        // Busca la entrega, puebla su asignación y navega hacia arriba para verificar la propiedad del docente
        const submission = await Submission.findById(submissionId).populate({
            path: 'assignment_id', // Puebla la asignación de la entrega
            populate: {
                path: 'theme_id', // Dentro de la asignación, puebla el tema
                populate: {
                    path: 'module_id', // Dentro del tema, puebla el módulo
                    populate: {
                        path: 'learning_path_id', // Dentro del módulo, puebla la ruta
                        populate: {
                            path: 'group_id', // Dentro de la ruta, puebla el grupo
                            model: 'Group' // Especifica el modelo Group
                        }
                    }
                }
            }
        });

        // Si la entrega no existe, o si no pertenece a una asignación cuyo tema/módulo/ruta/grupo sea propiedad de este docente
        if (!submission || !submission.assignment_id || !submission.assignment_id.theme_id || !submission.assignment_id.theme_id.module_id || !submission.assignment_id.theme_id.module_id.learning_path_id || !submission.assignment_id.theme_id.module_id.learning_path_id.group_id || !submission.assignment_id.theme_id.module_id.learning_path_id.group_id.docente_id.equals(docenteId)) {
             // Se usa 404 para no revelar si la entrega existe pero pertenece a otro
            return res.status(404).json({ message: 'Entrega no encontrada o no pertenece a una de tus asignaciones/grupos.' });
        }
        // --- Fin Verificación de Propiedad ---


        // --- Eliminar la Entrega ---
        // Eliminamos el documento de Submission de la base de datos
        await Submission.findByIdAndDelete(submissionId);

        // --- Manejar Impacto en el Conteo de Intentos (Implícito) ---
        // Como explicamos antes, si la lógica de `createSubmission` cuenta las entregas existentes para controlar intentos,
        // al eliminar una entrega aquí, implícitamente se reduce el conteo de entregas existentes para ese estudiante y asignación.
        // Esto podría "liberar" un intento si el estudiante no había llegado al límite máximo de intentos.
        console.log(`Entrega ${submissionId} (estudiante: ${submission.student_id}, asignación: ${submission.assignment_id._id}) eliminada por docente ${docenteId}.`);
        // --- Fin Manejo de Impacto ---


        // Respuesta de éxito
        res.status(200).json({ message: 'Entrega eliminada exitosamente.' });

    } catch (error) {
         console.error('Error al eliminar entrega por docente:', error);
         res.status(500).json({ message: 'Error interno del servidor al eliminar la entrega', error: error.message });
    }
};

module.exports = {
    createSubmission,
    getStudentSubmissionsForAssignment,
    getAssignmentSubmissionsForDocente,
    getSubmissionByIdForDocente,
    gradeSubmission, // Exporta la nueva función
    deleteSubmissionByDocente
};