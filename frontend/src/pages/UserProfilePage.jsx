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
  useTheme, // Import useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  // No necesitamos los iconos específicos de campo aquí, EditableField los describe con texto
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

// Nuevo componente local para campos editables/visualizables
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
  rows = 1
}) => {
  const theme = useTheme();

  if (!editing) {
    let displayValue = value;
    if (type === 'date' && value) {
      try {
        displayValue = new Date(value).toLocaleDateString(navigator.language || 'es-CO', { // Usa el idioma del navegador o un fallback
          year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch (e) {
        displayValue = value.slice(0,10); // Fallback si la fecha no es válida
      }
    }
    
    return (
      <Box mb={2.5}> {/* Aumentado el margen inferior para más espacio */}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-word', minHeight: '24px' /* Para evitar saltos de layout */ }}>
          {displayValue || <em style={{ color: theme.palette.text.disabled }}>No especificado</em>}
        </Typography>
      </Box>
    );
  }

  // Modo Edición
  if (options) { // Campo Select
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
        InputLabelProps={{ shrink: true }} // Siempre encoger para Selects
      >
        <MenuItem value="">
          <em style={{ color: theme.palette.text.disabled }}>Ninguno</em>
        </MenuItem>
        {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
      </TextField>
    );
  }

  return ( // Campos de Texto, Fecha, etc.
    <TextField
      fullWidth
      variant="outlined"
      size="small"
      label={label}
      type={type}
      name={name}
      value={type === 'date' && value ? value.slice(0,10) : (value || '')}
      onChange={onChange}
      disabled={disabled}
      sx={{ mb: 2 }}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined} // Encoger para Date
      multiline={multiline}
      rows={multiline ? rows : undefined}
    />
  );
};


function UserProfilePage() {
  const theme = useTheme(); // Acceder al tema para usarlo en el JSX
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const { userId: userIdFromParams } = useParams();
  const { user: currentUser,_id: currentUserId } = useAuth(); // Desestructurar _id para usar en dependencias

  const loadProfile = useCallback(async () => {
    setLoading(true);
    let apiUrl = '/api/profile'; 

    if (userIdFromParams) {
      if (currentUser?.tipo_usuario === 'Administrador') {
        apiUrl = `/api/profile/admin/${userIdFromParams}`;
      } else if (currentUser?.tipo_usuario === 'Docente' && currentUser._id !== userIdFromParams) {
        // Docente viendo perfil de otro (presumiblemente estudiante bajo su cargo, backend debe validar)
        apiUrl = `/api/profile/${userIdFromParams}`;
      } else if (currentUser?._id === userIdFromParams) {
        // Usuario viendo su propio perfil (incluso si es Docente)
         apiUrl = '/api/profile';
      } else {
        // Estudiante o Docente intentando ver perfil ajeno no permitido
        toast.error('No tienes permiso para ver este perfil.');
        setProfile(null); // Limpiar perfil
        setIsOwnProfile(false);
        setEdit(false);
        setLoading(false);
        return;
      }
    } else if (!currentUser) {
        // No hay usuario logueado y no se está pidiendo un perfil específico
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
  }, [userIdFromParams, currentUser?.tipo_usuario, currentUserId]); // Usar currentUserId (o currentUser._id directamente)

  useEffect(() => {
    loadProfile();
  }, [loadProfile]); // Depender de la función memoizada


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!isOwnProfile) {
          toast.error("No puedes modificar un perfil que no es tuyo.");
          setSaving(false);
          return;
      }
      // Envía los datos del formulario actual
      await axiosInstance.put('/api/profile', form); 
      
      toast.success('Perfil actualizado exitosamente');
      setEdit(false); // Sal del modo edición primero

      // LUEGO, vuelve a cargar el perfil para obtener los datos más frescos del servidor
      await loadProfile(); // <--- LLAMADA A loadProfile()

    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.response?.data?.message || 'Error al actualizar el perfil');
      // No reviertas el form aquí necesariamente, el usuario podría querer reintentar o ver sus cambios.
      // Si loadProfile falla, mostrará un error.
    } finally {
      setSaving(false);
    }
  };


  const handleCancel = () => {
    setEdit(false);
    setForm(profile); // Revertir a los datos originales del perfil
  };

  const getInitials = (nombre, apellidos) => {
    const initials = `${nombre?.charAt(0) || ''}${apellidos?.charAt(0) || ''}`;
    return initials.toUpperCase();
  };

  if (loading) {
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
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Paper elevation={3} sx={{p:4, borderRadius: 3}}>
          <Typography variant="h6">No se pudo cargar la información del perfil.</Typography>
          <Typography>Intenta de nuevo más tarde o contacta al soporte.</Typography>
        </Paper>
      </Container>
    );
  }
  
  // Campos a mostrar, adaptados de tu UserProfilePage original
  const profileFieldsConfig = [
    {
      sectionTitle: "Información Personal",
      fields: [
        { label: "Nombre", name: "nombre", value: form.nombre, type: "text" },
        { label: "Apellidos", name: "apellidos", value: form.apellidos, type: "text" },
        { label: "Correo Electrónico", name: "email", value: form.email, type: "email", disabled: true }, // Email no editable
        { label: "Teléfono", name: "telefono", value: form.telefono, type: "tel" },
        { label: "Fecha de Nacimiento", name: "fecha_nacimiento", type: "date", value: form.fecha_nacimiento },
      ],
    },
    {
      sectionTitle: "Identificación e Institución",
      fields: [
        { label: "Tipo de Identificación", name: "tipo_identificacion", value: form.tipo_identificacion, options: tiposIdentificacion, type: "select" },
        { label: "Número de Identificación", name: "numero_identificacion", value: form.numero_identificacion, type: "text" },
        { label: "Institución", name: "institucion", value: form.institucion, type: "text" },
      ],
    },
  ];


  return (
    <Container maxWidth="md" sx={{ mt: {xs: 2, sm: 4}, mb: 4 }}> {/* Reducido margen superior en móviles */}
      <Fade in={true} timeout={600}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: "12px" /* Bordes más suaves */ }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left'} }}>
            <Avatar 
              src={profile.fotoUrl || undefined} // Añadir si tienes fotoUrl
              sx={{ 
                width: {xs: 80, sm: 100}, 
                height: {xs: 80, sm: 100}, 
                fontSize: {xs: '2.5rem', sm: '3rem'}, 
                mr: {sm: 3}, mb: {xs: 2, sm: 0},
                bgcolor: 'primary.main', // Color de fondo del tema
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
              {profile.institucion && 
                <Chip 
                  label={profile.institucion} 
                  variant="outlined" 
                  size="small" 
                  sx={{ mt: 1, ml: profile.tipo_usuario ? 1 : 0, borderColor: 'rgba(0,0,0,0.23)', color: 'text.secondary' }} 
                />
              }
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

          <Divider sx={{ borderBottomWidth: '3px', borderStyle: 'dashed', borderColor: theme.palette.divider , my: 2 }} />
          
          <Grid container spacing={{xs: 2, md: 4}}>
            {profileFieldsConfig.map((section, sectionIndex) => (
              <Grid item xs={12} md={profileFieldsConfig.length > 1 ? 6 : 12} key={sectionIndex}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: '600', 
                  color: 'primary.light', // Usar color del tema
                  borderBottom: `2px solid ${theme.palette.text.secondary}`, // Borde más sutil
                  pb: 0.5, 
                  mb: 2.5 
                }}>
                  {section.sectionTitle}
                </Typography>
                {section.fields.map((field, fieldIndex) => (
                  <EditableField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    value={form[field.name]} // Asegurar que el valor venga de 'form'
                    type={field.type}
                    options={field.options}
                    editing={edit && isOwnProfile && !field.disabled} // Campo no editable si field.disabled es true
                    onChange={handleChange}
                    disabled={field.disabled || (edit && !isOwnProfile) || saving} // Deshabilitar si el campo es intrínsecamente no editable, o no es el perfil propio, o se está guardando
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
