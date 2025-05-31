// frontend/src/pages/administrator/AdminPlanManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { axiosInstance } from '../../contexts/AuthContext'; // Assuming axiosInstance is exported from AuthContext
import ConfirmationModal from '../../components/ConfirmationModal'; // We'll reuse or create this

// --- ADD THIS IMPORT ---
import PlanFormModal from '../../components/administrator/PlanFormModal';
// --- END ADD THIS IMPORT ---

const AdminPlanManagementPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for Modals
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // Plan object to edit, or null for new plan
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null); // Plan object to delete

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/api/admin/plans');
      setPlans(response.data.data || []); // Assuming backend sends { success: true, count: N, data: [] }
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

  // --- RENAME THIS FUNCTION TO onSavePlan ---
  // This function will be called by PlanFormModal upon successful save
  const handleSavePlan = () => {
    setIsPlanFormOpen(false);
    setEditingPlan(null);
    fetchPlans(); // Refresh list after modal closes
  };
  // --- END RENAME ---

  const handleClosePlanForm = () => { // This is just for closing without saving
    setIsPlanFormOpen(false);
    setEditingPlan(null);
  }


  // ... existing delete handlers ...
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
      fetchPlans(); // Refresh list
    } catch (err) {
      console.error("Error deleting plan:", err);
      toast.error(err.response?.data?.message || 'Error al eliminar el plan.');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, m: { xs: 1, sm: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Gestión de Planes de Suscripción
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleOpenCreatePlanForm}
          sx={{ fontWeight: 'bold' }}
        >
          Crear Nuevo Plan
        </Button>
      </Box>

      {plans.length === 0 ? (
        <Typography>No hay planes configurados. Comienza creando uno.</Typography>
      ) : (
        <TableContainer>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Duración</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Grupos Max.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Recursos Max.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actividades Max.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Default Free</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Activo</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((plan) => (
                <TableRow hover key={plan._id}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.price === null || plan.price === undefined ? 'Gratis' : `$${plan.price}`}</TableCell>
                  <TableCell>{plan.duration}</TableCell>
                  <TableCell>{plan.limits?.maxGroups}</TableCell>
                  <TableCell>{plan.limits?.maxResources}</TableCell>
                  <TableCell>{plan.limits?.maxActivities}</TableCell>
                  <TableCell>{plan.isDefaultFree ? 'Sí' : 'No'}</TableCell>
                  <TableCell>{plan.isActive ? 'Sí' : 'No'}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Tooltip title="Editar Plan">
                      <IconButton onClick={() => handleOpenEditPlanForm(plan)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar Plan">
                      <IconButton onClick={() => handleOpenDeleteConfirm(plan)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --- UPDATE PlanFormModal props --- */}
      <PlanFormModal
        open={isPlanFormOpen}
        onClose={handleClosePlanForm} // Pass the simple close handler
        plan={editingPlan}
        onSave={handleSavePlan} // Pass the save handler
      />
      {/* --- END UPDATE --- */}

      <ConfirmationModal
        open={isConfirmDeleteOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleDeletePlan}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar el plan "${planToDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </Paper>
  );
};

export default AdminPlanManagementPage;
