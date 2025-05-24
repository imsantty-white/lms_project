import React, { useState } from 'react';
import { Alert, Button, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';

function ProfileCompletionBanner({ onDismiss }) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss(); // Callback to inform parent about dismissal
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Alert
      severity="info"
      action={
        <>
          <Button 
            color="inherit" 
            size="small" 
            component={RouterLink} 
            to="/profile"
            onClick={() => setVisible(false)} // Optionally hide banner on click too
          >
            Complete Profile
          </Button>
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleDismiss}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        </>
      }
      sx={{ 
        width: '100%', 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center',
        '& .MuiAlert-message': {
          flexGrow: 1,
        },
        '& .MuiAlert-action': {
          marginLeft: 'auto',
          alignItems: 'center',
          display: 'flex'
        }
      }}
    >
      Your profile is incomplete. Complete it now to get the most out of our platform!
    </Alert>
  );
}

export default ProfileCompletionBanner;
