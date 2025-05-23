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
  DialogTitle // <-- Importa DialogTitle
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

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


function TeacherGroupsPage() {
  // *** Obtén isAuthInitialized del hook useAuth ***
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // <-- Añade isAuthInitialized

  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasShownSuccessToast = useRef(false);


  // --- NUEVOS ESTADOS PARA MODAL DE CREAR GRUPO Y SU CONFIRMACIÓN (mantener) ---
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateGroupConfirmOpen, setIsCreateGroupConfirmOpen] = useState(false);
  const [groupDataToCreate, setGroupDataToCreate] = useState(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  // --- FIN NUEVOS ESTADOS GRUPO ---


  useEffect(() => {
    const fetchTeacherGroups = async () => {
         // No necesitas la verificación de auth aquí dentro, la haremos en la condición del useEffect
         // if (!isAuthenticated || user?.userType !== 'Docente') {
         //    setIsLoading(false);
         //    setError('No tienes permiso para ver esta página.');
         //    return;
         // }

      setIsLoading(true);
      setError(null);
      hasShownSuccessToast.current = false;

      try {
        // *** Usar axiosInstance.get en lugar de axios.get ***
        // Nota: si axiosInstance ya tiene baseURL, puedes usar rutas relativas como '/api/groups/'
        const response = await axiosInstance.get('/api/groups/docente/me'); // <-- Modificado

        setGroups(response.data.data); // Asumiendo que tu backend devuelve los grupos en response.data.data

        if (!hasShownSuccessToast.current) {
            toast.success('Grupos cargados con éxito.');
            hasShownSuccessToast.current = true;
        }

      } catch (err) {
        console.error('Error al obtener los grupos del docente:', err.response ? err.response.data : err.message);
        const errorMessage = err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Error al cargar tus grupos.';
        setError(errorMessage);
        toast.error('Error al cargar grupos.');
        hasShownSuccessToast.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    // *** CONDICIÓN CLAVE: Ejecutar el fetch solo si la Auth está inicializada Y autenticado como Docente ***
    if (isAuthInitialized && isAuthenticated && user?.userType === 'Docente') {
        fetchTeacherGroups();
    } else if (isAuthInitialized && !isAuthenticated) {
         // Si la inicialización terminó pero no estamos autenticados,
         // esto no debería pasar si la ruta está protegida por ProtectedRoute,
         // pero como fallback, seteamos el error y el estado de carga.
         // La redirección a '/' la maneja ProtectedRoute.
         console.log("Auth inicializada, pero usuario no autenticado. No se cargan grupos.");
         setIsLoading(false);
         setError("No estás autenticado para ver tus grupos."); // Mostrar error apropiado
     } else if (!isAuthInitialized) {
         // Si la Auth aún no ha terminado de inicializar, no hacemos nada aún,
         // ProtectedRoute mostrará el spinner inicial.
         console.log("Auth aún no inicializada. Esperando para cargar grupos.");
     }


    // *** Añadir isAuthInitialized a las dependencias ***
  }, [isAuthenticated, user, isAuthInitialized]); // <-- Añade isAuthInitialized

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


        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && !isLoading && <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>}

        {!isLoading && !error && groups.length === 0 && (
          <Alert severity="info" sx={{ mt: 4 }}>
            Aún no has creado ningún grupo. Haz clic en "Crear Grupo" para empezar.
          </Alert>
        )}

        {/* --- Lista de Grupos (Centrada y Compacta) --- */}
        {!isLoading && !error && groups.length > 0 && (
          <Box sx={{ maxWidth: 'sm', mx: 'auto', mt: 3 }}>
            <List dense sx={{ width: '100%', p: 0 }}>
              {groups.map((group) => (
                <Paper key={group._id} sx={{ mb: 2, width: '100%' }}>
                  <ListItemButton
                    component={Link} // Asegúrate de que Link esté importado de react-router-dom
                    to={`/my-teacher-groups/${group._id}/manage`}
                    sx={{ p: 2, width: '100%' }}
                  >
                    <ListItemText
                      primary={<Typography variant="h6">{group.nombre}</Typography>}
                      secondary={
                        <>
                          <Typography sx={{ display: 'inline', mr: 1 }} component="span" variant="body2" color="text.primary"> {/* Añade mr para separar */}
                            Código: {group.codigo_acceso}
                          </Typography>
                          {/* Elimina el Divider si quieres los datos en la misma línea o ajusta según necesites */}
                          {/* <Divider sx={{ my: 1 }} /> */}
                          <Typography variant="body2" color="text.secondary" component="span"> {/* Usa component="span" para que quede en la misma línea */}
                            Estudiantes: {group.approvedStudentCount || 0}
                         </Typography>
                         {group.description && ( // Muestra descripción si existe
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1, whiteSpace: 'normal' }}>
                            {group.description}
                          </Typography>
                         )}
                      </>
                    }
                  />
                  </ListItemButton>
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
        <DialogTitle id="create-group-confirm-title">{"Confirmar Creación de Grupo"}</DialogTitle> {/* Título más específico */}
        <DialogContent>
          <DialogContentText id="create-group-confirm-description">
            ¿Estás seguro de que deseas crear el grupo "{groupDataToCreate?.nombre}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateGroupConfirm} disabled={isCreatingGroup}>Cancelar</Button>
          <Button onClick={handleConfirmCreateGroup} color="primary" disabled={isCreatingGroup} autoFocus>
            {isCreatingGroup ? 'Creando...' : 'Confirmar Creación'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}

export default TeacherGroupsPage;