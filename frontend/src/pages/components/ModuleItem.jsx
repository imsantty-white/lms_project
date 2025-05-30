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
  Divider,
  useTheme,
  Tooltip // Import Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion'; 
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
  const theme = useTheme(); // Get theme object

  const handleChange = (event, newExpanded) => {
    setIsExpanded(newExpanded);
    if (onAccordionChange) {
      onAccordionChange(event, newExpanded);
    }
  };

  return (
    // The Paper component already provides boxShadow. We'll ensure borderRadius is applied.
    // The main motion.div for list item animation (if needed for modules themselves) would be outside this component, in the list.
    // For expand/collapse, AnimatePresence is used inside.
    <Paper sx={{ 
      mb: 2, 
      boxShadow: theme.shadows[3], // Use theme's shadow definition
      borderRadius: theme.shape.borderRadius * 2, // Consistent rounded corners (e.g., 16px if borderRadius is 8px)
      overflow: 'hidden' // Important for child border radius to look right
    }}>
      <Accordion 
        expanded={isExpanded} 
        onChange={handleChange}
        // Disable default MUI transitions to let Framer Motion handle it
        TransitionProps={{ timeout: 0, unmountOnExit: true }} 
        elevation={0} // Remove Accordion's own shadow as Paper handles it
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.primary.contrastText }} />}
          aria-controls={`panel${module._id}-content`}
          id={`panel${module._id}-header`}
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderTopLeftRadius: 'inherit', // Inherit from Paper for consistency
            borderTopRightRadius: 'inherit',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.4)',
            // If Accordion is not the first/last child, conditional radius might be needed
            // but Paper's overflow:hidden helps.
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {`Módulo ${module.orden || moduleIndex + 1}: ${module.nombre}`}
            </Typography>
            <Tooltip title="Editar Módulo">
              <IconButton
                aria-label="editar módulo"
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent Accordion toggle
                  onEditModule(module);
                }}
                disabled={isAnyOperationInProgress}
                sx={{ mr: 2, color: 'inherit',
                  bgcolor: alpha(theme.palette.primary.dark, 0.2),
        '&:hover': { bgcolor: alpha(theme.palette.primary.dark, 0.5) },
                 }} // Inherit color for contrast
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar Módulo">
              <IconButton
                aria-label="eliminar módulo"
                size="small"
                color="error" // Changed color
                onClick={(e) => {
                  e.stopPropagation(); // Prevent Accordion toggle
                  onDeleteModule(module._id);
                }}
                disabled={isAnyOperationInProgress}
                sx={{ mr: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.2),
                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.5) },
                 }} // Adjusted margin
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </AccordionSummary>
        {/* AnimatePresence for the content expand/collapse animation */}
        <AnimatePresence initial={false}>
          {isExpanded && (
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
              <AccordionDetails sx={{ backgroundColor: theme.palette.background.paper, pt: 2 }}> {/* Ensure padding top for details */}
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
            <Tooltip title="Crear Nuevo Tema en este Módulo">
              <motion.div whileHover={{ scale: 1.03 }} style={{ display: 'inline-block' }}>
                <Button
                  variant="outlined"
                  size="small"
                  color="secondary" // Changed color
                  startIcon={<AddCircleOutlinedIcon />}
                  onClick={() => onCreateTheme(module._id)}
                  disabled={isAnyOperationInProgress}
                >
                  Nuevo Tema
                </Button>
              </motion.div>
            </Tooltip>
          </Stack>
          <Divider sx={{ borderBottomWidth: '3px', borderStyle: 'dashed', borderColor: theme.palette.divider , my: 2 }} /> {/* Used theme.palette.divider */}
          <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>Temas:</Typography>
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
            </motion.section>
          )}
        </AnimatePresence>
      </Accordion>
    </Paper>
  );
});

export default ModuleItem;