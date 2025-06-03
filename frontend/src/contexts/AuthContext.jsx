// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; // Volvemos a usar react-toastify
import { API_BASE_URL } from '../utils/constants';
import { jwtDecode } from 'jwt-decode';

// Crea el contexto de autenticación
export const AuthContext = createContext(null);

// Configurar una instancia de Axios separada
export const axiosInstance = axios.create({ // Exportar directamente aquí
    baseURL: API_BASE_URL,
});

// CONFIGURAR EL INTERCEPTOR DE PETICIONES DE AXIOS
axiosInstance.interceptors.request.use(
  (config) => {
    // Intenta obtener el token de localStorage justo antes de cada petición
    const token = localStorage.getItem('token');

    // Si el token existe y la cabecera Authorization no está ya definida, añádela
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Componente Proveedor de Autenticación
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // Efecto PRINCIPAL para cargar Auth desde localStorage al inicio
  useEffect(() => {
      const loadAuthFromStorage = async () => {
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          let userFromStorage = null;

          if (storedUser && storedUser !== 'undefined') {
              try {
                  userFromStorage = JSON.parse(storedUser);
              } catch (error) {
                  console.error("Error parsing user from localStorage:", error);
                  localStorage.removeItem('user');
                  userFromStorage = null;
              }
          }

          if (storedToken && userFromStorage) {
              try {
                  const decodedToken = jwtDecode(storedToken);
                  const currentTime = Date.now() / 1000;

                  if (decodedToken.exp > currentTime) {
                      setToken(storedToken);
                      setUser(userFromStorage); // This will now include plan, subscriptionEndDate, usage if stored
                      console.log("Auth state set from storage.", userFromStorage);
                  } else {
                      console.log("Token expired in storage, cleaning up.");
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                  }
              } catch (error) {
                  console.error("Error decoding or verifying token from storage:", error);
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
              }
          } else {
              console.log("No valid auth data found in storage.");
          }
          setIsAuthInitialized(true);
          console.log("Auth initialization process finished.");
      };
      loadAuthFromStorage();
  }, []);

  // Función para actualizar los datos del usuario
  const fetchAndUpdateUser = async () => {
    try {
      const response = await axiosInstance.get('/api/auth/me');
      const updatedUserData = response.data.data;

      const refreshedUser = {
        _id: updatedUserData._id,
        email: updatedUserData.email,
        userType: updatedUserData.tipo_usuario,
        tipo_usuario: updatedUserData.tipo_usuario,
        nombre: updatedUserData.nombre,
        apellidos: updatedUserData.apellidos,
        institucion: updatedUserData.institucion,
        telefono: updatedUserData.telefono,
        fecha_registro: updatedUserData.fecha_registro,
        aprobado: updatedUserData.aprobado,
        activo: updatedUserData.activo,
      };

      if (updatedUserData.tipo_usuario === 'Docente') {
        refreshedUser.plan = updatedUserData.plan;
        refreshedUser.subscriptionEndDate = updatedUserData.subscriptionEndDate;
        refreshedUser.usage = updatedUserData.usage;
      }

      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));
      return refreshedUser;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logout();
      }
      return null;
    }
  };

  // Efecto para actualizar periódicamente los límites del usuario
  useEffect(() => {
    let intervalId;
    
    if (token && user?.userType === 'Docente') {
      // Actualizar cada 5 minutos
      intervalId = setInterval(fetchAndUpdateUser, 5 * 60 * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [token, user?.userType]);

  // Función para manejar el Login
  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/api/auth/login', { email, password });
      // Destructure all expected fields from response.data
      const {
        token: receivedToken,
        _id,
        email: userEmail,
        tipo_usuario,
        nombre,
        apellidos,
        // --- NEW FIELDS for teachers ---
        plan, // This will be the populated plan object
        subscriptionEndDate,
        usage
      } = response.data;

      const loggedUser = {
        _id,
        email: userEmail,
        userType: tipo_usuario, // Main field for user type checks
        tipo_usuario, // Keep for compatibility
        nombre,
        apellidos,
      };

      // If the user is a Docente, add plan-related information
      if (tipo_usuario === 'Docente') {
        loggedUser.plan = plan; // plan object from backend
        loggedUser.subscriptionEndDate = subscriptionEndDate; // date string or null
        loggedUser.usage = usage; // usage object
      }

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(loggedUser)); // Store the enhanced user object

      setToken(receivedToken);
      setUser(loggedUser);
      
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
      toast.success('¡Inicio de sesión exitoso!');
      return { success: true, userType: loggedUser.userType, user: loggedUser }; // Return loggedUser
    } catch (error) {
      console.error('Error en el login:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      
      toast.error(errorMessage); // Usar toast

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      delete axiosInstance.defaults.headers.common['Authorization']; // Limpiar el header por defecto

      return { success: false, message: errorMessage };
    }
  };

  // Función para manejar el Registro
  const register = async (registrationData) => {
    try {
      const res = await axiosInstance.post('/api/auth/register', registrationData);
      // El componente que llama a register es responsable de mostrar el toast con res.data.message
      return { success: true, ...res.data, userType: registrationData.tipo_usuario };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al registrar';
      // El componente que llama a register es responsable de mostrar el toast con el mensaje de error
      return { success: false, message };
    }
  };

  // Función para manejar el Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete axiosInstance.defaults.headers.common['Authorization']; // Elimina la cabecera de autorización de la instancia de axios
    
    toast.info('Sesión cerrada.'); // Usar toast
  };

  const contextValue = {
    token,
    user,
    login,
    register,
    logout,
    fetchAndUpdateUser,
    isAuthenticated: !!token,
    isAuthInitialized,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {/* Recuerda tener <ToastContainer /> en tu App.js o en el componente raíz */}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// La instancia de axiosInstance ya se exporta arriba donde se define.