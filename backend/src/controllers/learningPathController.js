// src/controllers/learningPathController.js

const LearningPath = require('../models/LearningPathModel');
const Module = require('../models/ModuleModel');
const Theme = require('../models/ThemeModel');
const Group = require('../models/GroupModel');
const ContentAssignment = require('../models/ContentAssignmentModel');
const Resource = require('../models/ResourceModel');
const Activity = require('../models/ActivityModel');
const Membership = require('../models/MembershipModel');
const Progress = require('../models/ProgressModel');
const User = require('../models/UserModel');
const Submission = require('../models/SubmissionModel');

// @desc    Obtener Rutas de Aprendizaje creadas por el docente autenticado
// @route   GET /api/learning-paths/my-creations
// Acceso:  Privado/Docente
const getMyCreatedLearningPaths = async (req, res, next) => {
    try {
        // El ID del docente se obtiene del objeto user que el middleware 'protect' añade a la request
        const docenteId = req.user._id;

        // 1. Encontrar todos los Grupos que pertenecen a este docente
        const ownedGroups = await Group.find({ docente_id: docenteId });

        // 2. Obtener los IDs de estos grupos
        const groupIds = ownedGroups.map(group => group._id);

        // Si el docente no tiene grupos, no tendrá rutas de aprendizaje creadas a través de grupos
        if (groupIds.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [] // Devuelve un array vacío si no hay rutas
            });
        }

        // 3. Encontrar todas las Rutas de Aprendizaje cuyo group_id está en la lista de groupIds
        // Usamos $in para buscar documentos donde el campo group_id sea uno de los valores en el array groupIds
        const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } });

        // 4. Enviar la respuesta con las rutas encontradas
        res.status(200).json({
            success: true,
            count: learningPaths.length,
            data: learningPaths
        });

    } catch (error) {
        console.error('Error fetching teacher\'s created learning paths:', error);
        // Pasa el error al middleware de manejo de errores
        next(error);
    }
};

// @desc    Crear una nueva Ruta de Aprendizaje
// @route   POST /api/learning-paths
// @access  Privado/Docente
const createLearningPath = async (req, res, next) => { // Añadir 'next' para pasar errores a middleware centralizado
    // Extrae group_id (nombre correcto) del cuerpo de la petición
    const { nombre, descripcion, group_id, fecha_inicio, fecha_fin } = req.body;
    const docenteId = req.user._id; // ID del docente autenticado

    // Validación básica (usando group_id)
    if (!nombre || !group_id) {
        return res.status(400).json({ message: 'Nombre de la ruta y ID del grupo son obligatorios' });
    }

    try {
        // --- Verificación de Propiedad: Asegurar que el grupo pertenece a este docente ---
        // Un docente solo puede crear rutas en sus propios grupos
        // Busca el grupo por su ID Y verificando que su docente_id coincida con el docente logueado
        const group = await Group.findOne({ _id: group_id, docente_id: docenteId }); // Usamos group_id aquí
        if (!group) {
            // Si no encuentra el grupo con ese ID Y que pertenezca a este docente
            return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece. No puedes crear una ruta aquí.' });
        }
        // --- Fin Verificación de Propiedad ---

        const learningPath = await LearningPath.create({
            nombre,
            descripcion,
            group_id: group_id, // Asocia la ruta al grupo usando el campo group_id
            fecha_inicio,
            fecha_fin,
            // 'activo' por defecto es true según el modelo
        });

        // Populate el campo group_id con la información del grupo si es necesario para la respuesta
        // const createdLearningPath = await LearningPath.findById(learningPath._id).populate('group_id');
        // res.status(201).json(createdLearningPath); // Responde con la ruta creada (populada)

        // O simplemente responde con el objeto tal cual se creó si la populación no es necesaria aquí
        res.status(201).json(learningPath); // Responde con la ruta creada

    } catch (error) {
        console.error('Error creando ruta de aprendizaje:', error);
        // Considera usar un middleware de manejo de errores centralizado
        // res.status(500).json({ message: 'Error interno del servidor al crear la ruta de aprendizaje', error: error.message });
        next(error); // Pasa el error al siguiente middleware (si tienes uno)
    }
};

// @desc    Crear un nuevo Módulo para una Ruta de Aprendizaje
// @route   POST /api/learning-paths/:learningPathId/modules
// @access  Privado/Docente
const createModule = async (req, res, next) => { // Añadir 'next'
    // Extrae nombre y descripcion del cuerpo de la petición
    const { nombre, descripcion } = req.body; // NO esperamos 'orden' aquí
    const { learningPathId } = req.params; // Obtiene el ID de la ruta de los parámetros de la URL
    const docenteId = req.user._id; // ID del docente autenticado

    // Validación básica (solo nombre es obligatorio desde el frontend ahora)
    if (!nombre) {
        return res.status(400).json({ message: 'El nombre del módulo es obligatorio' });
    }

    try {
        // --- Verificación de Propiedad: Asegurar que la ruta de aprendizaje pertenece a este docente ---
        // Un docente solo puede añadir módulos a rutas que le pertenecen (a través de sus grupos)
        // Primero, encontrar la ruta de aprendizaje
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');

        if (!learningPath) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada.' });
        }

        // Verificar si el docente autenticado es el dueño del grupo al que pertenece la ruta
        if (learningPath.group_id.docente_id.toString() !== docenteId.toString()) {
             return res.status(403).json({ message: 'No tienes permiso para añadir módulos a esta ruta de aprendizaje.' });
        }
        // --- Fin Verificación de Propiedad ---


        // --- Calcular el próximo número de orden ---
        // Encontrar todos los módulos existentes en esta ruta de aprendizaje
        const existingModules = await Module.find({ learning_path_id: learningPathId }).sort('orden');

        // El próximo orden será el orden del último módulo existente + 1, o 1 si no hay módulos
        const nextOrder = existingModules.length > 0 ? existingModules[existingModules.length - 1].orden + 1 : 1;
        // --- Fin Cálculo de Orden ---


        // Crear el nuevo Módulo con el orden calculado
        const newModule = await Module.create({
            nombre,
            descripcion,
            learning_path_id: learningPathId, // Asocia el módulo a la ruta
            orden: nextOrder, // <-- Asigna el orden calculado
        });

        // Opcional: Puedes querer devolver el módulo creado completo
        res.status(201).json(newModule);

    } catch (error) {
        console.error('Error creando módulo:', error);
        // Considera usar un middleware de manejo de errores centralizado
        // res.status(500).json({ message: 'Error interno del servidor al crear el módulo', error: error.message });
        next(error); // Pasa el error al siguiente middleware
    }
};

// @desc    Crear un nuevo Tema para un Módulo
// @route   POST /api/learning-paths/modules/:moduleId/themes
// @access  Privado/Docente
const createTheme = async (req, res, next) => { // Añadir 'next'
    // Extrae nombre y descripcion del cuerpo de la petición
    const { nombre, descripcion } = req.body; // NO esperamos 'orden' aquí
    const { moduleId } = req.params; // Obtiene el ID del módulo de los parámetros de la URL
    const docenteId = req.user._id; // ID del docente autenticado

    // Validación básica (solo nombre es obligatorio desde el frontend ahora)
    if (!nombre) {
        return res.status(400).json({ message: 'El nombre del tema es obligatorio' });
    }

    try {
        // --- Verificación de Propiedad: Asegurar que el módulo pertenece a un docente válido ---
        // Un docente solo puede añadir temas a módulos que le pertenecen (a través de la ruta/grupo)
        // Primero, encontrar el módulo y popular su ruta de aprendizaje y grupo para la verificación
        const module = await Module.findById(moduleId).populate({
            path: 'learning_path_id',
            populate: {
                path: 'group_id'
            }
        });

        if (!module) {
            return res.status(404).json({ message: 'Módulo no encontrado.' });
        }

        // Verificar si el docente autenticado es el dueño del grupo al que pertenece la ruta del módulo
        if (module.learning_path_id.group_id.docente_id.toString() !== docenteId.toString()) {
             return res.status(403).json({ message: 'No tienes permiso para añadir temas a este módulo.' });
        }
        // --- Fin Verificación de Propiedad ---


        // --- Calcular el próximo número de orden para el tema dentro de este módulo ---
        // Encontrar todos los temas existentes en este módulo
        const existingThemes = await Theme.find({ module_id: moduleId }).sort('orden');

        // El próximo orden será el orden del último tema existente + 1, o 1 si no hay temas
        const nextOrder = existingThemes.length > 0 ? existingThemes[existingThemes.length - 1].orden + 1 : 1;
        // --- Fin Cálculo de Orden ---


        // Crear el nuevo Tema con el orden calculado
        const newTheme = await Theme.create({
            nombre,
            descripcion,
            module_id: moduleId, // Asocia el tema al módulo
            orden: nextOrder, // <-- Asigna el orden calculado
        });

        // Opcional: Puedes querer devolver el tema creado completo
        res.status(201).json(newTheme);

    } catch (error) {
        console.error('Error creando tema:', error);
        // Considera usar un middleware de manejo de errores centralizado
        // res.status(500).json({ message: 'Error interno del servidor al crear el tema', error: error.message });
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Asignar Contenido (Recurso o Actividad) a un Tema
// @route   POST /api/learning-paths/themes/:themeId/assign-content
// @access  Privado/Docente, Admin
const assignContentToTheme = async (req, res, next) => {
    const { themeId } = req.params;
    // Obtener los campos de la asignación del cuerpo de la petición
    // Mantener solo los campos relevantes del body
    const { type, resource_id, activity_id, fecha_inicio, fecha_fin, puntos_maximos, intentos_permitidos, tiempo_limite } = req.body;

    // *** Validación de entrada inicial (mantenemos la tuya) ***
    if (!type || (!resource_id && !activity_id)) {
        return res.status(400).json({ message: 'Debe especificar el tipo de contenido y proporcionar un resource_id o activity_id.' });
    }
    if (type !== 'Resource' && type !== 'Activity') {
         return res.status(400).json({ message: 'Tipo de asignación inválido. Debe ser "Resource" o "Activity".' });
    }
    if (type === 'Resource' && !resource_id) { // Asegurarse de que si es Resource, resource_id exista
         return res.status(400).json({ message: 'Debe proporcionar un resource_id válido para el tipo Resource.' });
    } else if (type === 'Activity' && !activity_id) { // Asegurarse de que si es Activity, activity_id exista
         return res.status(400).json({ message: 'Debe proporcionar un activity_id válido para el tipo Activity.' });
    }


    // Asegurarse de que solo se proporciona un ID (ya lo tenías, ajustado ligeramente)
    if (resource_id && activity_id) {
         return res.status(400).json({ message: 'Solo se puede asignar un Resource o una Activity a la vez.' });
    }


    try {
        // --- Buscar y Verificar Existencia y Propiedad del Tema (tu lógica existente) ---
        // Necesitamos popular el tema -> módulo -> ruta -> grupo para verificar el docente_id
        const theme = await Theme.findById(themeId).populate({ // Pobla el módulo
            path: 'module_id',
            populate: { // Pobla la ruta
                path: 'learning_path_id',
                populate: { // Pobla el grupo
                    path: 'group_id',
                    select: 'docente_id' // Solo necesitamos el ID del docente del grupo
                }
            }
        });

        if (!theme) {
            return res.status(404).json({ message: 'Tema no encontrado.' });
        }

         // Comprueba si la jerarquía completa existe y si el grupo pertenece al docente (tu lógica existente)
        // CORREGIDO: theme -> module_id -> learning_path_id -> group_id
        if (!theme.module_id || !theme.module_id.learning_path_id || !theme.module_id.learning_path_id.group_id || !theme.module_id.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return res.status(403).json({ message: 'No tienes permiso para añadir contenido a este tema. No te pertenece.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Tema y Propiedad ---


        // --- Verificar la existencia del Recurso o Actividad (tu lógica existente) ---
        let contentItem = null;
        let contentItemType = null; // Guardar el subtipo de recurso/actividad (ej. 'Quiz', 'Contenido')
        if (type === 'Resource' && resource_id) {
            contentItem = await Resource.findById(resource_id);
            if (!contentItem) return res.status(404).json({ message: 'Recurso no encontrado.' });
             // Opcional: Verificar si el recurso pertenece a este docente si tu modelo Resource tiene docente_id
            // if (!contentItem.docente_id.equals(req.user._id)) { return res.status(403).json({ message: 'El recurso no te pertenece.' }); }
             contentItemType = contentItem.type; // Guardar el tipo de Recurso (Contenido, Enlace, Video-Enlace)

        } else if (type === 'Activity' && activity_id) {
            contentItem = await Activity.findById(activity_id);
            if (!contentItem) return res.status(404).json({ message: 'Actividad no encontrada.' });
            // Opcional: Verificar si la actividad pertenece a este docente si tu modelo Activity tiene docente_id
            // if (!contentItem.docente_id.equals(req.user._id)) { return res.status(403).json({ message: 'La actividad no te pertenece.' }); }
            contentItemType = contentItem.type; // Guardar el tipo de Actividad (Quiz, Cuestionario, Trabajo)

        }
         // Si contentItem es null, significa que no se encontró el recurso/actividad, ya manejado con 404.


        // *** LÓGICA PARA CALCULAR EL SIGUIENTE ORDEN AUTOMÁTICAMENTE (mantenemos tu lógica) ***
        const lastAssignmentInTheme = await ContentAssignment.findOne({ theme_id: themeId })
            .sort({ orden: -1 }) // Ordenar por orden descendente para obtener el más alto
            .select('orden'); // Seleccionar solo el campo 'orden'

        const nextOrder = lastAssignmentInTheme ? lastAssignmentInTheme.orden + 1 : 1; // Si no hay asignaciones en el tema, el primero es 1
        // ******************************************************************************


        // --- Preparar los campos de la asignación ---
        const assignmentFields = {
            theme_id: themeId,
            type: type,
            resource_id: resource_id,
            activity_id: activity_id,
             orden: nextOrder, // *** ASIGNAR EL ORDEN CALCULADO AQUÍ ***
            // El estado (status) se establecerá a 'Draft' por defecto en el modelo
        };

        // --- Añadir group_id y docente_id a assignmentFields (tu lógica existente) ---
         // Estos deberían estar presentes si la verificación de propiedad pasó
         if (theme?.module_id?.learning_path_id?.group_id) {
              assignmentFields.group_id = theme.module_id.learning_path_id.group_id._id;
              assignmentFields.docente_id = theme.module_id.learning_path_id.group_id.docente_id;
         } else {
              console.error('Error lógico: La verificación de propiedad pasó pero no se pudo obtener group_id/docente_id del tema.');
              return res.status(500).json({ message: 'Error interno al procesar la asignación.' }); // Error interno si no se puede asociar a grupo/docente
         }


        // --- Asignación de Fechas y Hora (Ahora son opcionales/informativas) ---
        // Eliminamos validaciones de fecha contra la hora actual y contra la fecha de LP
        if (fecha_inicio !== undefined && fecha_inicio !== null && fecha_inicio !== '') {
            const date = new Date(fecha_inicio);
            if (!isNaN(date.getTime())) {
                // *** Eliminada validación: fecha_inicio no puede ser anterior a la actual ***
                // if (date < new Date()) { ... }
                assignmentFields.fecha_inicio = date;
            } else {
                 console.warn(`Fecha de inicio inválida proporcionada para asignación ${contentItem?._id || 'N/A'}. Ignorando.`); // Log warning en lugar de error 400
            }
        }

         if (fecha_fin !== undefined && fecha_fin !== null && fecha_fin !== '') {
            const date = new Date(fecha_fin);
            if (!isNaN(date.getTime())) {
                assignmentFields.fecha_fin = date;
            } else {
                console.warn(`Fecha de fin inválida proporcionada para asignación ${contentItem?._id || 'N/A'}. Ignorando.`); // Log warning
            }
        }

        // Mantenemos la validación de que fecha_fin no sea anterior a fecha_inicio por integridad de datos
        if (assignmentFields.fecha_inicio && assignmentFields.fecha_fin && assignmentFields.fecha_fin <= assignmentFields.fecha_inicio) {
            // Esto es un error de datos si las fechas son proporcionadas y son inválidas entre sí
            // Dependiendo de si las fechas son opcionales/informativas, podrías cambiar esto a un warning o eliminarlo.
            // Si quieres que el docente pueda poner fechas pasadas como referencia, podrías eliminar esta validación también.
            // Por ahora, la mantenemos para evitar inconsistencia de datos si las fechas se usan para algo más.
            return res.status(400).json({ message: 'La fecha de fin proporcionada no puede ser anterior o igual a la fecha de inicio proporcionada.' });
        }
        // *** Eliminada validación de fechas contra rango de Ruta de Aprendizaje ***
        // if (assignmentFields.fecha_inicio && lpStartDate && assignmentFields.fecha_inicio < lpStartDate) { ... }


        // Validar campos condicionales (puntos, intentos, tiempo) basados en el contentItemType (mantenemos lógica y validaciones)
        const isActivityAssignment = type === 'Activity';
        const isQuizOrCuestionarioAssignment = isActivityAssignment && (contentItemType === 'Quiz' || contentItemType === 'Cuestionario');
        const isActivityAssignmentWithPoints = isActivityAssignment && (contentItemType === 'Quiz' || contentItemType === 'Cuestionario' || contentItemType === 'Trabajo');

        // Validación de puntos_maximos (mantener)
        if (isActivityAssignmentWithPoints) {
             if (puntos_maximos !== undefined && puntos_maximos !== null && puntos_maximos !== '') {
                 const numPuntos = parseFloat(puntos_maximos);
                 if (isNaN(numPuntos) || numPuntos < 0) {
                     return res.status(400).json({ message: `Valor inválido para puntos_maximos. Debe ser un número no negativo.` });
                 }
                 assignmentFields.puntos_maximos = numPuntos;
             } // No se valida si es obligatorio aquí; si es obligatorio, Mongoose schema o un middleware de validación lo manejaría
        } else if (puntos_maximos !== undefined && puntos_maximos !== null && puntos_maximos !== '') {
             // Opcional: Podrías retornar un error 400 si se proporcionan puntos para un Recurso, o simplemente ignorarlos (como ahora)
        }


         // Validación de intentos_permitidos (mantener)
         if (isQuizOrCuestionarioAssignment) {
             if (intentos_permitidos !== undefined && intentos_permitidos !== null && intentos_permitidos !== '') {
                 const numIntentos = parseInt(intentos_permitidos, 10);
                 if (isNaN(numIntentos) || numIntentos < 0 || !Number.isInteger(numIntentos)) {
                     return res.status(400).json({ message: `Valor inválido para intentos_permitidos. Debe ser un número entero no negativo.` });
                 }
                  assignmentFields.intentos_permitidos = numIntentos;
             } // No se valida si es obligatorio aquí
         } else if (intentos_permitidos !== undefined && intentos_permitidos !== null && intentos_permitidos !== '') {
             // Opcional: Podrías retornar un error 400 si se proporcionan intentos para un tipo que no lo permite
         }


         // Validación de tiempo_limite (mantener validación positivo si aplica)
        if (isQuizOrCuestionarioAssignment) {
            if (tiempo_limite !== undefined && tiempo_limite !== null && tiempo_limite !== '') {
                 const numTiempo = parseInt(tiempo_limite, 10);
                 // Validar que sea un entero positivo
                 if (isNaN(numTiempo) || numTiempo <= 0 || !Number.isInteger(numTiempo)) {
                     return res.status(400).json({ message: `Valor inválido para tiempo_limite. Debe ser un número entero positivo en minutos para ${contentItemType}.` }); // Mensaje más específico
                 }
                  assignmentFields.tiempo_limite = numTiempo;
             } else {
                // Si es Quiz/Cuestionario, ¿es tiempoLimite obligatorio? Si sí, podrías añadir un error aquí
                // if (isQuizOrCuestionarioAssignment) { return res.status(400).json({ message: `Tiempo límite es obligatorio para asignaciones de ${contentItemType}.` }); }
             }
         } else if (tiempo_limite !== undefined && tiempo_limite !== null && tiempo_limite !== '') {
             // Opcional: Podrías retornar un error 400 si se proporciona tiempo_limite para un tipo que no lo permite
         }


        // --- Crear la nueva Asignación de Contenido ---
        // El estado (status) se establecerá a 'Draft' por defecto en el modelo Mongoose,
        // así que no necesitamos añadirlo explícitamente a assignmentFields aquí a menos que queramos otro default.
        const newAssignment = new ContentAssignment(assignmentFields); // assignmentFields ya incluye el orden calculado

        // Guardar la asignación
        await newAssignment.save();

        // Loggear el estado y orden asignados
        console.log(`Asignación creada: ${newAssignment._id} (Tipo Asignación: ${newAssignment.type}, Tipo Contenido: ${contentItemType || 'N/A'}, Orden: ${newAssignment.orden}, Estado: ${newAssignment.status})`);


        // --- Respuesta exitosa ---
        // Populamos los IDs de recurso/actividad y el estado
        const populatedAssignment = await ContentAssignment.findById(newAssignment._id)
             .populate('resource_id', 'title type')
             .populate('activity_id', 'title type');


        res.status(201).json(populatedAssignment); // 201 Creado


    } catch (error) {
        // --- Manejo de errores ---
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al crear la asignación.', errors: messages });
        }
        if (error.name === 'CastError') {
             return res.status(400).json({ message: 'ID(s) inválido(s) para el contenido o tema.' });
        }
        console.error('Error al crear asignación de contenido:', error);
        next(error); // Pasa el error al siguiente middleware de manejo de errores global
    }
};



// @desc    Obtener Rutas de Aprendizaje para un grupo (Vista Docente)
// @route   GET /api/learning-paths/groups/:groupId/docente
// Acceso: Privado/Docente (dueño del grupo)
const getGroupLearningPathsForDocente = async (req, res) => {
    const { groupId } = req.params; // ID del grupo de la URL
    const docenteId = req.user._id; // ID del docente autenticado

    try {
        // --- Verificación de Propiedad: Asegurar que el grupo pertenece a este docente ---
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId });
        if (!group) {
            return res.status(404).json({ message: 'Grupo no encontrado o no te pertenece' });
        }
        // --- Fin Verificación de Propiedad ---

        // Buscar todas las rutas de aprendizaje asociadas a este grupo
        const learningPaths = await LearningPath.find({ group_id: groupId });

        res.status(200).json(learningPaths); // Responde con la lista de rutas

    } catch (error) {
        console.error('Error al obtener rutas de aprendizaje del grupo (Docente):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener rutas de aprendizaje del grupo', error: error.message });
    }
};


// @desc    Obtener Rutas de Aprendizaje para un grupo (Vista Estudiante)
// @route   GET /api/learning-paths/groups/:groupId/student
// Acceso: Privado/Estudiante (miembro aprobado del grupo)
const getGroupLearningPathsForStudent = async (req, res) => {
    const { groupId } = req.params; // ID del grupo de la URL
    const userId = req.user._id; // ID del usuario (estudiante) autenticado
    const userType = req.user.tipo_usuario;

    // --- Validación: Solo estudiantes pueden usar esta ruta (aunque protect ya lo hace, es una doble verificación) ---
    if (userType !== 'Estudiante') {
        return res.status(403).json({ message: 'Solo los estudiantes pueden ver rutas de aprendizaje de grupos a los que pertenecen' });
    }
    // --- Fin Validación ---

    try {
        // --- Verificación de Membresía Aprobada: Asegurar que el estudiante es miembro aprobado del grupo ---
        const approvedMembership = await Membership.findOne({
            usuario_id: userId,
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        });

        if (!approvedMembership) {
            // Si no encuentra una membresía aprobada para este estudiante en este grupo
            return res.status(404).json({ message: 'Grupo no encontrado o no eres miembro aprobado de este grupo' }); // Mensaje genérico por seguridad
        }
        // --- Fin Verificación de Membresía ---


        // Buscar todas las rutas de aprendizaje asociadas a este grupo
        const learningPaths = await LearningPath.find({ group_id: groupId });

        res.status(200).json(learningPaths); // Responde con la lista de rutas

    } catch (error) {
        console.error('Error al obtener rutas de aprendizaje del grupo (Estudiante):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener rutas de aprendizaje del grupo', error: error.message });
    }
};


// @desc    Obtener la estructura completa de una Ruta de Aprendizaje específica
// @route   GET /api/learning-paths/:pathId/structure
// Acceso: Privado/Docente (dueño del grupo) O Estudiante (miembro aprobado del grupo)
const getLearningPathStructure = async (req, res) => {
    const { pathId } = req.params; // ID de la ruta de aprendizaje de la URL
    const userId = req.user._id; // ID del usuario autenticado
    const userType = req.user.tipo_usuario;

    try {
        // --- Verificación de Permiso: Asegurar que el usuario tiene permiso para ver esta ruta ---
        // Primero, buscar la ruta y poblar el grupo asociado
        const learningPath = await LearningPath.findById(pathId).populate('group_id');

        if (!learningPath) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada' });
        }

        let canView = false;
        // Si es Docente, verificar si es dueño del grupo de la ruta
        if (userType === 'Docente') {
            if (learningPath.group_id && learningPath.group_id.docente_id.equals(userId)) {
                canView = true;
            }
        // Si es Estudiante, verificar si es miembro aprobado del grupo de la ruta
        } else if (userType === 'Estudiante') {
            if (learningPath.group_id) {
                 const approvedMembership = await Membership.findOne({
                     usuario_id: userId,
                     grupo_id: learningPath.group_id._id,
                     estado_solicitud: 'Aprobado'
                 });
                 if (approvedMembership) {
                     canView = true;
                 }
            }
        }

        // Si el usuario no es ni el docente dueño ni un estudiante miembro aprobado
        if (!canView) {
            return res.status(403).json({ message: 'No tienes permiso para ver esta ruta de aprendizaje' }); // 403 Forbidden
        }
        // --- Fin Verificación de Permiso ---

        // Si el usuario tiene permiso, obtener la estructura completa de la ruta
        // Obtenemos Módulos -> Temas -> Asignaciones de Contenido -> Contenido (Recursos/Actividades)
        const modules = await Module.find({ learning_path_id: pathId }).sort('orden');

        // Creamos el objeto de respuesta estructurado jerárquicamente
        const pathStructure = {
            ...learningPath.toObject(), // Copia los datos de la ruta
            modules: [] // Array para los módulos
        };

        // Iterar sobre cada módulo para obtener sus temas y asignaciones
        for (const module of modules) {
            const themes = await Theme.find({ module_id: module._id }).sort('orden');
            const moduleObject = {
                ...module.toObject(), // Copia los datos del módulo
                themes: [] // Array para los temas
            };

            // Iterar sobre cada tema para obtener sus asignaciones de contenido
            for (const theme of themes) {
                // Buscar asignaciones para este tema y poblar los detalles del contenido (Recurso o Actividad)
                const assignments = await ContentAssignment.find({ theme_id: theme._id }).sort('orden')
                    .populate('resource_id') // Pobla los detalles si es un recurso
                    .populate('activity_id'); // Pobla los detalles si es una actividad (solo se poblará uno)

                 const themeObject = {
                     ...theme.toObject(), // Copia los datos del tema
                     assignments: assignments // Añade el array de asignaciones (con contenido poblado)
                 };
                 moduleObject.themes.push(themeObject); // Añade el tema (con asignaciones) al módulo
            }
            pathStructure.modules.push(moduleObject); // Añade el módulo (con temas) a la ruta
        }

        res.status(200).json(pathStructure); // Responde con la estructura completa

    } catch (error) {
        console.error('Error al obtener la estructura de la ruta de aprendizaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la estructura de la ruta de aprendizaje', error: error.message });
    }
};

// @desc    Obtener todas las Rutas de Aprendizaje asignadas al usuario autenticado
// @route   GET /api/learning-paths/my-assigned
// Acceso:  Privado (manejado por el middleware 'protect')
const getMyAssignedLearningPaths = async (req, res) => {
    try {
        const userId = req.user._id;

        const approvedMemberships = await Membership.find({
            usuario_id: userId,
            estado_solicitud: 'Aprobado'
        }).select('grupo_id');

        if (approvedMemberships.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const approvedGroupIds = approvedMemberships.map(membership => membership.grupo_id);

        const assignedLearningPaths = await LearningPath.find({
            group_id: { $in: approvedGroupIds }
        }).populate('group_id', 'nombre');

        res.status(200).json({
            success: true,
            count: assignedLearningPaths.length,
            data: assignedLearningPaths
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error al obtener las rutas de aprendizaje asignadas.'
        });
    }
};


// @desc    Actualizar detalles de una Ruta de Aprendizaje
// @route   PUT /api/learning-paths/:learningPathId
// @access  Privado/Docente
const updateLearningPath = async (req, res) => {
    const { learningPathId } = req.params; // ID de la Ruta de Aprendizaje de la URL
    // Campos permitidos para actualizar (título, descripción)
    const { title, description } = req.body;
    const docenteId = req.user._id; // ID del docente autenticado

     // Validación básica del ID de la Ruta
     if (!mongoose.Types.ObjectId.isValid(learningPathId)) {
         return res.status(400).json({ message: 'ID de ruta de aprendizaje inválido' });
    }

    // Validación de los campos a actualizar si se proporcionaron
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
         return res.status(400).json({ message: 'El título debe ser un texto no vacío si se proporciona' });
    }
     if (description !== undefined && typeof description !== 'string') {
         return res.status(400).json({ message: 'La descripción debe ser texto si se proporciona' });
     }
     // Si no se proporcionó ni título ni descripción
     if (title === undefined && description === undefined) {
          return res.status(400).json({ message: 'Se debe proporcionar título o descripción para actualizar la ruta' });
     }


    try {
        // Buscar la ruta de aprendizaje por ID y verificar que pertenece al docente autenticado VÍA su grupo
        // Poblamos el grupo para obtener el ID del docente dueño
        const learningPath = await LearningPath.findById(learningPathId).populate('group_id');

        // Si la ruta no existe, o si tiene grupo pero ese grupo no pertenece al docente autenticado
        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId)) {
             // Se usa 404 para no revelar si la ruta existe pero pertenece a otro docente/grupo
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada o no te pertenece' });
        }

        // Actualizar los campos permitidos solo si se proporcionaron en el cuerpo
        if (title !== undefined) {
            learningPath.title = title.trim(); // Limpiar espacios
        }
         if (description !== undefined) {
             learningPath.description = description.trim(); // Limpiar espacios
         }

        // Guardar los cambios en la base de datos
        await learningPath.save();

        // Responder con la ruta actualizada
        res.status(200).json(learningPath);

    } catch (error) {
        // Manejo de errores de validación de Mongoose u otros errores
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar ruta de aprendizaje', errors: messages });
        }
        console.error('Error actualizando ruta de aprendizaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar la ruta de aprendizaje', error: error.message });
    }
};


// @desc    Eliminar una Ruta de Aprendizaje
// @route   DELETE /api/learning-paths/:learningPathId
// @access  Privado/Docente
const deleteLearningPath = async (req, res) => {
    const { learningPathId } = req.params; // ID de la Ruta de Aprendizaje de la URL
    const docenteId = req.user._id; // ID del docente autenticado

     // Validación básica del ID de la Ruta
     if (!mongoose.Types.ObjectId.isValid(learningPathId)) {
         return res.status(400).json({ message: 'ID de ruta de aprendizaje inválido' });
    }

    try {
        // Buscar la ruta de aprendizaje por ID y verificar que pertenece al docente autenticado VÍA su grupo
         const learningPath = await LearningPath.findById(learningPathId).populate('group_id');

        // Si la ruta no existe, o si tiene grupo pero ese grupo no pertenece al docente autenticado
        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId)) {
             // Se usa 404 para no revelar si existe pero pertenece a otro docente/grupo
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada o no te pertenece' });
        }

        // --- Verificación para EVITAR eliminar si hay datos relacionados ---
        // Implementamos verificaciones para prevenir la eliminación si la ruta tiene ítems dependientes:

        // 1. Verificar si la ruta tiene Módulos asociados
        const relatedModulesCount = await Module.countDocuments({ learning_path_id: learningPathId });
        if (relatedModulesCount > 0) {
             // Si se encuentran módulos, no se permite eliminar la ruta.
             // Se usa 409 Conflict.
             return res.status(409).json({ message: 'No se puede eliminar la ruta de aprendizaje porque tiene módulos asociados. Elimina primero todos los módulos.' });
        }

        // 2. Verificar si hay progreso de estudiantes asociado a esta ruta
        const relatedProgressCount = await Progress.countDocuments({ learning_path_id: learningPathId });
        if (relatedProgressCount > 0) {
             // Si se encuentra progreso de estudiantes, no se permite eliminar la ruta.
             // Se usa 409 Conflict.
             // Nota: Borrar el progreso de estudiantes es una tarea compleja que podría requerir permisos de Administrador o un proceso específico.
             return res.status(409).json({ message: 'No se puede eliminar la ruta de aprendizaje porque tiene progreso de estudiantes asociado. Considera archivarla o eliminar el progreso manualmente.' });
        }

        // NOTA: Si no hay módulos, tampoco habrá Temas ni Asignaciones asociadas a esta ruta (ya que dependen de los módulos y temas).
        // Verificar Módulos y Progreso es suficiente para esta primera capa de restricción.

        // --- Fin Verificación ---


        // Si no hay módulos ni progreso de estudiantes asociados, procedemos con la eliminación
        // Esto elimina el documento LearningPath itself
        await LearningPath.findByIdAndDelete(learningPathId);

        // NOTA: En un escenario con "eliminación en cascada", aquí también tendrías que borrar:
        // - Todos los Módulos donde learning_path_id = learningPathId
        // - Todos los Temas donde module_id esté entre los módulos borrados
        // - Todas las ContentAssignment donde theme_id esté entre los temas borrados
        // - Todos los Progress donde learning_path_id = learningPathId
        // Esto es complejo y no se implementa aquí. La restricción de eliminación previene la creación de datos huérfanos.


        // Respuesta de éxito
        res.status(200).json({ message: 'Ruta de aprendizaje eliminada exitosamente' });

    } catch (error) {
         console.error('Error eliminando ruta de aprendizaje:', error);
         res.status(500).json({ message: 'Error interno del servidor al eliminar la ruta de aprendizaje', error: error.message });
    }
};

// @desc    Actualizar un Módulo específico
// @route   PUT /api/modules/:moduleId
// @access  Privado/Docente
const updateModule = async (req, res, next) => { // Añadir 'next'
    const { moduleId } = req.params; // Obtiene el ID del módulo
    // Obtiene los datos actualizados del cuerpo de la petición
    // Permitimos actualizar nombre, descripción y orden
    const { nombre, descripcion, orden } = req.body;

    // *** Validación básica de entrada (puedes ampliarla) ***
    // Al menos uno de los campos debe estar presente para actualizar
    if (nombre === undefined && descripcion === undefined && orden === undefined) {
        return res.status(400).json({ message: 'Se deben proporcionar datos para actualizar el módulo (nombre, descripción u orden).' });
    }
    // Validación si se proporciona el orden
    if (orden !== undefined && (typeof orden !== 'number' || orden < 0)) {
        return res.status(400).json({ message: 'El orden debe ser un número válido no negativo.' });
    }
    // *** Fin Validación básica ***

    try {
        // --- Buscar y Verificar Propiedad del Módulo ---
        // Necesitamos popular el módulo -> ruta -> grupo para verificar el docente_id
        const moduleToUpdate = await Module.findById(moduleId).populate({ // Pobla la ruta
            path: 'learning_path_id',
            populate: { // Pobla el grupo
                path: 'group_id',
                select: 'docente_id' // Solo necesitamos el ID del docente del grupo
            }
        });

        if (!moduleToUpdate) {
            return res.status(404).json({ message: 'Módulo no encontrado.' });
        }

        // Comprueba si la jerarquía completa existe y si el grupo pertenece al docente
        if (!moduleToUpdate.learning_path_id || !moduleToUpdate.learning_path_id.group_id || !moduleToUpdate.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return res.status(403).json({ message: 'No tienes permiso para actualizar este módulo. No te pertenece.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad ---


        // --- Actualizar los campos del Módulo ---
        if (nombre !== undefined) moduleToUpdate.nombre = nombre;
        if (descripcion !== undefined) moduleToUpdate.descripcion = descripcion;
        // Si se proporciona orden, lo actualizamos.
        // NOTA: Gestionar la unicidad del orden o reordenar automáticamente otros módulos es lógica adicional
        // que puede ser compleja dependiendo de tus requisitos. Por ahora, solo actualizamos el campo.
        if (orden !== undefined) moduleToUpdate.orden = orden;


        // Guardar los cambios
        const updatedModule = await moduleToUpdate.save();

        // --- Respuesta exitosa ---
        // Opcional: Podrías popular learning_path_id, group_id si necesitas esos datos en la respuesta
        // const populatedUpdatedModule = await Module.findById(updatedModule._id).populate('learning_path_id'); // Ejemplo de población

        res.status(200).json(updatedModule); // Responde con el módulo actualizado

    } catch (error) {
        // Si el error es de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar el módulo', errors: messages });
        }
        console.error('Error al actualizar módulo:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Eliminar un Módulo (y sus Temas y Asignaciones en cascada)
// @route   DELETE /api/modules/:moduleId
// @access  Privado/Docente
const deleteModule = async (req, res, next) => { // Añadir 'next'
    const { moduleId } = req.params; // Obtiene el ID del módulo

    try {
        // --- Verificación de Propiedad del Módulo ---
        // Necesitamos popular el módulo -> ruta -> grupo para verificar el docente_id
        const module = await Module.findById(moduleId).populate({ // Pobla la ruta
            path: 'learning_path_id',
            populate: { // Pobla el grupo
                path: 'group_id',
                select: 'docente_id' // Solo necesitamos el ID del docente del grupo
            }
        });

        if (!module) {
            return res.status(404).json({ message: 'Módulo no encontrado.' });
        }

        // Comprueba si la jerarquía completa del módulo (ruta, grupo) existe y si el grupo pertenece al docente
        if (!module.learning_path_id || !module.learning_path_id.group_id || !module.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return res.status(403).json({ message: 'No tienes permiso para eliminar este módulo. No te pertenece.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad del Módulo ---


        // --- Eliminación en Cascada ---
        // 1. Encontrar y eliminar todas las Asignaciones de Contenido dentro de los Temas de este Módulo
        // Primero, encontrar todos los IDs de los temas dentro de este módulo
        const themeIds = await Theme.find({ module_id: moduleId }, '_id'); // Busca solo los IDs de los temas

        if (themeIds.length > 0) {
            const idsToDelete = themeIds.map(theme => theme._id);
            // Eliminar todas las asignaciones que referencian cualquiera de estos IDs de tema
            await ContentAssignment.deleteMany({ theme_id: { $in: idsToDelete } });
            console.log(`Eliminadas asignaciones de contenido para los temas del módulo ${moduleId}.`);
        }

        // 2. Eliminar todos los Temas asociados a este Módulo
        await Theme.deleteMany({ module_id: moduleId });
        console.log(`Eliminados temas del módulo ${moduleId}.`);

        // 3. Eliminar el Módulo en sí
        await Module.deleteOne({ _id: moduleId }); // O findByIdAndDelete(moduleId)
        console.log(`Módulo ${moduleId} eliminado.`);
        // --- Fin Eliminación en Cascada ---


        // --- Respuesta exitosa ---
        res.status(200).json({ message: 'Módulo y su contenido asociado eliminados con éxito.' });

    } catch (error) {
        console.error('Error eliminando módulo:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Actualizar un Tema específico
// @route   PUT /api/themes/:themeId
// @access  Privado/Docente
const updateTheme = async (req, res, next) => { // Añadir 'next'
    const { themeId } = req.params; // Obtiene el ID del tema
    // Obtiene los datos actualizados del cuerpo de la petición
    const { nombre, descripcion, orden } = req.body;

    // *** Validación básica de entrada (puedes ampliarla) ***
    // Al menos uno de los campos debe estar presente para actualizar
    if (nombre === undefined && descripcion === undefined && orden === undefined) {
        return res.status(400).json({ message: 'Se deben proporcionar datos para actualizar el tema (nombre, descripción u orden).' });
    }
    // Validación si se proporciona el orden
    if (orden !== undefined && (typeof orden !== 'number' || orden < 0)) {
        return res.status(400).json({ message: 'El orden debe ser un número válido no negativo.' });
    }
    // *** Fin Validación básica ***

    try {
        // --- Buscar y Verificar Propiedad del Tema ---
        // Necesitamos popular el tema -> módulo -> ruta -> grupo para verificar el docente_id
        const themeToUpdate = await Theme.findById(themeId).populate({ // Pobla el módulo
            path: 'module_id',
            populate: { // Pobla la ruta
                path: 'learning_path_id',
                populate: { // Pobla el grupo
                    path: 'group_id',
                    select: 'docente_id' // Solo necesitamos el ID del docente del grupo
                }
            }
        });

        if (!themeToUpdate) {
            return res.status(404).json({ message: 'Tema no encontrado.' });
        }

        // Comprueba si la jerarquía completa existe y si el grupo pertenece al docente
        if (!themeToUpdate.module_id || !themeToUpdate.module_id.learning_path_id || !themeToUpdate.module_id.learning_path_id.group_id || !themeToUpdate.module_id.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return res.status(403).json({ message: 'No tienes permiso para actualizar este tema. No te pertenece.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad ---


        // --- Actualizar los campos del Tema ---
        if (nombre !== undefined) themeToUpdate.nombre = nombre;
        if (descripcion !== undefined) themeToUpdate.descripcion = descripcion;
        if (orden !== undefined) themeToUpdate.orden = orden; // NOTA: Gestionar la unicidad del orden es lógica adicional


        // Guardar los cambios
        const updatedTheme = await themeToUpdate.save();

        // --- Respuesta exitosa ---
        res.status(200).json(updatedTheme); // Responde con el tema actualizado

    } catch (error) {
        // Si el error es de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar el tema', errors: messages });
        }
        console.error('Error al actualizar tema:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Eliminar un Tema (y sus Asignaciones en cascada)
// @route   DELETE /api/themes/:themeId
// @access  Privado/Docente
const deleteTheme = async (req, res, next) => { // Añadir 'next'
    const { themeId } = req.params; // Obtiene el ID del tema

    try {
        // --- Verificación de Propiedad del Tema ---
        // Necesitamos popular el tema -> módulo -> ruta -> grupo para verificar el docente_id
        const theme = await Theme.findById(themeId).populate({ // Pobla el módulo
            path: 'module_id',
            populate: { // Pobla la ruta
                path: 'learning_path_id',
                populate: { // Pobla el grupo
                    path: 'group_id',
                    select: 'docente_id' // Solo necesitamos el ID del docente del grupo
                }
            }
        });

        if (!theme) {
            return res.status(404).json({ message: 'Tema no encontrado.' });
        }

        // Comprueba si la jerarquía completa del tema (módulo, ruta, grupo) existe y si el grupo pertenece al docente
        if (!theme.module_id || !theme.module_id.learning_path_id || !theme.module_id.learning_path_id.group_id || !theme.module_id.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return res.status(403).json({ message: 'No tienes permiso para eliminar este tema. No te pertenece.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad del Tema ---


        // --- Eliminación en Cascada ---
        // 1. Eliminar todas las Asignaciones de Contenido asociadas a este Tema
        await ContentAssignment.deleteMany({ theme_id: themeId });
        console.log(`Eliminadas asignaciones de contenido para el tema ${themeId}.`);

        // 2. Eliminar el Tema en sí
        await Theme.deleteOne({ _id: themeId }); // O findByIdAndDelete(themeId)
        console.log(`Tema ${themeId} eliminado.`);
        // --- Fin Eliminación en Cascada ---


        // --- Respuesta exitosa ---
        res.status(200).json({ message: 'Tema y su contenido asociado eliminados con éxito.' });

    } catch (error) {
        console.error('Error eliminando tema:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Actualizar una Asignación de Contenido específica
// @route   PUT /api/content-assignments/:assignmentId
// @access  Privado/Docente, Admin
const updateContentAssignment = async (req, res, next) => { // Añadir 'next'
    const { assignmentId } = req.params; // Obtiene el ID de la asignación
    // Obtiene los datos actualizados del cuerpo de la petición
    // *** REMOVER 'orden' del destructuring del body ***
    const { fecha_inicio, fecha_fin, puntos_maximos, intentos_permitidos, tiempo_limite } = req.body;

    // *** Validación de entrada mejorada ***
    // *** REMOVER 'orden' de los campos permitidos ***
    const allowedFields = ['fecha_inicio', 'fecha_fin', 'puntos_maximos', 'intentos_permitidos', 'tiempo_limite'];
    const updateData = {}; // Objeto para construir solo los campos que se van a actualizar

    // Validar y construir el objeto de actualización
    allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
            const value = req.body[field];
            // Si el valor es una cadena vacía o null, lo establecemos a undefined
            // para que Mongoose lo elimine si el esquema lo permite o no lo actualice si no
            if (value === '' || value === null) {
                 // Solo establecer a undefined si el campo existe en el body
                 updateData[field] = undefined;
            } else {
                // Validaciones específicas por campo
                 // *** REMOVER VALIDACIÓN DE 'orden' AQUÍ ***
                if (field === 'puntos_maximos' || field === 'intentos_permitidos' || field === 'tiempo_limite') { // 'orden' removido de la condición
                     // Intentar convertir a número y validar
                     const numValue = parseFloat(value); // Usar parseFloat para permitir decimales en puntos
                     if (isNaN(numValue) || numValue < 0) {
                         return res.status(400).json({ message: `Valor inválido para ${field}. Debe ser un número no negativo.` });
                     }
                     // Validar enteros si es necesario (intentos, tiempo)
                      if ((field === 'intentos_permitidos' || field === 'tiempo_limite') && !Number.isInteger(numValue)) {
                          return res.status(400).json({ message: `Valor inválido para ${field}. Debe ser un número entero no negativo.` });
                      }
                     updateData[field] = numValue;

                 } else if (field === 'fecha_inicio' || field === 'fecha_fin') {
                     // Validar y convertir a fecha
                     const date = new Date(value);
                     if (isNaN(date.getTime())) {
                         return res.status(400).json({ message: `Fecha inválida para ${field}.` });
                     }
                     updateData[field] = date;
                 } else {
                    // Otros campos si los hubiera
                    updateData[field] = value;
                 }
            }
        }
    });

    // Validación adicional de fechas (fin >= inicio) si ambas están presentes en la actualización (tu lógica existente)
    if (updateData.hasOwnProperty('fecha_inicio') && updateData.hasOwnProperty('fecha_fin')) {
        const inicio = updateData.fecha_inicio;
        const fin = updateData.fecha_fin;
        // Solo comparar si ambas son fechas (no undefined o null)
        if (inicio instanceof Date && !isNaN(inicio.getTime()) && fin instanceof Date && !isNaN(fin.getTime())) {
             if (fin < inicio) {
                 return res.status(400).json({ message: 'La fecha de fin no puede ser anterior a la fecha de inicio.' });
             }
        }
         // Si una es null/undefined y la otra es una fecha, la comparación estricta puede fallar,
         // pero el DatePicker frontend debería manejar esto visualmente, y la validación individual
         // ya asegura que cada fecha es válida si se proporciona.
    }


    // Verificar si hay al menos un campo válido para actualizar (tu lógica existente)
    if (Object.keys(updateData).length === 0) {
         return res.status(400).json({ message: 'Se deben proporcionar datos válidos para actualizar la asignación.' });
    }


    try {
        // --- Buscar y Verificar Propiedad de la Asignación (tu lógica existente) ---
        // Necesitamos popular la asignación -> tema -> módulo -> ruta -> grupo para verificar el docente_id
        const assignmentToUpdate = await ContentAssignment.findById(assignmentId).populate({ // Pobla el tema
            path: 'theme_id',
            populate: { // Pobla el módulo
                path: 'module_id',
                populate: { // Pobla la ruta
                    path: 'learning_path_id',
                    populate: { // Pobla el grupo
                        path: 'group_id',
                        select: 'docente_id' // Solo necesitamos el ID del docente del grupo
                    }
                }
            }
        });

        if (!assignmentToUpdate) {
            return res.status(404).json({ message: 'Asignación de contenido no encontrada.' });
        }

        // Comprueba si la jerarquía completa existe y si el grupo pertenece al docente (tu lógica existente)
        if (!assignmentToUpdate.theme_id || !assignmentToUpdate.theme_id.module_id || !assignmentToUpdate.theme_id.module_id.learning_path_id || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return res.status(403).json({ message: 'No tienes permiso para actualizar esta asignación. No te pertenece.' }); // 403 Forbidden
        }
        // --- Fin Verificación de Propiedad ---


        // *** Actualizar los campos permitidos usando el objeto updateData (tu lógica existente) ***
        // Usamos findByIdAndUpdate con {$set: updateData} para actualizar solo los campos en updateData
        // La opción `new: true` devuelve el documento actualizado
        // La opción `runValidators: true` ejecuta las validaciones definidas en el Schema de Mongoose
        const updatedAssignment = await ContentAssignment.findByIdAndUpdate(
            assignmentId,
            { $set: updateData }, // $set actualiza solo los campos especificados
            { new: true, runValidators: true, context: 'query' } // Options
        );

        // Si por alguna razón findByIdAndUpdate no encontró o actualizó (aunque ya verificamos antes)
         if (!updatedAssignment) {
             return res.status(500).json({ message: 'Error al guardar la asignación actualizada.' });
         }


        // --- Respuesta exitosa ---
        // Populamos los IDs de recurso/actividad para que el frontend tenga los datos completos
         const populatedUpdatedAssignment = await ContentAssignment.findById(updatedAssignment._id)
             .populate('resource_id', 'title type') // Asumiendo que Resource tiene title y type
             .populate('activity_id', 'title type'); // Asumiendo que Activity tiene title y type


        res.status(200).json(populatedUpdatedAssignment); // Responde con la asignación actualizada y populada

    } catch (error) {
        // Si el error es de validación de Mongoose (aparte de las que ya manejamos manualmente)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar la asignación.', errors: messages });
        }
        console.error('Error al actualizar asignación de contenido:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Eliminar una Asignación de Contenido específica
// @route   DELETE /api/content-assignments/:assignmentId
// @access  Privado/Docente
const deleteContentAssignment = async (req, res, next) => {
    const { assignmentId } = req.params;

    try {
        // --- Buscar la Asignación ANTES de eliminarla para obtener su orden y theme_id ---
        // Necesitamos el theme_id y el orden original para el reordenamiento posterior
        const assignmentToDelete = await ContentAssignment.findById(assignmentId);

        if (!assignmentToDelete) {
            return res.status(404).json({ message: 'Asignación de contenido no encontrada para eliminar.' });
        }

        // Guarda el theme_id y el orden original de la asignación a borrar
        const themeId = assignmentToDelete.theme_id;
        const deletedOrder = assignmentToDelete.orden;

        // --- Verificación de Propiedad de la Asignación (tu lógica existente, usando assignmentToDelete) ---
        // Necesitamos popular desde la asignación que encontramos para verificar la propiedad del docente
        const assignmentWithOwnership = await ContentAssignment.findById(assignmentId).populate({
            path: 'theme_id',
            populate: {
                path: 'module_id',
                populate: {
                    path: 'learning_path_id',
                    populate: {
                        path: 'group_id',
                        select: 'docente_id'
                    }
                }
            }
        });

         // Si por alguna razón no se pudo poblar o encontrar con el populate (aunque findById ya verificó la existencia)
         if (!assignmentWithOwnership || !assignmentWithOwnership.theme_id || !assignmentWithOwnership.theme_id.module_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id)) {
              // Usamos el themeId y deletedOrder obtenidos antes, pero la verificación es sobre el documento populado
              return res.status(403).json({ message: 'No tienes permiso para eliminar esta asignación. No te pertenece.' }); // 403 Forbidden
         }
        // --- Fin Verificación de Propiedad ---


        // --- Eliminar la Asignación de Contenido ---
        // Esto SOLO elimina el enlace, NO el Recurso o Actividad del banco
        await ContentAssignment.deleteOne({ _id: assignmentId }); // Ahora eliminamos sabiendo que existe y el usuario tiene permiso
        console.log(`Asignación de contenido ${assignmentId} (orden ${deletedOrder} en tema ${themeId}) eliminada.`);
        // --- Fin Eliminación de Asignación ---


        // *** LÓGICA PARA REORGANIZAR EL ORDEN DE LOS ELEMENTOS POSTERIORES ***

        // Encontrar todas las asignaciones en el mismo tema con un orden mayor al del elemento borrado
        const assignmentsToShift = await ContentAssignment.find({
            theme_id: themeId,
            orden: { $gt: deletedOrder } // $gt significa "greater than" (mayor que)
        }).sort({ orden: 1 }); // Ordenar por orden ascendente

        if (assignmentsToShift.length > 0) {
            // Preparar operaciones de actualización masiva (bulkWrite) para eficiencia
            const bulkOps = assignmentsToShift.map(assignment => ({
                updateOne: {
                    filter: { _id: assignment._id },
                    update: { $inc: { orden: -1 } } // $inc decrementa el valor del campo 'orden' en -1
                }
            }));

            // Ejecutar las operaciones de actualización masiva
            const bulkWriteResult = await ContentAssignment.bulkWrite(bulkOps);
            console.log(`Reordenados ${bulkWriteResult.modifiedCount} asignaciones después de la eliminación.`);
        }

        // *** FIN LÓGICA DE REORGANIZACIÓN ***


        // --- Respuesta exitosa ---
        res.status(200).json({ message: 'Asignación de contenido eliminada y orden reorganizado con éxito.' });

    } catch (error) {
        console.error('Error eliminando o reorganizando asignación de contenido:', error);
         if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación no válido.' });
         }
        next(error); // Pasa el error al siguiente middleware
    }
};


// @desc    Obtener una asignación de contenido específica por ID
// @route   GET /api/learning-paths/assignments/:assignmentId
// @access  Privado/Docente
const getContentAssignmentById = async (req, res, next) => {
    try {
        const assignmentId = req.params.assignmentId;

        // Validar que el ID sea un ObjectId válido
        if (!assignmentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'ID de asignación no válido.' });
        }

        // Buscar la asignación por ID y poblar referencias clave
        // Asegúrate de poblar el tema para la verificación de propiedad
        // y poblar el recurso/actividad asociado para obtener su tipo/subtipo
        const assignment = await ContentAssignment.findById(assignmentId)
             .populate({
                 path: 'theme_id', // Poblar tema para verificar propiedad
                 populate: {
                     path: 'module_id',
                     populate: {
                         path: 'learning_path_id',
                         populate: {
                             path: 'group_id',
                             select: 'docente_id' // Asegurarse de traer el docente_id del grupo
                         }
                     }
                 }
             })
             .populate('resource_id') // Poblar el recurso si existe
             .populate('activity_id'); // Poblar la actividad si existe


        if (!assignment) {
            return res.status(404).json({ message: 'Asignación no encontrada.' });
        }

        // Verificar que la asignación pertenece a un grupo propiedad del docente autenticado
        if (!assignment.theme_id ||
            !assignment.theme_id.module_id ||
            !assignment.theme_id.module_id.learning_path_id ||
            !assignment.theme_id.module_id.learning_path_id.group_id ||
            !assignment.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id)) {
            return res.status(403).json({ message: 'No tienes permiso para ver esta asignación.' }); // 403 Forbidden
        }

        // Construir la respuesta incluyendo el tipo/subtipo del contenido asociado
        const responseAssignment = {
            ...assignment.toJSON(), // Convierte el documento Mongoose a un objeto JS plano
            // Añade el tipo/subtipo del contenido asociado para el frontend
            contentItemType: assignment.type === 'Resource' ? assignment.resource_id?.type : assignment.activity_id?.type
        };


        res.status(200).json(responseAssignment); // 200 OK

    } catch (error) {
        console.error('Error fetching content assignment by ID:', error);
        // Si el error es de Mongoose por casting de ObjectId
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación no válido.' });
        }
        next(error); // Pasa otros errores al siguiente middleware
    }
};


// @desc    Update Content Assignment Status
// @route   PUT /api/learning-paths/assignments/:assignmentId/status
// @access  Privado/Docente, Admin
const updateContentAssignmentStatus = async (req, res, next) => {
    const { assignmentId } = req.params;
    const { status } = req.body; // Esperamos el nuevo estado en el body

    // Validar que el estado recibido sea uno de los permitidos
    const allowedStatuses = ['Draft', 'Open', 'Closed'];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Estado inválido. El estado debe ser uno de: ${allowedStatuses.join(', ')}` });
    }

    try {
        // Buscar la asignación por ID
        const assignment = await ContentAssignment.findById(assignmentId);

        // Verificar si la asignación existe
        if (!assignment) {
            return res.status(404).json({ message: 'Asignación no encontrada.' });
        }

        // *** Verificar permisos: Solo el docente propietario (o un Admin si tu lógica lo permite) puede cambiar el estado ***
        // Asumimos que req.user._id contiene el ID del usuario autenticado
        // Y que tu middleware 'authorize' ya verificó que es 'Docente' o 'Admin'.
        // Aquí verificamos que el docente sea el propietario de la asignación.
        // Si un Admin puede modificar cualquier asignación, necesitarías una verificación adicional aquí.
        if (assignment.docente_id.toString() !== req.user._id.toString() && req.user.userType !== 'Administrador') {
            // Asumo que req.user.userType está disponible y tiene el tipo de usuario
            return res.status(403).json({ message: 'No tienes permiso para modificar el estado de esta asignación.' });
        }
        // Puedes añadir una verificación adicional para Admins si es necesario:
        // if (req.user.userType === 'Administrador') { /* Permitir */ } else if (assignment.docente_id.equals(req.user._id)) { /* Permitir */ } else { /* Denegar */ }


        // *** Lógica de Transición de Estados Opcional (puedes añadir reglas aquí) ***
        // Por ejemplo, quizás no se puede pasar directamente de 'Closed' a 'Open' sin validación,
        // o solo se puede pasar a 'Closed' si todas las entregas han sido revisadas.
        // Por ahora, permitiremos cualquier transición válida ('Draft' -> 'Open', 'Open' -> 'Closed', etc.)
        // Solo verificamos que el estado actual no sea ya el estado deseado.
        if (assignment.status === status) {
            return res.status(200).json({ message: `La asignación ya se encuentra en estado "${status}".`, assignment });
        }


        // Actualizar el estado de la asignación
        assignment.status = status;
        await assignment.save();

        res.status(200).json({ message: `Estado de la asignación actualizado a "${status}"`, assignment });

    } catch (error) {
        // Manejo de errores
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación inválido.' });
        }
        console.error('Error al actualizar estado de asignación:', error);
        next(error); // Pasa el error al siguiente middleware
    }
};

module.exports = {
    createLearningPath,
    createModule,
    createTheme,
    assignContentToTheme,
    updateContentAssignmentStatus,
    getGroupLearningPathsForDocente,
    getGroupLearningPathsForStudent,
    getLearningPathStructure,
    updateLearningPath,
    deleteLearningPath,
    updateModule,
    deleteModule,
    updateTheme,
    deleteTheme,
    updateContentAssignment,
    deleteContentAssignment,
    getContentAssignmentById,
    getMyAssignedLearningPaths,
    getMyCreatedLearningPaths
};