import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    TextField,
    Select,
    MenuItem,
    Button,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Paper
} from '@mui/material';
import PageHeader from '../../components/PageHeader'; // Ajusta la ruta si es necesario
import { axiosInstance, useAuth } from '../../contexts/AuthContext'; // Ajusta la ruta si es necesario
import { toast } from 'react-toastify';
import SendIcon from '@mui/icons-material/Send';

function SystemNotificationPage() {
    const { user, isAuthenticated, isAuthInitialized } = useAuth();
    const [audience, setAudience] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [permissionError, setPermissionError] = useState(null); // Para errores de permiso o carga inicial
    const [formError, setFormError] = useState(null); // Para errores de envío de formulario

    useEffect(() => {
        if (isAuthInitialized) {
            if (!isAuthenticated || user?.tipo_usuario !== 'Administrador') {
                setPermissionError('No tienes permiso para acceder a esta página.');
            } else {
                setPermissionError(null); // Limpiar error de permiso si el usuario es admin
            }
        }
    }, [isAuthInitialized, isAuthenticated, user]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(null); // Limpiar errores de formulario anteriores

        if (!audience) {
            setFormError('Por favor, selecciona una audiencia.');
            toast.warn('Por favor, selecciona una audiencia.');
            return;
        }
        if (!message.trim()) {
            setFormError('El mensaje de la notificación no puede estar vacío.');
            toast.warn('El mensaje de la notificación no puede estar vacío.');
            return;
        }
        if (audience === 'usuario_especifico' && !recipientId.trim()) {
            setFormError('El ID del destinatario es obligatorio para la audiencia "Usuario Específico".');
            toast.warn('El ID del destinatario es obligatorio para la audiencia "Usuario Específico".');
            return;
        }

        setIsSending(true);
        try {
            const payload = { 
                audience, 
                message: message.trim(), 
            };
            if (link.trim()) { // Solo añadir link si no está vacío
                payload.link = link.trim();
            }
            if (audience === 'usuario_especifico') {
                payload.recipient_id = recipientId.trim();
            }

            await axiosInstance.post('/api/admin/notifications/system', payload);
            toast.success('Notificación(es) del sistema enviada(s) correctamente.');
            // Limpiar formulario
            setAudience('');
            setRecipientId('');
            setMessage('');
            setLink('');
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Error al enviar la notificación. Inténtalo de nuevo.';
            setFormError(errMsg);
            toast.error(errMsg);
            console.error("Error sending notification:", err);
        } finally {
            setIsSending(false);
        }
    };
    
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
    
    if (permissionError) { 
        return (
            <Container maxWidth="md">
                <PageHeader title="Enviar Notificaciones del Sistema" />
                <Alert severity="error" sx={{ mt: 3 }}>{permissionError}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <PageHeader title="Enviar Notificaciones del Sistema" />
            <Paper component="form" onSubmit={handleSubmit} sx={{ mt: 3, p: { xs: 2, sm: 3 }, boxShadow: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                    Completa el formulario para enviar una notificación.
                </Typography>
                
                <FormControl fullWidth margin="normal" required>
                    <InputLabel id="audience-select-label">Audiencia</InputLabel>
                    <Select
                        labelId="audience-select-label"
                        id="audience"
                        value={audience}
                        label="Audiencia"
                        onChange={(e) => {
                            setAudience(e.target.value);
                            if (e.target.value !== 'usuario_especifico') {
                                setRecipientId(''); // Limpiar ID si la audiencia no es específica
                            }
                        }}
                    >
                        <MenuItem value="" disabled><em>Selecciona una audiencia</em></MenuItem>
                        <MenuItem value="todos">Todos los usuarios</MenuItem>
                        <MenuItem value="docentes">Todos los Docentes</MenuItem>
                        <MenuItem value="estudiantes">Todos los Estudiantes</MenuItem>
                        <MenuItem value="usuario_especifico">Usuario Específico</MenuItem>
                    </Select>
                </FormControl>

                {audience === 'usuario_especifico' && (
                    <TextField
                        label="ID del Usuario Destinatario"
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        fullWidth
                        margin="normal"
                        required={audience === 'usuario_especifico'} // Requerido solo si es visible
                        placeholder="Ingresa el ID completo del usuario"
                    />
                )}

                <TextField
                    label="Mensaje de la Notificación"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    multiline
                    rows={5}
                    placeholder="Escribe aquí el mensaje que deseas enviar..."
                />

                <TextField
                    label="Enlace (Opcional)"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="https://ejemplo.com/enlace-relevante"
                />

                {formError && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{formError}</Alert>}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSending}
                        startIcon={isSending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    >
                        {isSending ? 'Enviando...' : 'Enviar Notificación'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default SystemNotificationPage;
