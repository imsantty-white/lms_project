// frontend/src/pages/components/ModuleItem.jsx
import React from 'react';
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
  expanded,
  onAccordionChange,
  onEditModule,
  onDeleteModule,
  onCreateTheme,
  // Props needed for ThemeItem that are passed down
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
  return (
    <Paper sx={{ mb: 2 }}>
      <Accordion expanded={expanded} onChange={onAccordionChange}>
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
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddCircleOutlinedIcon />}
              onClick={() => onCreateTheme(module._id)}
              disabled={isAnyOperationInProgress}
            >
              Añadir Tema
            </Button>
          </Stack>
          <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
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
