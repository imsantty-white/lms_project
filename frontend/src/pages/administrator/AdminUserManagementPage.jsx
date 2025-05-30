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
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Pagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';

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

    // State for filters
    const [searchNombre, setSearchNombre] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [tipoUsuarioFiltro, setTipoUsuarioFiltro] = useState(''); // Empty string for "Todos"

    // State for pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);


    // Estado para el modal de confirmación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState(() => () => {});
    const [modalMessage, setModalMessage] = useState('');

    const fetchUsers = async (currentPage = page, currentLimit = limit, currentSearchNombre = searchNombre, currentSearchEmail = searchEmail, currentTipoUsuario = tipoUsuarioFiltro) => {
        if (!isAuthenticated || user?.userType !== 'Administrador') {
            setIsLoading(false);
            setError('No tienes permiso para ver esta página.');
            toast.error('No tienes permiso para ver esta página.');
            return;
        }

        setIsLoading(true);
        setError(null);
        // Reset toast ref for each new fetch/filter
        // hasShownListSuccessToast.current = false; 

        let queryParams = `?page=${currentPage}&limit=${currentLimit}`;
        if (currentSearchNombre) queryParams += `&searchNombre=${encodeURIComponent(currentSearchNombre)}`;
        if (currentSearchEmail) queryParams += `&searchEmail=${encodeURIComponent(currentSearchEmail)}`;
        if (currentTipoUsuario && currentTipoUsuario !== "Todos") queryParams += `&tipo_usuario=${encodeURIComponent(currentTipoUsuario)}`;
        
        try {
            const response = await axiosInstance.get(`/api/admin/users${queryParams}`);
            setUsers(response.data.data || []);
            setPage(response.data.pagination.currentPage);
            setTotalPages(response.data.pagination.totalPages);
            setTotalItems(response.data.pagination.totalItems);
            setLimit(response.data.pagination.itemsPerPage);


            if (!hasShownListSuccessToast.current) { // Manage toast visibility based on specific conditions if needed
                if (response.data.data && response.data.data.length > 0) {
                    // toast.success('Lista de usuarios cargada.'); // Might be too noisy on every filter change
                } else {
                    toast.info('No se encontraron usuarios con los filtros aplicados.');
                }
                // hasShownListSuccessToast.current = true; // Decide if you want this toast only once per session or on specific events
            }

        } catch (err) {
            console.error('Error al obtener lista de usuarios:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar la lista de usuarios.';
            setError(errorMessage);
            toast.error(errorMessage);
            setUsers([]); // Clear users on error
            setTotalPages(0);
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Debounced version of fetchUsers for text inputs
    const debouncedFetchUsers = useRef(debounce(fetchUsers, 500)).current;

    useEffect(() => {
        if (isAuthInitialized) {
            fetchUsers(page, limit, searchNombre, searchEmail, tipoUsuarioFiltro);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, isAuthInitialized, page]); // Removed other dependencies to control fetch manually or via specific handlers

    // Handlers for filter changes
    const handleSearchNombreChange = (event) => {
        const newSearchNombre = event.target.value;
        setSearchNombre(newSearchNombre);
        setPage(1); // Reset to first page on filter change
        debouncedFetchUsers(1, limit, newSearchNombre, searchEmail, tipoUsuarioFiltro);
    };

    const handleSearchEmailChange = (event) => {
        const newSearchEmail = event.target.value;
        setSearchEmail(newSearchEmail);
        setPage(1); // Reset to first page on filter change
        debouncedFetchUsers(1, limit, searchNombre, newSearchEmail, tipoUsuarioFiltro);
    };

    const handleTipoUsuarioChange = (event) => {
        const newTipoUsuario = event.target.value;
        setTipoUsuarioFiltro(newTipoUsuario);
        setPage(1); // Reset to first page on filter change
        fetchUsers(1, limit, searchNombre, searchEmail, newTipoUsuario);
    };
    
    const handleLimitChange = (event) => {
        const newLimit = parseInt(event.target.value, 10);
        setLimit(newLimit);
        setPage(1); // Reset to first page
        fetchUsers(1, newLimit, searchNombre, searchEmail, tipoUsuarioFiltro);
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
        // fetchUsers is called by useEffect when 'page' changes
    };
    
    const handleRefresh = () => {
        hasShownListSuccessToast.current = false; // Allow success/info toast on refresh
        fetchUsers(page, limit, searchNombre, searchEmail, tipoUsuarioFiltro);
    };


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

            // Instead of just updating one user, refetch the current page to ensure data consistency
            // especially if sorting or other backend logic affects the list.
            fetchUsers(page, limit, searchNombre, searchEmail, tipoUsuarioFiltro);
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

            // Refetch current page to reflect changes
            fetchUsers(page, limit, searchNombre, searchEmail, tipoUsuarioFiltro);
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
    // Renderizado condicional inicial
    if (!isAuthInitialized && isLoading) { // Muestra cargando solo si la autenticación no ha terminado y está cargando
        return (
            <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>Inicializando...</Typography>
                </Box>
            </Container>
        );
    }
    
    // Si hay un error fundamental (como no estar autenticado como admin)
    if (error && users.length === 0) { // Modificado para mostrar error solo si no hay usuarios que mostrar
        return (
            <Container>
                 <PageHeader title="Gestión de Usuarios" />
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </Container>
        );
    }


    return (
        <Container maxWidth="xl"> {/* Usar maxWidth="xl" para más espacio */}
            <Box sx={{ mt: 4 }}>
                <PageHeader title="Gestión de Usuarios" />

                {/* Filter Controls */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Buscar por nombre o apellidos"
                                variant="outlined"
                                value={searchNombre}
                                onChange={handleSearchNombreChange}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Buscar por email"
                                variant="outlined"
                                value={searchEmail}
                                onChange={handleSearchEmailChange}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tipo de Usuario</InputLabel>
                                <Select
                                    value={tipoUsuarioFiltro}
                                    label="Tipo de Usuario"
                                    onChange={handleTipoUsuarioChange}
                                >
                                    <MenuItem value=""><em>Todos</em></MenuItem>
                                    <MenuItem value="Estudiante">Estudiante</MenuItem>
                                    <MenuItem value="Docente">Docente</MenuItem>
                                    <MenuItem value="Administrador">Administrador</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                             <FormControl fullWidth size="small">
                                <InputLabel>Items por página</InputLabel>
                                <Select
                                    value={limit}
                                    label="Items por página"
                                    onChange={handleLimitChange}
                                >
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={handleRefresh}
                                startIcon={<RefreshIcon />}
                            >
                                Refrescar
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {isLoading && (
                     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Cargando usuarios...</Typography>
                    </Box>
                )}

                {!isLoading && error && users.length === 0 && ( // Error específico de carga de datos, no de acceso
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {!isLoading && !error && users.length === 0 && (
                     <EmptyState
                        message="No se encontraron usuarios con los criterios seleccionados."
                        icon={GroupIcon}
                    />
                )}
                
                {!isLoading && users.length > 0 && (
                    <>
                        <TableContainer component={Paper} sx={{ mt: 0 }}>
                            <Table size="small" aria-label="Tabla de gestión de usuarios">
                                <TableHead sx={{ background: 'linear-gradient(135deg,rgb(194, 166, 245) 0%,rgb(214, 146, 241) 100%)' }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre Completo</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Aprobación (Docente) / Grupo (Estudiante)</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nº Grupos (Docente)</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado Cuenta</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((userItem) => (
                                        <TableRow hover key={userItem._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
                                    <TableCell>
                                        <Chip
                                            label={userItem.tipo_usuario}
                                            sx={{
                                            backgroundColor:
                                                userItem.tipo_usuario === 'Administrador'
                                                ? '#FFD700' // Dorado para Administrador
                                                : userItem.tipo_usuario === 'Estudiante'
                                                ? '#9aa0f5' // Azul para Estudiante
                                                : userItem.tipo_usuario === 'Docente'
                                                ? '#E91E63' // Rosa para Docente
                                                : 'inherit',
                                            color:
                                                userItem.tipo_usuario === 'Administrador'
                                                ? 'primary.main'
                                                : 'text.primary',
                                            }}
                                        />
                                        </TableCell>
                                    <TableCell>
                                        {userItem.tipo_usuario === 'Docente' ? (
                                            <Chip
                                                label={userItem.aprobado ? 'Aprobado' : 'Pendiente'}
                                                color={userItem.aprobado ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">No Aplica</Typography>
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
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            {userItem.tipo_usuario === 'Docente' && !userItem.aprobado && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    color="primary" // Cambiado a primary para diferenciar de Activar
                                                    onClick={() => openConfirmationModal(
                                                        () => handleApproveTeacher(userItem._id),
                                                        `¿Estás seguro que deseas aprobar al docente ${userItem.nombre} ${userItem.apellidos}?`
                                                    )}
                                                    disabled={actionLoading[userItem._id]}
                                                    startIcon={actionLoading[userItem._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                >
                                                    {actionLoading[userItem._id] ? 'Aprobando...' : 'Aprobar'}
                                                </Button>
                                            )}

                                            {userItem._id !== user?._id && ( // Asegurarse que user exista
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
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    </>
                )}
                
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