// frontend/src/components/administrator/PlanFormModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField,
  Grid, Checkbox, FormControlLabel, Select, MenuItem, InputLabel, FormControl, FormHelperText, Box, Typography
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { axiosInstance } from '../../contexts/AuthContext';

// Validation Schema
const planSchemaValidation = yup.object().shape({
  name: yup.string().required('El nombre del plan es obligatorio.'),
  duration: yup.string().required('La duración es obligatoria.'),
  price: yup.number()
    .transform(value => (isNaN(value) || value === null || value === undefined) ? undefined : Number(value))
    .nullable()
    .when('name', {
      is: (name) => name !== 'Free',
      then: (schema) => schema.min(0, 'El precio debe ser positivo.').required('El precio es obligatorio para planes de pago.'),
      otherwise: (schema) => schema.optional(),
    }),
  limits: yup.object().shape({
    maxGroups: yup.number().min(0, 'Mínimo 0').required('Límite de grupos es obligatorio.').integer('Debe ser entero.'),
    maxStudentsPerGroup: yup.number().min(0, 'Mínimo 0').required('Límite de estudiantes por grupo es obligatorio.').integer('Debe ser entero.'),
    maxRoutes: yup.number().min(0, 'Mínimo 0').required('Límite de rutas es obligatorio.').integer('Debe ser entero.'),
    maxResources: yup.number().min(0, 'Mínimo 0').required('Límite de recursos es obligatorio.').integer('Debe ser entero.'),
    maxActivities: yup.number().min(0, 'Mínimo 0').required('Límite de actividades es obligatorio.').integer('Debe ser entero.'),
  }),
  isDefaultFree: yup.boolean(),
  isActive: yup.boolean(),
});

const PlanFormModal = ({ open, onClose, plan, onSave }) => {
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(planSchemaValidation),
    defaultValues: {
      name: 'Basic',
      duration: 'monthly',
      price: '', // Keep as empty string for TextField, transform handles number conversion
      limits: {
        maxGroups: 10,
        maxStudentsPerGroup: 50,
        maxRoutes: 5,
        maxResources: 50,
        maxActivities: 50,
      },
      isDefaultFree: false,
      isActive: true,
    }
  });

  const isEditing = !!plan;
  const watchedName = watch('name');

  useEffect(() => {
    if (open) {
      if (isEditing && plan) {
        reset({
          name: plan.name,
          duration: plan.duration,
          price: plan.price === null || plan.price === undefined ? '' : plan.price,
          limits: {
            maxGroups: plan.limits?.maxGroups || 0,
            maxStudentsPerGroup: plan.limits?.maxStudentsPerGroup || 0,
            maxRoutes: plan.limits?.maxRoutes || 0,
            maxResources: plan.limits?.maxResources || 0,
            maxActivities: plan.limits?.maxActivities || 0,
          },
          isDefaultFree: plan.isDefaultFree || false,
          isActive: plan.isActive === undefined ? true : plan.isActive,
        });
      } else {
        // Reset to default for new plan, including specific defaults for 'Free' if chosen
        reset({
            name: 'Basic', // Default selected plan type
            duration: 'monthly',
            price: '',
            limits: { maxGroups: 10, maxStudentsPerGroup: 50, maxRoutes: 5, maxResources: 50, maxActivities: 50 },
            isDefaultFree: false,
            isActive: true,
        });
      }
    }
  }, [plan, isEditing, open, reset]);

  // Effect to adjust price field when 'Free' plan is selected
  useEffect(() => {
    if (watchedName === 'Free') {
      reset(currentValues => ({ ...currentValues, price: '', isDefaultFree: true }));
    } else if (isEditing && plan?.name === watchedName && plan?.name !== 'Free') {
      // If editing and name is reverted to original non-free, restore original price
      reset(currentValues => ({...currentValues, price: plan.price === null || plan.price === undefined ? '' : plan.price, isDefaultFree: false}));
    } else if (!isEditing || (isEditing && plan?.name !== watchedName && watchedName !== 'Free')) {
      // If creating a new non-free plan, or changing from Free to non-Free
      reset(currentValues => ({...currentValues, isDefaultFree: false}));
    }
  }, [watchedName, reset, isEditing, plan]);


  const onSubmit = async (data) => {
    const payload = {
      ...data,
      price: data.name === 'Free' ? null : Number(data.price) // Ensure price is number or null
    };

    try {
      if (isEditing) {
        await axiosInstance.put(`/api/admin/plans/${plan._id}`, payload);
        toast.success('Plan actualizado exitosamente.');
      } else {
        await axiosInstance.post('/api/admin/plans', payload);
        toast.success('Plan creado exitosamente.');
      }
      onSave(); // Callback to refresh data on parent and close modal
    } catch (err) {
      console.error("Error saving plan:", err);
      toast.error(err.response?.data?.message || 'Error al guardar el plan.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ component: 'form', onSubmit: handleSubmit(onSubmit) }}>
      <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2, fontWeight: 'bold' }}>
        {isEditing ? 'Editar Plan de Suscripción' : 'Crear Nuevo Plan de Suscripción'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Plan Name */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.name}>
              <InputLabel id="plan-name-label">Nombre del Plan</InputLabel>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Select labelId="plan-name-label" label="Nombre del Plan" {...field} disabled={isEditing && plan?.isDefaultFree}> {/* Prevent changing name of default free plan */}
                    <MenuItem value="Free">Free</MenuItem>
                    <MenuItem value="Basic">Basic</MenuItem>
                    <MenuItem value="Premium">Premium</MenuItem>
                  </Select>
                )}
              />
              {errors.name && <FormHelperText>{errors.name.message}</FormHelperText>}
            </FormControl>
          </Grid>

          {/* Duration */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.duration}>
              <InputLabel id="plan-duration-label">Duración</InputLabel>
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <Select labelId="plan-duration-label" label="Duración" {...field}>
                    <MenuItem value="monthly">Mensual</MenuItem>
                    <MenuItem value="quarterly">Trimestral</MenuItem>
                    <MenuItem value="annual">Anual</MenuItem>
                    <MenuItem value="indefinite">Indefinida</MenuItem>
                  </Select>
                )}
              />
              {errors.duration && <FormHelperText>{errors.duration.message}</FormHelperText>}
            </FormControl>
          </Grid>

          {/* Price */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Precio"
                  type="number"
                  fullWidth
                  error={!!errors.price}
                  helperText={errors.price?.message}
                  disabled={watchedName === 'Free'} // Disable price for 'Free' plan
                  InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{mt: 1, fontWeight: 'medium'}}>Límites de Características</Typography>
          </Grid>

          {/* Limits */}
          {Object.keys(control._defaultValues.limits).map((limitKey) => (
            <Grid item xs={12} sm={6} md={4} key={limitKey}>
              <Controller
                name={`limits.${limitKey}`}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={limitKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} // Format label
                    type="number"
                    fullWidth
                    error={!!errors.limits?.[limitKey]}
                    helperText={errors.limits?.[limitKey]?.message}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                )}
              />
            </Grid>
          ))}

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Controller
                  name="isDefaultFree"
                  control={control}
                  render={({ field }) => <Checkbox {...field} checked={field.value} disabled={watchedName !== 'Free'} />} // Only enable if name is 'Free'
                />
              }
              label="Es el plan gratuito predeterminado"
            />
             {errors.isDefaultFree && <FormHelperText error>{errors.isDefaultFree.message}</FormHelperText>}
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => <Checkbox {...field} checked={field.value} />}
                />
              }
              label="Plan Activo (disponible para asignación)"
            />
            {errors.isActive && <FormHelperText error>{errors.isActive.message}</FormHelperText>}
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px', borderTop: 1, borderColor: 'divider', mt:2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancelar</Button>
        <Button type="submit" variant="contained" color="primary">
          {isEditing ? 'Guardar Cambios' : 'Crear Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanFormModal;
