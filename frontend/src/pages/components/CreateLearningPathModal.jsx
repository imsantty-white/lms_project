// src/components/CreateLearningPathModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { toast } from 'react-toastify';

function CreateLearningPathModal({
  open,
  onClose,
  onSubmit,
  isCreating,
  teacherGroups,
  initialData // <-- Si viene, es edición
}) {
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Rellenar datos si es edición
  useEffect(() => {
    if (open) {
      if (initialData) {
        setNombre(initialData.nombre || '');
        setDescripcion(initialData.descripcion || '');
        setFechaInicio(initialData.fecha_inicio ? new Date(initialData.fecha_inicio).toISOString().slice(0, 10) : '');
        setFechaFin(initialData.fecha_fin ? new Date(initialData.fecha_fin).toISOString().slice(0, 10) : '');
        setSelectedGroupId(initialData.group_id || '');
      } else {
        setNombre('');
        setDescripcion('');
        setFechaInicio('');
        setFechaFin('');
        setSelectedGroupId(teacherGroups && teacherGroups.length > 0 ? teacherGroups[0]._id : '');
      }
    }
  }, [open, teacherGroups, initialData]);

  const handleGroupChange = (event) => {
    setSelectedGroupId(event.target.value);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!nombre.trim()) {
      toast.warning('El nombre de la ruta es obligatorio.');
      return;
    }
    if (!selectedGroupId) {
      toast.warning('Debes seleccionar un grupo para la ruta de aprendizaje.');
      return;
    }
    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      fecha_inicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fecha_fin: fechaFin ? new Date(fechaFin) : undefined,
      group_id: selectedGroupId,
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="learning-path-dialog-title" fullWidth maxWidth="sm">
      <DialogTitle id="learning-path-dialog-title">
        {initialData ? 'Editar Ruta de Aprendizaje' : 'Crear Nueva Ruta de Aprendizaje'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} component="form" onSubmit={handleFormSubmit} id="learning-path-form">
          <FormControl fullWidth variant="outlined" required disabled={isCreating || !teacherGroups || teacherGroups.length === 0}>
            <InputLabel id="group-select-label">Seleccionar Grupo</InputLabel>
            <Select
              labelId="group-select-label"
              value={selectedGroupId}
              onChange={handleGroupChange}
              label="Seleccionar Grupo"
              disabled={!!initialData} // No permitir cambiar grupo en edición
            >
              <MenuItem value=""><em>-- Selecciona un grupo --</em></MenuItem>
              {teacherGroups && teacherGroups.map((group) => (
                <MenuItem key={group._id} value={group._id}>{group.nombre}</MenuItem>
              ))}
            </Select>
            {(!teacherGroups || teacherGroups.length === 0) && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                No tienes grupos creados. No puedes crear Rutas de Aprendizaje.
              </Typography>
            )}
          </FormControl>

          <TextField
            label="Nombre de la Ruta"
            variant="outlined"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            fullWidth
            required
            disabled={isCreating || !selectedGroupId}
          />
          <TextField
            label="Descripción (Opcional)"
            variant="outlined"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            fullWidth
            disabled={isCreating || !selectedGroupId}
            multiline
            rows={2}
          />
          <TextField
            label="Fecha de Inicio"
            type="date"
            variant="outlined"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            fullWidth
            disabled={isCreating || !selectedGroupId}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Fecha de Fin"
            type="date"
            variant="outlined"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            fullWidth
            disabled={isCreating || !selectedGroupId}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isCreating}>Cancelar</Button>
        <Button
          type="submit"
          form="learning-path-form"
          variant="contained"
          color="primary"
          disabled={
            isCreating ||
            !selectedGroupId ||
            !nombre.trim()
          }
          endIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {initialData
            ? isCreating ? 'Guardando...' : 'Guardar Cambios'
            : isCreating ? 'Creando...' : 'Crear'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateLearningPathModal;