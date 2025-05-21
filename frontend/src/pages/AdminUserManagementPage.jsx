// src/pages/AdminUserManagementPage.jsx

import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack // Importa Stack si lo usas para alinear botones
} from '@mui/material';

// *** Importar useAuth (ahora incluyendo isAuthInitialized) Y axiosInstance ***
// Eliminamos la importación de axios y API_BASE_URL si usas axiosInstance
import { useAuth, axiosInstance } from '../context/AuthContext'; // <-- MODIFICADO

// import axios from 'axios'; // <-- ELIMINADO
// import { API_BASE_URL } from '../utils/constants'; // <-- ELIMINADO

import { toast } from 'react-toastify';


function AdminUserManagementPage() {
    // *** Usar useAuth para obtener user, isAuthenticated, Y isAuthInitialized ***
    const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- MODIFICADO

    const [users, setUsers] = useState([]); // Estado para la lista de usuarios
    // Estado de carga general para la lista de usuarios, ahora incluye espera por auth
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // Estado de error para la lista de usuarios

    // Estado para manejar la carga de acciones individuales (aprobar docente, cambiar estado)
    const [actionLoading, setActionLoading] = useState({});

    // Referencia para controlar el toast de éxito al cargar la lista (opcional, mantenido de tu código)
    const hasShownListSuccessToast = useRef(false);


    // useEffect para obtener la lista de usuarios
    useEffect(() => {
        // *** Solo proceder si la autenticación ha terminado de inicializar ***
        if (isAuthInitialized) { // <-- Lógica añadida
            const fetchUsers = async () => {
                // Verificar rol después de que auth inicialice
                if (!isAuthenticated || user?.userType !== 'Administrador') { // <-- Lógica de rol que ya tenías
                    setIsLoading(false); // Parar carga
                    setError('No tienes permiso para ver esta página.'); // Mostrar error de permiso
                    return; // Salir del fetch
                }

                setIsLoading(true); // Activar carga para el fetch
                setError(null); // Limpiar errores previos
                hasShownListSuccessToast.current = false; // Restablece la referencia

                try {
                    // --- Petición GET al backend usando axiosInstance ---
                    // Asume que axiosInstance ya tiene la URL base configurada
                    const response = await axiosInstance.get('/api/admin/users'); // <-- MODIFICADO

                    // Asume que el backend devuelve un array de objetos de usuario en response.data.data
                    setUsers(response.data.data); // <-- Guarda el array de usuarios

                    // Opcional: Si en el futuro necesitas la información de paginación, guárdala
                    // setPagination(response.data.pagination);

                    // Lógica del toast de éxito/info
                    if (!hasShownListSuccessToast.current) {
                        if (response.data.data.length > 0) { // Usar response.data.data
                            toast.success('Lista de usuarios cargada.');
                        } else {
                            toast.info('No hay usuarios registrados.');
                        }
                        hasShownListSuccessToast.current = true;
                    }

                } catch (err) {
                    console.error('Error al obtener lista de usuarios:', err.response ? err.response.data : err.message);
                    // Manejo de error genérico o específico del backend
                    const errorMessage = err.response?.data?.message || 'Error al cargar la lista de usuarios.';
                    setError(errorMessage);
                    toast.error('Error al cargar usuarios.'); // Toast genérico de error
                    hasShownListSuccessToast.current = false; // No mostrar toast de éxito si hay error
                } finally {
                    setIsLoading(false); // Desactivar carga
                }
            };

            // Ejecuta la petición solo si la autenticación inicializó Y el usuario es un Admin autenticado
            // La verificación de rol dentro de fetchUsers ya se encarga del resto.
            fetchUsers();
        }
        // Dependencias: Volver a ejecutar si cambia el estado de autenticación o el usuario
    }, [isAuthenticated, user, isAuthInitialized]); // <-- MODIFICADO


    // --- Función: Manejar la actualización del estado de cuenta de un usuario (Activo/Inactivo) ---
    // Recibe el ID del usuario a actualizar y un booleano indicando si debe estar activo
    const handleUpdateUserStatus = async (userIdToUpdate, isActive) => {
        // Verificación de rol (capa extra de seguridad frontend)
         if (!isAuthenticated || user?.userType !== 'Administrador') {
            toast.error('No tienes permiso para realizar esta acción.');
            return;
        }
        // Prevenir que un admin se desactive a sí mismo (opcional pero recomendado)
        if (user?._id === userIdToUpdate && !isActive) {
            toast.warning('No puedes desactivar tu propia cuenta de administrador.');
            return;
        }


        // Activa el estado de carga para este usuario
        setActionLoading(prev => ({ ...prev, [userIdToUpdate]: true }));

        try {
            // --- Petición PUT al backend usando axiosInstance ---
            // Endpoint: PUT /api/admin/users/:userId/status
            // Cuerpo de la petición: { isActive: true | false }
            const response = await axiosInstance.put(`/api/admin/users/${userIdToUpdate}/status`, { isActive: isActive }); // <-- MODIFICADO

             // Asume que el backend devuelve el objeto de usuario actualizado (con activo: true/false)
            const { message, user: updatedUserFromBackend } = response.data;


             // --- Actualizar el estado local (users) para reflejar el cambio ---
             setUsers(prevUsers =>
                prevUsers.map(userItem =>
                    userItem._id === updatedUserFromBackend._id
                        ? updatedUserFromBackend // Reemplaza con el objeto actualizado del backend
                        : userItem
                )
             );
            // --- Fin Actualización de estado local ---


            // El mensaje del toast aún puede usar la cadena 'activada'/'desactivada' para mejor legibilidad
            toast.success(message || `Cuenta de usuario ${isActive ? 'activada' : 'desactivada'} exitosamente.`);

        } catch (err) {
            console.error(`Error al actualizar estado de usuario ${userIdToUpdate}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || `Error al ${isActive ? 'activar' : 'desactivar'} la cuenta de usuario.`;
            toast.error(errorMessage);
        } finally {
            // Desactiva el estado de carga
            setActionLoading(prev => ({ ...prev, [userIdToUpdate]: false }));
        }
    };
    // --- FIN Función handleUpdateUserStatus ---


     // --- Función: Manejar la aprobación de un docente ---
    const handleApproveTeacher = async (userIdToApprove) => {
        // Verificación de rol (capa extra de seguridad frontend)
         if (!isAuthenticated || user?.userType !== 'Administrador') {
            toast.error('No tienes permiso para realizar esta acción.');
            return;
        }

        // Activa el estado de carga para esta acción de usuario específica
        setActionLoading(prev => ({ ...prev, [userIdToApprove]: true }));

        try {
            // --- Petición PUT al backend usando axiosInstance para aprobar a un docente ---
            // Asume un endpoint como PUT /api/admin/users/docentes/approve/:userId
            // Este endpoint debe estar protegido para Administradores
            const response = await axiosInstance.put(`/api/admin/users/docentes/approve/${userIdToApprove}`); // <-- MODIFICADO

             // Asume que el backend devuelve el objeto de usuario actualizado (con isApproved: true)
            const { message, user: updatedUserFromBackend } = response.data;

             // --- Actualizar el estado local (users) para reflejar el cambio ---
             // Encuentra al usuario en el array y actualiza su estado isApproved
             setUsers(prevUsers =>
                prevUsers.map(userItem =>
                    userItem._id === updatedUserFromBackend._id
                        ? updatedUserFromBackend // Reemplaza el objeto completo del usuario
                        : userItem
                )
             );
            // --- Fin Actualización de estado local ---


            toast.success(message || 'Docente aprobado exitosamente.');

        } catch (err) {
            console.error(`Error al aprobar docente ${userIdToApprove}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al aprobar al docente.';
            toast.error(errorMessage);
        } finally {
            // Desactiva el estado de carga para esta acción
            setActionLoading(prev => ({ ...prev, [userIdToApprove]: false }));
        }
    };
    // --- FIN Función handleApproveTeacher ---


    // --- Renderizado Condicional (Carga, Error, Lista Vacía) ---
    if (isLoading) {
        return (
             <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Cargando usuarios...</Typography>
                </Box>
            </Container>
        );
    }

    if (error && !isLoading) {
        return (
             <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </Container>
        );
    }

    if (!isLoading && !error && users.length === 0) {
         return (
             <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 3 }}>
                        No hay usuarios registrados en el sistema.
                    </Typography>
                </Box>
            </Container>
        );
    }


    // --- Renderizado de la Tabla de Usuarios si hay usuarios ---
     // Filtramos opcionalmente si solo queremos ver docentes pendientes, etc.
     // Por ahora, mostramos todos, pero destacando docentes pendientes.
    const usersToDisplay = users; // Podrías filtrar aquí: users.filter(...)


    return (
        <Container>
            <Box sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Gestión de Usuarios
                </Typography>

                 <TableContainer component={Paper} sx={{ mt: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {/* Encabezados de la tabla */}
                                <TableCell>Nombre Completo</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Tipo de Usuario</TableCell>
                                <TableCell>Estado Aprobación</TableCell>
                                {/* --- NUEVA Celda en la Cabecera --- */}
                                <TableCell>Estado Cuenta</TableCell> {/* <-- Nueva columna */}
                                {/* --- Fin NUEVA Celda --- */}
                                <TableCell>Acciones</TableCell> {/* Columna para botones de acción */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Mapea sobre la lista de usuarios para crear filas */}
                            {usersToDisplay.map((userItem) => (
                                <TableRow key={userItem._id}>
                                    {/* Celdas de información del usuario */}
                                    <TableCell>{`${userItem.nombre} ${userItem.apellidos}`.trim()}</TableCell>
                                    <TableCell>{userItem.email}</TableCell>
                                    <TableCell>{userItem.tipo_usuario}</TableCell>
                                    <TableCell>
                                        {/* Mostrar estado de aprobación usando Chip (Solo Docentes) */}
                                        {userItem.tipo_usuario === 'Docente' ? (
                                            <Chip
                                                label={userItem.aprobado ? 'Aprobado' : 'Pendiente'}
                                                color={userItem.aprobado ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">N/A</Typography> // No aplica para otros roles
                                        )}
                                    </TableCell>
                                     {/* --- NUEVA Celda para el estado de la cuenta --- */}
                                    <TableCell>
                                        {/* Mostrar estado de la cuenta (activo/inactivo) usando Chip */}
                                        <Chip
                                            label={userItem.activo ? 'Activa' : 'Inactiva'} // Usa la propiedad 'activo' del usuario
                                            color={userItem.activo ? 'success' : 'default'} // Color verde para activa, gris por defecto para inactiva
                                            size="small"
                                        />
                                    </TableCell>
                                    {/* --- Fin NUEVA Celda --- */}
                                    <TableCell>
                                        {/* Botones de Acción */}
                                        <Stack direction="row" spacing={1}>
                                            {/* Botón Aprobar Docente Pendiente (mantén como está) */}
                                            {userItem.tipo_usuario === 'Docente' && !userItem.aprobado && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleApproveTeacher(userItem._id)}
                                                    disabled={actionLoading[userItem._id]}
                                                    startIcon={actionLoading[userItem._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                >
                                                    {actionLoading[userItem._id] ? 'Aprobando...' : 'Aprobar'}
                                                </Button>
                                            )}

                                            {/* *** NUEVOS BOTONES Activar/Desactivar Cuenta *** */}
                                            {/* Mostrar Activar/Desactivar si el usuario no es el Admin logueado */}
                                            {userItem._id !== user._id && ( // No mostrar para el usuario Admin logueado
                                                userItem.activo ? ( // Si el usuario está ACTIVO, mostrar botón DESACTIVAR
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="warning" // Color de advertencia para desactivar
                                                        onClick={() => handleUpdateUserStatus(userItem._id, false)} // Llama a la función con isActive = false
                                                        disabled={actionLoading[userItem._id]} // Deshabilita si está cargando
                                                        startIcon={actionLoading[userItem._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                    >
                                                        {actionLoading[userItem._id] ? 'Desactivando...' : 'Desactivar'}
                                                    </Button>
                                                ) : ( // Si el usuario está INACTIVO, mostrar botón ACTIVAR
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="success" // Color verde para activar
                                                        onClick={() => handleUpdateUserStatus(userItem._id, true)} // Llama a la función con isActive = true
                                                        disabled={actionLoading[userItem._id]} // Deshabilita si está cargando
                                                        startIcon={actionLoading[userItem._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                    >
                                                         {actionLoading[userItem._id] ? 'Activando...' : 'Activar'}
                                                    </Button>
                                                )
                                            )}
                                             {/* *** FIN NUEVOS BOTONES *** */}

                                             {/* Aquí puedes añadir botón Eliminar */}
                                             {/* <Button variant="outlined" size="small" color="error">Eliminar</Button> */}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </TableContainer>


            </Box>
        </Container>
    );
}

export default AdminUserManagementPage;