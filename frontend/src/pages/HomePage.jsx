import React, { useState, useMemo, lazy, Suspense, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Container,
  Paper,
  useTheme,
  alpha,
  Grid,
  Skeleton,
  Fab,
  Zoom,
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  YouTube as YouTubeIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  MailOutline as MailIcon,
  ReportProblemOutlined as ReportIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon, // Icono para el indicador de scroll
  KeyboardArrowUp as KeyboardArrowUpIcon, // Icono para el botón "Volver al principio"
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Lazy loading de los modales para reducir el bundle inicial
const LoginModal = lazy(() => import('../components/LoginModal'));
const RegisterModal = lazy(() => import('../components/RegisterModal'));

function HomePage() {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false); // Estado para mostrar/ocultar el botón "Volver al principio"

  const handleOpenLoginModal = () => setIsLoginModalOpen(true);
  const handleOpenRegisterModal = () => setIsRegisterModalOpen(true);
  const handleCloseLoginModal = () => setIsLoginModalOpen(false);
  const handleCloseRegisterModal = () => setIsRegisterModalOpen(false);

  // Manejador del scroll para mostrar/ocultar el botón "Volver al principio"
  const handleScroll = useCallback(() => {
    // console.log('Scroll Y:', window.scrollY); // Para depuración: mira este valor en la consola
    if (window.scrollY > 400) { // Muestra el botón si el scroll es mayor a 400px (ajusta si es necesario)
      setShowScrollToTop(true);
    } else {
      setShowScrollToTop(false);
    }
  }, []);

  // Efecto para añadir y limpiar el event listener del scroll
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Ejecutarlo una vez al montar para el estado inicial
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Función para hacer scroll al principio de la página
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Desplazamiento suave
    });
  };

  // Memoización de las variantes de animación para evitar recrearlas en cada render
  const animationVariants = useMemo(() => ({
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 0.6,
          staggerChildren: 0.1,
        },
      },
    },
    item: {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 0.4,
          ease: 'easeOut',
        },
      },
    },
    // Variante para la animación del icono de scroll
    scrollArrow: {
      y: [0, 10, 0], // Animación de rebote arriba y abajo
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  }), []);

  // Memoización de las características para evitar recrear el array
  const features = useMemo(() => [
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
  ], [theme.palette.primary.main]);

  // Memoización de los tutoriales
  const tutorials = useMemo(() => [
    {
      title: 'Que es una Ruta de Aprendizaje',
      icon: <YouTubeIcon/>,
      id: 'tutorial-1'
    },
    {
      title: 'Asignar Contenido',
      icon: <YouTubeIcon/>,
      id: 'tutorial-2'
    },
    {
      title: 'Crear un Grupo',
      icon: <YouTubeIcon/>,
      id: 'tutorial-3'
    },
  ], []);

  // Memoización de estilos complejos
  const backgroundStyles = useMemo(() => ({
    minHeight: '100vh',
    width: '100%',
    margin: 0,
    padding: 0,
    background: `linear-gradient(135deg,
      ${alpha(theme.palette.secondary.main, 0.2)} 30%,
      ${alpha(theme.palette.primary.main, 0.2)} 50%,
      ${alpha(theme.palette.primary.dark, 0.6)} 100%)`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowX: 'hidden',
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
  }), [theme.palette.primary.main, theme.palette.primary.light, theme.palette.secondary.main]);

  const heroTitleStyles = useMemo(() => ({
    fontWeight: 900,
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    mb: 4,
    letterSpacing: '-0.02em',
  }), [theme.palette.primary.main, theme.palette.secondary.main]);

  const paperStyles = useMemo(() => ({
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
  }), [theme.palette.background.paper, theme.palette.primary.main]);

  // Componente memoizado para las tarjetas de características
  const FeatureCard = React.memo(({ feature, index }) => (
    <motion.div
      variants={animationVariants.item}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Paper elevation={0} sx={paperStyles}>
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
  ));

  // Componente memoizado para los tutoriales con lazy loading mejorado
  const TutorialCard = React.memo(({ tutorial, index }) => (
    <Grid item xs={12} sm={6} md={4} key={tutorial.id}>
      <motion.div
        variants={animationVariants.item}
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
              paddingTop: '56.25%',
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
              loading="lazy"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
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
  ));

  // Componente memoizado para las tarjetas de contacto
  const ContactCard = React.memo(({ icon, title, description, buttonText, buttonIcon, color = 'primary' }) => (
    <motion.div
      variants={animationVariants.item}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      style={{ flex: 1 }}
    >
      <Paper elevation={0} sx={paperStyles}>
        {React.cloneElement(icon, {
          sx: {
            fontSize: 40,
            color: theme.palette[color].main,
            mb: 2
          }
        })}
        <Typography
          variant="h6"
          component="h3"
          sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}
        >
          {title}
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
          {description}
        </Typography>
        <Button
          variant="contained"
          color={color}
          size="medium"
          startIcon={buttonIcon}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {buttonText}
        </Button>
      </Paper>
    </motion.div>
  ));

  return (
    <Box sx={backgroundStyles}>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div
          variants={animationVariants.container}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <Box sx={{
            textAlign: 'center',
            mb: 12,
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative', // <-- Asegúrate de que el contenedor padre tenga position: 'relative'
          }}>
            <motion.div variants={animationVariants.item}>
              <Typography
                variant="h2"
                component="h1"
                sx={heroTitleStyles}
              >
                Sistema de Gestión
                <br />
                de Aprendizaje
              </Typography>
            </motion.div>

            <motion.div variants={animationVariants.item}>
              <Typography
                variant="h4"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 400,
                  maxWidth: 600,
                  mx: 'auto',
                  mb: 5,
                  lineHeight: 1.6,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                }}
              >
                Plataforma moderna que conecta docentes y estudiantes
                en un entorno de aprendizaje colaborativo y eficiente
              </Typography>
            </motion.div>

            <motion.div variants={animationVariants.item}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
                sx={{ mb: 8 }}
              >
                {!isAuthenticated && (
                  <>
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
                  </>
                )}
              </Stack>
            </motion.div>

            {/* Indicador de "Scroll Down" */}
            <motion.div
              variants={animationVariants.scrollArrow}
              animate="scrollArrow"
              style={{
                position: 'absolute',
                bottom: '20px', // Ajusta esta posición si es necesario
                left: '50%',
                transform: 'translateX(-50%)',
                color: theme.palette.text.secondary,
                opacity: 0.8,
              }}
            >
              <KeyboardArrowDownIcon sx={{ fontSize: 40 }} />
            </motion.div>
          </Box>

          {/* Features Section */}
          <motion.div variants={animationVariants.item}>
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
                  <FeatureCard key={index} feature={feature} index={index} />
                ))}
              </Stack>
            </Box>
          </motion.div>

          {/* Tutorials Section */}
          <Box sx={{ mt: 12, pb: 8 }}>
            <motion.div variants={animationVariants.item}>
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
                <TutorialCard key={tutorial.id} tutorial={tutorial} index={index} />
              ))}
            </Grid>
          </Box>

          {/* Contact and Complaints Section */}
          <Box sx={{ mt: 12, pb: 8 }}>
            <motion.div variants={animationVariants.item}>
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
              <ContactCard
                icon={<MailIcon />}
                title="Contactar al Administrador"
                description="¿Tienes preguntas o necesitas soporte técnico? Envíanos un mensaje directo."
                buttonText="Enviar Email"
                buttonIcon={<MailIcon />}
                color="primary"
              />
              <ContactCard
                icon={<ReportIcon />}
                title="Apartado de Quejas o Reclamos"
                description="Si tienes alguna queja o reclamo, puedes reportarlo aquí."
                buttonText="Realizar Reclamo"
                buttonIcon={<ReportIcon />}
                color="secondary"
              />
            </Stack>
          </Box>
        </motion.div>

        {/* Footer */}
        <Box sx={{
          mt: 12,
          py: 4,
          textAlign: 'center',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <motion.div variants={animationVariants.item}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              © {new Date().getFullYear()} LMS. Todos los derechos reservados.
            </Typography>
          </motion.div>
        </Box>

        {/* Modales con Suspense para lazy loading */}
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
          {isLoginModalOpen && (
            <LoginModal open={isLoginModalOpen} onClose={handleCloseLoginModal} />
          )}
          {isRegisterModalOpen && (
            <RegisterModal open={isRegisterModalOpen} onClose={handleCloseRegisterModal} />
          )}
        </Suspense>

        {/* Botón "Volver al principio" */}
        <Zoom in={showScrollToTop}>
          <Fab
            color="primary"
            size="small"
            aria-label="scroll back to top"
            onClick={scrollToTop}
            sx={{
              position: 'fixed', // <-- Crucial para que el botón flote
              bottom: 20,
              right: 20,
              zIndex: theme.zIndex.tooltip + 1, // Asegura que esté por encima de otros elementos
            }}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Zoom>
      </Container>
    </Box>
  );
}

export default React.memo(HomePage);