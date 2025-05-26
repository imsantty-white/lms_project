import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert
} from '@mui/material';

const SetThemeStatusModal = ({ open, onClose, themeInfo, onConfirmSetStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState('No Iniciado'); // Default to 'No Iniciado'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setSelectedStatus('No Iniciado'); // Reset to 'No Iniciado' on open
      setError(null); // Clear previous errors
    }
  }, [open]);
  
  // Reset status if themeInfo changes while modal is open
  useEffect(() => {
    setSelectedStatus('No Iniciado'); // Reset to 'No Iniciado' if themeInfo changes
    setError(null);
  }, [themeInfo]);

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError("Por favor, selecciona un estado.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirmSetStatus(selectedStatus);
      // Parent will call onClose on successful promise resolution
    } catch (err) {
      setError(err.message || 'Error al confirmar el estado. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (event, reason) => {
    if (isSubmitting && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      // Prevent closing while submitting
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="set-theme-status-dialog-title" fullWidth maxWidth="sm">
      <DialogTitle id="set-theme-status-dialog-title">
        Establecer Progreso para Tema: {themeInfo?.themeName || 'Desconocido'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Selecciona el estado de progreso para aplicar a todos los estudiantes en el grupo 
          "{themeInfo?.groupName || 'N/A'}" para este tema.
        </DialogContentText>
        
        <FormControl fullWidth error={!!error && !selectedStatus} sx={{mt:1}}>
          <InputLabel id="theme-status-select-label">Estado de Progreso</InputLabel>
          <Select
            labelId="theme-status-select-label"
            value={selectedStatus}
            label="Estado de Progreso"
            onChange={(e) => {
                setSelectedStatus(e.target.value);
                if (error && e.target.value) setError(null); // Clear error once a selection is made
            }}
            disabled={isSubmitting}
          >
            <MenuItem value=""><em>Selecciona un estado</em></MenuItem>
            <MenuItem value="No Iniciado">No Iniciado</MenuItem>
            <MenuItem value="Visto">Visto</MenuItem>
            <MenuItem value="Completado">Completado</MenuItem>
          </Select>
        </FormControl>

        <Alert severity="warning" sx={{ mt: 2 }}>
          Nota: Esta acción modificará el progreso para todos los estudiantes del grupo asociados a esta ruta de aprendizaje en este tema.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary" 
          disabled={isSubmitting || !selectedStatus}
          startIcon={isSubmitting ? <CircularProgress size="1rem" color="inherit" /> : null}
        >
          {isSubmitting ? 'Confirmando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

SetThemeStatusModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  themeInfo: PropTypes.shape({
    themeId: PropTypes.string,
    themeName: PropTypes.string,
    moduleId: PropTypes.string,
    learningPathId: PropTypes.string,
    groupId: PropTypes.string,
    groupName: PropTypes.string,
  }),
  onConfirmSetStatus: PropTypes.func.isRequired,
};

export default SetThemeStatusModal;
