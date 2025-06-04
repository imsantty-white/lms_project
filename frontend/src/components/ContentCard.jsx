// frontend/src/components/ContentCard.jsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);

const ContentCard = React.memo(({
  item, // The resource or activity object
  index, // For motion animation delay
  itemTypeLabel, // e.g., "Recurso", "Actividad"
  icon, // JSX Element for the icon
  title,
  description,
  detailsRenderer, // Function that returns JSX for specific details
  isAssigned,
  onEdit,
  onDelete,
  isActionDisabled = false,
  cardStyleProps = {},
  headerStyleProps = {}
}) => {
  const theme = useTheme();

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  };

  return (
    <MotionCard
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        boxShadow: 3,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
        ...cardStyleProps,
      }}
    >
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          // Default header styles, can be overridden by headerStyleProps
          //bgcolor: itemTypeLabel === 'Recurso' ? theme.palette.primary.main : theme.palette.primary.main,
          //color: itemTypeLabel === 'Recurso' ? theme.palette.primary.text : theme.palette.secondary.text,
          borderTopLeftRadius: 'inherit', // Inherit from Card's borderRadius
          borderTopRightRadius: 'inherit',
          ...headerStyleProps,
        }}
      >
        {icon}
        <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
          {itemTypeLabel}
        </Typography>
      </Box>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="h6" noWrap sx={{ mb: 1, fontSize: '1rem', fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Box sx={{ height: 60, overflow: 'hidden', mb: 1 }}> {/* Ensure some space for details */}
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2, // Show 2 lines
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 0.5
            }}>
              {description}
            </Typography>
          )}
          {detailsRenderer && detailsRenderer(item)}
        </Box>
        {isAssigned !== undefined && ( // Only show chip if isAssigned is provided
            <Chip
                label={isAssigned ? 'Asignado' : 'No Asignado'}
                color={isAssigned ? 'success' : 'default'}
                size="small"
                sx={{ mt: 'auto' }} // Push chip to the bottom if CardContent is flex
            />
        )}
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
        {onEdit && (
          <IconButton
            size="small"
            onClick={onEdit}
            disabled={isActionDisabled}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        {onDelete && (
          <IconButton
            size="small"
            color="error"
            onClick={onDelete}
            disabled={isActionDisabled}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </CardActions>
    </MotionCard>
  );
});

export default ContentCard;
