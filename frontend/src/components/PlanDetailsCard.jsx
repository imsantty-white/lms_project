// frontend/src/components/PlanDetailsCard.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Paper, Chip, Grid, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircleOutline as CheckCircleOutlineIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

const PlanDetailsCard = () => {
  const { user } = useAuth();

  if (user?.userType !== 'Docente' || !user.plan) {
    // Or return a message indicating no plan information is available
    return null;
  }

  const { plan, subscriptionEndDate, usage } = user;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Detalles de tu Plan Actual
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="span" sx={{ mr: 1 }}>
          {plan.name}
        </Typography>
        <Chip
          label={plan.isActive ? 'Activo' : 'Inactivo'}
          color={plan.isActive ? 'success' : 'error'}
          size="small"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Información General:</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><InfoOutlinedIcon color="action" /></ListItemIcon>
              <ListItemText primary="Precio:" secondary={plan.price !== null && plan.price !== undefined ? `$${plan.price}` : 'Gratuito'} />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoOutlinedIcon color="action" /></ListItemIcon>
              <ListItemText primary="Duración:" secondary={plan.duration ? plan.duration.charAt(0).toUpperCase() + plan.duration.slice(1) : 'N/A'} />
            </ListItem>
            {plan.duration !== 'indefinite' && (
              <ListItem>
                <ListItemIcon><InfoOutlinedIcon color="action" /></ListItemIcon>
                <ListItemText primary="Fecha de Vencimiento:" secondary={formatDate(subscriptionEndDate)} />
              </ListItem>
            )}
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Límites y Uso Actual:</Typography>
          <List dense>
            {Object.entries(plan.limits).map(([key, value]) => {
              let limitName = '';
              let currentUsage = 0;
              switch (key) {
                case 'maxGroups':
                  limitName = 'Grupos';
                  currentUsage = usage?.groupsCreated || 0;
                  break;
                case 'maxStudentsPerGroup':
                  limitName = 'Estudiantes por Grupo';
                  // Usage for this specific limit is not directly tracked in user.usage in this example
                  // This limit is typically enforced at the point of adding a student to a group.
                  // Displaying it here for informational purposes.
                  currentUsage = 'N/A'; // Or some other placeholder
                  break;
                case 'maxRoutes':
                  limitName = 'Rutas de Aprendizaje';
                  // Assuming 'routes' usage is not tracked in user.usage.routesCreated
                  // If it were, it would be: currentUsage = usage?.routesCreated || 0;
                  currentUsage = 'N/A'; // Placeholder
                  break;
                case 'maxResources':
                  limitName = 'Recursos';
                  currentUsage = usage?.resourcesGenerated || 0;
                  break;
                case 'maxActivities':
                  limitName = 'Actividades';
                  currentUsage = usage?.activitiesGenerated || 0;
                  break;
                default:
                  limitName = key;
              }
              return (
                <ListItem key={key}>
                  <ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary={`${limitName}: ${value}`}
                    secondary={currentUsage !== 'N/A' ? `Usado: ${currentUsage}` : ''}
                  />
                </ListItem>
              );
            })}
          </List>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PlanDetailsCard;
