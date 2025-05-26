import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert, Box
} from '@mui/material';

const SetModuleStatusModal = ({ open, onClose, moduleInfo, onConfirmSetStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState('No Iniciado'); // Default to 'No Iniciado'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset status when modal opens
  useEffect(() => {
    if (open) {
      setSelectedStatus('No Iniciado'); // Reset to 'No Iniciado' on open
      setError(null); // Clear previous errors
    }
  }, [open]);
  
  // Reset status if moduleInfo changes while modal is open
  useEffect(() => {
    setSelectedStatus('No Iniciado'); // Reset to 'No Iniciado' if moduleInfo changes
    setError(null);
  }, [moduleInfo]);


  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError("Por favor, selecciona un estado.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirmSetStatus(selectedStatus);
      // onClose will be called by parent on success if onConfirmSetStatus resolves
      // setSelectedStatus(''); // Resetting in parent's onClose or here
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
    // setSelectedStatus(''); // Resetting status on any close action
  };

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="set-module-status-dialog-title" fullWidth maxWidth="sm">
      <DialogTitle id="set-module-status-dialog-title">
        Establecer Progreso para Módulo: {moduleInfo?.moduleName || 'Desconocido'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Selecciona el estado de progreso para aplicar a todos los estudiantes en el grupo 
          "{moduleInfo?.groupName || 'N/A'}" para este módulo.
        </DialogContentText>
        
        <FormControl fullWidth error={!!error && !selectedStatus} sx={{mt:1}}>
          <InputLabel id="module-status-select-label">Estado de Progreso</InputLabel>
          <Select
            labelId="module-status-select-label"
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
            <MenuItem value="En Progreso">En Progreso</MenuItem>
            <MenuItem value="Completado">Completado</MenuItem>
          </Select>
        </FormControl>

        <Alert severity="warning" sx={{ mt: 2 }}>
          Nota: Esta acción modificará el progreso para todos los estudiantes del grupo asociados a esta ruta de aprendizaje.
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

SetModuleStatusModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  moduleInfo: PropTypes.shape({
    moduleId: PropTypes.string,
    moduleName: PropTypes.string,
    learningPathId: PropTypes.string,
    groupId: PropTypes.string,
    groupName: PropTypes.string,
  }),
  onConfirmSetStatus: PropTypes.func.isRequired,
};

export default SetModuleStatusModal;
