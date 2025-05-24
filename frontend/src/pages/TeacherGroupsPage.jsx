// src/pages/TeacherGroupsPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  ListItemButton,
  Button,
  Stack,
  Dialog, // <-- Importa Dialog
  DialogActions, // <-- Importa DialogActions
  DialogContent, // <-- Importa DialogContent
  DialogContentText, // <-- Importa DialogContentText
  DialogTitle, // <-- Importa DialogTitle
  Tabs, // <-- Importa Tabs
  Tab, // <-- Importa Tab
  IconButton, // For Archive button
  ListItemSecondaryAction, // To position the archive button
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArchiveIcon from '@mui/icons-material/Archive'; // Icon for archive button
import RestoreIcon from '@mui/icons-material/Restore'; // Icon for unarchive/restore button

// *** Importar useAuth Y axiosInstance ***
import { useAuth, axiosInstance } from '../contexts/AuthContext'; // <-- Importa axiosInstance aquí

// *** Eliminar la importación de 'axios' si ya no la usas directamente ***
// import axios from 'axios';

// *** Eliminar la importación de API_BASE_URL si axiosInstance ya la tiene configurada ***
// import { API_BASE_URL } from '../utils/constants';

import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Importa el nuevo componente modal para crear grupo
import CreateGroupModal from '../pages/components/CreateGroupModal';
import ConfirmationModal from '../components/ConfirmationModal'; // Import ConfirmationModal


function TeacherGroupsPage() {
  // *** Obtén isAuthInitialized del hook useAuth ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- Añade isAuthInitialized

  const _navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('active'); // State for current tab

  const _hasShownSuccessToast = useRef(false);


  // --- NUEVOS ESTADOS PARA MODAL DE CREAR GRUPO Y SU CONFIRMACIÓN (mantener) ---
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateGroupConfirmOpen, setIsCreateGroupConfirmOpen] = useState(false);
  const [groupDataToCreate, setGroupDataToCreate] = useState(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  // --- FIN NUEVOS ESTADOS GRUPO ---

  // --- State for Archive Group confirmation ---
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [groupToArchive, setGroupToArchive] = useState(null); // Store { id, nombre }
  const [isArchiving, setIsArchiving] = useState(false);

  // --- State for Unarchive Group confirmation ---
  const [isUnarchiveConfirmOpen, setIsUnarchiveConfirmOpen] = useState(false);
  const [groupToUnarchive, setGroupToUnarchive] = useState(null); // Store { id, nombre }
  const [isUnarchiving, setIsUnarchiving] = useState(false);


  useEffect(() => {
    const fetchTeacherGroups = async () => {
      setIsLoading(true);
      setError(null);
      // Resetting toast ref for each fetch attempt based on tab
      // hasShownSuccessToast.current = false; // This might be too noisy if reset on every tab change. Let's manage it carefully.

      let endpoint = '/api/groups/docente/me';
      if (currentTab === 'archived') {
        endpoint = '/api/groups/docente/me?status=archived';
      } else {
        // Default to active, or explicitly for 'active' tab
        endpoint = '/api/groups/docente/me?status=active';
      }

      try {
        const response = await axiosInstance.get(endpoint);
        setGroups(response.data.data);

        // Show success toast only once per successful load of a tab, or adjust as needed
        // For simplicity, let's show it every time a tab loads successfully for now.
        toast.success(`Grupos ${currentTab === 'active' ? 'activos' : 'archivados'} cargados con éxito.`);
        
      } catch (err) {
        console.error(`Error al obtener los grupos (${currentTab}) del docente:`, err.response ? err.response.data : err.message);
        const errorMessage = err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : `Error al cargar tus grupos ${currentTab === 'active' ? 'activos' : 'archivados'}.`;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthInitialized && isAuthenticated && user?.userType === 'Docente') {
      fetchTeacherGroups();
    } else if (isAuthInitialized && (!isAuthenticated || user?.userType !== 'Docente')) {
      setIsLoading(false);
      setError("No estás autenticado o no tienes permiso para ver esta página.");
    }
  }, [isAuthenticated, user, isAuthInitialized, currentTab]); // <-- Añade currentTab

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Mensaje de acceso denegado si no es docente/admin (mantener, pero la redirección la maneja ProtectedRoute)
  // Este bloque se ejecutará solo si isAuthInitialized es true y !isAuthenticated
  if (!isAuthenticated || user?.userType !== 'Docente') {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error || 'Debes ser Docente para ver esta página.'}</Typography>
        </Box>
      </Container>
    );
  }


  // --- Lógica para Modal de Crear Grupo y su Confirmación (mantener) ---

  // Abre el modal de crear grupo
  const handleOpenCreateGroupModal = () => {
    setIsCreateGroupModalOpen(true);
  };

  // Cierra el modal de crear grupo
  const handleCloseCreateGroupModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsCreateGroupModalOpen(false);
    setGroupDataToCreate(null);
  };

  // Maneja la presentación del formulario en el modal de grupo
  const handleGroupFormSubmit = (formData) => {
    setGroupDataToCreate(formData);
    setIsCreateGroupConfirmOpen(true);
  };

  // Cierra el diálogo de confirmación previa a la creación de grupo
  const handleCloseCreateGroupConfirm = () => {
    setIsCreateGroupConfirmOpen(false);
    setGroupDataToCreate(null);
  };

  // Maneja la confirmación de la creación del grupo (hace la llamada al backend)
  const handleConfirmCreateGroup = async () => {
    if (!groupDataToCreate) return;

    setIsCreatingGroup(true);

    try {
      // *** Usar axiosInstance.post en lugar de axios.post ***
      const response = await axiosInstance.post('/api/groups/create', groupDataToCreate); // <-- Modificado

      const newGroup = response.data;
      toast.success('Grupo creado con éxito!');

      setGroups(prevGroups => [...prevGroups, newGroup]);

      handleCloseCreateGroupConfirm();
      handleCloseCreateGroupModal();

    } catch (err) {
      console.error('Error creating group:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al intentar crear el grupo.';
      toast.error(errorMessage);
      setIsCreatingGroup(false);
    }
  };
  // --- FIN Lógica para Modal de Crear Grupo y su Confirmación ---

  // --- Lógica para Modal de Archivar Grupo ---
  const handleOpenArchiveConfirm = (group) => {
    setGroupToArchive({ id: group._id, nombre: group.nombre });
    setIsArchiveConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!groupToArchive) return;

    setIsArchiving(true);
    try {
      await axiosInstance.delete(`/api/groups/${groupToArchive.id}`);
      toast.success(`Grupo "${groupToArchive.nombre}" archivado con éxito.`);
      setGroups(prevGroups => prevGroups.filter(g => g._id !== groupToArchive.id));
      setIsArchiveConfirmOpen(false);
      setGroupToArchive(null);
    } catch (err) {
      console.error('Error archiving group:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al intentar archivar el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsArchiving(false);
      // Ensure modal closes even on error, unless specific handling is needed
      // setIsArchiveConfirmOpen(false); 
      // setGroupToArchive(null); // Reset groupToArchive here or in onClose of modal
    }
  };
  // --- FIN Lógica para Modal de Archivar Grupo ---

  // --- Lógica para Modal de Restaurar Grupo ---
  const handleOpenUnarchiveConfirm = (group) => {
    setGroupToUnarchive({ id: group._id, nombre: group.nombre });
    setIsUnarchiveConfirmOpen(true);
  };

  const handleConfirmUnarchive = async () => {
    if (!groupToUnarchive) return;

    setIsUnarchiving(true);
    try {
      await axiosInstance.put(`/api/groups/${groupToUnarchive.id}/restore`);
      toast.success(`Grupo "${groupToUnarchive.nombre}" restaurado con éxito.`);
      setGroups(prevGroups => prevGroups.filter(g => g._id !== groupToUnarchive.id));
      setIsUnarchiveConfirmOpen(false);
      setGroupToUnarchive(null);
    } catch (err) {
      console.error('Error unarchiving group:', err.response ? err.response.data : err.message);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al intentar restaurar el grupo.';
      toast.error(errorMessage);
      // It's good practice to close modal even on error, or handle specific cases
      setIsUnarchiveConfirmOpen(false);
      setGroupToUnarchive(null);
    } finally {
      setIsUnarchiving(false);
    }
  };
  // --- FIN Lógica para Modal de Restaurar Grupo ---


  // ----Renderizado seguiria aqui (mantener tu JSX de renderizado) ------------
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        {/* --- Encabezado y botón Crear Grupo --- */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Mis Grupos</Typography>
          {/* --- Botón que abre el modal de Crear Grupo --- */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenCreateGroupModal} // <-- Llama a la función para abrir el modal de grupo
            disabled={isCreatingGroup} // Deshabilita durante la creación
          >
            Crear Grupo
          </Button>
        </Box>
        {/* --- Fin Encabezado --- */}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="pestañas de grupos">
            <Tab label="Grupos Activos" value="active" />
            <Tab label="Grupos Archivados" value="archived" />
          </Tabs>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && !isLoading && <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>}

        {!isLoading && !error && groups.length === 0 && (
          <Alert severity="info" sx={{ mt: 4 }}>
            {currentTab === 'active'
              ? 'Aún no has creado ningún grupo activo. Haz clic en "Crear Grupo" para empezar.'
              : 'No tienes grupos archivados.'}
          </Alert>
        )}

        {/* --- Lista de Grupos (Centrada y Compacta) --- */}
        {!isLoading && !error && groups.length > 0 && (
          <Box sx={{ maxWidth: 'sm', mx: 'auto', mt: 3 }}> {/* Ajusta el maxWidth según necesidad */}
            <List dense sx={{ width: '100%', p: 0 }}>
              {groups.map((group) => (
                <Paper key={group._id} sx={{ mb: 2, width: '100%' }}>
                  <ListItem
                    component={Link} // Asegúrate de que Link esté importado de react-router-dom
                    to={`/teacher/groups/${group._id}/manage`}
                    sx={{ p: 2, width: '100%' }}
                  >
                    <ListItemText
                      primary={<Typography variant="h6">{group.nombre}</Typography>}
                      secondary={
                        <>
                          <Typography sx={{ display: 'inline', mr: 1 }} component="span" variant="body2" color="text.primary">
                            Código: {group.codigo_acceso}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span">
                            Estudiantes: {group.approvedStudentCount || 0}
                          </Typography>
                          {group.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1, whiteSpace: 'normal' }}>
                              {group.description}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    {currentTab === 'active' && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="archive"
                          onClick={() => handleOpenArchiveConfirm(group)}
                          disabled={isArchiving}
                          color="warning"
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                    {currentTab === 'archived' && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="unarchive"
                          onClick={() => handleOpenUnarchiveConfirm(group)}
                          disabled={isUnarchiving}
                          color="success" // Use a success color for restore
                        >
                          <RestoreIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem> {/* Changed from ListItemButton to ListItem to accommodate ListItemSecondaryAction */}
                </Paper>
              ))}
            </List>
          </Box>
        )}
      </Box>
      <CreateGroupModal
        open={isCreateGroupModalOpen}
        onClose={handleCloseCreateGroupModal}
        onSubmit={handleGroupFormSubmit} // Le pasamos la función que manejará el submit del formulario
        isCreating={isCreatingGroup} // Le pasamos el estado de creación
      />
      <Dialog
        open={isCreateGroupConfirmOpen}
        onClose={handleCloseCreateGroupConfirm}
        aria-labelledby="create-group-confirm-title"
        aria-describedby="create-group-confirm-description"
      >
        <DialogTitle id="create-group-confirm-title">{"Confirmar Creación de Grupo"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="create-group-confirm-description">
            ¿Estás seguro de que deseas crear el grupo "{groupDataToCreate?.nombre}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateGroupConfirm} disabled={isCreatingGroup}>Cancelar</Button>
          <Button onClick={handleConfirmCreateGroup} color="primary" disabled={isCreatingGroup} autoFocus>
            {isCreatingGroup ? 'Creando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmationModal
        open={isArchiveConfirmOpen}
        onClose={() => { setIsArchiveConfirmOpen(false); setGroupToArchive(null); }}
        onConfirm={handleConfirmArchive}
        title="Confirmar Archivar Grupo"
        message={groupToArchive ? `¿Estás seguro de que quieres archivar el grupo "${groupToArchive.nombre}"? El grupo se ocultará de la lista principal y los estudiantes no podrán unirse a nuevos grupos. Podrás restaurarlo más tarde si esta funcionalidad está habilitada.` : ''}
        confirmButtonText="Archivar"
        cancelButtonText="Cancelar"
        isActionInProgress={isArchiving}
      />

      <ConfirmationModal
        open={isUnarchiveConfirmOpen}
        onClose={() => { setIsUnarchiveConfirmOpen(false); setGroupToUnarchive(null); }}
        onConfirm={handleConfirmUnarchive}
        title="Confirmar Restaurar Grupo"
        message={groupToUnarchive ? `¿Estás seguro de que quieres restaurar el grupo "${groupToUnarchive.nombre}"? El grupo volverá a la lista de grupos activos.` : ''}
        confirmButtonText="Restaurar"
        cancelButtonText="Cancelar"
        isActionInProgress={isUnarchiving}
      />
    </Container>
  );
}

export default TeacherGroupsPage;