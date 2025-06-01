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
const User = require('../models/UserModel'); // Already imported
const Plan = require('../models/PlanModel'); // <--- ADD IF NOT PRESENT
const SubscriptionService = require('../services/SubscriptionService'); // <--- ADD THIS
const Submission = require('../models/SubmissionModel');
const mongoose = require('mongoose');
const NotificationService = require('../services/NotificationService'); // Adjust path if necessary
// Membership is already imported
// ContentAssignment is already imported


// @desc    Obtener Rutas de Aprendizaje creadas por el docente autenticado
// @route   GET /api/learning-paths/my-creations
// Acceso:  Privado/Docente
const getMyCreatedLearningPaths = async (req, res, next) => {
    try {
        // El ID del docente se obtiene del objeto user que el middleware 'protect' añade a la request
        const docenteId = req.user._id;

        // 1. Encontrar todos los Grupos que pertenecen a este docente
        const ownedGroups = await Group.find({ docente_id: docenteId, activo: true });

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
        const group = await Group.findOne({ _id: group_id, docente_id: docenteId, activo: true }); // Usamos group_id aquí
        if (!group) {
            return res.status(404).json({ message: 'Grupo no encontrado, no está activo o no te pertenece. No puedes crear una ruta aquí.' });
        }

        // --- BEGIN PLAN AND USAGE LIMIT CHECK for Docentes ---
        if (req.user.tipo_usuario === 'Docente') {
            // Fetch the full user object with plan populated
            const teacher = await User.findById(docenteId).populate('planId');
            if (!teacher) { // Should not happen if protect middleware works
                return res.status(404).json({ message: 'Usuario docente no encontrado.' });
            }

            const subscription = await SubscriptionService.checkSubscriptionStatus(docenteId);
            if (!subscription.isActive) {
                return res.status(403).json({
                    message: `No se puede crear la ruta de aprendizaje: ${subscription.message}`
                });
            }

            // Check maxRoutes limit
            if (teacher.planId && teacher.planId.limits && teacher.planId.limits.maxRoutes !== undefined) {
                // Count existing active learning paths for this teacher.
                // A learning path is tied to a group, and group is tied to a teacher.
                // So, we need to find all groups for this teacher, then all LPs for those groups.
                // Or, if LearningPath model can directly store docente_id (even if redundant), query would be simpler.
                // Assuming LearningPath does NOT directly store docente_id, and it's derived via group.

                const teacherGroups = await Group.find({ docente_id: docenteId, activo: true }).select('_id');
                const teacherGroupIds = teacherGroups.map(g => g._id);

                // Count active learning paths in those groups
                // Assuming LearningPath has an 'activo' field or similar (if not, all are considered active)
                // For now, let's assume all learning paths are 'active' once created for simplicity of counting.
                // If LearningPath model has an 'activo' field, add it to the query: activo: true
                const currentRoutesCount = await LearningPath.countDocuments({ group_id: { $in: teacherGroupIds } });

                // Note: user.usage.routesCreated tracks all routes ever created by the user for this plan period.
                // The check here is against the 'live' count of routes.
                // If the plan limit is for concurrent active routes, this 'currentRoutesCount' is correct.
                // If the plan limit is for total routes created during a subscription period,
                // then user.usage.routesCreated should be used directly.
                // The current PlanModel.limits.maxRoutes sounds like concurrent/active routes.
                // Let's use user.usage.routesCreated as that's what we are tracking.

                if (teacher.usage.routesCreated >= teacher.planId.limits.maxRoutes) {
                    return res.status(403).json({
                        message: `Has alcanzado el límite de ${teacher.planId.limits.maxRoutes} rutas de aprendizaje permitidas por tu plan "${teacher.planId.name}".`
                    });
                }
            } else {
                // Fallback or error if plan details/limits are missing
                console.warn(`Plan o límite maxRoutes no definidos para el docente ${docenteId} al crear ruta de aprendizaje.`);
                return res.status(403).json({ message: 'No se pudieron verificar los límites de tu plan para crear rutas de aprendizaje.' });
            }
        }
        // --- END PLAN AND USAGE LIMIT CHECK ---

        const learningPath = await LearningPath.create({
            nombre,
            descripcion,
            group_id: group_id,
            fecha_inicio,
            fecha_fin,
            // 'activo' por defecto es true según el modelo
        });

        // --- BEGIN INCREMENT USAGE COUNTER ---
        if (req.user.tipo_usuario === 'Docente') {
            // Re-fetch user to ensure atomicity, or use the 'teacher' object if confident no intermediate changes occurred.
            // For safety, fetching again or using $inc is better.
            await User.findByIdAndUpdate(docenteId, { $inc: { 'usage.routesCreated': 1 } });
        }
        // --- END INCREMENT USAGE COUNTER ---

        res.status(201).json(learningPath);

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
        const learningPath = await LearningPath.findById(learningPathId).populate({ path: 'group_id', select: 'docente_id activo' });

        if (!learningPath) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada.' });
        }

        // Verificar si el docente autenticado es el dueño del grupo al que pertenece la ruta
        if (!learningPath.group_id || learningPath.group_id.docente_id.toString() !== docenteId.toString() || !learningPath.group_id.activo) {
             return res.status(403).json({ message: 'No tienes permiso para añadir módulos a esta ruta de aprendizaje, o el grupo está inactivo.' });
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
                path: 'group_id',
                select: 'docente_id activo'
            }
        });

        if (!module) {
            return res.status(404).json({ message: 'Módulo no encontrado.' });
        }

        // Verificar si el docente autenticado es el dueño del grupo al que pertenece la ruta del módulo
        if (!module.learning_path_id.group_id || module.learning_path_id.group_id.docente_id.toString() !== docenteId.toString() || !module.learning_path_id.group_id.activo) {
             return res.status(403).json({ message: 'No tienes permiso para añadir temas a este módulo, o el grupo está inactivo.' });
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
                    select: 'docente_id activo' // Solo necesitamos el ID del docente del grupo
                }
            }
        });

        if (!theme) {
            return res.status(404).json({ message: 'Tema no encontrado.' });
        }

         // Comprueba si la jerarquía completa existe y si el grupo pertenece al docente (tu lógica existente)
        // CORREGIDO: theme -> module_id -> learning_path_id -> group_id
        if (!theme.module_id || !theme.module_id.learning_path_id || !theme.module_id.learning_path_id.group_id || !theme.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !theme.module_id.learning_path_id.group_id.activo) {
             return res.status(403).json({ message: 'No tienes permiso para añadir contenido a este tema. No te pertenece o el grupo está inactivo.' }); // 403 Forbidden
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
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId, activo: true });
        if (!group) {
            return res.status(404).json({ message: 'Grupo no encontrado, no está activo o no te pertenece.' });
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

        const group = await Group.findById(groupId); 
        if (!group || !group.activo) {
            return res.status(404).json({ message: 'Este grupo ya no está activo o no ha sido encontrado.' });
        }

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
    const { pathId } = req.params;
    const userId = req.user._id;
    const userType = req.user.tipo_usuario;

    try {
        // --- Verificación de Permiso: Asegurar que el usuario tiene permiso para ver esta ruta ---
        // Primero, buscar la ruta y poblar el grupo asociado
        const learningPath = await LearningPath.findById(pathId).populate({ path: 'group_id', select: '_id nombre activo docente_id' }); // <<< Asegúrate de seleccionar 'activo' del grupo

        if (!learningPath) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada' });
        }

        // *** AJUSTE CLAVE AQUI: Si el grupo asociado a la ruta NO está activo, denegar acceso. ***
        if (learningPath.group_id && !learningPath.group_id.activo) {
            return res.status(403).json({ message: 'El grupo asociado a esta ruta de aprendizaje ha sido archivado y no puedes acceder a su contenido.' });
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
            return res.status(403).json({ message: 'No tienes permiso para ver esta ruta de aprendizaje o el grupo ha sido archivado.' });
        }
        // --- Fin Verificación de Permiso ---

        // Si el usuario tiene permiso y el grupo está activo, obtener la estructura completa
        const modules = await Module.find({ learning_path_id: pathId }).sort('orden');

        const pathStructure = {
            _id: learningPath._id,
            nombre: learningPath.nombre,
            descripcion: learningPath.descripcion,
            fecha_inicio: learningPath.fecha_inicio,
            fecha_fin: learningPath.fecha_fin,
            activo: learningPath.activo,
            // Asegúrate de enviar el estado 'activo' del grupo al frontend
            group_id: learningPath.group_id ? {
                _id: learningPath.group_id._id,
                nombre: learningPath.group_id.nombre,
                activo: learningPath.group_id.activo // <<< IMPORTANTE: Pasar el estado activo del grupo
            } : null,
            modules: []
        };

        // ... (el resto de tu lógica para poblar módulos, temas, asignaciones) ...
        for (const module of modules) {
            const themes = await Theme.find({ module_id: module._id }).sort('orden');
            const moduleObject = {
                _id: module._id,
                nombre: module.nombre,
                descripcion: module.descripcion,
                orden: module.orden,
                themes: []
            };

            for (const theme of themes) {
                const assignments = await ContentAssignment.find({ theme_id: theme._id }).sort('orden')
                    .populate({ path: 'resource_id', select: '_id title type link_url video_url content_body' })
                    .populate({ path: 'activity_id', select: '_id title type' });

                const themeObject = {
                    _id: theme._id,
                    nombre: theme.nombre,
                    descripcion: theme.descripcion,
                    orden: theme.orden,
                    assignments: assignments.map(assign => ({
                        _id: assign._id,
                        type: assign.type,
                        orden: assign.orden,
                        status: assign.status,
                        fecha_inicio: assign.fecha_inicio,
                        fecha_fin: assign.fecha_fin,
                        puntos_maximos: assign.puntos_maximos,
                        intentos_permitidos: assign.intentos_permitidos,
                        tiempo_limite: assign.tiempo_limite,
                        resource_id: assign.type === 'Resource' && assign.resource_id ? {
                            _id: assign.resource_id._id,
                            title: assign.resource_id.title,
                            type: assign.resource_id.type,
                            link_url: assign.resource_id.link_url,
                            video_url: assign.resource_id.video_url,
                            content_body: assign.resource_id.content_body
                        } : null,
                        activity_id: assign.type === 'Activity' && assign.activity_id ? {
                            _id: assign.activity_id._id,
                            title: assign.activity_id.title,
                            type: assign.activity_id.type
                        } : null,
                    }))
                };
                moduleObject.themes.push(themeObject);
            }
            pathStructure.modules.push(moduleObject);
        }

        res.status(200).json(pathStructure);

    } catch (error) {
        console.error('Error al obtener la estructura de la ruta de aprendizaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la estructura de la ruta de aprendizaje', error: error.message });
    }
};

// @desc    Obtener todas las Rutas de Aprendizaje asignadas al usuario autenticado con su estado
// @route   GET /api/learning-paths/my-assigned
// Acceso:  Privado (manejado por el middleware 'protect')
const getMyAssignedLearningPaths = async (req, res) => {
    try {
        const userId = req.user._id;

        const approvedMemberships = await Membership.find({
            usuario_id: userId,
            estado_solicitud: 'Aprobado'
        }).populate({
            path: 'grupo_id',
            select: 'activo'
        });

        const activeGroupIds = approvedMemberships
            .filter(membership => membership.grupo_id && membership.grupo_id.activo)
            .map(membership => membership.grupo_id._id);

        if (activeGroupIds.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        // Obtener las rutas de aprendizaje asociadas a los grupos activos
        const rawAssignedPaths = await LearningPath.find({
            group_id: { $in: activeGroupIds }
        })
        .populate('group_id', 'nombre'); // Para obtener el nombre del grupo

        // Calcular el estado de cada ruta de aprendizaje usando el modelo Progress
        const formattedAssignedPaths = await Promise.all(rawAssignedPaths.map(async (lp) => {
            if (!lp.group_id) {
                console.warn(`Ruta de aprendizaje ${lp._id} tiene una referencia de grupo nula o el grupo no fue populado.`);
                return null;
            }

            // Buscar el progreso del estudiante para esta ruta específica
            const studentProgress = await Progress.findOne({
                student_id: userId,
                learning_path_id: lp._id
            });

            // Determinar el estado de la ruta. Si no hay documento de progreso, se asume 'No Iniciado'.
            const status = studentProgress ? studentProgress.path_status : 'No Iniciado';

            return {
                _id: lp._id,
                nombre: lp.nombre,
                group_id: lp.group_id._id,
                group_name: lp.group_id.nombre,
                status: status, // <--- ¡Ahora usamos el 'path_status' de tu modelo Progress!
                // Si quieres, podrías calcular un porcentaje de progreso aquí basado en completed_themes
                // y los temas totales de la LearningPath si tu modelo LearningPath los tiene.
                // Por ahora, solo enviamos el status directo.
            };
        }));

        const finalPaths = formattedAssignedPaths.filter(item => item !== null);

        res.status(200).json({
            success: true,
            count: finalPaths.length,
            data: finalPaths
        });

    } catch (error) {
        console.error('Error al obtener las rutas de aprendizaje asignadas:', error);
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
    const { learningPathId } = req.params;
    const { nombre, descripcion } = req.body; // <-- Cambia aquí
    const docenteId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(learningPathId)) {
        return res.status(400).json({ message: 'ID de ruta de aprendizaje inválido' });
    }

    // Validación de los campos a actualizar si se proporcionaron
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
        return res.status(400).json({ message: 'El nombre debe ser un texto no vacío si se proporciona' });
    }
    if (descripcion !== undefined && typeof descripcion !== 'string') {
        return res.status(400).json({ message: 'La descripción debe ser texto si se proporciona' });
    }
    if (nombre === undefined && descripcion === undefined) {
        return res.status(400).json({ message: 'Se debe proporcionar nombre o descripción para actualizar la ruta' });
    }

    try {
        const learningPath = await LearningPath.findById(learningPathId).populate({ path: 'group_id', select: 'nombre docente_id activo' });
        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId) || !learningPath.group_id.activo) {
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada, no te pertenece o el grupo está inactivo.' });
        }

        if (nombre !== undefined) {
            learningPath.nombre = nombre.trim();
        }
        if (descripcion !== undefined) {
            learningPath.descripcion = descripcion.trim();
        }

        await learningPath.save();
        res.status(200).json(learningPath);

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar ruta de aprendizaje', errors: messages });
        }
        console.error('Error actualizando ruta de aprendizaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar la ruta de aprendizaje', error: error.message });
    }
};


// @desc    Eliminar una Ruta de Aprendizaje y todo su contenido asociado
// @route   DELETE /api/learning-paths/:learningPathId
// @access  Privado/Docente
const deleteLearningPath = async (req, res) => {
    const { learningPathId } = req.params;
    const { nombreConfirmacion } = req.body;
    const docenteId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(learningPathId)) {
        return res.status(400).json({ message: 'ID de ruta de aprendizaje inválido' });
    }

    // Iniciar una sesión para la transacción
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Buscar la ruta de aprendizaje y validar la propiedad
        const learningPath = await LearningPath.findById(learningPathId).populate({
            path: 'group_id',
            select: 'nombre docente_id activo'
        }).session(session);

        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId) || !learningPath.group_id.activo) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Ruta de aprendizaje no encontrada, no te pertenece o el grupo está inactivo.' });
        }

        // Confirmar el nombre para evitar borrados accidentales
        if (!nombreConfirmacion || nombreConfirmacion.trim() !== learningPath.nombre) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'El nombre de la ruta de aprendizaje no coincide. Escribe el nombre exacto para confirmar.' });
        }

        // --- Inicio de la lógica de eliminación en cascada ---

        // 1. Encontrar todos los módulos de la ruta de aprendizaje
        const modules = await Module.find({ learning_path_id: learningPathId }).session(session);
        const moduleIds = modules.map(m => m._id);

        if (moduleIds.length > 0) {
            // 2. Encontrar todos los temas de esos módulos
            const themes = await Theme.find({ module_id: { $in: moduleIds } }).session(session);
            const themeIds = themes.map(t => t._id);

            if (themeIds.length > 0) {
                // 3. Eliminar todas las asignaciones de contenido de esos temas
                await ContentAssignment.deleteMany({ theme_id: { $in: themeIds } }).session(session);
            }

            // 4. Eliminar todos los temas
            await Theme.deleteMany({ module_id: { $in: moduleIds } }).session(session);
        }

        // 5. Eliminar todos los módulos
        await Module.deleteMany({ learning_path_id: learningPathId }).session(session);

        // 6. Eliminar todo el progreso de estudiantes asociado a la ruta
        await Progress.deleteMany({ learning_path_id: learningPathId }).session(session);

        // 7. Finalmente, eliminar la ruta de aprendizaje
        await LearningPath.findByIdAndDelete(learningPathId).session(session);

        // Si todo fue exitoso, confirma la transacción
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: `Ruta de aprendizaje '${learningPath.nombre}' y todo su contenido asociado han sido eliminados.` });

    } catch (error) {
        // Si algo falla, revierte todos los cambios
        await session.abortTransaction();
        session.endSession();
        console.error('Error durante la eliminación en cascada de la ruta de aprendizaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la ruta de aprendizaje.', error: error.message });
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
const updateTheme = async (req, res, next) => {
    const { themeId } = req.params;
    const { nombre, descripcion, orden } = req.body;

    if (nombre === undefined && descripcion === undefined && orden === undefined) {
        return res.status(400).json({ message: 'Se deben proporcionar datos para actualizar el tema (nombre, descripción u orden).' });
    }
    if (orden !== undefined && (typeof orden !== 'number' || orden < 0)) {
        return res.status(400).json({ message: 'El orden debe ser un número válido no negativo.' });
    }

    try {
        const themeToUpdate = await Theme.findById(themeId).populate({
            path: 'module_id',
            populate: {
                path: 'learning_path_id',
                populate: {
                    path: 'group_id',
                    select: 'docente_id activo'
                }
            }
        });

        if (!themeToUpdate) {
            return res.status(404).json({ message: 'Tema no encontrado.' });
        }

        // *** CORRECCIÓN CRUCIAL AQUÍ ***
        // Se debe usar 'themeToUpdate' en lugar de 'moduleToUpdate'
        // Y el mensaje de error debe reflejar que es un "tema"
        if (!themeToUpdate.module_id ||
            !themeToUpdate.module_id.learning_path_id ||
            !themeToUpdate.module_id.learning_path_id.group_id ||
            !themeToUpdate.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) ||
            !themeToUpdate.module_id.learning_path_id.group_id.activo)
        {
            return res.status(403).json({ message: 'No tienes permiso para actualizar este tema. No te pertenece o el grupo está inactivo.' });
        }
        // --- Fin Verificación de Propiedad ---

        if (nombre !== undefined) themeToUpdate.nombre = nombre;
        if (descripcion !== undefined) themeToUpdate.descripcion = descripcion;
        if (orden !== undefined) themeToUpdate.orden = orden;

        const updatedTheme = await themeToUpdate.save();

        res.status(200).json(updatedTheme);

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Error de validación al actualizar el tema', errors: messages });
        }
        console.error('Error al actualizar tema:', error);
        next(error);
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
                    select: 'docente_id activo' // Solo necesitamos el ID del docente del grupo
                }
            }
        });

        if (!theme) {
            return res.status(404).json({ message: 'Tema no encontrado.' });
        }

        // Comprueba si la jerarquía completa del tema (módulo, ruta, grupo) existe y si el grupo pertenece al docente
        if (!theme.module_id || !theme.module_id.learning_path_id || !theme.module_id.learning_path_id.group_id || !theme.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !theme.module_id.learning_path_id.group_id.activo) {
             return res.status(403).json({ message: 'No tienes permiso para eliminar este tema. No te pertenece o el grupo está inactivo.' }); // 403 Forbidden
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
    // *** REMOVER VALIDACIÓN DE 'orden' AQUÍ ***
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
                            select: 'docente_id activo' // Solo necesitamos el ID del docente del grupo
                    }
                }
            }
        });

        if (!assignmentToUpdate) {
            return res.status(404).json({ message: 'Asignación de contenido no encontrada.' });
        }

        // Comprueba si la jerarquía completa existe y si el grupo pertenece al docente (tu lógica existente)
        if (!assignmentToUpdate.theme_id || !assignmentToUpdate.theme_id.module_id || !assignmentToUpdate.theme_id.module_id.learning_path_id || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id.activo) {
             return res.status(403).json({ message: 'No tienes permiso para actualizar esta asignación. No te pertenece o el grupo está inactivo.' }); // 403 Forbidden
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
                            select: 'docente_id activo'
                    }
                }
            }
        });

         // Si por alguna razón no se pudo poblar o encontrar con el populate (aunque findById ya verificó la existencia)
         if (!assignmentWithOwnership || !assignmentWithOwnership.theme_id || !assignmentWithOwnership.theme_id.module_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id.activo) {
              // Usamos el themeId y deletedOrder obtenidos antes, pero la verificación es sobre el documento populado
              return res.status(403).json({ message: 'No tienes permiso para eliminar esta asignación. No te pertenece o el grupo está inactivo.' }); // 403 Forbidden
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
                                 select: 'docente_id activo' // Asegurarse de traer el docente_id del grupo
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
            !assignment.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) ||
            !assignment.theme_id.module_id.learning_path_id.group_id.activo ) {
            return res.status(403).json({ message: 'No tienes permiso para ver esta asignación o el grupo está inactivo.' }); // 403 Forbidden
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
    const { status } = req.body;

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

        // Verificar permisos
        if (assignment.docente_id.toString() !== req.user._id.toString() && req.user.userType !== 'Administrador') {
            return res.status(403).json({ message: 'No tienes permiso para modificar el estado de esta asignación.' });
        }

        // Si el estado no ha cambiado, no hacer nada más
        if (assignment.status === status) {
            return res.status(200).json({ message: `La asignación ya se encuentra en estado "${status}".`, assignment });
        }

        const oldStatus = assignment.status; // Store old status

        // Actualizar el estado de la asignación
        assignment.status = status;
        await assignment.save();

        // Si la asignación pasa a estado 'Open' desde otro estado, enviar notificaciones
        if (status === 'Open' && oldStatus !== 'Open') {
            try {
                // Populate necessary details for the notification message and link
                const detailedAssignment = await ContentAssignment.findById(assignment._id)
                    .populate('activity_id', 'title') // Populate activity title
                    .populate('resource_id', 'title') // Populate resource title
                    .populate({
                        path: 'theme_id',
                        select: 'nombre module_id',
                        populate: {
                            path: 'module_id',
                            select: 'nombre learning_path_id',
                            populate: {
                                path: 'learning_path_id',
                                select: 'nombre group_id', // Need group_id
                            }
                        }
                    });

                if (detailedAssignment &&
                    detailedAssignment.theme_id &&
                    detailedAssignment.theme_id.module_id &&
                    detailedAssignment.theme_id.module_id.learning_path_id &&
                    detailedAssignment.theme_id.module_id.learning_path_id.group_id) {

                    const groupId = detailedAssignment.theme_id.module_id.learning_path_id.group_id;
                    const assignmentTitle = detailedAssignment.activity_id?.title || detailedAssignment.resource_id?.title || 'Unnamed Assignment';
                    const learningPathName = detailedAssignment.theme_id.module_id.learning_path_id.nombre;

                    // Find approved members of the group
                    const approvedMembers = await Membership.find({
                        grupo_id: groupId,
                        estado_solicitud: 'Aprobado'
                    }).populate('usuario_id', 'tipo_usuario'); // Populate to check if user is Estudiante

                    // --- ACCEDE A LA INSTANCIA GLOBAL DE SOCKET.IO ---
                    const io = global.io; // Aquí accedes a la instancia de Socket.IO que hiciste global en server.js

                    for (const member of approvedMembers) {
                        // Ensure the member is a student
                        if (member.usuario_id && member.usuario_id.tipo_usuario === 'Estudiante') {
                            const message = `New assignment '${assignmentTitle}' in '${learningPathName}' is now open.`;
                            // TODO: Confirm actual frontend URL structure for student assignment view
                            const link = `/student/learning-paths/${detailedAssignment.theme_id.module_id.learning_path_id._id}/themes/${detailedAssignment.theme_id._id}/assignments/${detailedAssignment._id}`;

                            // 1. Crear la notificación en la base de datos
                            const newNotification = await NotificationService.createNotification({
                                recipient: member.usuario_id._id, // Send to the student's User ID
                                sender: req.user._id, // The teacher who triggered the update
                                type: 'NEW_ASSIGNMENT',
                                message: message,
                                link: link
                            });

                            // 2. Emitir la notificación en tiempo real vía WebSockets
                            if (io) { // Asegurarse de que la instancia de io esté disponible
                                // Emitir el evento 'new_notification' a la sala específica del usuario.
                                // La sala se nombró con el _id del usuario cuando se conectó el socket.
                                io.to(member.usuario_id._id.toString()).emit('new_notification', newNotification);
                                console.log(`Notification emitted to user room: ${member.usuario_id._id.toString()} for notification ID: ${newNotification._id}`);
                            } else {
                                console.warn('Socket.IO instance (global.io) not available. Real-time notifications might not be working.');
                            }
                        }
                    }
                } else {
                    console.error(`Could not populate details for assignment ${assignment._id} to send notifications.`);
                }
            } catch (notificationError) {
                console.error('Failed to send new assignment notifications:', notificationError);
                // No se debe detener la respuesta principal por un error de notificación.
            }
        }

        res.status(200).json({ message: `Estado de la asignación actualizado a "${status}"`, assignment });

    } catch (error) {
        // Manejo de errores
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de asignación inválido.' });
        }
        console.error('Error al actualizar estado de asignación:', error);
        next(error); // Pasa el error al siguiente middleware para manejo centralizado
    }
};

// @desc    Obtener todas las actividades asignadas a un estudiante en una ruta de aprendizaje
// @route   GET /api/learning-paths/:learningPathId/student-activities
// @access  Privado/Estudiante
const getStudentActivitiesForLearningPath = async (req, res) => {
  try {
    const { learningPathId } = req.params;
    const studentId = req.user._id;

    // 1. Buscar todos los temas de la ruta
    const modules = await Module.find({ learning_path_id: learningPathId });
    const moduleIds = modules.map(m => m._id);
    const themes = await Theme.find({ module_id: { $in: moduleIds } });
    const themeIds = themes.map(t => t._id);

    // 2. Buscar todas las asignaciones de actividades en esos temas
    // ¡Aquí el populate ya se está haciendo correctamente!
    const assignments = await ContentAssignment.find({ theme_id: { $in: themeIds }, type: 'Activity' })
      .populate('activity_id'); // Esto pobla activity_id con el documento Activity completo

    // 3. Para cada asignación, buscar la última entrega del estudiante
    const results = await Promise.all(assignments.map(async (assignment) => {
      const lastSubmission = await Submission.findOne({
        assignment_id: assignment._id,
        student_id: studentId
      }).sort({ fecha_envio: -1 });

      return {
        _id: assignment._id, // Esto es el _id de ContentAssignment
        activity_id: assignment.activity_id, // **¡Envía el objeto activity_id poblado!**
        // Ya no necesitas title: assignment.activity_id?.title aquí,
        // porque el frontend lo leerá directamente de activity_id
        fecha_inicio: assignment.fecha_inicio,
        fecha_fin: assignment.fecha_fin,
        status: assignment.status, // Esto parece ser el estado de la asignación
        lastSubmission: lastSubmission ? {
          calificacion: lastSubmission.calificacion,
          estado_envio: lastSubmission.estado_envio,
          fecha_envio: lastSubmission.fecha_envio
        } : null
      };
    }));

    res.json({ activities: results });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener actividades del estudiante', error: error.message });
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
    getMyCreatedLearningPaths,
    getStudentActivitiesForLearningPath,
};