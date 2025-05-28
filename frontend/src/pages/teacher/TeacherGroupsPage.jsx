// src/pages/TeacherGroupsPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from "react-router-dom";
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
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';

// Context and utilities
import { useAuth, axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

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
const TeacherGroupCard = ({ group, index, isArchived, onArchive, onRestore, isProcessing }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        sx={{ 
          mb: 3,
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s ease-in-out',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: isArchived ? 
            (theme) => alpha(theme.palette.grey[500], 0.05) : 
            'background.paper',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: (theme) => `0 8px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
          }
        }}
      >
        <CardContent sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" spacing={3} alignItems="flex-start">
            {/* Avatar del grupo */}
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: isArchived ? 'grey.400' : 'primary.main',
                fontSize: '1.5rem'
              }}
            >
              <GroupsIcon />
            </Avatar>

            {/* Información del grupo */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  mb: 1,
                  color: isArchived ? 'text.secondary' : 'text.primary'
                }}
              >
                {group.nombre}
              </Typography>

              {/* Código de acceso */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <CodeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Código de Acceso:</strong> {group.codigo_acceso}
                </Typography>
              </Stack>

              {/* Descripción */}
              {group.descripcion && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {group.descripcion}
                </Typography>
              )}

              {/* Chips de información */}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip
                  icon={<PeopleIcon sx={{ fontSize: 16 }} />}
                  label={`${group.approvedStudentCount || 0} estudiantes`}
                  size="small"
                  color={isArchived ? 'default' : 'primary'}
                  variant="filled"
                />
                {isArchived && (
                  <Chip
                    icon={<ArchiveIcon sx={{ fontSize: 16 }} />}
                    label="Archivado"
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>

            {/* Botones de acción */}
            <Stack direction="column" spacing={3} alignItems="flex-end">
              {/* Botón de gestionar */}
              <Tooltip title="Gestionar grupo">
                <IconButton
                  component={Link}
                  to={`/teacher/groups/${group._id}/manage`}
                  sx={{
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                    }
                  }}
                >
                  <SettingsIcon color="primary" />
                </IconButton>
              </Tooltip>

              {/* Botón de archivar/restaurar */}
              {!isArchived ? (
                <Tooltip title="Archivar grupo">
                  <IconButton
                    onClick={() => onArchive(group)}
                    disabled={isProcessing}
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.2),
                      }
                    }}
                  >
                    <ArchiveIcon color="warning" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Restaurar grupo">
                  <IconButton
                    onClick={() => onRestore(group)}
                    disabled={isProcessing}
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.2),
                      }
                    }}
                  >
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
    <Tabs 
      value={currentTab} 
      onChange={onTabChange}
      sx={{
        '& .MuiTabs-indicator': {
          height: 3,
          borderRadius: 2,
        },
        '& .MuiTab-root': {
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          minHeight: 48,
        }
      }}
    >
      <Tab 
        label={
          <Stack direction="row" spacing={2} alignItems="center">
            <span>Grupos Activos</span>
            <Badge 
              badgeContent={activeCount} 
              color="primary"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
            />
          </Stack>
        } 
        value="active" 
      />
      <Tab 
        label={
          <Stack direction="row" spacing={2} alignItems="center">
            <span>Grupos Archivados</span>
            <Badge 
              badgeContent={archivedCount} 
              color="default"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
            />
          </Stack>
        } 
        value="archived" 
      />
    </Tabs>
  </Box>
);

// Componente principal
function TeacherGroupsPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('active');
  const [stats, setStats] = useState({ active: 0, archived: 0 });

  const hasShownSuccessToast = useRef({ active: false, archived: false });

  // Estados para modales
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateGroupConfirmOpen, setIsCreateGroupConfirmOpen] = useState(false);
  const [groupDataToCreate, setGroupDataToCreate] = useState(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [groupToArchive, setGroupToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  
  const [isUnarchiveConfirmOpen, setIsUnarchiveConfirmOpen] = useState(false);
  const [groupToUnarchive, setGroupToUnarchive] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  useEffect(() => {
    const fetchTeacherGroups = async () => {
      setIsLoading(true);
      setError(null);

      let endpoint = '/api/groups/docente/me';
      if (currentTab === 'archived') {
        endpoint = '/api/groups/docente/me?status=archived';
      } else {
        endpoint = '/api/groups/docente/me?status=active';
      }

      try {
        const response = await axiosInstance.get(endpoint);
        setGroups(response.data.data);

        // Actualizar estadísticas
        if (currentTab === 'active') {
          setStats(prev => ({ ...prev, active: response.data.data.length }));
        } else {
          setStats(prev => ({ ...prev, archived: response.data.data.length }));
        }

        if (!hasShownSuccessToast.current[currentTab]) {
          toast.success(`Grupos ${currentTab === 'active' ? 'activos' : 'archivados'} cargados con éxito.`);
          hasShownSuccessToast.current[currentTab] = true;
        }
      } catch (err) {
        console.error(`Error al obtener los grupos (${currentTab}) del docente:`, err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.message || `Error al cargar tus grupos ${currentTab === 'active' ? 'activos' : 'archivados'}.`;
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
  }, [isAuthenticated, user, isAuthInitialized, currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handlers para modales
  const handleOpenCreateGroupModal = () => {
    setIsCreateGroupModalOpen(true);
  };

  const handleCloseCreateGroupModal = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    setIsCreateGroupModalOpen(false);
    setGroupDataToCreate(null);
  };

  const handleGroupFormSubmit = (formData) => {
    setGroupDataToCreate(formData);
    setIsCreateGroupConfirmOpen(true);
  };

  const handleCloseCreateGroupConfirm = () => {
    setIsCreateGroupConfirmOpen(false);
    setGroupDataToCreate(null);
  };

  const handleConfirmCreateGroup = async () => {
    if (!groupDataToCreate) return;

    setIsCreatingGroup(true);

    try {
      const response = await axiosInstance.post('/api/groups/create', groupDataToCreate);
      const newGroup = response.data;
      toast.success('Grupo creado con éxito!');

      if (currentTab === 'active') {
        setGroups(prevGroups => [...prevGroups, newGroup]);
        setStats(prev => ({ ...prev, active: prev.active + 1 }));
      }

      handleCloseCreateGroupConfirm();
      handleCloseCreateGroupModal();
    } catch (err) {
      console.error('Error creating group:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al intentar crear el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsCreatingGroup(false);
    }
  };

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
      setStats(prev => ({ ...prev, active: prev.active - 1, archived: prev.archived + 1 }));
      setIsArchiveConfirmOpen(false);
      setGroupToArchive(null);
    } catch (err) {
      console.error('Error archiving group:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al intentar archivar el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsArchiving(false);
    }
  };

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
      setStats(prev => ({ ...prev, active: prev.active + 1, archived: prev.archived - 1 }));
      setIsUnarchiveConfirmOpen(false);
      setGroupToUnarchive(null);
    } catch (err) {
      console.error('Error unarchiving group:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al intentar restaurar el grupo.';
      toast.error(errorMessage);
    } finally {
      setIsUnarchiving(false);
      setIsUnarchiveConfirmOpen(false);
      setGroupToUnarchive(null);
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
        {/* Header con animación */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
              Mis Grupos
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                maxWidth: 600, 
                mx: 'auto',
                fontSize: '1.1rem'
              }}
            >
              Administra todos tus grupos de estudiantes desde un solo lugar.
            </Typography>
          </Box>
        </motion.div>

        {/* Estadísticas rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #5d4aab 0%, #7c6fd1 100%)' }}>
            <CardContent sx={{ py: 3 }}>
              <Stack direction="row" spacing={4} justifyContent="center" alignItems="center">
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Grupos Activos
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                    {stats.archived}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Archivados
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                    {groups.reduce((acc, group) => acc + (group.approvedStudentCount || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {currentTab === 'active' ? 'Estudiantes Activos' : 'Total Estudiantes'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CustomTabs 
            currentTab={currentTab}
            onTabChange={handleTabChange}
            activeCount={stats.active}
            archivedCount={stats.archived}
          />
        </motion.div>

        {/* Contenido principal */}
        <Box sx={{ mt: 4 }}>
          <AnimatePresence mode="wait">
            {/* Loading */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GroupsSkeleton />
              </motion.div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 3,
                    borderRadius: 2,
                    '& .MuiAlert-message': {
                      fontSize: '1rem'
                    }
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && !error && groups.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  sx={{ 
                    mt: 6,
                    py: 6,
                    textAlign: 'center',
                    borderRadius: 3,
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.02),
                    border: '1px dashed',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.2)
                  }}
                >
                  <CardContent>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        mx: 'auto',
                        mb: 3
                      }}
                    >
                      <GroupsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {currentTab === 'active'
                        ? 'Aún no has creado ningún grupo activo'
                        : 'No tienes grupos archivados'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {currentTab === 'active'
                        ? 'Crea tu primer grupo para comenzar a organizar a tus estudiantes.'
                        : 'Los grupos archivados aparecerán aquí.'}
                    </Typography>
                    {currentTab === 'active' && (
                      <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleOpenCreateGroupModal}
                        size="large"
                      >
                        Crear Primer Grupo
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Groups List */}
            {!isLoading && !error && groups.length > 0 && (
              <motion.div
                key="groups"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ mt: 4 }}>
                  {groups.map((group, index) => (
                    <TeacherGroupCard
                      key={group._id}
                      group={group}
                      index={index}
                      isArchived={currentTab === 'archived'}
                      onArchive={handleOpenArchiveConfirm}
                      onRestore={handleOpenUnarchiveConfirm}
                      isProcessing={isArchiving || isUnarchiving}
                    />
                  ))}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* FAB para crear grupo */}
        <AnimatePresence>
          {!isLoading && currentTab === 'active' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Fab
                color="primary"
                sx={{
                  position: 'fixed',
                  bottom: 24,
                  right: 24,
                  zIndex: 1000
                }}
                onClick={handleOpenCreateGroupModal}
                disabled={isCreatingGroup}
              >
                <AddIcon />
              </Fab>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Modales */}
      <CreateGroupModal
        open={isCreateGroupModalOpen}
        onClose={handleCloseCreateGroupModal}
        onSubmit={handleGroupFormSubmit}
        isCreating={isCreatingGroup}
      />

      <ConfirmationModal
        open={isCreateGroupConfirmOpen}
        onClose={handleCloseCreateGroupConfirm}
        onConfirm={handleConfirmCreateGroup}
        title="Confirmar Creación de Grupo"
        message={groupDataToCreate ? `¿Estás seguro de que deseas crear el grupo "${groupDataToCreate.nombre}"?` : ''}
        confirmButtonText={isCreatingGroup ? 'Creando...' : 'Confirmar'}
        cancelButtonText="Cancelar"
        isActionInProgress={isCreatingGroup}
      />

      <ConfirmationModal
        open={isArchiveConfirmOpen}
        onClose={() => { setIsArchiveConfirmOpen(false); setGroupToArchive(null); }}
        onConfirm={handleConfirmArchive}
        title="Confirmar Archivar Grupo"
        message={groupToArchive ? `¿Estás seguro de que quieres archivar el grupo "${groupToArchive.nombre}"? El grupo se ocultará de la lista principal y los estudiantes no podrán unirse al grupo. Podrás restaurarlo más tarde si está habilitado.` : ''}
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