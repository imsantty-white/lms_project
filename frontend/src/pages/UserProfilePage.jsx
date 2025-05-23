import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Import useParams
import { useAuth, axiosInstance } from '../contexts/AuthContext'; // Import useAuth and axiosInstance
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  MenuItem,
  Avatar,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Fade,
  Skeleton,
  Chip,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  LabelImportant as LabelIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  Check as CheckIcon
} from '@mui/icons-material';
// axiosInstance is already imported via useAuth line
import { toast } from 'react-toastify';

const tiposIdentificacion = [
  'Tarjeta de Identidad',
  'Cédula de Ciudadanía',
  'Registro Civil de Nacimiento',
  'Tarjeta de Extranjería',
  'Cédula de Extranjería',
  'NIT',
  'Pasaporte'
];

const ProfileField = ({ icon, label, value, name, type = 'text', options, disabled, onChange, editing }) => (
  <Grid item xs={12} md={6}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
      <Box sx={{ 
        color: 'primary.main', 
        mt: 1,
        display: 'flex',
        alignItems: 'center',
        minWidth: 24
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        {options ? (
          <TextField
            select
            label={label}
            name={name}
            value={value || ''}
            onChange={onChange}
            fullWidth
            size="small"
            disabled={disabled}
            variant={editing ? "outlined" : "standard"}
            InputProps={{
              disableUnderline: !editing,
              sx: editing ? {} : { 
                '& .MuiInputBase-input': { 
                  color: value ? 'text.primary' : 'text.secondary',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  textOverflow: 'unset'
                }
              }
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (!selected || selected === '') {
                  return <span style={{ color: '#9e9e9e', fontStyle: 'italic' }}>Ninguno</span>;
                }
                return selected;
              },
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    '& .MuiMenuItem-root': {
                      whiteSpace: 'normal',
                      wordWrap: 'break-word'
                    }
                  }
                }
              }
            }}
            sx={{
              '& .MuiInputBase-root': {
                minHeight: editing ? 'auto' : '40px'
              },
              '& .MuiInputBase-input': {
                minHeight: 'unset !important',
                ...(editing ? {} : {
                  paddingTop: '8px',
                  paddingBottom: '8px'
                })
              }
            }}
          >
            <MenuItem value="">
              <em style={{ color: '#9e9e9e' }}>Ninguno</em>
            </MenuItem>
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            label={label}
            name={name}
            type={type}
            value={type === 'date' && value ? value.slice(0, 10) : (value || '')}
            onChange={onChange}
            fullWidth
            size="small"
            disabled={disabled}
            variant={editing ? "outlined" : "standard"}
            InputLabelProps={type === 'date' ? { shrink: true } : { shrink: !!value }}
            InputProps={{
              disableUnderline: !editing,
              sx: editing ? {} : { 
                '& .MuiInputBase-input': { 
                  color: 'text.primary',
                  fontWeight: 500
                }
              }
            }}
          />
        )}
      </Box>
    </Box>
  </Grid>
);

function UserProfilePage() {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false); // State to track if it's own profile

  const { userId: userIdFromParams } = useParams(); // Get userId from URL parameters
  const { user: currentUser } = useAuth(); // Get current authenticated user

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      let apiUrl = '/api/profile'; // Default to own profile
      let viewingUserId = currentUser?._id;

      if (userIdFromParams) {
        apiUrl = `/api/profile/${userIdFromParams}`;
        viewingUserId = userIdFromParams;
      }
      
      if (!currentUser || !currentUser._id) {
        // If currentUser is not yet available, might need to wait or handle
        // For now, if we don't have currentUser and no params, we can't do much.
        // This case should ideally be handled by AuthContext initialization.
        // If viewing other's profile, currentUser is needed to determine isOwnProfile.
        // If viewing own, currentUser is needed for the default API URL.
        // console.log("Current user or user ID not available yet.");
        // toast.error("No se pudo determinar el usuario actual.");
        // setLoading(false); // Stop loading if we can't proceed
        // return;
        // For now, let's assume currentUser will be available or the effect will re-run.
      }

      try {
        const res = await axiosInstance.get(apiUrl);
        setProfile(res.data);
        setForm(res.data);

        // Determine if this is the user's own profile
        if (currentUser && res.data && currentUser._id === res.data._id) {
          setIsOwnProfile(true);
        } else {
          setIsOwnProfile(false);
          setEdit(false); // Ensure edit mode is off if not own profile
        }

      } catch (error) {
        console.error("Error loading profile:", error);
        const errorMsg = error.response?.data?.message || 'Error al cargar el perfil';
        toast.error(errorMsg);
        // If profile load fails (e.g. 403, 404), it might not be own profile or not found
        setIsOwnProfile(false); 
        setEdit(false);
      } finally {
        setLoading(false);
      }
    };
    
    // Only load if currentUser is available, or if viewing a specific user's profile (param exists)
    if (currentUser?._id || userIdFromParams) {
        loadProfile();
    } else {
        // This handles the case where AuthContext might not be initialized yet.
        // We don't want to make an API call to /api/profile if currentUser is null.
        // setLoading can be set to false if we know we can't load yet, or rely on re-run.
        // If isAuthInitialized from useAuth is available, that can be a dependency.
        // For now, this check prevents calls with undefined currentUser._id for own profile.
        // If userIdFromParams is present, the call will be made, and backend will authorize.
    }
  }, [userIdFromParams, currentUser?._id]); // Re-run if param changes or current user ID changes

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/api/profile', form);
      toast.success('Perfil actualizado exitosamente');
      setProfile({ ...profile, ...form });
      setEdit(false);
    } catch {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEdit(false);
    setForm(profile);
  };

  const getInitials = (nombre, apellidos) => {
    const initials = `${nombre?.charAt(0) || ''}${apellidos?.charAt(0) || ''}`;
    return initials.toUpperCase();
  };

  if (loading) {
    return (
      <Box maxWidth={900} mx="auto" mt={4} px={2}>
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 4 }}>
            <Stack direction="row" spacing={3} alignItems="center" mb={4}>
              <Skeleton variant="circular" width={100} height={100} />
              <Box>
                <Skeleton variant="text" width={200} height={40} />
                <Skeleton variant="text" width={150} height={20} />
              </Box>
            </Stack>
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Skeleton variant="text" width="100%" height={60} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box maxWidth={900} mx="auto" mt={4} px={2}>
      <Fade in={true} timeout={800}>
        <Paper 
          elevation={3} 
          sx={{ 
            borderRadius: 3, 
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative'
          }}
        >
          {/* Header Section */}
          <Box 
            sx={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(10px)',
              p: 4,
              color: 'white'
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    border: '4px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {profile?.nombre || profile?.apellidos ? 
                    getInitials(profile.nombre, profile.apellidos) : 
                    <PersonIcon sx={{ fontSize: '2.5rem' }} />
                  }
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" mb={1}>
                    {profile?.nombre} {profile?.apellidos}
                  </Typography>
                  <Chip 
                    label={profile?.institucion || 'Sin institución'} 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      fontWeight: 500
                    }} 
                  />
                </Box>
              </Stack>
              
              {isOwnProfile && (
                <IconButton
                  onClick={() => setEdit(!edit)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.3)',
                      transform: 'scale(1.05)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                  disabled={saving}
                >
                  <EditIcon />
                </IconButton>
              )}
            </Stack>
          </Box>

          {/* Content Section */}
          <Card sx={{ m: 0, borderRadius: 0 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" mb={3}>
                Información Personal
              </Typography>
              
              <Grid container spacing={2}>
                <ProfileField
                  icon={<LabelIcon />}
                  label="Nombre"
                  value={form.nombre}
                  name="nombre"
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
                
                <ProfileField
                  icon={<LabelIcon />}
                  label="Apellidos"
                  value={form.apellidos}
                  name="apellidos"
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
                
                <ProfileField
                  icon={<EmailIcon />}
                  label="Correo Electrónico"
                  value={form.email} // Assuming form.email is populated
                  name="email"
                  onChange={handleChange}
                  disabled={true} // Email usually not editable by user directly
                  editing={false} // Always non-editing style for email
                />
                
                <ProfileField
                  icon={<PhoneIcon />}
                  label="Teléfono"
                  value={form.telefono}
                  name="telefono"
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
                
                <ProfileField
                  icon={<BusinessIcon />}
                  label="Institución"
                  value={form.institucion}
                  name="institucion"
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
                
                <ProfileField
                  icon={<BadgeIcon />}
                  label="Tipo de Identificación"
                  value={form.tipo_identificacion}
                  name="tipo_identificacion"
                  options={tiposIdentificacion}
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
                
                <ProfileField
                  icon={<BadgeIcon />}
                  label="Número de Identificación"
                  value={form.numero_identificacion}
                  name="numero_identificacion"
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
                
                <ProfileField
                  icon={<CalendarIcon />}
                  label="Fecha de Nacimiento"
                  value={form.fecha_nacimiento}
                  name="fecha_nacimiento"
                  type="date"
                  onChange={handleChange}
                  disabled={!isOwnProfile || !edit}
                  editing={isOwnProfile && edit}
                />
              </Grid>

              {isOwnProfile && edit && (
                <Fade in={edit} timeout={300}>
                  <Box mt={4}>
                    <Divider sx={{ mb: 3 }} />
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={handleCancel}
                        startIcon={<CancelIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? null : <SaveIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                          }
                        }}
                      >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    </Stack>
                  </Box>
                </Fade>
              )}
            </CardContent>
          </Card>
        </Paper>
      </Fade>
    </Box>
  );
}

export default UserProfilePage;