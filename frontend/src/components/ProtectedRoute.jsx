// src/components/ProtectedRoute.jsx

import React, { useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Box, CircularProgress } from '@mui/material'; // Importa componentes de MUI para un spinner


// Componente para proteger rutas
// Recibe el componente a renderizar como 'element' prop
// Recibe la lista de roles permitidos como 'allowedRoles' prop (un array de strings)
const ProtectedRoute = React.memo(({ element, allowedRoles }) => {
  // *** Hooks llamados SIEMPRE al nivel superior ***
  const { isAuthenticated, user, isAuthInitialized } = useAuth(); // <-- useAuth
  const hasShownLoginToast = useRef(false); // <-- useRef


  // *** Este useEffect ahora está fuera de cualquier condición ***
  // Se ejecuta cada vez que isAuthenticated cambia.
  // Resetear la bandera cuando el usuario se autentica.
  useEffect(() => {
    if (isAuthenticated && hasShownLoginToast.current) { // Solo resetear si estaba en true
      hasShownLoginToast.current = false;
      console.log("Toast login flag reset."); // Para depuración
    }
  }, [isAuthenticated]);


  // *** LÓGICA DE RENDERIZADO CONDICIONAL (DESPUÉS DE LOS HOOKS) ***

  // 1. Si la autenticación aún no ha terminado de inicializar, muestra un spinner
  if (!isAuthInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
      </Box>
    );
  }

  // 2. Si la inicialización terminó, verifica si el usuario NO está autenticado
  if (!isAuthenticated) {
    // Si NO está autenticado (y ya terminó la inicialización)
    // Muestra el toast SOLO si aún no se ha mostrado
    if (!hasShownLoginToast.current) {
      //toast.warn('Debes iniciar sesión para acceder a esta página.');
      hasShownLoginToast.current = true; // Marca el toast como mostrado
    }

    // Redirige a la página de inicio o login
    return <Navigate to="/" replace />;
  }

  // 3. Si el usuario está autenticado (y la inicialización terminó), verifica los roles si es necesario
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !user.userType) {
       // Si isAuthenticated es true pero la info del usuario no está
       toast.error('Error al obtener la información de tu usuario. Por favor, intenta iniciar sesión de nuevo.');
       // Limpiamos storage y redirigimos para forzar un re-login limpio
         localStorage.removeItem('token'); // Limpiar token corrupto
         localStorage.removeItem('user'); // Limpiar info de usuario corrupta
         // El estado de AuthContext se actualizará por la limpieza de localStorage/estado
         // y esto disparará un re-render que llevará a la redirección por !isAuthenticated
         // No necesitamos return <Navigate> explícito aquí, el próximo render lo hará.
         return null; // Renderiza null mientras ocurre la redirección por cambio de estado auth
    }

    if (!allowedRoles.includes(user.userType)) {
      console.warn(`Acceso denegado. Rol del usuario: ${user.userType}, Roles permitidos: ${allowedRoles.join(', ')}`);
      toast.error('No tienes permisos para acceder a esta página.');
      // Redirige a la página de inicio
      return <Navigate to="/" replace />;
    }
  }

  // Si todas las comprobaciones pasan (inicializado, autenticado y con rol permitido), renderiza el elemento pasado
  return element;
});

export default ProtectedRoute;