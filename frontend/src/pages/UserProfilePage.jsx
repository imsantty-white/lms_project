import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Typography, Paper, MenuItem } from '@mui/material';
import { axiosInstance } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const tiposIdentificacion = [
  'Tarjeta de Identidad',
  'Cédula de Ciudadanía',
  'Registro Civil de Nacimiento',
  'Tarjeta de Extranjería',
  'Cédula de Extranjería',
  'NIT',
  'Pasaporte'
];

function UserProfilePage() {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    axiosInstance.get('/api/profile')
      .then(res => {
        setProfile(res.data);
        setForm(res.data);
      })
      .catch(() => toast.error('Error al cargar el perfil'));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await axiosInstance.put('/api/profile', form);
      toast.success('Perfil actualizado');
      setProfile({ ...profile, ...form });
      setEdit(false);
    } catch {
      toast.error('Error al actualizar el perfil');
    }
  };

  if (!profile) return <Typography>Cargando...</Typography>;

  return (
    <Box maxWidth={500} mx="auto" mt={4}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Mi Perfil</Typography>
        <TextField
          label="Nombre"
          name="nombre"
          value={form.nombre || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!edit}
        />
        <TextField
          label="Apellidos"
          name="apellidos"
          value={form.apellidos || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!edit}
        />
        <TextField
          label="Correo"
          name="email"
          value={form.email || ''}
          fullWidth
          margin="normal"
          disabled
        />
        <TextField
          label="Teléfono"
          name="telefono"
          value={form.telefono || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!edit}
        />
        <TextField
          label="Institución"
          name="institucion"
          value={form.institucion || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!edit}
        />
        <TextField
          select
          label="Tipo de Identificación"
          name="tipo_identificacion"
          value={form.tipo_identificacion || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!edit}
        >
          {tiposIdentificacion.map((tipo) => (
            <MenuItem key={tipo} value={tipo}>
              {tipo}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Número de Identificación"
          name="numero_identificacion"
          value={form.numero_identificacion || ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={!edit}
        />
        <TextField
          label="Fecha de Nacimiento"
          name="fecha_nacimiento"
          type="date"
          value={form.fecha_nacimiento ? form.fecha_nacimiento.slice(0, 10) : ''}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          disabled={!edit}
        />
        <Box mt={2}>
          {!edit ? (
            <Button variant="contained" onClick={() => setEdit(true)}>Editar</Button>
          ) : (
            <>
              <Button variant="contained" onClick={handleSave} sx={{ mr: 2 }}>Guardar</Button>
              <Button variant="outlined" onClick={() => { setEdit(false); setForm(profile); }}>Cancelar</Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default UserProfilePage;