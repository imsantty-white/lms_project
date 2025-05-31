import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    CircularProgress,
    Box,
    Typography
} from '@mui/material';

function CreateGroupModal({ open, onClose, onSubmit, isCreating, initialData }) {
    // Determina si el modal está en modo de edición basado en si recibe 'initialData'
    const isEditMode = Boolean(initialData);

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Si hay 'initialData', llena el formulario con esos datos.
        // Si no, asegúrate de que el formulario esté vacío (para el modo de creación).
        if (open) {
            if (isEditMode) {
                setNombre(initialData.nombre || '');
                setDescripcion(initialData.descripcion || '');
            } else {
                setNombre('');
                setDescripcion('');
            }
            setError(''); // Limpia errores al abrir o cambiar de modo
        }
    }, [initialData, open, isEditMode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nombre.trim()) {
            setError('El nombre del grupo es obligatorio.');
            return;
        }
        setError('');
        onSubmit({ nombre, descripcion });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ component: 'form', onSubmit: handleSubmit }}
        >
            {/* Título dinámico */}
            <DialogTitle sx={{ fontWeight: 600 }}>
                {isEditMode ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {isEditMode
                        ? 'Modifica los detalles de tu grupo. Los cambios serán visibles para todos los miembros.'
                        : 'Los grupos te ayudan a organizar a tus estudiantes y asignarles rutas de aprendizaje.'
                    }
                </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    id="nombre"
                    label="Nombre del Grupo"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    error={!!error}
                    helperText={error}
                    sx={{ mb: 2 }}
                />
                <TextField
                    margin="dense"
                    id="descripcion"
                    label="Descripción (Opcional)"
                    type="text"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                />
            </DialogContent>
            <DialogActions sx={{ p: '0 24px 24px' }}>
                <Button onClick={onClose} disabled={isCreating} color='secondary'>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={isCreating}>
                    {isCreating ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        // Texto del botón dinámico
                        isEditMode ? 'Guardar Cambios' : 'Crear Grupo'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CreateGroupModal;