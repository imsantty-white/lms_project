// frontend/src/pages/components/ThemeItem.jsx
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
import AssignmentItem from './AssignmentItem'; // Will be created next

const ThemeItem = React.memo(({
  theme,
  themeIndex,
  expanded,
  onAccordionChange,
  onEditTheme,
  onDeleteTheme,
  onAddContentAssignment,
  // Props needed for AssignmentItem that are passed down
  onEditAssignment,
  onDeleteAssignment,
  onStatusChange,
  ASSIGNMENT_STATUS_OPTIONS,
  updatingAssignmentStatus,
  isAnyOperationInProgress
}) => {
  return (
    <Paper sx={{ mb: 1, ml: 2, boxShadow: 5 }}>
      <Accordion expanded={expanded} onChange={onAccordionChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`panel${theme._id}-content`}
          id={`panel${theme._id}-header`}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {`Tema ${theme.orden || themeIndex + 1}: ${theme.nombre}`}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditTheme(theme);
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
                onDeleteTheme(theme._id);
              }}
              disabled={isAnyOperationInProgress}
              sx={{ mr: 2 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {theme.descripcion}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              color="text.primary"
              startIcon={<AddCircleOutlinedIcon />}
              onClick={() => onAddContentAssignment(theme._id, theme.nombre)}
              disabled={isAnyOperationInProgress}
            >
              Asignar Contenido
            </Button>
          </Stack>
          <Divider sx={{ borderStyle: 'dashed', borderColor: 'primary.main', my: 2 }} />
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Contenido:
          </Typography>
          {theme.assignments && theme.assignments.length > 0 ? (
            <List dense disablePadding>
              {theme.assignments.map((assignment) => (
                <AssignmentItem
                  key={assignment._id}
                  assignment={assignment}
                  themeName={theme.nombre} // Pass themeName for context in modals/dialogs
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
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 4 }}>
              No hay contenido asignado a este tema.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
});

export default ThemeItem;
