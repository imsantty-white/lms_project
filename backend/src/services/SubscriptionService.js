// backend/src/services/SubscriptionService.js
const User = require('../models/UserModel');
const Plan = require('../models/PlanModel');
const mongoose = require('mongoose');

const SubscriptionService = {
    /**
     * Checks if a user's subscription is currently active.
     * @param {string|mongoose.Types.ObjectId} userId - The ID of the user.
     * @returns {Promise<Object>} An object indicating subscription status:
     *                            { isActive: boolean, message: string, plan: Object|null, user: Object|null }
     */
    checkSubscriptionStatus: async (userId) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return { isActive: false, message: 'ID de usuario inválido.', plan: null, user: null };
        }

        try {
            const user = await User.findById(userId).populate('planId'); // Populate the plan details

            if (!user) {
                return { isActive: false, message: 'Usuario no encontrado.', plan: null, user: null };
            }

            if (user.tipo_usuario !== 'Docente') {
                // Non-teachers don't have plans in this context, or their access is managed differently
                return { isActive: true, message: 'No se requiere plan para este tipo de usuario.', plan: null, user };
            }

            if (!user.planId) {
                // This case might happen if a teacher was created before plan system, or an error occurred.
                // Consider assigning a default free plan here if appropriate.
                return { isActive: false, message: 'El docente no tiene un plan asignado.', plan: null, user };
            }

            // The plan is populated directly in user.planId object
            const plan = user.planId;

            if (!plan.isActive) {
                return { isActive: false, message: `El plan "${plan.name}" asignado al docente no está activo. Contacte al administrador.`, plan, user };
            }

            // Check subscription end date
            // If subscriptionEndDate is null, it might mean indefinite (e.g., for a default free plan)
            if (plan.duration !== 'indefinite' && user.subscriptionEndDate) {
                if (new Date(user.subscriptionEndDate) < new Date()) {
                    return { isActive: false, message: `La suscripción al plan "${plan.name}" ha expirado el ${new Date(user.subscriptionEndDate).toLocaleDateString()}.`, plan, user };
                }
            } else if (plan.duration !== 'indefinite' && !user.subscriptionEndDate) {
                // A plan with a fixed duration should have an end date.
                return { isActive: false, message: `La suscripción al plan "${plan.name}" no tiene fecha de finalización definida.`, plan, user };
            }


            // If all checks pass
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
        today.setHours(0, 0, 0, 0); // Compare with the beginning of today

        try {
            // Find teachers whose subscriptionEndDate is in the past
            // and whose plan is not indefinite (as indefinite plans shouldn't expire this way)
            const expiredUsers = await User.find({
                tipo_usuario: 'Docente',
                subscriptionEndDate: { $lt: today },
                planId: { $ne: null } // Ensure they have a plan that could expire
            }).populate('planId');

            if (expiredUsers.length === 0) {
                console.log('No hay suscripciones de docentes expiradas para procesar.');
                return { success: true, message: 'No hay suscripciones expiradas.', deactivatedCount: 0 };
            }

            const defaultFreePlan = await Plan.findOne({ isDefaultFree: true, isActive: true });
            if (!defaultFreePlan) {
                console.error('Error Crítico: No se encontró un plan gratuito predeterminado activo para asignar a usuarios con suscripciones expiradas.');
                // Consider sending an admin notification here
                return { success: false, message: 'No se encontró el plan gratuito predeterminado.', deactivatedCount: 0 };
            }

            let deactivatedCount = 0;
            for (const user of expiredUsers) {
                // Avoid changing plan if current plan is already the default free plan and it's indefinite
                // This check is important if subscriptionEndDate was set for a "Free" plan that was a trial
                if (user.planId && user.planId._id.equals(defaultFreePlan._id) && defaultFreePlan.duration === 'indefinite') {
                    // If they are already on the indefinite free plan, but somehow had an old expiry date,
                    // we can just nullify the expiry date.
                    if (user.subscriptionEndDate !== null) {
                        user.subscriptionEndDate = null;
                        await user.save();
                        console.log(`Fecha de expiración eliminada para el usuario ${user.email} que ya está en el plan gratuito indefinido.`);
                    }
                    continue;
                }

                // If the current plan is not the default free plan, or it is but it's not indefinite
                if (!user.planId || !user.planId._id.equals(defaultFreePlan._id) || user.planId.duration !== 'indefinite') {
                    console.log(`Suscripción expirada para el usuario ${user.email} (Plan: ${user.planId ? user.planId.name : 'N/A'}). Revirtiendo al plan "${defaultFreePlan.name}".`);

                    // Update user's plan to the default free plan
                    user.planId = defaultFreePlan._id;
                    user.subscriptionEndDate = defaultFreePlan.duration === 'indefinite' ? null : new Date(today.setDate(today.getDate() + 30)); // Example: 30 days for a temporary free plan if not indefinite

                    // Reset usage limits (optional, depends on policy)
                    // user.usage = { groupsCreated: 0, resourcesGenerated: 0, activitiesGenerated: 0 };

                    await user.save();
                    deactivatedCount++;

                    // TODO: Optionally, send a notification to the user about the plan change.
                    // await NotificationService.createNotification({ ... });
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
