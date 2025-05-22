// Assuming you have an authFetch utility or similar for authenticated API calls
// For example, if AuthContext provides a way to get the token or a pre-configured fetch
// This is a placeholder for how you might typically make authenticated requests.
// You'll need to adapt this to your project's actual auth setup.

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
