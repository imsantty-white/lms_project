// backend/src/services/SubscriptionService.js
const User = require('../models/UserModel');
const Plan = require('../models/PlanModel');
const mongoose = require('mongoose');

const SubscriptionService = {
    /**
     * Checks if a user's subscription is currently active.
     * @param {string|mongoose.Types.ObjectId} userId - The ID of the user.
     * @param {Object|null} preloadedUser - Optional preloaded user object with planId populated.
     * @returns {Promise<Object>} An object indicating subscription status:
     *                            { isActive: boolean, message: string, plan: Object|null, user: Object|null }
     */
    checkSubscriptionStatus: async (userId, preloadedUser = null) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return { isActive: false, message: 'ID de usuario inválido.', plan: null, user: null };
        }

        try {
            let user = preloadedUser;

            // Verify if preloadedUser is the correct user and has planId populated as an object
            if (!user || user._id.toString() !== userId.toString() || typeof user.planId !== 'object' || user.planId === null) {
                // If no valid preloadedUser, fetch from DB
                user = await User.findById(userId).populate('planId');
            }

            if (!user) {
                return { isActive: false, message: 'Usuario no encontrado.', plan: null, user: null };
            }

            if (user.tipo_usuario !== 'Docente') {
                return { isActive: true, message: 'No se requiere plan para este tipo de usuario.', plan: null, user };
            }

            if (!user.planId) {
                return { isActive: false, message: 'El docente no tiene un plan asignado.', plan: null, user };
            }

            const plan = user.planId; // planId is already populated here

            if (!plan.isActive) {
                return { isActive: false, message: `El plan "${plan.name}" asignado al docente no está activo. Contacte al administrador.`, plan, user };
            }

            if (plan.duration !== 'indefinite' && user.subscriptionEndDate) {
                if (new Date(user.subscriptionEndDate) < new Date()) {
                    return { isActive: false, message: `La suscripción al plan "${plan.name}" ha expirado el ${new Date(user.subscriptionEndDate).toLocaleDateString()}.`, plan, user };
                }
            } else if (plan.duration !== 'indefinite' && !user.subscriptionEndDate) {
                return { isActive: false, message: `La suscripción al plan "${plan.name}" no tiene fecha de finalización definida.`, plan, user };
            }

            return { isActive: true, message: 'La suscripción está activa.', plan, user };

        } catch (error) {
            console.error(`Error al verificar el estado de la suscripción para el usuario ${userId}:`, error);
            return { isActive: false, message: 'Error interno del servidor al verificar la suscripción.', plan: null, user: null, error: error.message };
        }
    },

    /**
     * Finds users with expired subscriptions and handles them (e.g., reverts to a default plan).
     * This function is intended to be called by a scheduled job.
     */
    deactivateExpiredSubscriptions: async () => {
        console.log('Ejecutando tarea de desactivación de suscripciones expiradas...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
            const expiredUsers = await User.find({
                tipo_usuario: 'Docente',
                subscriptionEndDate: { $lt: today },
                planId: { $ne: null }
            }).populate('planId');

            if (expiredUsers.length === 0) {
                console.log('No hay suscripciones de docentes expiradas para procesar.');
                return { success: true, message: 'No hay suscripciones expiradas.', deactivatedCount: 0 };
            }

            const defaultFreePlan = await Plan.findOne({ isDefaultFree: true, isActive: true });
            if (!defaultFreePlan) {
                console.error('Error Crítico: No se encontró un plan gratuito predeterminado activo para asignar a usuarios con suscripciones expiradas.');
                return { success: false, message: 'No se encontró el plan gratuito predeterminado.', deactivatedCount: 0 };
            }

            let deactivatedCount = 0;
            for (const user of expiredUsers) {
                if (user.planId && user.planId._id.equals(defaultFreePlan._id) && defaultFreePlan.duration === 'indefinite') {
                    if (user.subscriptionEndDate !== null) {
                        user.subscriptionEndDate = null;
                        await user.save();
                        console.log(`Fecha de expiración eliminada para el usuario ${user.email} que ya está en el plan gratuito indefinido.`);
                    }
                    continue;
                }

                if (!user.planId || !user.planId._id.equals(defaultFreePlan._id) || user.planId.duration !== 'indefinite') {
                    console.log(`Suscripción expirada para el usuario ${user.email} (Plan: ${user.planId ? user.planId.name : 'N/A'}). Revirtiendo al plan "${defaultFreePlan.name}".`);

                    user.planId = defaultFreePlan._id;
                    user.subscriptionEndDate = defaultFreePlan.duration === 'indefinite' ? null : new Date(new Date().setDate(new Date().getDate() + 30)); // Example: 30 days for a temporary free plan if not indefinite

                    // Consider resetting usage, depends on policy. For now, not resetting.
                    // user.usage = { groupsCreated: 0, resourcesGenerated: 0, activitiesGenerated: 0 };

                    await user.save();
                    deactivatedCount++;
                }
            }

            console.log(`Proceso completado. ${deactivatedCount} suscripciones de docentes han sido revertidas al plan gratuito.`);
            return { success: true, message: `${deactivatedCount} suscripciones expiradas procesadas.`, deactivatedCount };

        } catch (error) {
            console.error('Error durante la desactivación de suscripciones expiradas:', error);
            return { success: false, message: 'Error interno del servidor durante la tarea programada.', error: error.message, deactivatedCount: 0 };
        }
    }
};

module.exports = SubscriptionService;
