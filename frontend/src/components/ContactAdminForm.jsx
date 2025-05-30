import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Paper } from '@mui/material';
import { axiosInstance } from '../contexts/AuthContext'; // Ajustar la ruta si es necesario
import { toast } from 'react-toastify';
import SendIcon from '@mui/icons-material/Send';

function ContactAdminForm() {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [formError, setFormError] = useState(null);
    const [formSuccess, setFormSuccess] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);
        setFormSuccess(null);

        if (!subject.trim()) {
            setFormError('El asunto es obligatorio.');
            toast.warn('Por favor, ingresa un asunto.');
            return;
        }
        if (!message.trim()) {
            setFormError('El mensaje es obligatorio.');
            toast.warn('Por favor, ingresa un mensaje.');
            return;
        }

        setIsSending(true);
        try {
            // Endpoint real (puede fallar si no está implementado en el backend aún)
            const response = await axiosInstance.post('/api/contact/admin-message', { 
                subject: subject.trim(), 
                message: message.trim() 
            });

            // Asumiendo que el backend responde con un success: true y un mensaje
            if (response.data && response.data.success) {
                toast.success(response.data.message || 'Mensaje enviado correctamente al administrador.');
                setFormSuccess(response.data.message || 'Tu mensaje ha sido enviado. Nos pondremos en contacto contigo si es necesario.');
                setSubject('');
                setMessage('');
            } else {
                // Si el backend responde con 2xx pero success es false o no hay mensaje específico
                throw new Error(response.data?.message || 'Respuesta inesperada del servidor.');
            }

        } catch (err) {
            // Captura errores de red, 404s, o errores explícitos del backend
            const errMsg = err.response?.data?.message || err.message || 'Error al enviar el mensaje. Inténtalo de nuevo más tarde.';
            setFormError(errMsg);
            toast.error(errMsg);
            console.error("Error sending contact message:", err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ mt: 2, p: { xs: 2, sm: 3 } }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                Contactar al Administrador
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                Si tienes alguna pregunta, problema técnico o necesitas asistencia, por favor completa el siguiente formulario.
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                    label="Asunto"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    variant="outlined"
                    id="contact-admin-subject"
                />
                <TextField
                    label="Mensaje"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    multiline
                    rows={5}
                    variant="outlined"
                    id="contact-admin-message"
                    placeholder="Describe tu consulta o problema detalladamente aquí..."
                />

                {formError && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{formError}</Alert>}
                {formSuccess && <Alert severity="success" sx={{ mt: 2, mb: 1 }}>{formSuccess}</Alert>}
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSending}
                        startIcon={isSending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        size="large"
                    >
                        {isSending ? 'Enviando...' : 'Enviar Mensaje'}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default ContactAdminForm;
