import React, { useState } from 'react';
import {
  Paper, Typography, TextField, Button, Stack, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

function RegisterForm() {
  const { register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('Estudiante');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const registrationData = { nombre, apellidos, email, password, userType };
    const result = await register(registrationData);

    setIsLoading(false);

    if (result.success) {
      setSuccessMsg(
        userType === 'Docente'
          ? 'Tu cuenta como Docente ha sido creada. Será activada tras aprobación de un administrador.'
          : '¡Registro exitoso! Ya puedes iniciar sesión.'
      );
      setNombre('');
      setApellidos('');
      setEmail('');
      setPassword('');
      setUserType('Estudiante');
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Registrarse</Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Nombre(s)"
            fullWidth
            required
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            label="Apellidos"
            fullWidth
            required
            value={apellidos}
            onChange={e => setApellidos(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            label="Correo electrónico"
            type="email"
            fullWidth
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <FormControl fullWidth required disabled={isLoading}>
            <InputLabel id="user-type-label">Tipo de Usuario</InputLabel>
            <Select
              labelId="user-type-label"
              value={userType}
              label="Tipo de Usuario"
              onChange={e => setUserType(e.target.value)}
            >
              <MenuItem value="Estudiante">Estudiante</MenuItem>
              <MenuItem value="Docente">Docente</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Creando Cuenta...' : 'Crear Cuenta'}
          </Button>
          {successMsg && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              {successMsg}
            </Typography>
          )}
        </Stack>
      </form>
    </Paper>
  );
}

export default RegisterForm;