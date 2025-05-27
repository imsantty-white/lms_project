// frontend/src/pages/components/ModuleItem.jsx
import React, { useState } from 'react';
import {
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  IconButton,
  Button,
  Stack,
  List,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import ThemeItem from './ThemeItem'; // Will be created next

const ModuleItem = React.memo(({
  module,
  moduleIndex,
  // Se recibe onAccordionChange para propagar el cambio si se requiere más adelante
  onAccordionChange,
  onEditModule,
  onDeleteModule,
  onCreateTheme,
  // Props para ThemeItem
  expandedTheme,
  handleThemeAccordionChange,
  onEditTheme,
  onDeleteTheme,
  onAddContentAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onStatusChange,
  ASSIGNMENT_STATUS_OPTIONS,
  updatingAssignmentStatus,
  isAnyOperationInProgress
}) => {
  // Estado local para controlar el acordeón, iniciando en 'true'
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChange = (event, newExpanded) => {
    setIsExpanded(newExpanded);
    if (onAccordionChange) {
      onAccordionChange(event, newExpanded);
    }
  };

  return (
    <Paper sx={{ mb: 2, boxShadow: 3 }}>
      <Accordion expanded={isExpanded} onChange={handleChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`panel${module._id}-content`}
          id={`panel${module._id}-header`}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {`Módulo ${module.orden || moduleIndex + 1}: ${module.nombre}`}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditModule(module);
              }}
              disabled={isAnyOperationInProgress}
              sx={{ mr: 2 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteModule(module._id);
              }}
              disabled={isAnyOperationInProgress}
              sx={{ mr: 3.5 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {module.descripcion}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 2 }}
            alignItems="center"
            justifyContent="flex-end"
          >
            <Button
              variant="outlined"
              size="small"
              color="text.primary"
              startIcon={<AddCircleOutlinedIcon />}
              onClick={() => onCreateTheme(module._id)}
              disabled={isAnyOperationInProgress}
            >
              Nuevo Tema
            </Button>
          </Stack>
          <Divider sx={{ borderStyle: 'dotted', borderColor: 'text.primary', my: 2 }} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Temas:</Typography>
          {module.themes && module.themes.length > 0 ? (
            <List dense disablePadding>
              {module.themes.map((theme, themeIndex) => (
                <ThemeItem
                  key={theme._id}
                  theme={theme}
                  themeIndex={themeIndex}
                  expanded={expandedTheme[`theme-${theme._id}`] || false}
                  onAccordionChange={handleThemeAccordionChange(`theme-${theme._id}`)}
                  onEditTheme={onEditTheme}
                  onDeleteTheme={onDeleteTheme}
                  onAddContentAssignment={onAddContentAssignment}
                  onEditAssignment={onEditAssignment}
                  onDeleteAssignment={onDeleteAssignment}
                  onStatusChange={onStatusChange}
                  ASSIGNMENT_STATUS_OPTIONS={ASSIGNMENT_STATUS_OPTIONS}
                  updatingAssignmentStatus={updatingAssignmentStatus}
                  isAnyOperationInProgress={isAnyOperationInProgress}
                />
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', ml: 2 }}>
              No hay temas en este módulo.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
});

export default ModuleItem;