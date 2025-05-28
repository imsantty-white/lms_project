// src/services/notificationService.js
// A mock authFetch, replace with your actual implementation
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token'); // Or get from AuthContext
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'API request failed');
  }
  return response.json();
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getNotifications = async (page = 1, limit = 10) => {
  return authFetch(`${API_BASE_URL}/api/notifications?page=${page}&limit=${limit}`);
};

export const markNotificationAsRead = async (notificationId) => {
  return authFetch(`${API_BASE_URL}/api/notifications/${notificationId}/mark-read`, {
    method: 'PATCH',
  });
};

export const markAllNotificationsAsRead = async () => {
  return authFetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
    method: 'POST',
  });
};

// --- NUEVAS FUNCIONES PARA BORRAR ---

/**
 * @desc Borra una notificación específica del usuario autenticado.
 * @param {string} notificationId - El ID de la notificación a borrar.
 * @returns {Promise<Object>} La respuesta de la API (ej: { success: true, message: 'Notificación eliminada exitosamente.' })
 */
export const deleteNotification = async (notificationId) => {
  return authFetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });
};

/**
 * @desc Borra todas las notificaciones del usuario autenticado.
 * @returns {Promise<Object>} La respuesta de la API (ej: { success: true, message: 'Se eliminaron X notificaciones.', deletedCount: X })
 */
export const deleteAllNotifications = async () => {
  // Asegúrate de que esta ruta coincida con tu ruta DELETE en el backend para borrar todas.
  // En tu `notificationRoutes.js`, la definimos como `router.delete('/all', protect, deleteAllNotifications);`
  // Si tu backend usa `/` sin el `/all`, ajusta esto.
  return authFetch(`${API_BASE_URL}/api/notifications/all`, {
    method: 'DELETE',
  });
};