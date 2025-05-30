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
                  localStorage.removeItem('user'); // Limpiar si está corrupto
                  userFromStorage = null;
              }
          }

          if (storedToken && userFromStorage) {
              try {
                  const decodedToken = jwtDecode(storedToken);
                  const currentTime = Date.now() / 1000;

                  if (decodedToken.exp > currentTime) {
                      setToken(storedToken);
                      setUser(userFromStorage);
                      // El interceptor se encargará de añadir el header a las nuevas peticiones
                      // Si se había seteado axiosInstance.defaults, el interceptor lo puede sobreescribir si es necesario o añadirlo si no está.
                      console.log("Auth state set from storage.");
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

  // Función para manejar el Login
  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/api/auth/login', { email, password });
      // Renombrar 'token' y 'user' de la respuesta para evitar conflictos de scope con el estado
      const { token: receivedToken, _id, email: userEmail, tipo_usuario, nombre, apellidos } = response.data;

      const loggedUser = {
        _id,
        email: userEmail,
        userType: tipo_usuario,
        tipo_usuario, // Mantener por compatibilidad si se usa en otros lados
        nombre,
        apellidos,
      };

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(loggedUser));

      setToken(receivedToken);
      setUser(loggedUser);
      
      // Configurar el header de axiosInstance por defecto para esta sesión
      // Aunque el interceptor lo hace por petición, esto asegura que la instancia lo tenga por defecto inmediatamente.
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

      toast.success('¡Inicio de sesión exitoso!'); // Usar toast

      return { success: true, userType: loggedUser.userType };
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