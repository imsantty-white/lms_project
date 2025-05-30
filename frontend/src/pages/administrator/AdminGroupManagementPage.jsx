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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';

// Import reusable components
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import GroupIcon from '@mui/icons-material/Group'; // Icon for groups
import ConfirmationModal from '../../components/ConfirmationModal'; 

function AdminGroupManagementPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();

    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const hasShownListSuccessToast = useRef(false);

    // State for filters
    const [searchNombreGrupo, setSearchNombreGrupo] = useState('');
    const [searchNombreDocente, setSearchNombreDocente] = useState('');

    // State for pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    
    const [actionLoading, setActionLoading] = useState({}); 
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');

    const fetchGroups = async (currentPage = page, currentLimit = limit, currentSearchNombreGrupo = searchNombreGrupo, currentSearchNombreDocente = searchNombreDocente) => {
        if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
            setIsLoading(false);
            setError('No tienes permiso para ver esta página.');
            // toast.error('Acceso no autorizado.'); // Already handled by global error display
            return;
        }

        setIsLoading(true);
        setError(null);
        // hasShownListSuccessToast.current = false; // Reset on each fetch to allow new toasts

        let queryParams = `?page=${currentPage}&limit=${currentLimit}`;
        if (currentSearchNombreGrupo) queryParams += `&searchNombreGrupo=${encodeURIComponent(currentSearchNombreGrupo)}`;
        if (currentSearchNombreDocente) queryParams += `&searchNombreDocente=${encodeURIComponent(currentSearchNombreDocente)}`;

        try {
            const response = await axiosInstance.get(`/api/admin/groups${queryParams}`);
            setGroups(response.data.data || []);
            setPage(response.data.pagination.currentPage);
            setTotalPages(response.data.pagination.totalPages);
            setTotalItems(response.data.pagination.totalItems);
            setLimit(response.data.pagination.itemsPerPage);

            // if (!hasShownListSuccessToast.current) {
            //     if (response.data.data && response.data.data.length > 0) {
            //         // toast.success('Lista de grupos actualizada.'); // Can be too noisy
            //     } else {
            //         toast.info('No se encontraron grupos con los filtros aplicados.');
            //     }
            //     hasShownListSuccessToast.current = true;
            // }
        } catch (err) {
            console.error('Error al obtener lista de grupos:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al cargar la lista de grupos.';
            setError(errorMessage);
            // toast.error(errorMessage); // Error is displayed in Alert component
            setGroups([]);
            setTotalPages(0);
        } finally {
            setIsLoading(false);
        }
    };

    const debouncedFetchGroups = useRef(debounce(fetchGroups, 500)).current;

    useEffect(() => {
        if (isAuthInitialized) {
            fetchGroups(page, limit, searchNombreGrupo, searchNombreDocente);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, isAuthInitialized, page]);


    const handleSearchNombreGrupoChange = (event) => {
        const newSearch = event.target.value;
        setSearchNombreGrupo(newSearch);
        setPage(1);
        debouncedFetchGroups(1, limit, newSearch, searchNombreDocente);
    };

    const handleSearchNombreDocenteChange = (event) => {
        const newSearch = event.target.value;
        setSearchNombreDocente(newSearch);
        setPage(1);
        debouncedFetchGroups(1, limit, searchNombreGrupo, newSearch);
    };

    const handleLimitChange = (event) => {
        const newLimit = parseInt(event.target.value, 10);
        setLimit(newLimit);
        setPage(1);
        fetchGroups(1, newLimit, searchNombreGrupo, searchNombreDocente);
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
        // fetchGroups is called by useEffect when page changes
    };

    const handleRefresh = () => {
        hasShownListSuccessToast.current = false;
        fetchGroups(page, limit, searchNombreGrupo, searchNombreDocente);
    };
    
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
            toast.success(`Grupo "${groupToDelete.nombre}" eliminado permanentemente.`);
            setIsDeleteModalOpen(false);
            setGroupToDelete(null);
            // Refetch data for the current page after deletion
            fetchGroups(page, limit, searchNombreGrupo, searchNombreDocente); 
        } catch (err) {
            console.error(`Error al eliminar grupo ${groupToDelete._id}:`, err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Error al eliminar el grupo.';
            toast.error(errorMessage);
        } finally {
            setActionLoading(prev => ({ ...prev, [groupToDelete._id]: false }));
        }
    };


    if (!isAuthInitialized) { // Show loading only if auth is not initialized
        return (
            <Container>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Inicializando...</Typography>
                </Box>
            </Container>
        );
    }
    
    // If error during initial load (e.g. not authorized)
    if (error && groups.length === 0 && !isLoading) {
        return (
            <Container>
                <PageHeader title="Gestión de Grupos" />
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </Container>
        );
    }


    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 4 }}>
                <PageHeader title="Gestión de Grupos" />

                {/* Filter Controls */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Buscar por nombre de grupo"
                                variant="outlined"
                                value={searchNombreGrupo}
                                onChange={handleSearchNombreGrupoChange}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Buscar por nombre de docente"
                                variant="outlined"
                                value={searchNombreDocente}
                                onChange={handleSearchNombreDocenteChange}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                             <FormControl fullWidth size="small">
                                <InputLabel>Ítems por página</InputLabel>
                                <Select
                                    value={limit}
                                    label="Ítems por página"
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
                        <Typography sx={{ ml: 2 }}>Cargando grupos...</Typography>
                    </Box>
                )}

                {!isLoading && error && groups.length === 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}
                
                {!isLoading && !error && groups.length === 0 && (
                     <EmptyState
                        message="No se encontraron grupos con los criterios seleccionados."
                        icon={GroupIcon}
                    />
                )}

                {!isLoading && groups.length > 0 && (
                    <>
                        <TableContainer component={Paper} sx={{ mt: 0 }}>
                            <Table size="small">
                                <TableHead sx={{ background: 'linear-gradient(135deg,rgb(194, 166, 245) 0%,rgb(214, 146, 241) 100%)' }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre del Grupo</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Docente Creador</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Código</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Miembros</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Estado</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Días Archivado</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groups.map((group) => (
                                        <TableRow hover key={group._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
                                                {group.activo === false && group.daysArchived !== null ? `${group.daysArchived} día(s)` : (group.activo ? '-' : '-')}
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
