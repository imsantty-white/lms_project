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
  Divider,
  useTheme,
  Tooltip // Import Tooltip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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
  const themeMaterial = useTheme(); // Renamed to avoid conflict with 'theme' prop

  return (
    // Removed Paper wrapper, Accordion will be styled directly
    <Accordion 
      expanded={expanded} 
      onChange={onAccordionChange}
      sx={{
        // Removemos el border del Accordion principal
        borderRadius: themeMaterial.shape.borderRadius,
        boxShadow: themeMaterial.shadows[1],
        '&:not(:last-child)': { mb: 1 },
        // Ensure nested accordions don't have strange borders if MUI adds them by default
        '&:before': { 
          display: 'none',
        },
        // Aplicamos overflow hidden para que el contenido respete el borderRadius
        overflow: 'hidden',
      }}
      // Disable default MUI transitions to let Framer Motion handle it
      TransitionProps={{ timeout: 0, unmountOnExit: true }}
      elevation={0} // Use sx.boxShadow instead of elevation prop for consistency
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel${theme._id}-content`}
        id={`panel${theme._id}-header`}
        sx={{
          backgroundColor: themeMaterial.palette.action.hover,
          color: themeMaterial.palette.text.primary,
          minHeight: 48, // Denser summary
          // Añadimos el border solo al summary
          border: `1px solid ${themeMaterial.palette.divider}`,
          // El borderRadius se aplicará automáticamente por el overflow hidden del padre
          '& .MuiAccordionSummary-content': { // Reduce margin around content
            my: 0,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
            {`Tema ${theme.orden || themeIndex + 1}: ${theme.nombre}`}
          </Typography>
          <Tooltip title="Editar Tema">
            <IconButton
              aria-label="editar tema"
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent Accordion toggle
                onEditTheme(theme);
              }}
              disabled={isAnyOperationInProgress}
              sx={{ mr: 1 }} // Adjusted margin
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar Tema">
            <IconButton
              aria-label="eliminar tema"
              size="small"
              color="error" // Keep error color for delete
              onClick={(e) => {
                e.stopPropagation(); // Prevent Accordion toggle
                onDeleteTheme(theme._id);
              }}
              disabled={isAnyOperationInProgress}
              sx={{ mr: 0.5 }} // Adjusted margin
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </AccordionSummary>
      {/* AnimatePresence for the content expand/collapse animation */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.section
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <AccordionDetails sx={{ 
              backgroundColor: themeMaterial.palette.background.paper,
              p: 2, // Standard padding
              // Añadimos border para los lados y abajo cuando está expandido
              borderLeft: `1px solid ${themeMaterial.palette.divider}`,
              borderRight: `1px solid ${themeMaterial.palette.divider}`,
              borderBottom: `1px solid ${themeMaterial.palette.divider}`,
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {theme.descripcion}
              </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" justifyContent="flex-end"> {/* justifyContent added */}
            <Tooltip title="Asignar Contenido a este Tema">
              <motion.div whileHover={{ scale: 1.03 }} style={{ display: 'inline-block' }}>
                <Button
                  variant="outlined"
                  size="small"
                  color="secondary" // Changed color
                  startIcon={<AddCircleOutlinedIcon />}
                  onClick={() => onAddContentAssignment(theme._id, theme.nombre)}
                  disabled={isAnyOperationInProgress}
                >
                  Asignar Contenido
                </Button>
              </motion.div>
            </Tooltip>
          </Stack>
          <Divider sx={{ borderBottomWidth: '3px', borderStyle: 'dashed', borderColor: themeMaterial.palette.divider, my: 2 }} /> {/* Used themeMaterial.palette.divider */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
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
          </motion.section>
                  )}
          </AnimatePresence>
        </Accordion>
    );
});

export default ThemeItem;
