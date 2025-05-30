// src/pages/administrator/ConfiguracionAdminPlaceholder.js
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications'; // Icono de ejemplo

const ConfiguracionAdminPlaceholder = () => {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center', maxWidth: 'md' }}>
        <SettingsApplicationsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" component="h1" gutterBottom>
          Configuración del Sistema (Placeholder)
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Aquí se debería mostrar la configuración avanzada del sistema.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Esto podría incluir aspectos como:
        </Typography>
        <Box component="ul" sx={{ textAlign: 'left', display: 'inline-block', mb: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary">Limitaciones para planes y suscripciones de usuarios.</Typography>
          <Typography component="li" variant="body2" color="text.secondary">Gestión de características globales.</Typography>
          <Typography component="li" variant="body2" color="text.secondary">Integraciones con servicios externos.</Typography>
          <Typography component="li" variant="body2" color="text.secondary">Parámetros de seguridad y auditoría.</Typography>
        </Box>
        <Typography variant="caption" display="block" color="text.disabled">
          (Este es un modelo de negocio y funcionalidad aún no implementada)
        </Typography>
      </Paper>
    </Box>
  );
};

export default ConfiguracionAdminPlaceholder;