// src/pages/administrator/AdminContactMessagesPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    Container, Box, Typography, Paper, Alert, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Chip, IconButton, Tooltip, Grid, Select, MenuItem, FormControl, InputLabel, Pagination
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmationModal from '../../components/ConfirmationModal'; // For potential future use
import EmptyState from '../../components/EmptyState';

function AdminContactMessagesPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    // const [totalItems, setTotalItems] = useState(0); // Not directly used in UI but good to have

    // Filter state
    const [filterResolved, setFilterResolved] = useState('all'); // 'all', 'true', 'false'

    const [actionLoading, setActionLoading] = useState({});


    const fetchMessages = useCallback(async (currentPage = page, currentLimit = limit, currentFilterResolved = filterResolved) => {
        if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
            setError('No tienes permiso para acceder a esta página.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);

        let queryParams = `?page=${currentPage}&limit=${currentLimit}`;
        if (currentFilterResolved !== 'all') {
            queryParams += `&isResolved=${currentFilterResolved}`;
        }
        // TODO: Add sorting params if needed: &sortBy=createdAt&sortOrder=desc

        try {
            const response = await axiosInstance.get(`/api/admin/contact-messages${queryParams}`);
            setMessages(response.data.data || []);
            setPage(response.data.pagination.currentPage);
            setTotalPages(response.data.pagination.totalPages);
            // setTotalItems(response.data.pagination.totalItems);
            setLimit(response.data.pagination.itemsPerPage);
            if ((response.data.data || []).length === 0) {
                toast.info('No se encontraron mensajes con los filtros actuales.');
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Error al cargar los mensajes de contacto.';
            setError(errMsg);
            toast.error(errMsg);
            setMessages([]);
            setTotalPages(0);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user, page, limit, filterResolved]); // Dependencies for useCallback

    useEffect(() => {
        if (isAuthInitialized) {
            fetchMessages();
        }
    }, [isAuthInitialized, fetchMessages]);


    const handlePageChange = (event, newPage) => {
        setPage(newPage);
        // fetchMessages will be called by useEffect due to 'page' dependency if it was in fetchMessages's own dep array
        // Or call directly: fetchMessages(newPage, limit, filterResolved);
    };

    const handleLimitChange = (event) => {
        const newLimit = parseInt(event.target.value, 10);
        setLimit(newLimit);
        setPage(1); // Reset to first page
        fetchMessages(1, newLimit, filterResolved);
    };
    
    const handleFilterResolvedChange = (event) => {
        const newFilter = event.target.value;
        setFilterResolved(newFilter);
        setPage(1); // Reset to first page
        fetchMessages(1, limit, newFilter);
    };

    const handleRefresh = () => {
        fetchMessages(page, limit, filterResolved);
    };

    const handleMarkAsResolved = async (messageId) => {
        setActionLoading(prev => ({ ...prev, [messageId]: true }));
        try {
            const response = await axiosInstance.put(`/api/admin/contact-messages/${messageId}/resolve`);
            // Update the specific message in the list
            setMessages(prevMessages => 
                prevMessages.map(msg => 
                    msg._id === messageId ? { ...msg, isResolved: true, ...response.data.data } : msg
                )
            );
            toast.success(response.data.message || 'Mensaje marcado como resuelto.');
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Error al marcar el mensaje como resuelto.';
            toast.error(errMsg);
        } finally {
            setActionLoading(prev => ({ ...prev, [messageId]: false }));
        }
    };


    if (!isAuthInitialized && isLoading) { // Show loading only if auth is not initialized AND still loading
        return (
            <Container>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress /> <Typography sx={{ml:2}}>Verificando permisos...</Typography>
                </Box>
            </Container>
        );
    }

    if (error && messages.length === 0) { // Show error primarily if there's no data to display
        return (
            <Container maxWidth="lg">
                <PageHeader title="Mensajes de Contacto Recibidos" />
                <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl">
            <PageHeader title="Mensajes de Contacto Recibidos" />
            
            <Paper sx={{ p: 2, mb: 3, mt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado de Resolución</InputLabel>
                            <Select
                                value={filterResolved}
                                label="Estado de Resolución"
                                onChange={handleFilterResolvedChange}
                            >
                                <MenuItem value="all">Todos</MenuItem>
                                <MenuItem value="false">No Resueltos</MenuItem>
                                <MenuItem value="true">Resueltos</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Ítems por página</InputLabel>
                            <Select value={limit} label="Ítems por página" onChange={handleLimitChange}>
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                        <Button fullWidth variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
                            Refrescar
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
            )}

            {!isLoading && !error && messages.length === 0 && (
                <EmptyState message="No hay mensajes de contacto que coincidan con los filtros seleccionados." icon={MailOutlineIcon} />
            )}
            
            {!isLoading && messages.length > 0 && (
                <>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table" size="small">
                            <TableHead sx={{ background: 'linear-gradient(135deg,rgb(194, 166, 245) 0%,rgb(214, 146, 241) 100%)' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Asunto</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Mensaje</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Enviado por</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email Contacto</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Estado</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {messages.map((msg) => (
                                    <TableRow hover key={msg._id}>
                                        <TableCell sx={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                            <Tooltip title={msg.subject} placement="top-start">
                                                <span>{msg.subject}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                            <Tooltip title={msg.message} placement="top-start">
                                                 <span>{msg.message}</span>
                                            </Tooltip>
                                            {/* TODO: Implement a modal to see full message */}
                                        </TableCell>
                                        <TableCell>
                                            {msg.userId ? `${msg.userId.nombre} ${msg.userId.apellidos}` : (msg.name || 'Anónimo')}
                                        </TableCell>
                                        <TableCell>{msg.userId ? msg.userId.email : (msg.email || '-')}</TableCell>
                                        <TableCell>
                                            {format(new Date(msg.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                icon={msg.isResolved ? <CheckCircleOutlineIcon /> : <HourglassEmptyIcon />}
                                                label={msg.isResolved ? 'Resuelto' : 'No Resuelto'}
                                                color={msg.isResolved ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {!msg.isResolved && (
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => handleMarkAsResolved(msg._id)}
                                                    disabled={actionLoading[msg._id]}
                                                    startIcon={actionLoading[msg._id] ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
                                                >
                                                    {actionLoading[msg._id] ? 'Marcando...' : 'Resuelto'}
                                                </Button>
                                            )}
                                            {/*
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                    // TODO: Open modal to view full message
                                                    }}
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>
                                                */}
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
        </Container>
    );
}

export default AdminContactMessagesPage;
