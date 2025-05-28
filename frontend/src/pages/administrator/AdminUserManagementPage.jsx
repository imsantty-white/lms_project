// src/pages/AdminUserManagementPage.jsx

import React, { useEffect, useState, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Link,
  Stack
} from '@mui/material';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Import reusable components
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import GroupIcon from '@mui/icons-material/Group';
import ConfirmationModal from '../../components/ConfirmationModal';

function AdminUserManagementPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const hasShownListSuccessToast = useRef(false);

    // Estado para el modal de confirmación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState(() => () => {});
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        if (isAuthInitialized) {
            const fetchUsers = async () => {
                if (!isAuthenticated || user?.userType !== 'Administrador') {
                    setIsLoading(false);
                    setError('No tienes permiso para ver esta página.');
                    return;
                }

                setIsLoading(true);
                setError(null);
                hasShownListSuccessToast.current = false;

                try {
                    const response = await axiosInstance.get('/api/admin/users');
                    setUsers(response.data.data);

                    if (!hasShownListSuccessToast.current) {
                        if (response.data.data.length > 0) {
                            toast.success('Lista de usuarios cargada.');
                        } else {
                            toast.info('No hay usuarios registrados.');
                        }
                        hasShownListSuccessToast.current = true;
                    }
                } catch (err) {
                    console.error('Error al obtener lista de usuarios:', err.response ? err.response.data : err.message);
                    const errorMessage = err.response?.data?.message || 'Error al cargar la lista de usuarios.';
                    setError(errorMessage);
                    toast.error('Error al cargar usuarios.');
                    hasShownListSuccessToast.current = false;
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUsers();
        }
    }, [isAuthenticated, user, isAuthInitialized]);

    // --- Función: Manejar la actualización del estado de cuenta de un usuario (Activo/Inactivo) ---
    const handleUpdateUserStatus = async (userIdToUpdate, isActive) => {
        if (!isAuthenticated || user?.userType !== 'Administrador') {
            toast.error('No tienes permiso para realizar esta acción.');
            return;
        }
        if (user?._id === userIdToUpdate && !isActive) {
            toast.warning('No puedes desactivar tu propia cuenta de administrador.');
            return;
        }

        setActionLoading(prev => ({ ...prev, [userIdToUpdate]: true }));

        try {
            const response = await axiosInstance.put(`/api/admin/users/${userIdToUpdate}/status`, { isActive: isActive });
            const { message, user: updatedUserFromBackend } = response.data;

            setUsers(prevUsers =>
                prevUsers.map(userItem =>
                    userItem._id === updatedUserFromBackend._id
                        ? updatedUserFromBackend
                        : userItem
                )
            );
            toast.success(message || `Cuenta de usuario ${isActive ? 'activada' : 'desactivada'} exitosamente.`);
        } catch (err) {
            console.error(`Error al actualizar estado de usuario ${userIdToUpdate}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || `Error al ${isActive ? 'activar' : 'desactivar'} la cuenta de usuario.`;
            toast.error(errorMessage);
        } finally {
            setActionLoading(prev => ({ ...prev, [userIdToUpdate]: false }));
        }
    };

    // --- Función: Manejar la aprobación de un docente ---
    const handleApproveTeacher = async (userIdToApprove) => {
        if (!isAuthenticated || user?.userType !== 'Administrador') {
            toast.error('No tienes permiso para realizar esta acción.');
            return;
        }
        setActionLoading(prev => ({ ...prev, [userIdToApprove]: true }));

        try {
            const response = await axiosInstance.put(`/api/admin/users/docentes/approve/${userIdToApprove}`);
            const { message, user: updatedUserFromBackend } = response.data;

            setUsers(prevUsers =>
                prevUsers.map(userItem =>
                    userItem._id === updatedUserFromBackend._id
                        ? updatedUserFromBackend
                        : userItem
                )
            );
            toast.success(message || 'Docente aprobado exitosamente.');
        } catch (err) {
            console.error(`Error al aprobar docente ${userIdToApprove}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al aprobar al docente.';
            toast.error(errorMessage);
        } finally {
            setActionLoading(prev => ({ ...prev, [userIdToApprove]: false }));
        }
    };

    // --- Función: Abrir el modal de confirmación ---
    const openConfirmationModal = (action, message) => {
        setModalAction(() => action);
        setModalMessage(message);
        setIsModalOpen(true);
    };

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
                <PageHeader title="Gestión de Usuarios" />
                <EmptyState
                    message="No hay usuarios registrados en el sistema."
                    icon={GroupIcon}
                />
            </Container>
        );
    }

    const usersToDisplay = users;

    return (
        <Container>
            <Box sx={{ mt: 4 }}>
                <PageHeader title="Gestión de Usuarios" />

                <TableContainer component={Paper} sx={{ mt: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre Completo</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Tipo de Usuario</TableCell>
                                <TableCell>Estado Aprobación</TableCell>
                                <TableCell>Estado Cuenta</TableCell>
                                <TableCell>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usersToDisplay.map((userItem) => (
                                <TableRow key={userItem._id}>
                                    <TableCell>
                                        <Link
                                            component={RouterLink}
                                            to={`/profile/${userItem._id}`}
                                            underline="hover"
                                            color="inherit"
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            {`${userItem.nombre} ${userItem.apellidos}`.trim()}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{userItem.email}</TableCell>
                                    <TableCell>{userItem.tipo_usuario}</TableCell>
                                    <TableCell>
                                        {userItem.tipo_usuario === 'Docente' ? (
                                            <Chip
                                                label={userItem.aprobado ? 'Aprobado' : 'Pendiente'}
                                                color={userItem.aprobado ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">N/A</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={userItem.activo ? 'Activa' : 'Inactiva'}
                                            color={userItem.activo ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
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

                                            {userItem._id !== user._id && (
                                                userItem.activo ? (
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="warning"
                                                        onClick={() =>
                                                            openConfirmationModal(
                                                                () => handleUpdateUserStatus(userItem._id, false),
                                                                `¿Estás seguro que deseas desactivar la cuenta de ${userItem.nombre} ${userItem.apellidos}?`
                                                            )
                                                        }
                                                        disabled={actionLoading[userItem._id]}
                                                        startIcon={actionLoading[userItem._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                    >
                                                        {actionLoading[userItem._id] ? 'Desactivando...' : 'Desactivar'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="success"
                                                        onClick={() =>
                                                            openConfirmationModal(
                                                                () => handleUpdateUserStatus(userItem._id, true),
                                                                `¿Estás seguro que deseas activar la cuenta de ${userItem.nombre} ${userItem.apellidos}?`
                                                            )
                                                        }
                                                        disabled={actionLoading[userItem._id]}
                                                        startIcon={actionLoading[userItem._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                    >
                                                        {actionLoading[userItem._id] ? 'Activando...' : 'Activar'}
                                                    </Button>
                                                )
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <ConfirmationModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={() => {
                        modalAction();
                        setIsModalOpen(false);
                    }}
                    title="Confirmar acción"
                    message={modalMessage}
                    confirmText="Sí"
                    cancelText="No"
                />
            </Box>
        </Container>
    );
}

export default AdminUserManagementPage;