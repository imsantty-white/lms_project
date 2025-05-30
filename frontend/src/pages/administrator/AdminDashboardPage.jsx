import React, { useEffect, useState } from 'react';
import { Container, Grid, Card, CardContent, Typography, CircularProgress, Alert, Box } from '@mui/material';
import PageHeader from '../../components/PageHeader'; // Ajusta la ruta si es necesario
import { axiosInstance, useAuth } from '../../contexts/AuthContext'; // Ajusta la ruta si es necesario

// Iconos (opcional, pero recomendado para una mejor UI)
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'; // Total Usuarios
import SchoolIcon from '@mui/icons-material/School'; // Total Docentes
import FaceIcon from '@mui/icons-material/Face'; // Total Estudiantes
import GroupWorkIcon from '@mui/icons-material/GroupWork'; // Grupos Activos
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'; // Aprobaciones Pendientes

function AdminDashboardPage() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, isAuthenticated, isAuthInitialized } = useAuth();

    useEffect(() => {
        if (isAuthInitialized) {
            if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
                setError('No tienes permiso para acceder a esta página.');
                setIsLoading(false);
                return;
            }

            const fetchStats = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await axiosInstance.get('/api/admin/statistics');
                    if (response.data && response.data.success && response.data.data) {
                        setStats(response.data.data);
                    } else {
                        throw new Error(response.data?.message || 'Formato de respuesta inesperado de la API.');
                    }
                } catch (err) {
                    const errorMessage = err.response?.data?.message || err.message || 'Error al cargar las estadísticas del sistema.';
                    setError(errorMessage);
                    console.error("Error fetching stats:", err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStats();
        }
    }, [isAuthInitialized, isAuthenticated, user]);

    if (!isAuthInitialized || isLoading) { // Muestra cargando mientras se inicializa auth o se cargan datos
        return (
            <Container>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Cargando datos del panel...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg">
                <PageHeader title="Panel de Administración" />
                <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            </Container>
        );
    }

    if (!stats) {
        return (
            <Container maxWidth="lg">
                <PageHeader title="Panel de Administración" />
                <Typography sx={{ mt: 2, textAlign: 'center' }}>No se pudieron cargar las estadísticas. Intenta refrescar la página.</Typography>
            </Container>
        );
    }

    const StatCard = ({ title, value, icon, color = 'primary.main' }) => (
        <Grid item xs={12} sm={6} md={4} lg={2.4}> {/* Ajustado para 5 tarjetas por fila en lg */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Box sx={{ fontSize: 48, color: color, mb: 2 }}>
                        {icon}
                    </Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {value !== undefined && value !== null ? value.toLocaleString() : 'N/A'}
                    </Typography>
                    <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                        {title}
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    );

    return (
        <Container maxWidth="lg">
            <PageHeader title="Panel de Administración" />
            <Box sx={{ mt: 3 }}>
                <Grid container spacing={3} justifyContent="center">
                    <StatCard 
                        title="Total de Usuarios Registrados" 
                        value={stats.totalUsers} 
                        icon={<PeopleAltIcon fontSize="inherit" />}
                        color="info.main"
                    />
                    <StatCard 
                        title="Total de Docentes" 
                        value={stats.totalTeachers} 
                        icon={<SchoolIcon fontSize="inherit" />}
                        color="success.main"
                    />
                    <StatCard 
                        title="Total de Estudiantes" 
                        value={stats.totalStudents} 
                        icon={<FaceIcon fontSize="inherit" />}
                        color="secondary.main"
                    />
                    <StatCard 
                        title="Grupos Activos en el Sistema" 
                        value={stats.activeGroups} 
                        icon={<GroupWorkIcon fontSize="inherit" />}
                        color="warning.dark"
                    />
                    <StatCard 
                        title="Aprobaciones de Docentes Pendientes" 
                        value={stats.pendingTeacherApprovals} 
                        icon={<AssignmentIndIcon fontSize="inherit" />}
                        color="error.main"
                    />
                </Grid>
            </Box>
        </Container>
    );
}

export default AdminDashboardPage;
