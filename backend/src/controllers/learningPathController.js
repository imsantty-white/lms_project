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
const Plan = require('../models/PlanModel');
const SubscriptionService = require('../services/SubscriptionService');
const Submission = require('../models/SubmissionModel');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const NotificationService = require('../services/NotificationService');


// @desc    Obtener Rutas de Aprendizaje creadas por el docente autenticado
// @route   GET /api/learning-paths/my-creations
// Acceso:  Privado/Docente
const getMyCreatedLearningPaths = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    const skip = (pageNumber - 1) * limitNumber;

    try {
        const docenteId = req.user._id;
        const ownedGroups = await Group.find({ docente_id: docenteId, activo: true }).select('_id').lean();
        const groupIds = ownedGroups.map(group => group._id);

        const defaultPagination = { totalItems: 0, currentPage: pageNumber, itemsPerPage: limitNumber, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null };

        if (groupIds.length === 0) {
            return res.status(200).json({ data: [], pagination: defaultPagination });
        }

        const filter = { group_id: { $in: groupIds } };
        const totalItems = await LearningPath.countDocuments(filter);

        const learningPaths = await LearningPath.find(filter)
            .populate('group_id', 'nombre') // Poblar nombre del grupo para visualización
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: learningPaths,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });

    } catch (error) {
        console.error('Error fetching teacher\'s created learning paths:', error);
        next(error);
    }
};

// @desc    Crear una nueva Ruta de Aprendizaje
// @route   POST /api/learning-paths
// @access  Privado/Docente
const createLearningPath = async (req, res, next) => {
    const { nombre, descripcion, group_id, fecha_inicio, fecha_fin } = req.body;
    const docenteId = req.user._id;

    if (!nombre || !group_id) {
        return next(new AppError('Nombre de la ruta y ID del grupo son obligatorios', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(group_id)) {
        return next(new AppError('El ID del grupo no tiene un formato válido.', 400));
    }

    try {
        const group = await Group.findOne({ _id: group_id, docente_id: docenteId, activo: true });
        if (!group) {
            return next(new AppError('Grupo no encontrado, no está activo o no te pertenece. No puedes crear una ruta aquí.', 404));
        }

        if (req.user.tipo_usuario === 'Docente') {
            const teacher = await User.findById(docenteId).populate('planId');
            if (!teacher) {
                return next(new AppError('Usuario docente no encontrado.', 404));
            }

            const subscription = await SubscriptionService.checkSubscriptionStatus(docenteId);
            if (!subscription.isActive) {
                return next(new AppError(`No se puede crear la ruta de aprendizaje: ${subscription.message}`, 403));
            }

            if (teacher.planId && teacher.planId.limits && teacher.planId.limits.maxRoutes !== undefined) {
                const teacherGroups = await Group.find({ docente_id: docenteId, activo: true }).select('_id').lean();
                const teacherGroupIds = teacherGroups.map(g => g._id);
                const currentRoutesCount = await LearningPath.countDocuments({ group_id: { $in: teacherGroupIds } });

                if (currentRoutesCount >= teacher.planId.limits.maxRoutes) { // Comparar con currentRoutesCount
                    return next(new AppError(`Has alcanzado el límite de ${teacher.planId.limits.maxRoutes} rutas de aprendizaje permitidas por tu plan "${teacher.planId.name}".`, 403));
                }
            } else {
                console.warn(`Plan o límite maxRoutes no definidos para el docente ${docenteId} al crear ruta de aprendizaje.`);
                return next(new AppError('No se pudieron verificar los límites de tu plan para crear rutas de aprendizaje.', 403));
            }
        }

        const learningPath = await LearningPath.create({
            nombre,
            descripcion,
            group_id: group_id,
            fecha_inicio,
            fecha_fin,
        });

        if (req.user.tipo_usuario === 'Docente') {
            await User.findByIdAndUpdate(docenteId, { $inc: { 'usage.routesCreated': 1 } });
        }

        res.status(201).json(learningPath);

    } catch (error) {
        console.error('Error creando ruta de aprendizaje:', error);
        next(error);
    }
};

// @desc    Crear un nuevo Módulo para una Ruta de Aprendizaje
// @route   POST /api/learning-paths/:learningPathId/modules
// @access  Privado/Docente
const createModule = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.learningPathId)) {
        return next(new AppError('El ID de la ruta de aprendizaje no tiene un formato válido.', 400));
    }
    const { nombre, descripcion } = req.body;
    const { learningPathId } = req.params;
    const docenteId = req.user._id;

    if (!nombre) {
        return next(new AppError('El nombre del módulo es obligatorio', 400));
    }

    try {
        const learningPath = await LearningPath.findById(learningPathId).populate({ path: 'group_id', select: 'docente_id activo' });
        if (!learningPath) {
            return next(new AppError('Ruta de aprendizaje no encontrada.', 404));
        }
        if (!learningPath.group_id || learningPath.group_id.docente_id.toString() !== docenteId.toString() || !learningPath.group_id.activo) {
             return next(new AppError('No tienes permiso para añadir módulos a esta ruta de aprendizaje, o el grupo está inactivo.', 403));
        }

        const existingModules = await Module.find({ learning_path_id: learningPathId }).sort('orden');
        const nextOrder = existingModules.length > 0 ? existingModules[existingModules.length - 1].orden + 1 : 1;

        const newModule = await Module.create({
            nombre,
            descripcion,
            learning_path_id: learningPathId,
            orden: nextOrder,
        });

        res.status(201).json(newModule);
    } catch (error) {
        console.error('Error creando módulo:', error);
        next(error);
    }
};

// @desc    Crear un nuevo Tema para un Módulo
// @route   POST /api/learning-paths/modules/:moduleId/themes
// @access  Privado/Docente
const createTheme = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.moduleId)) {
        return next(new AppError('El ID del módulo no tiene un formato válido.', 400));
    }
    const { nombre, descripcion } = req.body;
    const { moduleId } = req.params;
    const docenteId = req.user._id;

    if (!nombre) {
        return next(new AppError('El nombre del tema es obligatorio', 400));
    }

    try {
        const module = await Module.findById(moduleId).populate({
            path: 'learning_path_id',
            populate: {
                path: 'group_id',
                select: 'docente_id activo'
            }
        });

        if (!module) {
            return next(new AppError('Módulo no encontrado.', 404));
        }
        if (!module.learning_path_id.group_id || module.learning_path_id.group_id.docente_id.toString() !== docenteId.toString() || !module.learning_path_id.group_id.activo) {
             return next(new AppError('No tienes permiso para añadir temas a este módulo, o el grupo está inactivo.', 403));
        }

        const existingThemes = await Theme.find({ module_id: moduleId }).sort('orden');
        const nextOrder = existingThemes.length > 0 ? existingThemes[existingThemes.length - 1].orden + 1 : 1;

        const newTheme = await Theme.create({
            nombre,
            descripcion,
            module_id: moduleId,
            orden: nextOrder,
        });

        res.status(201).json(newTheme);
    } catch (error) {
        console.error('Error creando tema:', error);
        next(error);
    }
};

// @desc    Asignar Contenido (Recurso o Actividad) a un Tema
// @route   POST /api/learning-paths/themes/:themeId/assign-content
// @access  Privado/Docente, Admin
const assignContentToTheme = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.themeId)) {
        return next(new AppError('El ID del tema no tiene un formato válido.', 400));
    }
    const { themeId } = req.params;
    const { type, resource_id, activity_id, fecha_inicio, fecha_fin, puntos_maximos, intentos_permitidos, tiempo_limite } = req.body;

    if (!type || (!resource_id && !activity_id)) {
        return next(new AppError('Debe especificar el tipo de contenido y proporcionar un resource_id o activity_id.', 400));
    }
    if (type !== 'Resource' && type !== 'Activity') {
         return next(new AppError('Tipo de asignación inválido. Debe ser "Resource" o "Activity".', 400));
    }
    if (type === 'Resource' && !resource_id) {
         return next(new AppError('Debe proporcionar un resource_id válido para el tipo Resource.', 400));
    } else if (type === 'Activity' && !activity_id) {
         return next(new AppError('Debe proporcionar un activity_id válido para el tipo Activity.', 400));
    }
    if (resource_id && activity_id) {
         return next(new AppError('Solo se puede asignar un Resource o una Activity a la vez.', 400));
    }

    try {
        const theme = await Theme.findById(themeId).populate({
            path: 'module_id',
            populate: {
                path: 'learning_path_id',
                populate: {
                    path: 'group_id',
                    select: 'docente_id activo'
                }
            }
        });

        if (!theme) {
            return next(new AppError('Tema no encontrado.', 404));
        }
        if (!theme.module_id || !theme.module_id.learning_path_id || !theme.module_id.learning_path_id.group_id || !theme.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !theme.module_id.learning_path_id.group_id.activo) {
             return next(new AppError('No tienes permiso para añadir contenido a este tema. No te pertenece o el grupo está inactivo.', 403));
        }

        let contentItem = null;
        let contentItemType = null;
        if (type === 'Resource' && resource_id) {
            contentItem = await Resource.findById(resource_id);
            if (!contentItem) return next(new AppError('Recurso no encontrado.', 404));
            contentItemType = contentItem.type;
        } else if (type === 'Activity' && activity_id) {
            contentItem = await Activity.findById(activity_id);
            if (!contentItem) return next(new AppError('Actividad no encontrada.', 404));
            contentItemType = contentItem.type;
        }

        const lastAssignmentInTheme = await ContentAssignment.findOne({ theme_id: themeId })
            .sort({ orden: -1 })
            .select('orden');

        const nextOrder = lastAssignmentInTheme ? lastAssignmentInTheme.orden + 1 : 1;

        const assignmentFields = {
            theme_id: themeId, type, resource_id, activity_id, orden: nextOrder,
        };

         if (theme?.module_id?.learning_path_id?.group_id) {
              assignmentFields.group_id = theme.module_id.learning_path_id.group_id._id;
              assignmentFields.docente_id = theme.module_id.learning_path_id.group_id.docente_id;
         } else {
              console.error('Error lógico: La verificación de propiedad pasó pero no se pudo obtener group_id/docente_id del tema.');
              return next(new AppError('La estructura del tema o su jerarquía es inválida y no se pudo procesar la asignación.', 400));
         }

        if (fecha_inicio !== undefined && fecha_inicio !== null && fecha_inicio !== '') {
            const date = new Date(fecha_inicio);
            if (!isNaN(date.getTime())) {
                assignmentFields.fecha_inicio = date;
            } else {
                 console.warn(`Fecha de inicio inválida proporcionada para asignación ${contentItem?._id || 'N/A'}. Ignorando.`);
            }
        }
         if (fecha_fin !== undefined && fecha_fin !== null && fecha_fin !== '') {
            const date = new Date(fecha_fin);
            if (!isNaN(date.getTime())) {
                assignmentFields.fecha_fin = date;
            } else {
                console.warn(`Fecha de fin inválida proporcionada para asignación ${contentItem?._id || 'N/A'}. Ignorando.`);
            }
        }
        if (assignmentFields.fecha_inicio && assignmentFields.fecha_fin && assignmentFields.fecha_fin <= assignmentFields.fecha_inicio) {
            return next(new AppError('La fecha de fin proporcionada no puede ser anterior o igual a la fecha de inicio proporcionada.', 400));
        }

        const isActivityAssignment = type === 'Activity';
        const isQuizOrCuestionarioAssignment = isActivityAssignment && (contentItemType === 'Quiz' || contentItemType === 'Cuestionario');
        const isActivityAssignmentWithPoints = isActivityAssignment && (contentItemType === 'Quiz' || contentItemType === 'Cuestionario' || contentItemType === 'Trabajo');

        if (isActivityAssignmentWithPoints) {
             if (puntos_maximos !== undefined && puntos_maximos !== null && puntos_maximos !== '') {
                 const numPuntos = parseFloat(puntos_maximos);
                 if (isNaN(numPuntos) || numPuntos < 0) {
                     return next(new AppError('Valor inválido para puntos_maximos. Debe ser un número no negativo.', 400));
                 }
                 assignmentFields.puntos_maximos = numPuntos;
             }
        }
         if (isQuizOrCuestionarioAssignment) {
             if (intentos_permitidos !== undefined && intentos_permitidos !== null && intentos_permitidos !== '') {
                 const numIntentos = parseInt(intentos_permitidos, 10);
                 if (isNaN(numIntentos) || numIntentos < 0 || !Number.isInteger(numIntentos)) {
                     return next(new AppError('Valor inválido para intentos_permitidos. Debe ser un número entero no negativo.', 400));
                 }
                  assignmentFields.intentos_permitidos = numIntentos;
             }
         }
        if (isQuizOrCuestionarioAssignment) {
            if (tiempo_limite !== undefined && tiempo_limite !== null && tiempo_limite !== '') {
                 const numTiempo = parseInt(tiempo_limite, 10);
                 if (isNaN(numTiempo) || numTiempo <= 0 || !Number.isInteger(numTiempo)) {
                     return next(new AppError(`Valor inválido para tiempo_limite. Debe ser un número entero positivo en minutos para ${contentItemType}.`, 400));
                 }
                  assignmentFields.tiempo_limite = numTiempo;
             }
         }

        const newAssignment = new ContentAssignment(assignmentFields);
        await newAssignment.save();

        console.log(`Asignación creada: ${newAssignment._id} (Tipo Asignación: ${newAssignment.type}, Tipo Contenido: ${contentItemType || 'N/A'}, Orden: ${newAssignment.orden}, Estado: ${newAssignment.status})`);

        const populatedAssignment = await ContentAssignment.findById(newAssignment._id)
             .populate('resource_id', 'title type')
             .populate('activity_id', 'title type');

        res.status(201).json(populatedAssignment);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next(new AppError(`Error de validación al crear la asignación. ${messages.join('. ')}`, 400));
        }
        if (error.name === 'CastError') {
             return next(new AppError('ID(s) inválido(s) para el contenido o tema.', 400));
        }
        console.error('Error al crear asignación de contenido:', error);
        next(error);
    }
};

// @desc    Obtener Rutas de Aprendizaje para un grupo (Vista Docente)
// @route   GET /api/learning-paths/groups/:groupId/docente
// Acceso: Privado/Docente (dueño del grupo)
const getGroupLearningPathsForDocente = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
        return next(new AppError('El ID del grupo no tiene un formato válido.', 400));
    }
    const skip = (pageNumber - 1) * limitNumber;
    const { groupId } = req.params;
    const docenteId = req.user._id;

    try {
        const group = await Group.findOne({ _id: groupId, docente_id: docenteId, activo: true });
        if (!group) {
            return next(new AppError('Grupo no encontrado, no está activo o no te pertenece.', 404));
        }

        const filter = { group_id: groupId };
        const totalItems = await LearningPath.countDocuments(filter);
        const learningPaths = await LearningPath.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: learningPaths,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });
    } catch (error) {
        console.error('Error al obtener rutas de aprendizaje del grupo (Docente):', error);
        next(error);
    }
};

// @desc    Obtener Rutas de Aprendizaje para un grupo (Vista Estudiante)
// @route   GET /api/learning-paths/groups/:groupId/student
// Acceso: Privado/Estudiante (miembro aprobado del grupo)
const getGroupLearningPathsForStudent = async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber <= 0 || limitNumber <= 0) {
        return next(new AppError('Los parámetros page y limit deben ser números positivos.', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
        return next(new AppError('El ID del grupo no tiene un formato válido.', 400));
    }
    const skip = (pageNumber - 1) * limitNumber;
    const { groupId } = req.params;
    const userId = req.user._id;
    const userType = req.user.tipo_usuario;

    if (userType !== 'Estudiante') {
        return next(new AppError('Solo los estudiantes pueden ver rutas de aprendizaje de grupos a los que pertenecen', 403));
    }

    try {
        const approvedMembership = await Membership.findOne({
            usuario_id: userId,
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        });

        if (!approvedMembership) {
            return next(new AppError('Grupo no encontrado o no eres miembro aprobado de este grupo', 404));
        }

        const group = await Group.findById(groupId); 
        if (!group || !group.activo) {
            return next(new AppError('Este grupo ya no está activo o no ha sido encontrado.', 404));
        }

        const filter = { group_id: groupId };
        const totalItems = await LearningPath.countDocuments(filter);
        const learningPaths = await LearningPath.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean();

        const totalPages = Math.ceil(totalItems / limitNumber);

        res.status(200).json({
            data: learningPaths,
            pagination: {
                totalItems,
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
                nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
                prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            }
        });
    } catch (error) {
        console.error('Error al obtener rutas de aprendizaje del grupo (Estudiante):', error);
        next(error);
    }
};

// @desc    Obtener la estructura completa de una Ruta de Aprendizaje específica
// @route   GET /api/learning-paths/:pathId/structure
// Acceso: Privado/Docente (dueño del grupo) O Estudiante (miembro aprobado del grupo)
const getLearningPathStructure = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.pathId)) {
        return next(new AppError('El ID de la ruta de aprendizaje no tiene un formato válido.', 400));
    }
    const { pathId } = req.params;
    const userId = req.user._id;
    const userType = req.user.tipo_usuario;

    try {
        const learningPath = await LearningPath.findById(pathId).populate({ path: 'group_id', select: '_id nombre activo docente_id' });

        if (!learningPath) {
            return next(new AppError('Ruta de aprendizaje no encontrada', 404));
        }
        if (learningPath.group_id && !learningPath.group_id.activo) {
            return next(new AppError('El grupo asociado a esta ruta de aprendizaje ha sido archivado y no puedes acceder a su contenido.', 403));
        }

        let canView = false;
        if (userType === 'Docente') {
            if (learningPath.group_id && learningPath.group_id.docente_id.equals(userId)) {
                canView = true;
            }
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
        if (!canView) {
            return next(new AppError('No tienes permiso para ver esta ruta de aprendizaje o el grupo ha sido archivado.', 403));
        }

        const modules = await Module.find({ learning_path_id: pathId }).sort('orden');
        const pathStructure = {
            _id: learningPath._id,
            nombre: learningPath.nombre,
            descripcion: learningPath.descripcion,
            fecha_inicio: learningPath.fecha_inicio,
            fecha_fin: learningPath.fecha_fin,
            activo: learningPath.activo,
            group_id: learningPath.group_id ? {
                _id: learningPath.group_id._id,
                nombre: learningPath.group_id.nombre,
                activo: learningPath.group_id.activo
            } : null,
            modules: []
        };

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
        next(error);
    }
};

// @desc    Obtener todas las Rutas de Aprendizaje asignadas al usuario autenticado con su estado
// @route   GET /api/learning-paths/my-assigned
// Acceso:  Privado (manejado por el middleware 'protect')
const getMyAssignedLearningPaths = async (req, res, next) => {
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
                data: [], // Cambiado de success y count a data
                pagination: { totalItems: 0, currentPage: 1, itemsPerPage: 0, totalPages: 0 } // Añadir paginación básica
            });
        }

        const rawAssignedPaths = await LearningPath.find({
            group_id: { $in: activeGroupIds }
        })
        .populate('group_id', 'nombre')
        .lean(); // Usar lean para mejor rendimiento

        const formattedAssignedPaths = await Promise.all(rawAssignedPaths.map(async (lp) => {
            if (!lp.group_id) {
                console.warn(`Ruta de aprendizaje ${lp._id} tiene una referencia de grupo nula o el grupo no fue populado.`);
                return null;
            }
            const studentProgress = await Progress.findOne({
                student_id: userId,
                learning_path_id: lp._id
            }).lean();
            const status = studentProgress ? studentProgress.path_status : 'No Iniciado';
            return { ...lp, status }; // No es necesario mapear cada campo, solo añadir status
        }));

        const finalPaths = formattedAssignedPaths.filter(item => item !== null);
        // No se implementa paginación completa aquí ya que la lógica de progreso es por ruta.
        // Si se necesitara paginación, se aplicaría a `rawAssignedPaths` y luego se calcularía el progreso
        // solo para las rutas de la página actual.
        res.status(200).json({
            data: finalPaths,
            // Podríamos añadir una paginación simulada o real si es necesario
            // Por ahora, se devuelven todas las rutas asignadas activas.
        });
    } catch (error) {
        console.error('Error al obtener las rutas de aprendizaje asignadas:', error);
        next(error);
    }
};

// @desc    Actualizar detalles de una Ruta de Aprendizaje
// @route   PUT /api/learning-paths/:learningPathId
// @access  Privado/Docente
const updateLearningPath = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.learningPathId)) {
        return next(new AppError('El ID de la ruta de aprendizaje no tiene un formato válido.', 400));
    }
    const { learningPathId } = req.params;
    const { nombre, descripcion } = req.body;
    const docenteId = req.user._id;

    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
        return next(new AppError('El nombre debe ser un texto no vacío si se proporciona', 400));
    }
    if (descripcion !== undefined && typeof descripcion !== 'string') {
        return next(new AppError('La descripción debe ser texto si se proporciona', 400));
    }
    if (nombre === undefined && descripcion === undefined) {
        return next(new AppError('Se debe proporcionar nombre o descripción para actualizar la ruta', 400));
    }

    try {
        const learningPath = await LearningPath.findById(learningPathId).populate({ path: 'group_id', select: 'nombre docente_id activo' });
        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId) || !learningPath.group_id.activo) {
            return next(new AppError('Ruta de aprendizaje no encontrada, no te pertenece o el grupo está inactivo.', 404));
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
            return next(new AppError(`Error de validación al actualizar ruta de aprendizaje. ${messages.join('. ')}`, 400));
        }
        console.error('Error actualizando ruta de aprendizaje:', error);
        next(error);
    }
};

// @desc    Eliminar una Ruta de Aprendizaje y todo su contenido asociado
// @route   DELETE /api/learning-paths/:learningPathId
// @access  Privado/Docente
const deleteLearningPath = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.learningPathId)) {
        return next(new AppError('El ID de la ruta de aprendizaje no tiene un formato válido.', 400));
    }
    const { learningPathId } = req.params;
    const { nombreConfirmacion } = req.body;
    const docenteId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const learningPath = await LearningPath.findById(learningPathId).populate({
            path: 'group_id',
            select: 'nombre docente_id activo'
        }).session(session);

        if (!learningPath || !learningPath.group_id || !learningPath.group_id.docente_id.equals(docenteId) || !learningPath.group_id.activo) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('Ruta de aprendizaje no encontrada, no te pertenece o el grupo está inactivo.', 404));
        }

        if (!nombreConfirmacion || nombreConfirmacion.trim() !== learningPath.nombre) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError('El nombre de la ruta de aprendizaje no coincide. Escribe el nombre exacto para confirmar.', 400));
        }

        const modules = await Module.find({ learning_path_id: learningPathId }).session(session);
        const moduleIds = modules.map(m => m._id);

        if (moduleIds.length > 0) {
            const themes = await Theme.find({ module_id: { $in: moduleIds } }).session(session);
            const themeIds = themes.map(t => t._id);
            if (themeIds.length > 0) {
                await ContentAssignment.deleteMany({ theme_id: { $in: themeIds } }).session(session);
            }
            await Theme.deleteMany({ module_id: { $in: moduleIds } }).session(session);
        }
        await Module.deleteMany({ learning_path_id: learningPathId }).session(session);
        await Progress.deleteMany({ learning_path_id: learningPathId }).session(session);

        if (req.user.tipo_usuario === 'Docente') {
            await User.findByIdAndUpdate(docenteId,
                { $inc: { 'usage.routesCreated': -1 } },
                { session }
            );
            console.log(`Usage counter routesCreated decremented for teacher ${docenteId} due to learning path deletion.`);
        }

        await LearningPath.findByIdAndDelete(learningPathId).session(session);
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: `Ruta de aprendizaje '${learningPath.nombre}' y todo su contenido asociado han sido eliminados.` });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error durante la eliminación en cascada de la ruta de aprendizaje:', error);
        next(error);
    }
};

// @desc    Actualizar un Módulo específico
// @route   PUT /api/modules/:moduleId
// @access  Privado/Docente
const updateModule = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.moduleId)) {
        return next(new AppError('El ID del módulo no tiene un formato válido.', 400));
    }
    const { moduleId } = req.params;
    const { nombre, descripcion, orden } = req.body;

    if (nombre === undefined && descripcion === undefined && orden === undefined) {
        return next(new AppError('Se deben proporcionar datos para actualizar el módulo (nombre, descripción u orden).', 400));
    }
    if (orden !== undefined && (typeof orden !== 'number' || orden < 0)) {
        return next(new AppError('El orden debe ser un número válido no negativo.', 400));
    }

    try {
        const moduleToUpdate = await Module.findById(moduleId).populate({
            path: 'learning_path_id',
            populate: {
                path: 'group_id',
                select: 'docente_id'
            }
        });

        if (!moduleToUpdate) {
            return next(new AppError('Módulo no encontrado.', 404));
        }
        if (!moduleToUpdate.learning_path_id || !moduleToUpdate.learning_path_id.group_id || !moduleToUpdate.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return next(new AppError('No tienes permiso para actualizar este módulo. No te pertenece.', 403));
        }

        if (nombre !== undefined) moduleToUpdate.nombre = nombre;
        if (descripcion !== undefined) moduleToUpdate.descripcion = descripcion;
        if (orden !== undefined) moduleToUpdate.orden = orden;

        const updatedModule = await moduleToUpdate.save();
        res.status(200).json(updatedModule);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next(new AppError(`Error de validación al actualizar el módulo. ${messages.join('. ')}`, 400));
        }
        console.error('Error al actualizar módulo:', error);
        next(error);
    }
};

// @desc    Eliminar un Módulo (y sus Temas y Asignaciones en cascada)
// @route   DELETE /api/modules/:moduleId
// @access  Privado/Docente
const deleteModule = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.moduleId)) {
        return next(new AppError('El ID del módulo no tiene un formato válido.', 400));
    }
    const { moduleId } = req.params;

    try {
        const module = await Module.findById(moduleId).populate({
            path: 'learning_path_id',
            populate: {
                path: 'group_id',
                select: 'docente_id'
            }
        });

        if (!module) {
            return next(new AppError('Módulo no encontrado.', 404));
        }
        if (!module.learning_path_id || !module.learning_path_id.group_id || !module.learning_path_id.group_id.docente_id.equals(req.user._id)) {
             return next(new AppError('No tienes permiso para eliminar este módulo. No te pertenece.', 403));
        }

        const themeIds = await Theme.find({ module_id: moduleId }, '_id').lean();
        if (themeIds.length > 0) {
            const idsToDelete = themeIds.map(theme => theme._id);
            await ContentAssignment.deleteMany({ theme_id: { $in: idsToDelete } });
            console.log(`Eliminadas asignaciones de contenido para los temas del módulo ${moduleId}.`);
        }

        await Theme.deleteMany({ module_id: moduleId });
        console.log(`Eliminados temas del módulo ${moduleId}.`);

        await Module.deleteOne({ _id: moduleId });
        console.log(`Módulo ${moduleId} eliminado.`);

        res.status(200).json({ message: 'Módulo y su contenido asociado eliminados con éxito.' });
    } catch (error) {
        console.error('Error eliminando módulo:', error);
        next(error);
    }
};

// @desc    Actualizar un Tema específico
// @route   PUT /api/themes/:themeId
// @access  Privado/Docente
const updateTheme = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.themeId)) {
        return next(new AppError('El ID del tema no tiene un formato válido.', 400));
    }
    const { themeId } = req.params;
    const { nombre, descripcion, orden } = req.body;

    if (nombre === undefined && descripcion === undefined && orden === undefined) {
        return next(new AppError('Se deben proporcionar datos para actualizar el tema (nombre, descripción u orden).', 400));
    }
    if (orden !== undefined && (typeof orden !== 'number' || orden < 0)) {
        return next(new AppError('El orden debe ser un número válido no negativo.', 400));
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
            return next(new AppError('Tema no encontrado.', 404));
        }
        if (!themeToUpdate.module_id ||
            !themeToUpdate.module_id.learning_path_id ||
            !themeToUpdate.module_id.learning_path_id.group_id ||
            !themeToUpdate.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) ||
            !themeToUpdate.module_id.learning_path_id.group_id.activo)
        {
            return next(new AppError('No tienes permiso para actualizar este tema. No te pertenece o el grupo está inactivo.', 403));
        }

        if (nombre !== undefined) themeToUpdate.nombre = nombre;
        if (descripcion !== undefined) themeToUpdate.descripcion = descripcion;
        if (orden !== undefined) themeToUpdate.orden = orden;

        const updatedTheme = await themeToUpdate.save();
        res.status(200).json(updatedTheme);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next(new AppError(`Error de validación al actualizar el tema. ${messages.join('. ')}`, 400));
        }
        console.error('Error al actualizar tema:', error);
        next(error);
    }
};

// @desc    Eliminar un Tema (y sus Asignaciones en cascada)
// @route   DELETE /api/themes/:themeId
// @access  Privado/Docente
const deleteTheme = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.themeId)) {
        return next(new AppError('El ID del tema no tiene un formato válido.', 400));
    }
    const { themeId } = req.params;

    try {
        const theme = await Theme.findById(themeId).populate({
            path: 'module_id',
            populate: {
                path: 'learning_path_id',
                populate: {
                    path: 'group_id',
                    select: 'docente_id activo'
                }
            }
        });

        if (!theme) {
            return next(new AppError('Tema no encontrado.', 404));
        }
        if (!theme.module_id || !theme.module_id.learning_path_id || !theme.module_id.learning_path_id.group_id || !theme.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !theme.module_id.learning_path_id.group_id.activo) {
             return next(new AppError('No tienes permiso para eliminar este tema. No te pertenece o el grupo está inactivo.', 403));
        }

        await ContentAssignment.deleteMany({ theme_id: themeId });
        console.log(`Eliminadas asignaciones de contenido para el tema ${themeId}.`);

        await Theme.deleteOne({ _id: themeId });
        console.log(`Tema ${themeId} eliminado.`);

        res.status(200).json({ message: 'Tema y su contenido asociado eliminados con éxito.' });
    } catch (error) {
        console.error('Error eliminando tema:', error);
        next(error);
    }
};

// @desc    Actualizar una Asignación de Contenido específica
// @route   PUT /api/content-assignments/:assignmentId
// @access  Privado/Docente, Admin
const updateContentAssignment = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    const { assignmentId } = req.params;
    const { fecha_inicio, fecha_fin, puntos_maximos, intentos_permitidos, tiempo_limite } = req.body;

    const allowedFields = ['fecha_inicio', 'fecha_fin', 'puntos_maximos', 'intentos_permitidos', 'tiempo_limite'];
    const updateData = {};

    allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
            const value = req.body[field];
            if (value === '' || value === null) {
                 updateData[field] = undefined;
            } else {
                if (field === 'puntos_maximos' || field === 'intentos_permitidos' || field === 'tiempo_limite') {
                     const numValue = parseFloat(value);
                     if (isNaN(numValue) || numValue < 0) {
                         return next(new AppError(`Valor inválido para ${field}. Debe ser un número no negativo.`, 400));
                     }
                      if ((field === 'intentos_permitidos' || field === 'tiempo_limite') && !Number.isInteger(numValue)) {
                          return next(new AppError(`Valor inválido para ${field}. Debe ser un número entero no negativo.`, 400));
                      }
                     updateData[field] = numValue;
                 } else if (field === 'fecha_inicio' || field === 'fecha_fin') {
                     const date = new Date(value);
                     if (isNaN(date.getTime())) {
                         return next(new AppError(`Fecha inválida para ${field}.`, 400));
                     }
                     updateData[field] = date;
                 } else {
                    updateData[field] = value;
                 }
            }
        }
    });

    if (updateData.hasOwnProperty('fecha_inicio') && updateData.hasOwnProperty('fecha_fin')) {
        const inicio = updateData.fecha_inicio;
        const fin = updateData.fecha_fin;
        if (inicio instanceof Date && !isNaN(inicio.getTime()) && fin instanceof Date && !isNaN(fin.getTime())) {
             if (fin < inicio) {
                 return next(new AppError('La fecha de fin no puede ser anterior a la fecha de inicio.', 400));
             }
        }
    }
    if (Object.keys(updateData).length === 0) {
         return next(new AppError('Se deben proporcionar datos válidos para actualizar la asignación.', 400));
    }

    try {
        const assignmentToUpdate = await ContentAssignment.findById(assignmentId).populate({
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

        if (!assignmentToUpdate) {
            return next(new AppError('Asignación de contenido no encontrada.', 404));
        }
        if (!assignmentToUpdate.theme_id || !assignmentToUpdate.theme_id.module_id || !assignmentToUpdate.theme_id.module_id.learning_path_id || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !assignmentToUpdate.theme_id.module_id.learning_path_id.group_id.activo) {
             return next(new AppError('No tienes permiso para actualizar esta asignación. No te pertenece o el grupo está inactivo.', 403));
        }

        const updatedAssignment = await ContentAssignment.findByIdAndUpdate(
            assignmentId,
            { $set: updateData },
            { new: true, runValidators: true, context: 'query' }
        );

         if (!updatedAssignment) {
             return next(new AppError('Error al guardar la asignación actualizada.', 500));
         }

         const populatedUpdatedAssignment = await ContentAssignment.findById(updatedAssignment._id)
             .populate('resource_id', 'title type')
             .populate('activity_id', 'title type');

        res.status(200).json(populatedUpdatedAssignment);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next(new AppError(`Error de validación al actualizar la asignación. ${messages.join('. ')}`, 400));
        }
        console.error('Error al actualizar asignación de contenido:', error);
        next(error);
    }
};

// @desc    Eliminar una Asignación de Contenido específica
// @route   DELETE /api/content-assignments/:assignmentId
// @access  Privado/Docente
const deleteContentAssignment = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    const { assignmentId } = req.params;

    try {
        const assignmentToDelete = await ContentAssignment.findById(assignmentId);
        if (!assignmentToDelete) {
            return next(new AppError('Asignación de contenido no encontrada para eliminar.', 404));
        }

        const themeId = assignmentToDelete.theme_id;
        const deletedOrder = assignmentToDelete.orden;

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

         if (!assignmentWithOwnership || !assignmentWithOwnership.theme_id || !assignmentWithOwnership.theme_id.module_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) || !assignmentWithOwnership.theme_id.module_id.learning_path_id.group_id.activo) {
              return next(new AppError('No tienes permiso para eliminar esta asignación. No te pertenece o el grupo está inactivo.', 403));
         }

        await ContentAssignment.deleteOne({ _id: assignmentId });
        console.log(`Asignación de contenido ${assignmentId} (orden ${deletedOrder} en tema ${themeId}) eliminada.`);

        const assignmentsToShift = await ContentAssignment.find({
            theme_id: themeId,
            orden: { $gt: deletedOrder }
        }).sort({ orden: 1 });

        if (assignmentsToShift.length > 0) {
            const bulkOps = assignmentsToShift.map(assignment => ({
                updateOne: {
                    filter: { _id: assignment._id },
                    update: { $inc: { orden: -1 } }
                }
            }));

            const bulkWriteResult = await ContentAssignment.bulkWrite(bulkOps);
            console.log(`Reordenados ${bulkWriteResult.modifiedCount} asignaciones después de la eliminación.`);
        }

        res.status(200).json({ message: 'Asignación de contenido eliminada y orden reorganizado con éxito.' });
    } catch (error) {
        console.error('Error eliminando o reorganizando asignación de contenido:', error);
        next(error);
    }
};

// @desc    Obtener una asignación de contenido específica por ID
// @route   GET /api/learning-paths/assignments/:assignmentId
// @access  Privado/Docente
const getContentAssignmentById = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    try {
        const assignmentId = req.params.assignmentId;
        const assignment = await ContentAssignment.findById(assignmentId)
             .populate({
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
             })
             .populate('resource_id')
             .populate('activity_id');

        if (!assignment) {
            return next(new AppError('Asignación no encontrada.', 404));
        }

        if (!assignment.theme_id ||
            !assignment.theme_id.module_id ||
            !assignment.theme_id.module_id.learning_path_id ||
            !assignment.theme_id.module_id.learning_path_id.group_id ||
            !assignment.theme_id.module_id.learning_path_id.group_id.docente_id.equals(req.user._id) ||
            !assignment.theme_id.module_id.learning_path_id.group_id.activo ) {
            return next(new AppError('No tienes permiso para ver esta asignación o el grupo está inactivo.', 403));
        }

        const responseAssignment = {
            ...assignment.toJSON(),
            contentItemType: assignment.type === 'Resource' ? assignment.resource_id?.type : assignment.activity_id?.type
        };

        res.status(200).json(responseAssignment);
    } catch (error) {
        console.error('Error fetching content assignment by ID:', error);
        next(error);
    }
};

// @desc    Update Content Assignment Status
// @route   PUT /api/learning-paths/assignments/:assignmentId/status
// @access  Privado/Docente, Admin
const updateContentAssignmentStatus = async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
        return next(new AppError('El ID de la asignación no tiene un formato válido.', 400));
    }
    const { assignmentId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Draft', 'Open', 'Closed'];
    if (!status || !allowedStatuses.includes(status)) {
        return next(new AppError(`Estado inválido. El estado debe ser uno de: ${allowedStatuses.join(', ')}`, 400));
    }

    try {
        const assignment = await ContentAssignment.findById(assignmentId);
        if (!assignment) {
            return next(new AppError('Asignación no encontrada.', 404));
        }
        if (assignment.docente_id.toString() !== req.user._id.toString() && req.user.userType !== 'Administrador') { // Asumiendo que userType está en req.user
            return next(new AppError('No tienes permiso para modificar el estado de esta asignación.', 403));
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
                        path: 'theme_id',
                        select: 'nombre module_id',
                        populate: {
                            path: 'module_id',
                            select: 'nombre learning_path_id',
                            populate: {
                                path: 'learning_path_id',
                                select: 'nombre group_id',
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

                    const approvedMembers = await Membership.find({
                        grupo_id: groupId,
                        estado_solicitud: 'Aprobado'
                    }).populate('usuario_id', 'tipo_usuario');

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
            }
        }
        res.status(200).json({ message: `Estado de la asignación actualizado a "${status}"`, assignment });
    } catch (error) {
        console.error('Error al actualizar estado de asignación:', error);
        next(error);
    }
};

// @desc    Obtener todas las actividades asignadas a un estudiante en una ruta de aprendizaje
// @route   GET /api/learning-paths/:learningPathId/student-activities
// @access  Privado/Estudiante
const getStudentActivitiesForLearningPath = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.learningPathId)) {
      return next(new AppError('El ID de la ruta de aprendizaje no tiene un formato válido.', 400));
  }
  try {
    const { learningPathId } = req.params;
    const studentId = req.user._id;

    const modules = await Module.find({ learning_path_id: learningPathId });
    const moduleIds = modules.map(m => m._id);
    const themes = await Theme.find({ module_id: { $in: moduleIds } });
    const themeIds = themes.map(t => t._id);

    const assignments = await ContentAssignment.find({ theme_id: { $in: themeIds }, type: 'Activity' })
      .populate('activity_id');

    const results = await Promise.all(assignments.map(async (assignment) => {
      const lastSubmission = await Submission.findOne({
        assignment_id: assignment._id,
        student_id: studentId
      }).sort({ fecha_envio: -1 });

      return {
        _id: assignment._id,
        activity_id: assignment.activity_id,
        fecha_inicio: assignment.fecha_inicio,
        fecha_fin: assignment.fecha_fin,
        status: assignment.status,
        lastSubmission: lastSubmission ? {
          calificacion: lastSubmission.calificacion,
          estado_envio: lastSubmission.estado_envio,
          fecha_envio: lastSubmission.fecha_envio
        } : null
      };
    }));

    res.json({ activities: results });
  } catch (error) {
    console.error('Error al obtener actividades del estudiante', error);
    next(error);
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