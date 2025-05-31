// src/pages/AdminAnnouncementsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Button, Paper, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, CircularProgress, Alert, Chip, Switch, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, FormControlLabel
} from '@mui/material';
import {
  AddCircleOutline as AddIcon, Edit as EditIcon, DeleteOutline as DeleteIcon,
  Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon,
  CalendarToday as CalendarIcon, Link as LinkIcon,
  Refresh as RefreshIcon, PeopleAlt as AudienceIcon,
} from '@mui/icons-material';
import { useAuth, axiosInstance } from '../../contexts/AuthContext'; // Asumo que axiosInstance está aquí
import { toast } from 'react-toastify';
import { format } from 'date-fns'; // Para formatear fechas
import ConfirmationModal from '../../components/ConfirmationModal'; // Reutilizamos tu modal
import PageHeader from '../../components/PageHeader'; // Reutilizamos PageHeader

// Componente de Formulario (puede ir en este archivo o en uno separado)
const AnnouncementForm = ({ open, onClose, onSubmit, initialData, isLoading }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('todos');
  const [link, setLink] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState(''); // Formato YYYY-MM-DDTHH:mm

  useEffect(() => {
    if (open) { // Resetear o popular el formulario cuando se abre
      if (initialData) {
        setTitle(initialData.title || '');
        setMessage(initialData.message || '');
        setAudience(initialData.audience || 'todos');
        setLink(initialData.link || '');
        setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
        setExpiresAt(initialData.expiresAt ? format(new Date(initialData.expiresAt), "yyyy-MM-dd'T'HH:mm") : '');
      } else {
        setTitle('');
        setMessage('');
        setAudience('todos');
        setLink('');
        setIsActive(true);
        setExpiresAt('');
      }
    }
  }, [initialData, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('El título y el mensaje son obligatorios.');
      return;
    }
    const formData = { title, message, audience, link, isActive };
    if (expiresAt) {
        // Validar que la fecha de expiración no sea pasada (opcional, pero buena UX)
        if (new Date(expiresAt) < new Date()) {
            toast.warn('La fecha de expiración no puede ser una fecha pasada.');
            // Podrías permitirlo si la lógica de backend o de visualización lo maneja,
            // pero para un anuncio nuevo o editado, usualmente se espera una fecha futura o ninguna.
            // return; 
        }
        formData.expiresAt = new Date(expiresAt).toISOString();
    } else {
        formData.expiresAt = null; // Enviar null si se quiere borrar o no se establece
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialData ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Título del Anuncio"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            disabled={isLoading}
            variant="outlined"
          />
          <TextField
            label="Mensaje del Anuncio"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            required
            multiline
            rows={4}
            disabled={isLoading}
            variant="outlined"
          />
          <FormControl fullWidth variant="outlined" disabled={isLoading}>
            <InputLabel id="audience-select-label">Audiencia</InputLabel>
            <Select
              labelId="audience-select-label"
              label="Audiencia"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <MenuItem value="todos">Todos los Usuarios</MenuItem>
              <MenuItem value="docentes">Solo Docentes</MenuItem>
              <MenuItem value="estudiantes">Solo Estudiantes</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Enlace (Opcional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            fullWidth
            type="url"
            disabled={isLoading}
            variant="outlined"
            InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1, color: 'action.active' }} /> }}
          />
          <TextField
            label="Fecha de Expiración (Opcional)"
            type="datetime-local" // Permite seleccionar fecha y hora
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            disabled={isLoading}
            variant="outlined"
            helperText="Si se deja vacío, el anuncio no expirará automáticamente."
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isLoading}
                color="primary"
              />
            }
            label="Anuncio Activo (visible para la audiencia)"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : (initialData ? 'Guardar Cambios' : 'Crear Anuncio')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


function AdminAnnouncementsPage() {
  const { user, isAuthInitialized, isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0); // MUI TablePagination usa índice base 0 para page
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null); // null para crear, objeto para editar
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);

  const fetchAnnouncements = useCallback(async (currentPage = page, currentRowsPerPage = rowsPerPage) => {
    if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
      setError("No tienes permiso para acceder a esta sección.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // El backend espera page 1-indexed, TablePagination usa 0-indexed
      const response = await axiosInstance.get(`/api/announcements/admin?page=${currentPage + 1}&limit=${currentRowsPerPage}`);
      setAnnouncements(response.data.data || []);
      setTotalItems(response.data.totalItems || 0);
      // setPage(response.data.currentPage -1); // Asegurarse que el estado local de page se mantenga
      // setRowsPerPage(currentRowsPerPage); // Se actualiza con el handler de MUI
    } catch (err) {
      console.error("Error fetching announcements:", err);
      const errorMsg = err.response?.data?.message || 'Error al cargar los anuncios.';
      setError(errorMsg);
      toast.error(errorMsg);
      setAnnouncements([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, page, rowsPerPage]); // Se incluye page y rowsPerPage para refrescar en cambio

  useEffect(() => {
    if (isAuthInitialized) {
      fetchAnnouncements(page, rowsPerPage);
    }
  }, [isAuthInitialized, fetchAnnouncements, page, rowsPerPage]);


  const handleOpenFormModal = (announcement = null) => {
    setEditingAnnouncement(announcement);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingAnnouncement(null);
  };

  const handleFormSubmit = async (formData) => {
    setIsSubmittingForm(true);
    const method = editingAnnouncement ? 'put' : 'post';
    const url = editingAnnouncement 
      ? `/api/announcements/admin/${editingAnnouncement._id}` 
      : '/api/announcements/admin';

    try {
      await axiosInstance[method](url, formData);
      toast.success(editingAnnouncement ? 'Anuncio actualizado exitosamente.' : 'Anuncio creado exitosamente.');
      handleCloseFormModal();
      fetchAnnouncements(page, rowsPerPage); // Refrescar la lista
    } catch (err) {
      console.error("Error submitting announcement form:", err);
      toast.error(err.response?.data?.message || 'Error al guardar el anuncio.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleToggleActive = async (announcement) => {
    const updatedData = { ...announcement, isActive: !announcement.isActive };
    // No necesitamos enviar todo, solo el campo que cambia, pero enviar todo es más simple aquí.
    // El backend en updateAnnouncement debería manejar solo los campos relevantes
    setIsSubmittingForm(true); // Usar un loader general o específico por fila
    try {
      await axiosInstance.put(`/api/announcements/admin/${announcement._id}`, { isActive: updatedData.isActive });
      toast.success(`Anuncio ${updatedData.isActive ? 'activado' : 'desactivado'}.`);
      fetchAnnouncements(page, rowsPerPage); // Refrescar
    } catch (err) {
      toast.error('Error al cambiar estado del anuncio.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenDeleteModal = (announcement) => {
    setAnnouncementToDelete(announcement);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!announcementToDelete) return;
    setIsSubmittingForm(true);
    try {
      await axiosInstance.delete(`/api/announcements/admin/${announcementToDelete._id}`);
      toast.success('Anuncio eliminado exitosamente.');
      setIsConfirmDeleteModalOpen(false);
      setAnnouncementToDelete(null);
      // Si al borrar se afecta la paginación actual (ej. era el único item en la última página)
      // se podría ajustar 'page' antes de refrescar, o simplemente refrescar.
      const newTotalItems = totalItems - 1;
      const newTotalPages = Math.ceil(newTotalItems / rowsPerPage);
      if (page + 1 > newTotalPages && newTotalPages > 0) {
        setPage(newTotalPages - 1); // Ir a la nueva última página si es necesario
      } else {
         fetchAnnouncements(page, rowsPerPage); // Refrescar la lista actual
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar el anuncio.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // fetchAnnouncements se llamará por el useEffect al cambiar 'page'
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Volver a la primera página cuando cambia el límite
    // fetchAnnouncements se llamará por el useEffect
  };

  if (!isAuthInitialized) {
    return <Container sx={{display: 'flex', justifyContent:'center', mt:5}}><CircularProgress /></Container>;
  }
  if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
     return <Container sx={{mt:2}}><Alert severity="error">Acceso denegado.</Alert></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <PageHeader 
        title="Gestión de Anuncios del Sistema"
        rightContent={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenFormModal()}
          >
            Crear Anuncio
          </Button>
        }
      />

      {isLoading && !announcements.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
          <CircularProgress /> <Typography sx={{ml:2}}>Cargando anuncios...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : announcements.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" gutterBottom>No hay anuncios creados.</Typography>
          <Typography color="text.secondary">Crea el primer anuncio para comunicarte con los usuarios.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ mt: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="tabla de anuncios">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Título</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Mensaje (extracto)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}><AudienceIcon fontSize="small" sx={{verticalAlign:'middle', mr:0.5}}/>Audiencia</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}><CalendarIcon fontSize="small" sx={{verticalAlign:'middle', mr:0.5}}/>Expira</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Activo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {announcements.map((ann) => (
                  <TableRow hover key={ann._id}>
                    <TableCell sx={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        <Tooltip title={ann.title}><span>{ann.title}</span></Tooltip>
                    </TableCell>
                    <TableCell sx={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        <Tooltip title={ann.message}><span>{ann.message}</span></Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={ann.audience.charAt(0).toUpperCase() + ann.audience.slice(1)} 
                        size="small"
                        color={
                            ann.audience === 'todos' ? 'info' : 
                            ann.audience === 'docentes' ? 'secondary' : 
                            ann.audience === 'estudiantes' ? 'primary' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      {ann.expiresAt ? format(new Date(ann.expiresAt), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={ann.isActive ? "Desactivar anuncio" : "Activar anuncio"}>
                        <Switch
                          checked={ann.isActive}
                          onChange={() => handleToggleActive(ann)}
                          size="small"
                          color="primary"
                          disabled={isSubmittingForm}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar Anuncio">
                        <IconButton size="small" onClick={() => handleOpenFormModal(ann)} color="primary" disabled={isSubmittingForm}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar Anuncio">
                        <IconButton size="small" onClick={() => handleOpenDeleteModal(ann)} color="error" disabled={isSubmittingForm}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalItems}
            rowsPerPage={rowsPerPage}
            page={page} // MUI TablePagination es 0-indexed
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Anuncios por página:"
          />
        </Paper>
      )}

      <AnnouncementForm
        open={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        initialData={editingAnnouncement}
        isLoading={isSubmittingForm}
      />

      <ConfirmationModal
        open={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que deseas eliminar el anuncio "${announcementToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmButtonText="Eliminar"
        confirmButtonColor="error"
      />
    </Container>
  );
}

export default AdminAnnouncementsPage;