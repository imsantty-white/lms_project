import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Container,
  Paper,
  useTheme,
  alpha,
  Grid // Importamos Grid para el layout de los tutoriales
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  HelpOutline as HelpIcon, // Nuevo icono para contacto/quejas
  MailOutline as MailIcon, // Nuevo icono para contacto
  ReportProblemOutlined as ReportIcon // Nuevo icono para quejas
} from '@mui/icons-material';

// Importa los componentes de los modales
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';

function HomePage() {
  const theme = useTheme();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleOpenLoginModal = () => setIsLoginModalOpen(true);
  const handleOpenRegisterModal = () => setIsRegisterModalOpen(true);
  const handleCloseLoginModal = () => setIsLoginModalOpen(false);
  const handleCloseRegisterModal = () => setIsRegisterModalOpen(false);

  // Variantes de Framer Motion para animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const features = [
    {
      icon: <SchoolIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      title: 'Aprendizaje Interactivo',
      description: 'Herramientas dinámicas para facilitar el proceso educativo',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      title: 'Seguimiento de Progreso',
      description: 'Monitorea el avance académico en tiempo real',
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      title: 'Colaboración',
      description: 'Conecta docentes y estudiantes de manera eficiente',
    },
  ];

  // Datos para los tutoriales de YouTube
  const tutorials = [
    {
      title: 'Cómo Iniciar Sesión',
      embedUrl: 'https://www.youtube.com/embed/VIDEO_ID_1', // Reemplaza con el ID de tu video de YouTube
    },
    {
      title: 'Crear una Clase',
      embedUrl: 'https://www.youtube.com/embed/VIDEO_ID_2', // Reemplaza con el ID de tu video de YouTube
    },
    {
      title: 'Subir Tareas',
      embedUrl: 'https://www.youtube.com/embed/VIDEO_ID_3', // Reemplaza con el ID de tu video de YouTube
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: 0,
        background: `linear-gradient(135deg,
          ${alpha(theme.palette.primary.main, 0.1)} 0%,
          ${alpha(theme.palette.secondary.main, 0.05)} 50%,
          ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowX: 'hidden', // Evita el scroll horizontal
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
          zIndex: -1,
        },
      }}
    >
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section - Título, Descripción y Botones */}
          <Box sx={{ textAlign: 'center', mb: 12, minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <motion.div variants={itemVariants}>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 900,
                  //fontSize: { xs: '2.5rem', md: '3.5rem' },
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                Sistema de Gestión
                <br />
                de Aprendizaje
              </Typography>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Typography
                variant="h4"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 400,
                  maxWidth: 600,
                  mx: 'auto',
                  mb: 5,
                  lineHeight: 1.6,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                }}
              >
                Plataforma moderna que conecta docentes y estudiantes
                en un entorno de aprendizaje colaborativo y eficiente
              </Typography>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
                sx={{ mb: 8 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={handleOpenLoginModal}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                      boxShadow: `0 12px 35px ${alpha(theme.palette.primary.main, 0.4)}`,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Iniciar Sesión
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<RegisterIcon />}
                  onClick={handleOpenRegisterModal}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Registrarse
                </Button>
              </Stack>
            </motion.div>
          </Box>

          {/* Features Section - ¿Por qué elegirnos? */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mt: 12, pb: 8 }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  textAlign: 'center',
                  mb: 6,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                }}
              >
                ¿Por qué elegirnos?
              </Typography>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={4}
                justifyContent="center"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        height: '100%',
                        backgroundColor: alpha(theme.palette.background.paper, 0.7),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        borderRadius: 4,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.background.paper, 0.9),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          boxShadow: `0 10px 40px ${alpha(theme.palette.primary.main, 0.1)}`,
                        },
                      }}
                    >
                      <Box sx={{ mb: 2 }}>
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          mb: 2,
                          color: theme.palette.text.primary,
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: theme.palette.text.secondary,
                          lineHeight: 1.6,
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </Paper>
                  </motion.div>
                ))}
              </Stack>
            </Box>
          </motion.div>



          {/* Tutorials Section - Tutoriales de Uso */}
          <Box sx={{ mt: 12, pb: 8 }}>
            <motion.div variants={itemVariants}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  textAlign: 'center',
                  mb: 6,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                }}
              >
                Tutoriales de Uso del Sistema
              </Typography>
            </motion.div>

            <Grid container spacing={4} justifyContent="center">
              {tutorials.map((tutorial, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Paper
                      elevation={3}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        '&:hover': {
                          boxShadow: `0 10px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
                        },
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ mb: 2, fontWeight: 600, color: theme.palette.text.primary }}
                      >
                        {tutorial.title}
                      </Typography>
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          paddingTop: '56.25%', // 16:9 Aspect Ratio
                          borderRadius: 2,
                          overflow: 'hidden',
                          mb: 2,
                        }}
                      >
                        <iframe
                          width="100%"
                          height="100%"
                          src={tutorial.embedUrl}
                          title={tutorial.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                          }}
                        ></iframe>
                      </Box>
                      <Button
                        variant="text"
                        color="primary"
                        href={tutorial.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Ver en YouTube
                      </Button>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>


          {/* Contact and Complaints Section */}
          <Box sx={{ mt: 12, pb: 8 }}>
            <motion.div variants={itemVariants}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  textAlign: 'center',
                  mb: 6,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                }}
              >
                ¿Necesitas ayuda?
              </Typography>
            </motion.div>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              justifyContent="center"
              alignItems="stretch"
            >
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    height: '100%',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.9),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      boxShadow: `0 10px 40px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  }}
                >
                  <MailIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 2 }} />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}
                  >
                    Contactar al Administrador
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                    ¿Tienes preguntas o necesitas soporte técnico? Envíanos un mensaje directo.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    startIcon={<MailIcon />}
                    // Aquí podrías agregar un enlace a un formulario de contacto o un email
                    //href="mailto:tuemail@dominio.com" // Reemplaza con tu email
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Enviar Email
                  </Button>
                </Paper>
              </motion.div>

              <motion.div
                variants={itemVariants}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    height: '100%',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.9),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      boxShadow: `0 10px 40px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  }}
                >
                  <ReportIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 2 }} />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}
                  >
                    Apartado de Quejas o Reclamos
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                    Si tienes alguna queja o reclamo, puedes reportarlo aquí.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="medium"
                    startIcon={<ReportIcon />}
                    // Aquí podrías agregar un enlace a un formulario de quejas
                    //href="/quejas-reclamos" // Reemplaza con la ruta de tu formulario de quejas
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Realizar Reclamo
                  </Button>
                </Paper>
              </motion.div>
            </Stack>
          </Box>
        </motion.div>

        {/* Footer - Derechos de Autor */}
        <Box sx={{ mt: 12, py: 4, textAlign: 'center', borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <motion.div variants={itemVariants}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              © {new Date().getFullYear()} LMS. Todos los derechos reservados.
            </Typography>
          </motion.div>
        </Box>

        {/* Modales */}
        <LoginModal open={isLoginModalOpen} onClose={handleCloseLoginModal} />
        <RegisterModal open={isRegisterModalOpen} onClose={handleCloseRegisterModal} />
      </Container>
    </Box>
  );
}

export default HomePage;