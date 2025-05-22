// frontend/src/components/PageHeader.jsx
import React from 'react';
import { Typography, Box } from '@mui/material';

const PageHeader = React.memo(({ title, subtitle, titleProps, subtitleProps, sx }) => {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Typography variant="h4" gutterBottom fontWeight="500" {...titleProps}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" {...subtitleProps}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
});

export default PageHeader;
