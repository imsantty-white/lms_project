// src/components/ContentModal.jsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box
} from '@mui/material';

// Componente para mostrar contenido de texto/HTML en un modal
// Props:
// - open: booleano para controlar si el modal está abierto
// - onClose: función para cerrar el modal
// - title: Título del contenido
// - contentBody: El cuerpo del contenido (puede ser HTML)
const ContentModal = React.memo(({ open, onClose, title, contentBody }) => {
   // *** MODIFICAR LA FUNCIÓN INTERNA DE CIERRE ***
      const handleDialogClose = (event, reason) => {
        // No cierres el modal si la razón es click en el fondo o Escape
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return;
        }
        // Si la razón es otra (ej. clic en un botón del modal), llama a la prop onClose del padre
        if (onClose) {
          onClose(event, reason);
        }
      };
      // ********************************************


      return (
        <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
          <DialogTitle>{title || 'Contenido'}</DialogTitle>
          <DialogContent dividers>
            {contentBody ? (
              <Typography>{contentBody}</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Este contenido no tiene cuerpo especificado.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            {/* El botón "Cerrar" llama directamente a la prop onClose del padre, lo cual está bien */}
            <Button onClick={onClose}>Cerrar</Button>
          </DialogActions>
        </Dialog>
  );
});

export default ContentModal;