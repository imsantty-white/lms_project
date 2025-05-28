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
  Stack,
  TextField // Added TextField
} from '@mui/material';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Import reusable components
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import GroupIcon from '@mui/icons-material/Group'; // Icon for groups
import ConfirmationModal from '../../components/ConfirmationModal'; // Re-added for delete functionality

function AdminGroupManagementPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();

    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const hasShownListSuccessToast = useRef(false);

    // State for modal and actions
    const [actionLoading, setActionLoading] = useState({}); 
    
    // State for Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');


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

    // Modal Helper Function, Archive Handler, Restore Handler removed

    // --- Delete Modal Functions ---
    const openDeleteModal = (group) => {
        setGroupToDelete(group);
        setDeleteConfirmName('');
        setIsDeleteModalOpen(true);
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete || !isAuthenticated || user?.tipo_usuario !== 'Administrador') {
            toast.error('Acción no permitida o grupo no seleccionado.');
            return;
        }

        setActionLoading(prev => ({ ...prev, [groupToDelete._id]: true }));
        try {
            await axiosInstance.delete(`/api/admin/groups/${groupToDelete._id}`);
            setGroups(prevGroups => prevGroups.filter(g => g._id !== groupToDelete._id));
            toast.success(`Grupo "${groupToDelete.nombre}" eliminado permanentemente.`);
            setIsDeleteModalOpen(false);
            setGroupToDelete(null);
        } catch (err) {
            console.error(`Error al eliminar grupo ${groupToDelete._id}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al eliminar el grupo.';
            toast.error(errorMessage);
            // Optionally, keep modal open on error or close it
            // setIsDeleteModalOpen(false); 
        } finally {
            setActionLoading(prev => ({ ...prev, [groupToDelete._id]: false }));
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
                                <TableCell align="center">Días Archivado</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groups.map((group) => (
                                <TableRow key={group._id}>
                                    <TableCell>{group.nombre}</TableCell>
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
                                        {group.activo === false && group.daysArchived !== null ? `${group.daysArchived} día(s)` : (group.activo ? 'No Archivado' : '-')}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            {group.activo === false && group.daysArchived > 15 && (
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => openDeleteModal(group)}
                                                    disabled={actionLoading[group._id]}
                                                    startIcon={actionLoading[group._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                                >
                                                    {actionLoading[group._id] ? 'Eliminando...' : 'Eliminar'}
                                                </Button>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Delete Confirmation Modal */}
                {groupToDelete && (
                    <ConfirmationModal
                        open={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setGroupToDelete(null);
                        }}
                        onConfirm={handleDeleteGroup}
                        title={`Confirmar Eliminación Permanente del Grupo: "${groupToDelete.nombre}"`}
                        message={
                            <Box>
                                <Typography variant="body1" color="error" gutterBottom>
                                    <strong>¡Advertencia!</strong> Esta acción es irreversible y eliminará permanentemente el grupo y todas sus membresías asociadas.
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                                    Para confirmar, por favor escribe el nombre del grupo: <strong>{groupToDelete.nombre}</strong>
                                </Typography>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="delete-confirm-name"
                                    label="Nombre del Grupo"
                                    type="text"
                                    fullWidth
                                    variant="standard"
                                    value={deleteConfirmName}
                                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                            </Box>
                        }
                        confirmText="Confirmar Eliminación"
                        cancelText="Cancelar"
                        confirmButtonProps={{ 
                            color: "error", 
                            disabled: deleteConfirmName !== groupToDelete.nombre || actionLoading[groupToDelete._id]
                        }}
                        cancelButtonProps={{
                            disabled: actionLoading[groupToDelete._id]
                        }}
                    />
                )}
            </Box>
        </Container>
    );
}

export default AdminGroupManagementPage;
