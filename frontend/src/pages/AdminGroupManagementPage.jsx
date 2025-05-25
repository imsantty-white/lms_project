// src/pages/AdminGroupManagementPage.jsx

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
  Link,
  Button,
  Stack
} from '@mui/material';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Import reusable components
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import GroupIcon from '@mui/icons-material/Group'; // Icon for groups
import ConfirmationModal from '../components/ConfirmationModal'; // Import ConfirmationModal

function AdminGroupManagementPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();

    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const hasShownListSuccessToast = useRef(false);

    // State for modal and actions
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState(() => () => {});
    const [modalMessage, setModalMessage] = useState('');
    const [currentGroupId, setCurrentGroupId] = useState(null);
    const [actionLoading, setActionLoading] = useState({});


    useEffect(() => {
        if (isAuthInitialized) {
            const fetchGroups = async () => {
                if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
                    setIsLoading(false);
                    setError('No tienes permiso para ver esta página.');
                    toast.error('Acceso no autorizado.');
                    return;
                }

                setIsLoading(true);
                setError(null);
                hasShownListSuccessToast.current = false; // Reset toast flag on new fetch

                try {
                    const response = await axiosInstance.get('/api/admin/groups');
                    setGroups(response.data.data);

                    if (!hasShownListSuccessToast.current) {
                        if (response.data.data.length > 0) {
                            toast.success('Lista de grupos cargada exitosamente.');
                        } else {
                            toast.info('No hay grupos registrados en el sistema.');
                        }
                        hasShownListSuccessToast.current = true;
                    }
                } catch (err) {
                    console.error('Error al obtener lista de grupos:', err.response ? err.response.data : err.message);
                    const errorMessage = err.response?.data?.message || 'Error al cargar la lista de grupos.';
                    setError(errorMessage);
                    toast.error(errorMessage);
                    hasShownListSuccessToast.current = false; // Ensure toast can be shown again if fetch is retried after error
                } finally {
                    setIsLoading(false);
                }
            };
            fetchGroups();
        }
    }, [isAuthenticated, user, isAuthInitialized]);

    // --- Modal Helper Function ---
    const openConfirmationModal = (groupId, actionType) => {
        setCurrentGroupId(groupId);
        const groupName = groups.find(g => g._id === groupId)?.nombre_grupo || 'este grupo';
        if (actionType === 'archive') {
            setModalMessage(`¿Estás seguro que deseas archivar el grupo "${groupName}"?`);
            setModalAction(() => () => handleArchiveGroup(groupId));
        } else if (actionType === 'restore') {
            setModalMessage(`¿Estás seguro que deseas restaurar el grupo "${groupName}"?`);
            setModalAction(() => () => handleRestoreGroup(groupId));
        }
        setIsModalOpen(true);
    };

    // --- Handler for Archiving Group ---
    const handleArchiveGroup = async (groupId) => {
        if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
            toast.error('No tienes permiso para realizar esta acción.');
            return;
        }
        setActionLoading(prev => ({ ...prev, [groupId]: true }));
        try {
            const response = await axiosInstance.put(`/api/admin/groups/${groupId}/archive`);
            const updatedGroup = response.data.data;
            setGroups(prevGroups =>
                prevGroups.map(g => (g._id === updatedGroup._id ? updatedGroup : g))
            );
            toast.success(response.data.message || 'Grupo archivado correctamente.');
        } catch (err) {
            console.error(`Error al archivar grupo ${groupId}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al archivar el grupo.';
            toast.error(errorMessage);
        } finally {
            setActionLoading(prev => ({ ...prev, [groupId]: false }));
            setIsModalOpen(false);
        }
    };

    // --- Handler for Restoring Group ---
    const handleRestoreGroup = async (groupId) => {
        if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
            toast.error('No tienes permiso para realizar esta acción.');
            return;
        }
        setActionLoading(prev => ({ ...prev, [groupId]: true }));
        try {
            const response = await axiosInstance.put(`/api/admin/groups/${groupId}/restore`);
            const updatedGroup = response.data.data;
            setGroups(prevGroups =>
                prevGroups.map(g => (g._id === updatedGroup._id ? updatedGroup : g))
            );
            toast.success(response.data.message || 'Grupo restaurado correctamente.');
        } catch (err) {
            console.error(`Error al restaurar grupo ${groupId}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al restaurar el grupo.';
            toast.error(errorMessage);
        } finally {
            setActionLoading(prev => ({ ...prev, [groupId]: false }));
            setIsModalOpen(false);
        }
    };

    if (!isAuthInitialized || isLoading) {
        return (
            <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Cargando grupos...</Typography>
                </Box>
            </Container>
        );
    }

    if (error && !isLoading) {
        return (
            <Container>
                <PageHeader title="Gestión de Grupos" />
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </Container>
        );
    }

    if (!isLoading && !error && groups.length === 0) {
        return (
            <Container>
                <PageHeader title="Gestión de Grupos" />
                <EmptyState
                    message="No hay grupos registrados en el sistema en este momento."
                    icon={GroupIcon}
                />
            </Container>
        );
    }

    return (
        <Container>
            <Box sx={{ mt: 4 }}>
                <PageHeader title="Gestión de Grupos" />

                <TableContainer component={Paper} sx={{ mt: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre del Grupo</TableCell>
                                <TableCell>Docente Creador</TableCell>
                                <TableCell>Código de Acceso</TableCell>
                                <TableCell align="center">Miembros (Aprobados)</TableCell>
                                <TableCell align="center">Estado</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groups.map((group) => (
                                <TableRow key={group._id}>
                                    <TableCell>{group.nombre_grupo}</TableCell>
                                    <TableCell>
                                        {group.docente_id ? `${group.docente_id.nombre} ${group.docente_id.apellidos}` : 'Sistema/N/A'}
                                    </TableCell>
                                    <TableCell>{group.codigo_acceso}</TableCell>
                                    <TableCell align="center">{group.approvedMemberCount}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={group.activo ? 'Activo' : 'Archivado'}
                                            color={group.activo ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            {group.activo ? (
                                                <Button
                                                    variant="outlined"
                                                    color="warning"
                                                    size="small"
                                                    onClick={() => openConfirmationModal(group._id, 'archive')}
                                                    disabled={actionLoading[group._id]}
                                                    startIcon={actionLoading[group._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                >
                                                    {actionLoading[group._id] ? 'Archivando...' : 'Archivar'}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    color="success"
                                                    size="small"
                                                    onClick={() => openConfirmationModal(group._id, 'restore')}
                                                    disabled={actionLoading[group._id]}
                                                    startIcon={actionLoading[group._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                >
                                                    {actionLoading[group._id] ? 'Restaurando...' : 'Restaurar'}
                                                </Button>
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
                        if (modalAction) {
                            modalAction();
                        }
                        // setIsModalOpen(false); // Action handlers will close it
                    }}
                    title="Confirmar Acción"
                    message={modalMessage}
                    confirmText="Sí, Confirmar"
                    cancelText="Cancelar"
                />
            </Box>
        </Container>
    );
}

export default AdminGroupManagementPage;
