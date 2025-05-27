// Use Vite's environment variable for the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'; // Default if not set

const authService = {
  loginUser: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return await response.json(); // Should return { user, token }
    } catch (error) {
      console.error('Login error in authService:', error);
      throw error;
    }
  },

  registerUser: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      return await response.json(); // Should return { user, token } or similar
    } catch (error) {
      console.error('Registration error in authService:', error);
      throw error;
    }
  },

  getMe: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch user data');
      }
      return await response.json(); // Should return user data
    } catch (error) {
      console.error('GetMe error in authService:', error);
      throw error;
    }
  },
};

export default authService;
