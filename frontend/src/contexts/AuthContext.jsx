import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';
import { jwtDecode } from 'jwt-decode'; // Necesitas instalar esta librería: npm install jwt-decode


// Crea el contexto de autenticación
export const AuthContext = createContext(null); // MODIFIED: Added export

// *** Configurar una instancia de Axios separada ***
const axiosInstance = axios.create({
    baseURL: API_BASE_URL, // Usa tu URL base aquí
});


// *** CONFIGURAR EL INTERCEPTOR DE PETICIONES DE AXIOS ***
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
  // Estado para el token JWT
  const [token, setToken] = useState(null);
  // Estado para la información del usuario
  const [user, setUser] = useState(null);
  // Estado para indicar si la inicialización de la autenticación ha terminado
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);


  // --- Efecto PRINCIPAL para cargar Auth desde localStorage al inicio ---
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
              // Verificar si el token ha expirado
              try {
                  const decodedToken = jwtDecode(storedToken);
                  const currentTime = Date.now() / 1000;

                  if (decodedToken.exp > currentTime) {
                      setToken(storedToken);
                      setUser(userFromStorage);
                      // El interceptor se encargará de añadir el header
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
      // *** Usar axiosInstance ***
      const response = await axiosInstance.post('/api/auth/login', { email, password });

      const { token, _id, email: userEmail, tipo_usuario, nombre, apellidos } = response.data;

      const user = {
        _id,
        email: userEmail,
        userType: tipo_usuario,
        nombre,
        apellidos,
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setToken(token);
      setUser(user);
      // Configurar el header de axiosInstance aquí también por consistencia inmediata
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;


      toast.success('¡Inicio de sesión exitoso!');

      return { success: true, userType: user.userType };
    } catch (error) {
      console.error('Error en el login:', error.response ? error.response.data : error.message);
      const errorMessage = error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : 'Error al iniciar sesión. Verifica tus credenciales.';
      toast.error(errorMessage);

      // Asegurarse de limpiar en caso de error de login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      // Limpiar el header de axiosInstance
      delete axiosInstance.defaults.headers.common['Authorization'];


      return { success: false, message: errorMessage };
    }
  };

  // Función para manejar el Registro (mantener tu lógica, ajusta axiosInstance si aplica)
  const register = async (registrationData) => {
      // *** Usar axiosInstance ***
    try {
      const res = await axiosInstance.post('/api/auth/register', registrationData);
      return { success: true, ...res.data, userType: registrationData.tipo_usuario };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al registrar' };
    }
  };


   // Función para manejar el Logout (mantener tu lógica, ajusta axiosInstance si aplica)
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);

    // Elimina la cabecera de autorización de axiosInstance
    delete axiosInstance.defaults.headers.common['Authorization'];

    toast.info('Sesión cerrada.');
  };

  // El valor del contexto que estará disponible para los componentes
  const contextValue = {
    token,
    user,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isAuthInitialized,
    // No proveemos axiosInstance directamente en el contexto a menos que sea estrictamente necesario.
    // Es mejor importarla directamente donde se usa.
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
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

// *** AÑADE ESTA LÍNEA PARA EXPORTAR axiosInstance ***
export { axiosInstance };