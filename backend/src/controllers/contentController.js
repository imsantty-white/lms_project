// src/controllers/contentController.js

const Resource = require('../models/ResourceModel');
const Activity = require('../models/ActivityModel');
const ContentAssignment = require('../models/ContentAssignmentModel'); // Necesario para verificaciones
const LearningPath = require('../models/LearningPathModel'); // Necesario para verificaciones
const Module = require('../models/ModuleModel'); // Necesario para verificaciones
const Theme = require('../models/ThemeModel'); // Necesario para verificaciones
const mongoose = require('mongoose');
const User = require('../models/UserModel'); // <--- ADD THIS
const Plan = require('../models/PlanModel'); // <--- ADD THIS
const SubscriptionService = require('../services/SubscriptionService'); // <--- ADD THIS

// @desc    Crear un nuevo Recurso (para el banco del docente)
// @route   POST /api/content/resources
// @access  Privado/Docente
const createResource = async (req, res) => {
    const { type, title, content_body, link_url, video_url } = req.body;
    const docenteId = req.user._id; // ID del docente autenticado

    // Validación básica: tipo y título son siempre obligatorios
    if (!type || !title) {
        return res.status(400).json({ message: 'Tipo y título del recurso son obligatorios' });
    }

    // Validación de campos específicos según el tipo
    if (type === 'Contenido' && (!content_body || content_body.trim() === '')) {
        return res.status(400).json({ message: 'El cuerpo del contenido es obligatorio para recursos de tipo Contenido' });
    }
    if (type === 'Enlace' && (!link_url || link_url.trim() === '')) {
         return res.status(400).json({ message: 'La URL del enlace es obligatoria para recursos de tipo Enlace' });
    }
    if (type === 'Video-Enlace' && (!video_url || video_url.trim() === '')) {
         return res.status(400).json({ message: 'La URL del video es obligatoria para recursos de tipo Video-Enlace' });
    }
    // Mongoose validará si el 'type' está dentro del enum permitido.

    try {
        // --- BEGIN PLAN AND USAGE LIMIT CHECK ---
        if (req.user.tipo_usuario === 'Docente') {
            const user = await User.findById(docenteId).populate('planId');
            if (!user) {
                return res.status(404).json({ message: 'Usuario docente no encontrado.' });
            }

            const subscription = await SubscriptionService.checkSubscriptionStatus(docenteId);
            if (!subscription.isActive) {
                return res.status(403).json({ message: `No se puede crear el recurso: ${subscription.message}` });
            }

            if (user.planId && user.planId.limits && user.planId.limits.maxResources !== undefined) {
                if (user.usage.resourcesGenerated >= user.planId.limits.maxResources) {
                    return res.status(403).json({ message: `Has alcanzado el límite de ${user.planId.limits.maxResources} recursos permitidos por tu plan "${user.planId.name}".` });
                }
            } else {
                console.warn(`Plan o límites no definidos para el docente ${docenteId} al crear recurso.`);
                return res.status(403).json({ message: 'No se pudieron verificar los límites de tu plan para crear recursos.' });
            }
        }
        // --- END PLAN AND USAGE LIMIT CHECK ---

        const resource = await Resource.create({
            type,
            title,
            docente_id: docenteId,
            content_body: type === 'Contenido' ? content_body : undefined,
            link_url: type === 'Enlace' ? link_url : undefined,
            video_url: type === 'Video-Enlace' ? video_url : undefined
        });

        // --- BEGIN INCREMENT USAGE COUNTER ---
        if (req.user.tipo_usuario === 'Docente') {
            const userToUpdate = await User.findById(docenteId);
            if (userToUpdate) {
                userToUpdate.usage.resourcesGenerated = (userToUpdate.usage.resourcesGenerated || 0) + 1;
                await userToUpdate.save();
            }
        }
        // --- END INCREMENT USAGE COUNTER ---

        res.status(201).json(resource);

    } catch (error) {
        console.error('Error creando recurso:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear el recurso', error: error.message });
    }
};

// @desc    Crear nueva Actividad
// @route   POST /api/content/activities
// @access  Privado/Docente
const createActivity = async (req, res, next) => {
    //console.log('==> Contenido de req.user al entrar a createActivity:', req.user); // Puedes dejarlo temporalmente para verificar
    //console.log('==> Tipo de req.user.tipo_usuario:', typeof req.user?.tipo_usuario); // Puedes dejarlo temporalmente para verificar
    //console.log('==> Valor de req.user.tipo_usuario:', req.user?.tipo_usuario); // Puedes dejarlo temporalmente para verificar


    // Asegúrate de que el usuario autenticado es un docente o administrador
    if (req.user.tipo_usuario !== 'Docente' && req.user.tipo_usuario !== 'Administrador') {
        //console.log('==> Acceso denegado por userType:', req.user?.tipo_usuario); // Puedes dejarlo temporalmente para verificar
        return res.status(403).json({ message: 'Solo los docentes y administradores pueden crear actividades.' }); // 403 Forbidden
    }


    // Obtener los datos del cuerpo de la petición
    const {
        type, // 'Cuestionario', 'Trabajo', 'Quiz'
        title,
        description,
        // *** ELIMINAMOS total_points, allowed_attempts, time_limit de aquí ***
        cuestionario_questions,
        quiz_questions,
        // ... otros campos si otros tipos de actividad los tienen
    } = req.body;


    // *** Validación de entrada backend (SOLO campos de la Actividad base) ***
    if (!type || !title || title.trim() === '') {
        return res.status(400).json({ message: 'El tipo y el título de la actividad son obligatorios.' });
    }

    // Validaciones condicionales basadas UNICAMENTE en el contenido de la Actividad base
    if (type === 'Cuestionario') {
        if (!cuestionario_questions || !Array.isArray(cuestionario_questions) || cuestionario_questions.length === 0 || cuestionario_questions.some(q => !q || !q.text || q.text.trim() === '')) { // Añadido !q para manejar items nulos/indefinidos
             return res.status(400).json({ message: 'Las actividades tipo Cuestionario deben tener al menos una pregunta con texto.' });
        }
        // *** ELIMINAMOS VALIDACIONES DE total_points, allowed_attempts, time_limit ***

    } else if (type === 'Quiz') {
         if (!quiz_questions || !Array.isArray(quiz_questions) || quiz_questions.length === 0 || quiz_questions.some(q =>
            !q || !q.text || q.text.trim() === '' || // Añadido !q para manejar items nulos/indefinidos
            !q.options || !Array.isArray(q.options) || q.options.length < 2 ||
            q.options.some(opt => !opt || opt.trim() === '') || // Añadido !opt para manejar opciones nulas/indefinidas
            // Tu modelo permite opciones como strings, verifica que la respuesta correcta sea un string no vacío y esté en las opciones
            !q.correct_answer || typeof q.correct_answer !== 'string' || q.correct_answer.trim() === '' ||
            !q.options.map(opt => typeof opt === 'string' ? opt.trim() : '').includes(q.correct_answer.trim()) // Mapear opciones a strings para la comparación
         )) {
             return res.status(400).json({ message: 'Las actividades tipo Quiz deben tener al menos una pregunta con texto, al menos 2 opciones (con texto) y una respuesta correcta que coincida con una opción.' });
         }
          // *** ELIMINAMOS VALIDACIONES DE total_points, allowed_attempts, time_limit ***

    } else if (type === 'Trabajo') {
        // El trabajo solo requiere título y descripción, no hay validación adicional específica aquí
    } else {
         return res.status(400).json({ message: 'Tipo de actividad no soportado.' });
    }
    // *** Fin Validación de entrada backend ***


    try {
        // --- BEGIN PLAN AND USAGE LIMIT CHECK (Only for Docentes) ---
        if (req.user.tipo_usuario === 'Docente') {
            const user = await User.findById(docenteId).populate('planId');
            if (!user) {
                return res.status(404).json({ message: 'Usuario docente no encontrado.' });
            }

            const subscription = await SubscriptionService.checkSubscriptionStatus(docenteId);
            if (!subscription.isActive) {
                return res.status(403).json({ message: `No se puede crear la actividad: ${subscription.message}` });
            }

            if (user.planId && user.planId.limits && user.planId.limits.maxActivities !== undefined) {
                if (user.usage.activitiesGenerated >= user.planId.limits.maxActivities) {
                    return res.status(403).json({ message: `Has alcanzado el límite de ${user.planId.limits.maxActivities} actividades permitidas por tu plan "${user.planId.name}".` });
                }
            } else {
                console.warn(`Plan o límites no definidos para el docente ${docenteId} al crear actividad.`);
                return res.status(403).json({ message: 'No se pudieron verificar los límites de tu plan para crear actividades.' });
            }
        }
        // --- END PLAN AND USAGE LIMIT CHECK ---

        const newActivity = new Activity({
            type,
            title: title.trim(),
            description: description?.trim() || '',
            docente_id: req.user._id, // Asignar el ID del docente autenticado
            // *** ELIMINAMOS LA ADICIÓN DE total_points, allowed_attempts, time_limit AQUÍ ***
            // Añadir los campos específicos según el tipo
            ...(type === 'Cuestionario' && { cuestionario_questions }),
            ...(type === 'Quiz' && { quiz_questions }),
        });

        // Guardar la actividad en la base de datos
        const createdActivity = await newActivity.save();

        // --- BEGIN INCREMENT USAGE COUNTER (Only for Docentes) ---
        if (req.user.tipo_usuario === 'Docente') {
            const userToUpdate = await User.findById(docenteId);
            if (userToUpdate) {
                userToUpdate.usage.activitiesGenerated = (userToUpdate.usage.activitiesGenerated || 0) + 1;
                await userToUpdate.save();
            }
        }
        // --- END INCREMENT USAGE COUNTER ---

        console.log(`Actividad creada: ${createdActivity._id} (Tipo: ${createdActivity.type})`);
        res.status(201).json(createdActivity);

    } catch (error) {
         // Si el error es de validación de Mongoose (por ejemplo, si el esquema de Mongoose tiene validaciones `required`)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al crear la actividad.', errors: messages });
        }
        console.error('Error al crear actividad:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Obtener el banco de contenido (Recursos y Actividades) de un docente
// @route   GET /api/content/my-bank
// @access  Private/Docente
const getDocenteContentBank = async (req, res) => {
    // Obtenemos el ID del docente autenticado directamente desde el token (req.user)
    const docenteId = req.user._id;

    try {
        // 1. Buscamos todos los recursos creados por este docente
        let resources = await Resource.find({ docente_id: docenteId }).lean();

        // 2. Buscamos todas las actividades creadas por este docente
        let activities = await Activity.find({ docente_id: docenteId }).lean();

        // 3. Obtener todos los IDs de recursos y actividades asignados en ContentAssignments
        // Usamos $or para buscar assignments que coincidan con resource_id o activity_id
        const assignedContentItems = await ContentAssignment.find(
            {
                $or: [
                    { resource_id: { $in: resources.map(r => r._id) } },
                    { activity_id: { $in: activities.map(a => a._id) } }
                ],
                docente_id: docenteId // Asegurarnos que pertenecen a este docente
            },
            { _id: 0, resource_id: 1, activity_id: 1 } // Solo necesitamos estos campos
        ).lean();

        // 4. Crear un Set para una búsqueda eficiente de IDs asignados
        const assignedResourceIds = new Set();
        const assignedActivityIds = new Set();

        assignedContentItems.forEach(item => {
            if (item.resource_id) {
                assignedResourceIds.add(item.resource_id.toString());
            }
            if (item.activity_id) {
                assignedActivityIds.add(item.activity_id.toString());
            }
        });

        // 5. Marcar recursos como asignados
        resources = resources.map(resource => ({
            ...resource,
            isAssigned: assignedResourceIds.has(resource._id.toString())
        }));

        // 6. Marcar actividades como asignadas
        activities = activities.map(activity => ({
            ...activity,
            isAssigned: assignedActivityIds.has(activity._id.toString())
        }));

        // Combinamos y respondemos con ambas listas
        res.status(200).json({
            resources, // Array de recursos
            activities  // Array de actividades
        });

    } catch (error) {
        console.error('Error al obtener el banco de contenido del docente:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener tu banco de contenido', error: error.message });
    }
};

// @desc    Obtener un Recurso específico por ID
// @route   GET /api/content/resources/:resourceId
// @access  Privado/Docente
const getResourceById = async (req, res) => { // <-- SIN asyncHandler, usando async/await directamente
    try {
        // 1. Obtener el ID del recurso desde los parámetros de la URL
        const resourceId = req.params.resourceId;

        // Opcional: Validar si el ID es un ObjectId válido antes de buscar
        if (!mongoose.Types.ObjectId.isValid(resourceId)) {
             return res.status(400).json({ message: 'ID de recurso no válido' });
        }

        // 2. Buscar el recurso por ID
        const resource = await Resource.findById(resourceId);

        // 3. Verificar si el recurso fue encontrado
        if (!resource) {
            // Usamos return aquí para detener la ejecución después de enviar la respuesta
            return res.status(404).json({ message: 'Recurso no encontrado.' });
        }

        // 4. (Seguridad) Verificar que el recurso pertenece al docente autenticado
        // Comparamos el docente_id guardado en el recurso con el ID del docente autenticado (req.user._id).
        // Convertimos a string para una comparación segura, ya que pueden ser objetos ObjectId.
        if (resource.docente_id.toString() !== req.user._id.toString()) {
            // Usamos return aquí
            return res.status(403).json({ message: 'No autorizado para ver este recurso.' });
        }

        // 5. Si el recurso existe y pertenece al docente, responder con el recurso
        res.status(200).json(resource);

    } catch (error) {
        // Manejo de errores generales del servidor (ej. error de conexión a DB)
        console.error('Error fetching resource by ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el recurso', error: error.message });
    }
};


// @desc    Obtener una Actividad específica por ID
// @route   GET /api/content/activities/:activityId
// @access  Privado/Docente
const getActivityById = async (req, res) => { // <-- Usando async/await directamente
    try {
        // 1. Obtener el ID de la actividad desde los parámetros de la URL
        const activityId = req.params.activityId;

        // Opcional: Validar si el ID es un ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
             return res.status(400).json({ message: 'ID de actividad no válido' });
        }

        // 2. Buscar la actividad por ID en la base de datos
        const activity = await Activity.findById(activityId); // <-- Usamos el modelo Activity

        // 3. Verificar si la actividad fue encontrada
        if (!activity) {
            // Usamos return aquí para detener la ejecución después de enviar la respuesta
            return res.status(404).json({ message: 'Actividad no encontrada.' });
        }

        // 4. (Seguridad) Verificar que la actividad pertenece al docente autenticado
        // Comparamos el docente_id guardado en la actividad con el ID del docente autenticado (req.user._id).
        if (activity.docente_id.toString() !== req.user._id.toString()) {
            // Usamos return aquí
            return res.status(403).json({ message: 'No autorizado para ver esta actividad.' });
        }

        // 5. Si la actividad existe y pertenece al docente, responder con la actividad
        res.status(200).json(activity);

    } catch (error) {
        // Manejo de errores generales del servidor (ej. error de conexión a DB)
        console.error('Error fetching activity by ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la actividad', error: error.message });
    }
};


// @desc    Actualizar un Recurso específico en el Banco de Contenido
// @route   PUT /api/content/resources/:resourceId
// @access  Privado/Docente
const updateResource = async (req, res) => { // <-- Usando async/await directamente
    const { resourceId } = req.params; // ID del Recurso de la URL
    // Extraer TODOS los posibles campos específicos del body, además de título y descripción
    const { title, description, content_body, link_url, video_url } = req.body; // <-- ¡Extraemos los campos correctos!
    const docenteId = req.user._id; // ID del docente autenticado

    // Basic validation for Resource ID
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ message: 'ID de recurso inválido' });
    }

    // **Validación de campos en el body (Ajustada)**
    // Validamos que si un campo está presente, sea del tipo correcto y no vacío si aplica.
    // Ya no validamos si AL MENOS uno está presente aquí; la lógica de actualización decide qué aplicar.
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
        return res.status(400).json({ message: 'El título debe ser un texto no vacío si se proporciona' });
    }
    if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json({ message: 'La descripción debe ser texto si se proporciona' });
    }
    if (content_body !== undefined && (typeof content_body !== 'string' || content_body.trim() === '')) {
        return res.status(400).json({ message: 'El cuerpo del contenido debe ser un texto no vacío si se proporciona (para tipo Contenido)' });
    }
     if (link_url !== undefined && (typeof link_url !== 'string' || link_url.trim() === '')) {
        return res.status(400).json({ message: 'La URL del enlace debe ser un texto no vacío si se proporciona (para tipo Enlace)' });
    }
     if (video_url !== undefined && (typeof video_url !== 'string' || video_url.trim() === '')) {
        return res.status(400).json({ message: 'La URL del video debe ser un texto no vacío si se proporciona (para tipo Video-Enlace)' });
    }


    try {
        // Encontrar el recurso por ID y VERIFICAR PROPIEDAD en una sola consulta si es posible, o findOne y luego verificar
        // Usando findOne con docenteId ya valida la propiedad
        const resource = await Resource.findOne({ _id: resourceId, docente_id: docenteId });

        if (!resource) {
            // Si no se encuentra o no pertenece al docente
            return res.status(404).json({ message: 'Recurso no encontrado o no te pertenece' });
        }

        // --- Actualizar campos permitidos y específicos ---

        // Actualiza título si se proporciona en el body
        if (title !== undefined) {
            resource.title = title.trim();
        }

        // Actualiza descripción si se proporciona en el body
        if (description !== undefined) {
            // Permite que la descripción sea un string vacío si se envía así
            resource.description = description.trim();
        }

        // **Actualiza el campo de contenido específico basado en el TIPO ORIGINAL del recurso**
        if (resource.type === 'Contenido') {
            // Si el recurso es de tipo Contenido, actualiza content_body si se proporcionó
            if (content_body !== undefined) {
                resource.content_body = content_body.trim();
            }
            // Opcional: Asegurarse de que los otros campos específicos no relevantes estén limpios
            resource.link_url = undefined;
            resource.video_url = undefined;

        } else if (resource.type === 'Enlace') {
            // Si el recurso es de tipo Enlace, actualiza link_url si se proporcionó
            if (link_url !== undefined) {
                resource.link_url = link_url.trim();
            }
             // Opcional: Asegurarse de que los otros campos específicos no relevantes estén limpios
            resource.content_body = undefined;
            resource.video_url = undefined;

        } else if (resource.type === 'Video-Enlace') {
            // Si el recurso es de tipo Video-Enlace, actualiza video_url si se proporcionó
            if (video_url !== undefined) {
                resource.video_url = video_url.trim();
            }
             // Opcional: Asegurarse de que los otros campos específicos no relevantes estén limpios
            resource.content_body = undefined;
            resource.link_url = undefined;
        }
        // Si el tipo de recurso no coincide con ninguno conocido, no se actualiza ningún campo específico.


        // Guarda los cambios en la base de datos
        const updatedResource = await resource.save();

        // Responde con éxito y el recurso actualizado
        res.status(200).json({
            message: 'Recurso actualizado con éxito!',
            resource: updatedResource // Puedes devolver el recurso actualizado si el frontend lo necesita
        });

    } catch (error) {
        // Manejo de errores de validación de Mongoose o errores generales del servidor
        if (error.name === 'ValidationError') {
            // Si hay errores de validación del esquema de Mongoose
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar recurso', errors: messages });
        }
        console.error('Error updating resource:', error);
        // Otros errores (ej. DB)
        res.status(500).json({ message: 'Error interno del servidor al actualizar el recurso', error: error.message });
    }
};


// @desc    Eliminar un Recurso específico del Banco de Contenido
// @route   DELETE /api/content/resources/:resourceId
// @access  Privado/Docente
const deleteResource = async (req, res) => { // <-- Usando async/await directamente
    try {
        // 1. Obtener el ID del recurso desde los parámetros de la URL
        const resourceId = req.params.resourceId;
        // 2. Obtener el ID del docente autenticado (del middleware protect)
        const docenteId = req.user._id;

        // Opcional: Validar si el ID es un ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(resourceId)) {
             return res.status(400).json({ message: 'ID de recurso inválido' });
        }

        // 3. Buscar el recurso por ID y VERIFICAR PROPIEDAD ANTES DE ELIMINAR
        // Usamos findOne para obtener el documento y luego verificar
        const resource = await Resource.findOne({ _id: resourceId, docente_id: docenteId });

        // 4. Verificar si el recurso fue encontrado y pertenece al docente
        if (!resource) {
            // Si no se encuentra o no pertenece al docente autenticado
            return res.status(404).json({ message: 'Recurso no encontrado o no te pertenece' });
        }

        // 5. Si el recurso existe y pertenece al docente, proceder a eliminarlo
        // Usamos deleteOne con los mismos criterios (ID y docenteId) para una capa extra de seguridad
        const deleteResult = await Resource.deleteOne({ _id: resourceId, docente_id: docenteId });

        // Opcional: Verificar si la eliminación fue exitosa (n = número de documentos afectados)
        if (deleteResult.deletedCount === 0) {
             // Esto no debería ocurrir si findOne tuvo éxito, pero es una verificación defensiva
             return res.status(500).json({ message: 'Error al eliminar el recurso (puede que ya haya sido eliminado)' });
        }

        // 6. Responder con un mensaje de éxito
        res.status(200).json({ message: 'Recurso eliminado con éxito.' });

    } catch (error) {
        // Manejo de errores generales del servidor
        console.error('Error deleting resource:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el recurso', error: error.message });
    }
};


// @desc    Actualizar una Actividad específica en el Banco de Contenido
// @route   PUT /api/content/activities/:activityId
// @access  Privado/Docente
const updateActivity = async (req, res) => {
    try {
        const activityId = req.params.activityId;
        // Extraer campos del body. Ya NO extraemos link_url aquí.
        const {
              title,
              description,
              cuestionario_questions, // Para tipo 'Cuestionario'
              quiz_questions, // Para tipo 'Quiz'
              // Ya NO extraemos link_url aquí
          } = req.body;
        const docenteId = req.user._id;

        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
             return res.status(400).json({ message: 'ID de actividad inválido' });
        }

        // Validaciones de campos en el body
        if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
            return res.status(400).json({ message: 'El título debe ser un texto no vacío si se proporciona' });
        }
        if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({ message: 'La descripción debe ser texto si se proporciona' });
        }
        // TODO: Añadir validaciones más robustas para cuestionario_questions y quiz_questions si es necesario en el backend
        // Asegúrate de que los arrays y objetos internos tengan la estructura esperada.

        // Ya NO hay validación específica para link_url aquí.
        // Validar que campos de otros tipos no estén presentes (opcional pero buena práctica)
         if (req.body.link_url !== undefined) return res.status(400).json({ message: 'El campo enlace no es aplicable a este tipo de actividad.' });


        // Encontrar la actividad y verificar propiedad
        const activity = await Activity.findOne({ _id: activityId, docente_id: docenteId });

        if (!activity) {
            return res.status(404).json({ message: 'Actividad no encontrada o no te pertenece' });
        }

        // --- Actualizar campos ---

        // Actualiza título si se proporciona
        if (title !== undefined) {
            activity.title = title.trim();
        }

        // Actualiza descripción si se proporciona
        if (description !== undefined) {
            activity.description = description.trim();
        }

        // Actualiza campos específicos condicionalmente según el TIPO ORIGINAL de la actividad
        // Limpia otros campos específicos no relevantes
        if (activity.type === 'Cuestionario') {
            if (cuestionario_questions !== undefined) {
                 if (Array.isArray(cuestionario_questions)) {
                     activity.cuestionario_questions = cuestionario_questions.map(q => ({ text: q.text?.trim() || '' }));
                 }
            }
            activity.quiz_questions = undefined; // Limpiar campos de Quiz
            // Ya no necesitamos limpiar link_url aquí

        } else if (activity.type === 'Quiz') {
             if (quiz_questions !== undefined) {
                 if (Array.isArray(quiz_questions)) {
                     activity.quiz_questions = quiz_questions.map(q => ({
                         text: q.text?.trim() || '',
                         options: Array.isArray(q.options) ? q.options.map(opt => opt?.trim() || '') : [],
                         correct_answer: q.correct_answer?.trim() || ''
                     }));
                 }
             }
            activity.cuestionario_questions = undefined; // Limpiar campos de Cuestionario
            // Ya no necesitamos limpiar link_url aquí

        } else if (activity.type === 'Trabajo') {
            // El tipo 'Trabajo' solo tiene título y descripción, no hay campos específicos que actualizar aquí.
            activity.cuestionario_questions = undefined; // Limpiar campos de Cuestionario
            activity.quiz_questions = undefined; // Limpiar campos de Quiz
            // Ya no necesitamos limpiar link_url aquí
        }
        // Si el tipo es otro, no se actualizan campos específicos y los existentes se limpian (por los undefined)


        // Guarda los cambios
        const updatedActivity = await activity.save();

        // Responde con éxito
        res.status(200).json({
            message: 'Actividad actualizada con éxito!',
            activity: updatedActivity
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar actividad', errors: messages });
        }
        console.error('Error updating activity:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar la actividad', error: error.message });
    }
};


// @desc    Eliminar una Actividad específica del Banco de Contenido
// @route   DELETE /api/content/activities/:activityId
// @access  Privado/Docente
const deleteActivity = async (req, res) => { // <-- Usando async/await y try/catch
    try {
        // 1. Obtener el ID de la actividad desde los parámetros de la URL
        const activityId = req.params.activityId;
        // 2. Obtener el ID del docente autenticado
        const docenteId = req.user._id;

        // Opcional: Validar si el ID es un ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
             return res.status(400).json({ message: 'ID de actividad inválido' });
        }

        // 3. Buscar la actividad por ID y VERIFICAR PROPIEDAD ANTES DE ELIMINAR
        const activity = await Activity.findOne({ _id: activityId, docente_id: docenteId }); // <-- Usamos el modelo Activity

        // 4. Verificar si la actividad fue encontrada y pertenece al docente
        if (!activity) {
            return res.status(404).json({ message: 'Actividad no encontrada o no te pertenece' });
        }

        // 5. Si la actividad existe y pertenece al docente, proceder a eliminarla
        // Usamos deleteOne con los mismos criterios (ID y docenteId)
        const deleteResult = await Activity.deleteOne({ _id: activityId, docente_id: docenteId }); // <-- Usamos el modelo Activity

        // Opcional: Verificar si la eliminación fue exitosa
        if (deleteResult.deletedCount === 0) {
             return res.status(500).json({ message: 'Error al eliminar la actividad (puede que ya haya sido eliminada)' });
        }

        // 6. Responder con un mensaje de éxito
        res.status(200).json({ message: 'Actividad eliminada con éxito.' });

    } catch (error) {
        // Manejo de errores
        console.error('Error deleting activity:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la actividad', error: error.message });
    }
};



// ... exportación de todas las funciones del controlador ...

module.exports = {
  // Asegúrate de exportar todas tus funciones existentes, incluyendo las de creación y listado.
  createResource,
  createActivity,
  getDocenteContentBank,
  getResourceById,
  getActivityById,
  updateResource, 
  deleteResource, 
  updateActivity, 
  deleteActivity 
};