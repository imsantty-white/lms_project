// frontend/src/components/PageHeader.jsx
import React from 'react';
import { Typography, Box, Stack } from '@mui/material'; // Stack puede ser útil también

const PageHeader = React.memo(({ title, subtitle, rightContent, titleProps, subtitleProps, sx }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex',          // Habilitar Flexbox
        justifyContent: 'space-between', // Título a la izquierda, rightContent a la derecha
        alignItems: 'center',     // Alinear verticalmente al centro
        mb: 3, 
        flexWrap: 'wrap', // Permitir que los elementos se envuelvan en pantallas pequeñas
        ...sx 
      }}
    >
      <Box sx={{ flexGrow: 1, mr: rightContent ? 2 : 0 }}> {/* Dar espacio si hay rightContent */}
        <Typography variant="h4" gutterBottom={!subtitle} fontWeight="500" {...titleProps} sx={{mb: subtitle ? 0.5 : 2}}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" {...subtitleProps}>
            {subtitle}
          </Typography>
        )}
      </Box>
      
      {/* Renderizar el contenido de la derecha si existe */}
      {rightContent && (
        <Box sx={{ mt: { xs: 2, sm: 0 } }}> {/* Margen superior en móviles si se envuelve */}
          {rightContent}
        </Box>
      )}
    </Box>
  );
});

export default PageHeader;