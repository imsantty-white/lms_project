// frontend/src/components/EmptyState.jsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Example icon

const EmptyState = React.memo(({
  message = "No items to display.",
  icon: IconComponent = InfoOutlinedIcon, // Allow custom icon
  iconSize = 60,
  iconColor = 'text.secondary',
  containerProps,
  paperProps,
  iconProps,
  typographyProps
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: 4,
        ...containerProps,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          ...paperProps,
        }}
      >
        <IconComponent sx={{ fontSize: iconSize, color: iconColor, mb: 2, opacity: 0.5, ...iconProps }} />
        <Typography variant="h6" color="text.secondary" gutterBottom {...typographyProps}>
          {message}
        </Typography>
      </Paper>
    </Box>
  );
});

export default EmptyState;
