import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Button,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Avatar,
  Chip,
  Skeleton,
  Fab,
  Badge,
  Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import ArchiveIcon from '@mui/icons-material/Archive';
import RestoreIcon from '@mui/icons-material/Restore';
import PeopleIcon from '@mui/icons-material/People';
import CodeIcon from '@mui/icons-material/Code';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info'; // For usage display

// Context and utilities
import { useAuth, axiosInstance } from '../../contexts/AuthContext'; // useAuth already imported
import { toast } from 'react-toastify';

// Components
import CreateGroupModal from '../components/CreateGroupModal';
import ConfirmationModal from '../../components/ConfirmationModal';

// Componente de Loading mejorado
const GroupsSkeleton = () => (
  <Box sx={{ mt: 4 }}>
    {[1, 2, 3].map((item) => (
      <Card key={item} sx={{ mb: 3, p: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Skeleton variant="circular" width={56} height={56} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: '60%' }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', width: '40%', mt: 1 }} />
              <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '80%', mt: 1 }} />
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={100} height={24} />
              </Box>
            </Box>
            <Skeleton variant="circular" width={40} height={40} />
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Componente de tarjeta de grupo para docentes
const TeacherGroupCard = ({ group, index, isArchived, onArchive, onRestore, isProcessing, onEdit }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (!isArchived) {
      navigate(`/teacher/groups/${group._id}/manage`);
    }
  };
  
  // Detiene la propagación para que al hacer clic en los botones no se navegue.
  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action(group);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Card
        onClick={handleCardClick}
        sx={{
          mb: 3,
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s ease-in-out',
          border: '1px solid',
          borderColor: 'divider',
          cursor: isArchived ? 'default' : 'pointer', // Cambia el cursor si es clickeable
          backgroundColor: isArchived ?
            (theme) => alpha(theme.palette.grey[500], 0.05) :
            'background.paper',
          '&:hover': {
            borderColor: isArchived ? 'divider' : 'primary.main',
            boxShadow: isArchived ? 'none' : (theme) => `0 8px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
          }
        }}
      >
        <CardContent sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" spacing={3} alignItems="flex-start">
            <Avatar sx={{ width: 56, height: 56, bgcolor: isArchived ? 'grey.400' : 'primary.main', fontSize: '1.5rem' }}>
              <GroupsIcon />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: isArchived ? 'text.secondary' : 'text.primary' }}>
                {group.nombre}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <CodeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Código de Acceso:</strong> {group.codigo_acceso}
                </Typography>
              </Stack>
              {group.descripcion && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>
                  {group.descripcion}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip icon={<PeopleIcon sx={{ fontSize: 16 }} />} label={`${group.approvedStudentCount || 0} estudiantes`} size="small" color={isArchived ? 'default' : 'primary'} variant="filled" />
                {isArchived && (<Chip icon={<ArchiveIcon sx={{ fontSize: 16 }} />} label="Archivado" size="small" color="default" variant="outlined" />)}
              </Stack>
            </Box>

            <Stack direction="column" spacing={1} alignItems="flex-end">
                {!isArchived && (
                  <Tooltip title="Editar grupo">
                    <IconButton onClick={(e) => handleActionClick(e, onEdit)} disabled={isProcessing} sx={{ bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1), '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.2) } }}>
                      <EditIcon color="text.primary" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {!isArchived ? (
                  <Tooltip title="Archivar grupo">
                    <IconButton onClick={(e) => handleActionClick(e, onArchive)} disabled={isProcessing} sx={{ bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1), '&:hover': { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.2) } }}>
                      <ArchiveIcon color="info" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Restaurar grupo">
                    <IconButton onClick={(e) => handleActionClick(e, onRestore)} disabled={isProcessing} sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, 0.1), '&:hover': { bgcolor: (theme) => alpha(theme.palette.success.main, 0.2) } }}>
                      <RestoreIcon color="success" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Componente de tabs personalizado
const CustomTabs = ({ currentTab, onTabChange, activeCount, archivedCount }) => (
  <Box sx={{ mb: 4 }}>
    <Tabs value={currentTab} onChange={onTabChange} sx={{ '& .MuiTabs-indicator': { height: 3, borderRadius: 2, }, '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem', fontWeight: 600, minHeight: 48, } }}>
      <Tab label={ <Stack direction="row" spacing={2} alignItems="center"><span>Grupos Activos</span></Stack>} value="active" />
      <Tab label={ <Stack direction="row" spacing={2} alignItems="center"><span>Grupos Archivados</span></Stack>} value="archived" />
    </Tabs>
  </Box>
);

// Componente principal
function TeacherGroupsPage() {
  const { user, isAuthenticated, isAuthInitialized, fetchAndUpdateUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('active');
  const [stats, setStats] = useState({ active: 0, archived: 0 });
  const hasShownSuccessToast = useRef({ active: false, archived: false });

  // --- BEGIN Plan Limit States ---
  const [canCreateGroup, setCanCreateGroup] = useState(true);
  const [groupLimitMessage, setGroupLimitMessage] = useState('');
  // --- END Plan Limit States ---

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [dataToSave, setDataToSave] = useState(null);
  
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [groupToArchive, setGroupToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  
  const [isUnarchiveConfirmOpen, setIsUnarchiveConfirmOpen] = useState(false);
  const [groupToUnarchive, setGroupToUnarchive] = useState(null);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  useEffect(() => {
    const fetchTeacherGroups = async () => {
      setIsLoading(true);
      setError(null);
      const endpoint = `/api/groups/docente/me?status=${currentTab}`;

      try {
        const response = await axiosInstance.get(endpoint);
        setGroups(response.data.data);

        if (currentTab === 'active') {
          setStats(prev => ({ ...prev, active: response.data.data.length }));
        } else {
          setStats(prev => ({ ...prev, archived: response.data.data.length }));
        }

        if (!hasShownSuccessToast.current[currentTab]) {
          toast.success(`Grupos ${currentTab === 'active' ? 'activos' : 'archivados'} cargados.`);
          hasShownSuccessToast.current[currentTab] = true;
        }
      } catch (err) {
        console.error(`Error al obtener los grupos (${currentTab}):`, err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.message || `Error al cargar tus grupos.`;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthInitialized && isAuthenticated && user?.userType === 'Docente') {
      fetchTeacherGroups();

      // --- BEGIN Plan Limit Check ---
      if (user.plan && user.plan.limits && user.usage) {
        const { maxGroups } = user.plan.limits;
        const { groupsCreated } = user.usage;
        if (groupsCreated >= maxGroups) {
          setCanCreateGroup(false);
          setGroupLimitMessage(`Has alcanzado el límite de ${maxGroups} grupos de tu plan.`);
        } else {
          setCanCreateGroup(true);
          setGroupLimitMessage(`Grupos creados: ${groupsCreated}/${maxGroups}`);
        }
      } else {
        // Default to can create if plan info is somehow missing (backend should prevent actual creation)
        setCanCreateGroup(true);
        setGroupLimitMessage('');
      }
      // --- END Plan Limit Check ---

    } else if (isAuthInitialized && (!isAuthenticated || user?.userType !== 'Docente')) {
      setIsLoading(false);
      setError("No estás autenticado o no tienes permiso para ver esta página.");
    }
  }, [isAuthenticated, user, isAuthInitialized, currentTab]); // Added user to dependency array for plan limit check

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenCreateModal = () => {
    setGroupToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group) => {
    setGroupToEdit(group);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGroupToEdit(null);
    setDataToSave(null);
  };

  const handleFormSubmit = (formData) => {
    setDataToSave(formData);
    setIsConfirmModalOpen(true);
  };

  // Añadir función para actualizar límites
  const updateLimits = async () => {
    const updatedUser = await fetchAndUpdateUser();
    if (updatedUser?.plan && updatedUser?.plan.limits && updatedUser?.usage) {
      const { maxGroups } = updatedUser.plan.limits;
      const { groupsCreated } = updatedUser.usage;
      if (groupsCreated >= maxGroups) {
        setCanCreateGroup(false);
        setGroupLimitMessage(`Has alcanzado el límite de ${maxGroups} grupos de tu plan.`);
      } else {
        setCanCreateGroup(true);
        setGroupLimitMessage(`Grupos creados: ${groupsCreated}/${maxGroups}`);
      }
    }
  };

  const handleConfirmSave = async () => {
    if (!dataToSave) return;
    
    setIsSaving(true);
    try {
      const endpoint = groupToEdit ? `/api/groups/${groupToEdit._id}` : '/api/groups/create';
      const method = groupToEdit ? 'put' : 'post';
      
      const response = await axiosInstance[method](endpoint, dataToSave);
      
      // Asegurarnos de que tenemos una respuesta válida
      if (!response.data) {
        throw new Error('No se recibieron datos del servidor');
      }

      // La respuesta puede venir directamente en data o en data.data
      const savedGroup = response.data.data || response.data;
      
      if (!savedGroup || !savedGroup._id) {
        throw new Error('Los datos del grupo recibidos no son válidos');
      }

      // Actualizar la lista de grupos
      setGroups(prevGroups => {
        if (groupToEdit) {
          return prevGroups.map(g => g._id === savedGroup._id ? savedGroup : g);
        } else {
          return [...prevGroups, savedGroup];
        }
      });

      // Actualizar estadísticas si es un grupo nuevo
      if (!groupToEdit) {
        setStats(prev => ({
          ...prev,
          active: prev.active + 1
        }));
      }
      
      toast.success(groupToEdit ? 'Grupo actualizado con éxito.' : 'Grupo creado con éxito.');
      
      // Actualizar límites después de crear/editar
      await updateLimits();
      
      setIsConfirmModalOpen(false);
      setIsModalOpen(false);
      setGroupToEdit(null);
      setDataToSave(null);
      
    } catch (error) {
      console.error('Error al guardar el grupo:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenArchiveConfirm = (group) => {
    if (!group) return;
    setGroupToArchive(group);
    setIsArchiveConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!groupToArchive) return;
    
    setIsArchiving(true);
    try {
      await axiosInstance.put(`/api/groups/${groupToArchive._id}/archive`);
      
      // Actualizar la lista y estadísticas
      setGroups(prevGroups => prevGroups.filter(g => g._id !== groupToArchive._id));
      setStats(prev => ({
        active: prev.active - 1,
        archived: prev.archived + 1
      }));
      
      // Actualizar límites después de archivar
      await updateLimits();
      
      toast.success('Grupo archivado con éxito.');
      setIsArchiveConfirmOpen(false);
      setGroupToArchive(null);
      
    } catch (error) {
      console.error('Error al archivar el grupo:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al archivar el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOpenUnarchiveConfirm = (group) => {
    if (!group) return;
    setGroupToUnarchive(group);
    setIsUnarchiveConfirmOpen(true);
  };

  const handleConfirmUnarchive = async () => {
    if (!groupToUnarchive) return;
    
    setIsUnarchiving(true);
    try {
      await axiosInstance.put(`/api/groups/${groupToUnarchive._id}/unarchive`);
      
      // Actualizar la lista y estadísticas
      setGroups(prevGroups => prevGroups.filter(g => g._id !== groupToUnarchive._id));
      setStats(prev => ({
        active: prev.active + 1,
        archived: prev.archived - 1
      }));
      
      // Actualizar límites después de desarchivar
      await updateLimits();
      
      toast.success('Grupo restaurado con éxito.');
      setIsUnarchiveConfirmOpen(false);
      setGroupToUnarchive(null);
      
    } catch (error) {
      console.error('Error al restaurar el grupo:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al restaurar el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsUnarchiving(false);
    }
  };

  if (!isAuthenticated || user?.userType !== 'Docente') {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            {error || 'Debes ser Docente para ver esta página.'}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* ... Page Title ... */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Box sx={{ textAlign: 'center', mb: 1 }}> {/* Reduced mb here */}
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
              Mis Grupos
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
              Administra todos tus grupos de estudiantes desde un solo lugar.
            </Typography>
          </Box>
          {/* --- BEGIN Display Usage/Limit --- */}
          {user?.userType === 'Docente' && groupLimitMessage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 3, color: canCreateGroup ? 'text.secondary' : 'warning.main' }}>
              <InfoIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                {groupLimitMessage}
              </Typography>
            </Box>
          )}
          {/* --- END Display Usage/Limit --- */}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #5d4aab 0%, #7c6fd1 100%)' }}>
            <CardContent sx={{ py: 3 }}>
              <Stack direction="row" spacing={4} justifyContent="center" alignItems="center">
                <Box sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>{stats.active}</Typography><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Grupos Activos</Typography></Box>
                <Box sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>{stats.archived}</Typography><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Archivados</Typography></Box>
                <Box sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>{groups.reduce((acc, group) => acc + (group.approvedStudentCount || 0), 0)}</Typography><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{currentTab === 'active' ? 'Estudiantes Activos' : 'Total Estudiantes'}</Typography></Box>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <CustomTabs currentTab={currentTab} onTabChange={handleTabChange} activeCount={stats.active} archivedCount={stats.archived} />
        </motion.div>

        <Box sx={{ mt: 4 }}>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <GroupsSkeleton />
              </motion.div>
            )}
            {error && !isLoading && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <Alert severity="error" sx={{ mt: 3, borderRadius: 2, '& .MuiAlert-message': { fontSize: '1rem' } }}>{error}</Alert>
              </motion.div>
            )}
            {!isLoading && !error && groups.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <Card sx={{ mt: 6, py: 6, textAlign: 'center', borderRadius: 3, backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.02), border: '1px dashed', borderColor: (theme) => alpha(theme.palette.primary.main, 0.2) }}>
                  <CardContent>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), mx: 'auto', mb: 3 }}><GroupsIcon sx={{ fontSize: 40, color: 'primary.main' }} /></Avatar>
                    <Typography variant="h6" sx={{ mb: 2 }}>{currentTab === 'active' ? 'Aún no has creado ningún grupo activo' : 'No tienes grupos archivados'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{currentTab === 'active' ? 'Crea tu primer grupo para comenzar.' : 'Los grupos archivados aparecerán aquí.'}</Typography>
                    {currentTab === 'active' && (<Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenCreateModal} size="large">Crear Primer Grupo</Button>)}
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {!isLoading && !error && groups.length > 0 && (
              <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Box sx={{ mt: 4 }}>
                  {groups.map((group, index) => (
                    <TeacherGroupCard key={group._id} group={group} index={index} isArchived={currentTab === 'archived'} onArchive={handleOpenArchiveConfirm} onRestore={handleOpenUnarchiveConfirm} isProcessing={isArchiving || isUnarchiving} onEdit={handleOpenEditModal} />
                  ))}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        <AnimatePresence>
          {!isLoading && currentTab === 'active' && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.3, delay: 0.5 }}>
              {/* --- BEGIN Tooltip and Disable Logic for FAB --- */}
              <Tooltip title={!canCreateGroup ? groupLimitMessage : "Crear Nuevo Grupo"}>
                <span> {/* Span needed for Tooltip when button is disabled */}
                  <Fab
                    color="primary"
                    sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
                    onClick={handleOpenCreateModal}
                    disabled={isSaving || !canCreateGroup} // Disable if saving or limit reached
                  >
                    <AddIcon />
                  </Fab>
                </span>
              </Tooltip>
              {/* --- END Tooltip and Disable Logic for FAB --- */}
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <CreateGroupModal open={isModalOpen} onClose={handleCloseModal} onSubmit={handleFormSubmit} isCreating={isSaving} initialData={groupToEdit} />
      <ConfirmationModal open={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmSave} title={groupToEdit ? "Confirmar Edición" : "Confirmar Creación"} message={dataToSave ? `¿Estás seguro de que deseas ${groupToEdit ? 'guardar los cambios en' : 'crear el grupo'} "${dataToSave.nombre}"?` : ''} confirmButtonText={isSaving ? 'Guardando...' : 'Confirmar'} cancelButtonText="Cancelar" isActionInProgress={isSaving} />
      <ConfirmationModal open={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleConfirmArchive} title="Confirmar Archivar Grupo" message={groupToArchive ? `¿Estás seguro de que quieres archivar el grupo "${groupToArchive.nombre}"?` : ''} confirmButtonText="Archivar" cancelButtonText="Cancelar" isActionInProgress={isArchiving} />
      <ConfirmationModal open={isUnarchiveConfirmOpen} onClose={() => setIsUnarchiveConfirmOpen(false)} onConfirm={handleConfirmUnarchive} title="Confirmar Restaurar Grupo" message={groupToUnarchive ? `¿Estás seguro de que quieres restaurar el grupo "${groupToUnarchive.nombre}"?` : ''} confirmButtonText="Restaurar" cancelButtonText="Cancelar" isActionInProgress={isUnarchiving} />
    </Container>
  );
}

export default TeacherGroupsPage;