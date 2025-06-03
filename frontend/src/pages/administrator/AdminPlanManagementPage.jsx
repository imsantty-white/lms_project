// frontend/src/pages/administrator/AdminPlanManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Tooltip, Card, CardContent, Chip, Stack, Container,
  useTheme, alpha, Grid, Fade, Skeleton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlanIcon from '@mui/icons-material/CreditCard';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import RouteIcon from '@mui/icons-material/Route';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { toast } from 'react-toastify';
import { axiosInstance } from '../../contexts/AuthContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import PlanFormModal from '../../components/administrator/PlanFormModal';

const AdminPlanManagementPage = () => {
  const theme = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for Modals
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/api/admin/plans');
      setPlans(response.data.data || []);
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError(err.response?.data?.message || 'Error al cargar los planes.');
      toast.error(err.response?.data?.message || 'Error al cargar los planes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreatePlanForm = () => {
    setEditingPlan(null);
    setIsPlanFormOpen(true);
  };

  const handleOpenEditPlanForm = (plan) => {
    setEditingPlan(plan);
    setIsPlanFormOpen(true);
  };

  const handleSavePlan = () => {
    setIsPlanFormOpen(false);
    setEditingPlan(null);
    fetchPlans();
  };

  const handleClosePlanForm = () => {
    setIsPlanFormOpen(false);
    setEditingPlan(null);
  };

  const handleOpenDeleteConfirm = (plan) => {
    setPlanToDelete(plan);
    setIsConfirmDeleteOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setPlanToDelete(null);
    setIsConfirmDeleteOpen(false);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await axiosInstance.delete(`/api/admin/plans/${planToDelete._id}`);
      toast.success(`Plan "${planToDelete.name}" eliminado exitosamente.`);
      fetchPlans();
    } catch (err) {
      console.error("Error deleting plan:", err);
      toast.error(err.response?.data?.message || 'Error al eliminar el plan.');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === 0) {
      return 'Gratuito';
    }
    return `$${price.toLocaleString()}`;
  };

  const getLimitIcon = (type) => {
    const icons = {
      maxGroups: <GroupsIcon fontSize="small" />,
      maxStudentsPerGroup: <PersonIcon fontSize="small" />,
      maxRoutes: <RouteIcon fontSize="small" />,
      maxResources: <FolderIcon fontSize="small" />,
      maxActivities: <AssignmentIcon fontSize="small" />
    };
    return icons[type] || <PlanIcon fontSize="small" />;
  };

  const LoadingSkeleton = () => (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={400} height={48} />
        <Skeleton variant="rectangular" width={200} height={40} sx={{ mt: 2 }} />
      </Box>
      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} md={6} lg={4} key={i}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: 2,
            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.15)}`
          }}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2
          }}>
            <Box>
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  fontSize: { xs: '2rem', sm: '2.5rem' }
                }}
              >
                Planes de Suscripción
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ maxWidth: 600 }}
              >
                Gestiona los planes de suscripción disponibles para los usuarios del sistema
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleOpenCreatePlanForm}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                }
              }}
            >
              Crear Nuevo Plan
            </Button>
          </Box>
        </Box>
      </Fade>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Fade in timeout={600}>
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
              border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <PlanIcon sx={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No hay planes configurados
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Comienza creando tu primer plan de suscripción
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleOpenCreatePlanForm}
              sx={{ borderRadius: 2 }}
            >
              Crear Plan
            </Button>
          </Paper>
        </Fade>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan, index) => (
            <Grid item xs={12} md={6} lg={4} key={plan._id}>
              <Fade in timeout={600 + (index * 100)}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background: plan.isDefaultFree 
                      ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.light, 0.02)} 100%)`
                      : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'visible',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }
                  }}
                >
                  {/* Featured Badge */}
                  {plan.isDefaultFree && (
                    <Chip
                      icon={<StarIcon />}
                      label="Plan Gratuito"
                      color="warning"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: 16,
                        fontWeight: 600,
                        zIndex: 1,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.3)}`
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Plan Header */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                          {plan.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip
                            icon={plan.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                            label={plan.isActive ? 'Activo' : 'Inactivo'}
                            color={plan.isActive ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 800,
                          color: theme.palette.primary.main,
                          mb: 1 
                        }}
                      >
                        {formatPrice(plan.price)}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Duración: {plan.duration}
                      </Typography>
                    </Box>

                    {/* Limits Section */}
                    <Box sx={{ flex: 1, mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.secondary }}>
                        Límites del Plan
                      </Typography>
                      <Stack spacing={1.5}>
                        {Object.entries(plan.limits || {}).map(([key, value]) => (
                          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                              p: 0.5, 
                              borderRadius: 1, 
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main 
                            }}>
                              {getLimitIcon(key)}
                            </Box>
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </Typography>
                            <Chip 
                              label={value === -1 ? 'Ilimitado' : value}
                              size="small"
                              variant="outlined"
                              sx={{ minWidth: 70 }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                      <Tooltip title="Editar Plan">
                        <IconButton 
                          onClick={() => handleOpenEditPlanForm(plan)}
                          sx={{
                            color: theme.palette.primary.main,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.2),
                              transform: 'scale(1.1)',
                            }
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar Plan">
                        <IconButton 
                          onClick={() => handleOpenDeleteConfirm(plan)}
                          sx={{
                            color: theme.palette.error.main,
                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.error.main, 0.2),
                              transform: 'scale(1.1)',
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modals */}
      <PlanFormModal
        open={isPlanFormOpen}
        onClose={handleClosePlanForm}
        plan={editingPlan}
        onSave={handleSavePlan}
      />

      <ConfirmationModal
        open={isConfirmDeleteOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleDeletePlan}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar el plan "${planToDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </Container>
  );
};

export default AdminPlanManagementPage;