import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Stack } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      switch (result.userType) {
        case 'Docente':
          navigate('/dashboard-docente');
          break;
        case 'Estudiante':
          navigate('/dashboard-estudiante');
          break;
        case 'Administrador':
          navigate('/dashboard-admin');
          break;
        default:
          navigate('/');
          break;
      }
    } else {
      setPassword('');
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Iniciar Sesión</Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            required
          />
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Entrar'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

export default LoginForm;