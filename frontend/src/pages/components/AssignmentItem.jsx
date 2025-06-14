// frontend/src/pages/components/AssignmentItem.jsx
import React from 'react';
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  CircularProgress,
  Tooltip 
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment'; // Default for Activity
import QuizIcon from '@mui/icons-material/Quiz';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // Default for Resource
import { format } from 'date-fns';

// Helper function to get the icon (can be kept here or moved to a utils file if used elsewhere)
const getAssignmentIcon = (assignment) => {
  const type = assignment.type;
  if (type === 'Resource') {
    if (assignment.resource_id?.type === 'Contenido') return <DescriptionIcon />;
    if (assignment.resource_id?.type === 'Enlace') return <LinkIcon />;
    if (assignment.resource_id?.type === 'Video-Enlace') return <PlayCircleOutlinedIcon />;
    return <CheckCircleOutlineIcon />;
  }
  if (type === 'Activity') {
    if (assignment.activity_id?.type === 'Quiz') return <QuizIcon />;
    if (assignment.activity_id?.type === 'Cuestionario') return <QuestionAnswerIcon />;
    if (assignment.activity_id?.type === 'Trabajo') return <WorkIcon />;
    return <AssignmentIcon />;
  }
  return null;
};


const AssignmentItem = React.memo(({
  assignment,
  themeName,
  onEditAssignment,
  onDeleteAssignment,
  onStatusChange,
  ASSIGNMENT_STATUS_OPTIONS,
  updatingAssignmentStatus,
  isAnyOperationInProgress
}) => {
  const isThisAssignmentUpdating = updatingAssignmentStatus === assignment._id;
  const contentItem = assignment.resource_id || assignment.activity_id;
  const statusOption = ASSIGNMENT_STATUS_OPTIONS.find(option => option.value === assignment.status);
  const statusLabel = statusOption ? statusOption.label : assignment.status;

  // Determine if the assignment was auto-closed
  const isAutoClosed = assignment.status === 'Closed' && assignment.fecha_fin && new Date(assignment.fecha_fin) < new Date();
  const tooltipTitle = isAutoClosed ? "Esta actividad fue cerrada automáticamente. Para reabrirla, por favor edita la asignación y extiende su fecha de finalización." : "";
  const theme = useTheme(); // Get theme object

  const borderColor = assignment.type === 'Activity' 
    ? theme.palette.primary.main 
    : theme.palette.secondary.main;

  return (
    <ListItem sx={{ 
      pl: 3, // Adjusted paddingLeft
      borderLeftWidth: '4px',
      borderLeftStyle: 'solid',
      borderLeftColor: borderColor,
      my: 1, // Add some margin between items
      backgroundColor: theme.palette.background.default, // Subtle background for item itself
      borderRadius: theme.shape.borderRadius, // Rounded corners for the item
      boxShadow: theme.shadows[1] // Subtle shadow for depth
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', pr: 2 }}>
          <ListItemIcon sx={{ minWidth: 40, color: borderColor }}> {/* Icon color matches border */}
            {getAssignmentIcon(assignment)}
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body1" fontWeight="medium"> {/* Added fontWeight */}
                {contentItem?.title || 'Contenido sin título'}
              </Typography>
            }
            secondary={
              <Box component="span" sx={{ display: 'block' }}>
                <Typography variant="body2" color="text.secondary">
                  Tipo:{' '}
                  {assignment.type === 'Resource' ? 'Recurso' : 'Actividad'} (
                  {assignment.type === 'Resource'
                    ? assignment.resource_id?.type || 'Desconocido'
                    : assignment.activity_id?.type || 'Desconocido'}
                  )
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                  {assignment.fecha_inicio && (
                    <Chip
                      label={`Inicio: ${format(new Date(assignment.fecha_inicio), 'dd/MM/yyyy HH:mm')}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {assignment.fecha_fin && (
                    <Chip
                      label={`Fin: ${format(new Date(assignment.fecha_fin), 'dd/MM/yyyy HH:mm')}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {assignment.puntos_maximos !== undefined && (
                    <Chip label={`Pts: ${assignment.puntos_maximos}`} size="small" variant="outlined" />
                  )}
                  {assignment.intentos_permitidos !== undefined && (
                    <Chip label={`Intentos: ${assignment.intentos_permitidos}`} size="small" variant="outlined" />
                  )}
                  {assignment.tiempo_limite !== undefined && (
                    <Chip label={`Tiempo: ${assignment.tiempo_limite} min`} size="small" variant="outlined" />
                  )}
                  {assignment.status && (
                    <Chip
                      label={`${statusLabel}`}
                      size="small"
                      variant="filled"
                      color={
                        assignment.status === 'Open' ? 'success' :
                        assignment.status === 'Closed' ? 'error' : 'default'
                      }
                      sx={{ mr: 1 }}
                    />
                  )}
                </Stack>
              </Box>
            }
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          {isThisAssignmentUpdating ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : (
            <Tooltip title={tooltipTitle} arrow>
              {/* The Tooltip wraps a span because FormControl (or disabled elements directly) might not trigger Tooltip events correctly */}
              <span> 
                <FormControl variant="outlined" size="small" sx={{ minWidth: 120, mr: 1 }}>
                  <InputLabel id={`status-select-label-${assignment._id}`}>Estado</InputLabel>
                  <Select
                    labelId={`status-select-label-${assignment._id}`}
                    id={`status-select-${assignment._id}`}
                    value={assignment.status || ''}
                    label="Estado"
                    onChange={(e) =>
                      onStatusChange(
                        assignment._id,
                        e.target.value,
                        contentItem?.title || 'Contenido sin título',
                        themeName
                      )
                    }
                    disabled={isAutoClosed || isThisAssignmentUpdating || isAnyOperationInProgress}
                  >
                    {ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </span>
            </Tooltip>
          )}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar Asignación">
              <IconButton
                aria-label="editar asignación"
                size="small"
                onClick={() => onEditAssignment(assignment._id, themeName)}
                disabled={isAnyOperationInProgress || isThisAssignmentUpdating}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar Asignación">
              <IconButton
                aria-label="eliminar asignación"
                size="small"
                color="error"
                onClick={() => onDeleteAssignment(assignment._id)}
                disabled={isAnyOperationInProgress || isThisAssignmentUpdating}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>
    </ListItem>
  );
});

export default AssignmentItem;
