// src/pages/UserProfilePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
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
  IconButton,
  Fade,
  Skeleton,
  Chip,
  Stack,
  Container,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  ContentCopy as ContentCopyIcon,
  Group as GroupIcon,
  CalendarMonth as CalendarMonthIcon,
  Fingerprint as FingerprintIcon,
} from '@mui/icons-material';
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

// Componente EditableField (sin cambios importantes, solo se ajusta cómo se usa)
const EditableField = ({
  label,
  value,
  name,
  type = 'text',
  options,
  editing,
  onChange,
  disabled = false,
  multiline = false,
  rows = 1,
  startAdornment
}) => {
  const theme = useTheme();

  if (!editing) {
    let displayValue = value;
    // Formateo de fechas para visualización
    if ((type === 'date' || name === "fecha_registro_display_header") && value) { // MODIFICADO para manejar también fecha_registro_display_header
      try {
        const options = name === "fecha_registro_display_header"
          ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
          : { year: 'numeric', month: 'long', day: 'numeric' };
        displayValue = new Date(value).toLocaleDateString(navigator.language || 'es-CO', options);
      } catch (e) {
        displayValue = String(value).slice(0,10); 
      }
    }
    
    return (
      <Box mb={2.5}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {startAdornment && <Box sx={{ mr: 1, display: 'inline-flex', color: theme.palette.text.secondary }}>{startAdornment}</Box>}
          <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-word', minHeight: '24px' }}>
            {displayValue || <em style={{ color: theme.palette.text.disabled }}>No especificado</em>}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (options) {
    return (
      <TextField
        select
        fullWidth
        variant="outlined"
        size="small"
        label={label}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      >
        <MenuItem value=""disabled>
          <em style={{ color: theme.palette.text.disabled }}>Ninguno</em>
        </MenuItem>
        {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
      </TextField>
    );
  }

  return (
    <TextField
      fullWidth
      variant="outlined"
      size="small"
      label={label}
      type={type}
      name={name}
      value={type === 'date' && value ? String(value).slice(0,10) : (value || '')}
      onChange={onChange}
      disabled={disabled}
      sx={{ mb: 2 }}
      InputLabelProps={{ shrink: true }}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      InputProps={{
        startAdornment: startAdornment
      }}
    />
  );
};


function UserProfilePage() {
  const theme = useTheme();
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const { userId: userIdFromParams } = useParams();
  const { user: currentUser, _id: currentUserId } = useAuth();

  const loadProfile = useCallback(async () => {
    // ... (lógica de loadProfile sin cambios)
    setLoading(true);
    let apiUrl = '/api/profile'; 

    if (userIdFromParams) {
      if (currentUser?.tipo_usuario === 'Administrador') {
        apiUrl = `/api/profile/admin/${userIdFromParams}`;
      } else if (currentUser?.tipo_usuario === 'Docente' && currentUser._id !== userIdFromParams) {
        apiUrl = `/api/profile/${userIdFromParams}`;
      } else if (currentUser?._id === userIdFromParams) {
         apiUrl = '/api/profile'; 
      } else {
        toast.error('No tienes permiso para ver este perfil.');
        setProfile(null);
        setIsOwnProfile(false);
        setEdit(false);
        setLoading(false);
        return;
      }
    } else if (!currentUser) {
        toast.error('Debes iniciar sesión para ver un perfil.');
        setLoading(false);
        return;
    }

    try {
      const res = await axiosInstance.get(apiUrl);
      setProfile(res.data);
      setForm(res.data); 
      if (currentUser && res.data && currentUser._id === res.data._id) {
        setIsOwnProfile(true);
      } else {
        setIsOwnProfile(false);
        setEdit(false); 
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      const errorMsg = error.response?.data?.message || 'Error al cargar el perfil';
      toast.error(errorMsg);
      setIsOwnProfile(false);
      setEdit(false);
    } finally {
      setLoading(false);
    }
  }, [userIdFromParams, currentUser?.tipo_usuario, currentUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    // ... (lógica de handleSave sin cambios)
    setSaving(true);
    try {
      if (!isOwnProfile) {
        toast.error("No puedes modificar un perfil que no es tuyo.");
        setSaving(false);
        return;
      }
      await axiosInstance.put('/api/profile', form); 
      toast.success('Perfil actualizado exitosamente');
      setEdit(false);
      await loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.response?.data?.message || 'Error al actualizar el perfil');
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

  const handleCopyId = (idToCopy) => {
    navigator.clipboard.writeText(idToCopy)
      .then(() => {
        toast.success('ID copiado al portapapeles');
      })
      .catch(err => {
        console.error('Error al copiar ID:', err);
        toast.error('No se pudo copiar el ID');
      });
  };

  if (loading) {
    // ... (Skeleton de carga sin cambios)
    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Skeleton variant="circular" width={100} height={100} sx={{ mr: {sm:3}, mb: {xs:2, sm:0} }} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
              </Box>
              <Skeleton variant="rectangular" width={120} height={40} sx={{mt: {xs:2, sm:0}}}/>
            </Box>
            <Divider sx={{ mb: 4 }} />
            <Grid container spacing={3}>
              {[...Array(2)].map((_, colIndex) => (
                <Grid item xs={12} md={6} key={colIndex}>
                  <Skeleton variant="text" width="50%" height={30} sx={{mb:2}}/>
                  {[...Array(3)].map((_, fieldIndex) => (
                    <Box key={fieldIndex} mb={2.5}>
                      <Skeleton variant="text" width="30%" height={15} />
                      <Skeleton variant="text" width="70%" height={35} />
                    </Box>
                  ))}
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Container>
      );
  }

  if (!profile) {
    // ... (mensaje de error si no hay perfil sin cambios)
    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <Paper elevation={3} sx={{p:4, borderRadius: 3}}>
            <Typography variant="h6">No se pudo cargar la información del perfil.</Typography>
            <Typography>Intenta de nuevo más tarde o contacta al soporte.</Typography>
          </Paper>
        </Container>
      );
  }
  
  // --- CONFIGURACIÓN DE CAMPOS DEL PERFIL REORGANIZADA ---
  const getProfileFieldsConfig = (profileData) => {
    const config = [
      {
        sectionTitle: "Información Personal",
        fields: [
          // Nombre, Apellidos, Email, Teléfono, Fecha de Nacimiento se mantienen aquí
          { label: "Nombre", name: "nombre", value: form.nombre, type: "text" },
          { label: "Apellidos", name: "apellidos", value: form.apellidos, type: "text" },
          { label: "Correo Electrónico", name: "email", value: form.email, type: "email", disabled: true },
          { label: "Teléfono", name: "telefono", value: form.telefono, type: "tel" },
          { label: "Fecha de Nacimiento", name: "fecha_nacimiento", type: "date", value: form.fecha_nacimiento },
        ],
      },
      {
        sectionTitle: "Identificación e Institución",
        fields: [
          { label: "Tipo de Identificación", name: "tipo_identificacion", value: form.tipo_identificacion, options: tiposIdentificacion, type: "select" },
          { label: "Número de Identificación", name: "numero_identificacion", value: form.numero_identificacion, type: "text" },
          // Institución se mantiene aquí como editable
          { label: "Institución", name: "institucion", value: form.institucion, type: "text" },
        ],
      },
    ];

    // Añadir Número de Grupos Unidos a "Información Personal" si es Estudiante
    if (profileData?.tipo_usuario === 'Estudiante') {
      const personalInfoSection = config.find(section => section.sectionTitle === "Información Personal");
      if (personalInfoSection) {
          personalInfoSection.fields.push({
            label: "Número de Grupos Unidos",
            name: "numero_grupos_unidos",
            value: profileData.numero_grupos_unidos !== undefined ? profileData.numero_grupos_unidos : 'N/A',
            type: "text",
            disabled: true,
            startAdornment: <GroupIcon fontSize="small" color="action" />
          });
      }
    }
    return config;
  };

  const profileFieldsConfig = getProfileFieldsConfig(profile);


  return (
    <Container maxWidth="md" sx={{ mt: {xs: 2, sm: 4}, mb: 4 }}>
      <Fade in={true} timeout={600}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: "12px" }}>
          {/* --- SECCIÓN DE CABECERA MODIFICADA --- */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left'} }}>
            <Avatar 
              src={profile.fotoUrl || undefined}
              sx={{ 
                width: {xs: 80, sm: 100}, 
                height: {xs: 80, sm: 100}, 
                fontSize: {xs: '2.5rem', sm: '3rem'}, 
                mr: {sm: 3}, mb: {xs: 2, sm: 0},
                bgcolor: 'primary.main',
                color: 'primary.contrastText'
              }}
            >
              {!(profile.fotoUrl) && (profile?.nombre || profile?.apellidos ? 
                getInitials(profile.nombre, profile.apellidos) : 
                <PersonIcon sx={{ fontSize: {xs: '2.5rem', sm: '3rem'} }} />
              )}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" component="h1" fontWeight="bold" sx={{fontSize: {xs: '1.8rem', sm: '2.125rem'}}}>
                {profile.nombre} {profile.apellidos}
              </Typography>
              
              {profile.tipo_usuario && 
                <Chip 
                  label={profile.tipo_usuario} 
                  color={profile.tipo_usuario === 'Administrador' ? 'secondary' : 'primary'} 
                  size="small" 
                  sx={{ mt: 1, fontWeight: 500 }} 
                />
              }
              {/* Se eliminó el Chip de Institución de aquí */}

              {/* ID de Usuario (Visible para Admin Y para el propio usuario) */}
              {(isOwnProfile || currentUser?.tipo_usuario === 'Administrador') && profile?._id && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start'} }}>
                  <Tooltip title="ID de Usuario">
                    <FingerprintIcon fontSize="small" sx={{ mr: 0.8, color: 'text.secondary' }}/>
                  </Tooltip>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                    ID:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 0.5, userSelect: 'all' }}>
                    {profile._id}
                  </Typography>
                  {/* Botón de copiar ID solo para Administradores */}
                  {currentUser?.tipo_usuario === 'Administrador' && (
                    <Tooltip title="Copiar ID">
                      <IconButton onClick={() => handleCopyId(profile._id)} size="small" sx={{p:0.2}}>
                        <ContentCopyIcon sx={{fontSize: '1rem'}} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}

              {/* Fecha de Registro (Visible para Admin Y para el propio usuario) */}
              {(isOwnProfile || currentUser?.tipo_usuario === 'Administrador') && profile?.fecha_registro && (
                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start'} }}>
                   <Tooltip title="Fecha de Registro">
                    <CalendarMonthIcon fontSize="small" sx={{ mr: 0.8, color: 'text.secondary' }}/>
                  </Tooltip>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                    Registrado:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {new Date(profile.fecha_registro).toLocaleDateString(navigator.language || 'es-CO', {
                      year: 'numeric', month: 'long', day: 'numeric' // Puedes añadir hora si quieres
                    })}
                  </Typography>
                </Box>
              )}
            </Box>
            
            {isOwnProfile && (
              <Stack direction="row" spacing={1} sx={{mt: {xs:2, sm:0}, alignSelf: {xs: 'stretch', sm: 'flex-start'}}}>
                {edit ? (
                  <>
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={handleSave} 
                      startIcon={<SaveIcon />} 
                      disabled={saving}
                      sx={{ flexGrow: {xs: 1, sm: 0}}}
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={handleCancel} 
                      startIcon={<CancelIcon />} 
                      disabled={saving}
                      sx={{ flexGrow: {xs: 1, sm: 0}}}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={() => setEdit(true)} 
                    startIcon={<EditIcon />}
                    sx={{ flexGrow: {xs: 1, sm: 0}}}
                  >
                    Editar Perfil
                  </Button>
                )}
              </Stack>
            )}
          </Box>
          {/* --- FIN SECCIÓN DE CABECERA MODIFICADA --- */}

          <Divider sx={{ borderBottomWidth: '3px', borderStyle: 'dashed', borderColor: theme.palette.divider , my: 2 }} />
          
          <Grid container spacing={{xs: 2, md: 4}}>
            {profileFieldsConfig.map((section) => ( // Quité sectionIndex ya que el título puede ser key o usar el índice si es estable
              <Grid item xs={12} md={profileFieldsConfig.length > 1 ? 6 : 12} key={section.sectionTitle}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: '600', 
                  color: 'primary.light',
                  borderBottom: `2px solid ${theme.palette.text.secondary}`,
                  pb: 0.5, 
                  mb: 2.5 
                }}>
                  {section.sectionTitle}
                </Typography>
                {section.fields.map((field) => (
                  <EditableField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    value={form[field.name]} // 'form' contiene los datos para edición/visualización de campos estándar
                    type={field.type}
                    options={field.options}
                    editing={edit && isOwnProfile && !field.disabled}
                    onChange={handleChange}
                    disabled={field.disabled || (edit && !isOwnProfile) || saving}
                    startAdornment={field.startAdornment}
                  />
                ))}
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Fade>
    </Container>
  );
}

export default UserProfilePage;