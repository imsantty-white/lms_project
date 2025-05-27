// src/components/ContentModal.jsx

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box,
    IconButton // Importa IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; // Importa el ícono de cerrar

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
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pr: 1 // Padding a la derecha para el botón de cerrar
            }}>
                <Typography variant="h6" component="div">
                    {title || 'Contenido'}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose} // Llama directamente a onClose
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {contentBody ? (
                    <Box
                        component="div" // Use Box as a div
                        sx={{
                            // Add any necessary styling for the rendered HTML content here
                            // For example, ensure word wrap, basic typography, etc.
                            // These styles will apply to the container of the HTML.
                            // Styles for elements within the HTML (p, h1, ul, etc.)
                            // will come from TipTap's output or global styles.
                            wordWrap: 'break-word',
                            '& h1': { typography: 'h4', mb: 2 }, // Example: Style H1s from TipTap
                            '& h2': { typography: 'h5', mb: 1.5 }, // Example: Style H2s
                            '& h3': { typography: 'h6', mb: 1 },  // Example: Style H3s
                            '& p': { typography: 'body1', mb: 1 },   // Example: Style Ps
                            '& ul, & ol': { pl: 3, mb: 1 },         // Example: Style lists
                            '& blockquote': {
                                borderLeft: '4px solid',
                                borderColor: 'grey.400',
                                pl: 2,
                                ml: 0,
                                fontStyle: 'italic',
                                color: 'text.secondary',
                                mb: 1
                            },
                            '& pre': { // For code blocks
                                backgroundColor: 'grey.100',
                                border: '1px solid',
                                borderColor: 'grey.300',
                                p: 2,
                                borderRadius: 1,
                                overflowX: 'auto',
                                fontFamily: 'monospace',
                            }
                        }}
                        dangerouslySetInnerHTML={{ __html: contentBody }}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">Este contenido no tiene cuerpo especificado.</Typography>
                )}
            </DialogContent>
            {/* <DialogActions>
                // El botón "Cerrar" se ha movido al DialogTitle
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions> */}
        </Dialog>
    );
});

export default ContentModal;