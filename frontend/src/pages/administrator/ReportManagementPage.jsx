import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper, Grid, Alert, CircularProgress } from '@mui/material';
import PageHeader from '../../components/PageHeader'; // Ajusta la ruta si es necesario
import { useAuth } from '../../contexts/AuthContext'; // Ajusta la ruta si es necesario
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

function ReportManagementPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isAuthInitialized) {
            if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
                setError('No tienes permiso para acceder a esta página.');
            } else {
                setError(null); // Limpiar error si el usuario es admin
            }
        }
    }, [isAuthInitialized, isAuthenticated, user]);

    if (!isAuthInitialized) {
        return (
            <Container>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Verificando permisos...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md">
                <PageHeader title="Gestión de Reportes" />
                <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
            </Container>
        );
    }

    const PlaceholderSection = ({ title, message, icon }) => (
        <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                <Box sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}>
                    {icon}
                </Box>
                <Typography variant="h6" gutterBottom component="div">
                    {title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {message}
                </Typography>
            </Paper>
        </Grid>
    );


    return (
        <Container maxWidth="lg">
            <PageHeader title="Gestión de Reportes" />
            <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Esta sección está en desarrollo. Las funcionalidades completas de reportes se añadirán próximamente.
                </Typography>
                <Grid container spacing={4} sx={{ mt: 2 }}>
                    <PlaceholderSection 
                        title="Reportes de Soporte Técnico"
                        message="La funcionalidad para revisar y gestionar los informes de soporte técnico para usuarios estará disponible en futuras actualizaciones del sistema."
                        icon={<SupportAgentIcon fontSize="inherit" />}
                    />
                    <PlaceholderSection 
                        title="Quejas y Reclamos"
                        message="La funcionalidad para visualizar y administrar las quejas y reclamos enviados por los usuarios estará disponible en futuras actualizaciones del sistema."
                        icon={<ReportProblemIcon fontSize="inherit" />}
                    />
                    {/* Se podrían añadir más placeholders aquí si se anticipan otras secciones de reportes */}
                </Grid>
            </Box>
        </Container>
    );
}

export default ReportManagementPage;
