// src/components/VideoModal.jsx

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

// Componente para mostrar un video en un modal
// Props:
// - open: booleano para controlar si el modal está abierto
// - onClose: función para cerrar el modal
// - title: Título del video
// - videoUrl: La URL del video (preferiblemente URL incrustable, ej. de YouTube Embed)
const VideoModal = React.memo(({ open, onClose, title, videoUrl }) => {
  // Función simple para intentar obtener una URL incrustable básica
  // Esto puede necesitar ser más robusto dependiendo de tus fuentes de video
  const getEmbedUrl = (url) => {
    if (!url) return null;

    // Intento básico para URLs de YouTube y Vimeo
    let embedUrl = url;
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    // Puedes añadir lógica para URLs directas usando la etiqueta <video> si es necesario
    // if (url.endsWith('.mp4') || url.endsWith('.webm') || etc.) { /* ... */ }


    return embedUrl;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  // *** MODIFICAR LA FUNCIÓN INTERNA DE CIERRE ***
      const handleDialogClose = (event, reason) => {
        // No cierres el modal si la razón es click en el fondo o Escape
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return;
        }
        // Si la razón es otra, llama a la prop onClose del padre
        if (onClose) {
          onClose(event, reason);
        }
      };
      // ********************************************


      return (
        <Dialog open={open} onClose={handleDialogClose} maxWidth="lg" fullWidth>
          <DialogTitle>{title || 'Video'}</DialogTitle>
          <DialogContent dividers>
            {/* ...contenido del modal... */}
            {embedUrl ? (
              <Box sx={{ position: 'relative', height: 0, paddingBottom: '56.25%' /* Aspect ratio 16:9 */ }}>
                <iframe
                    src={embedUrl}
                    title={title || 'Video'}
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></iframe>
              </Box>
            ) : (
              <Typography variant="body2" color="error">URL de video no válida o no incrustable.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            {/* El botón "Cerrar" llama directamente a la prop onClose del padre */}
            <Button onClick={onClose}>Cerrar</Button>
          </DialogActions>
        </Dialog>
  );
});

export default VideoModal;