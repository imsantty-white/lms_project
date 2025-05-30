// src/pages/HomePage.js
import React, { useState, useMemo, lazy, Suspense, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Icon, // Para iconos genéricos si es necesario
  Link
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  School as SchoolIcon, // Reutilizado
  TrendingUp as TrendingUpIcon, // Reutilizado
  People as PeopleIcon, // Reutilizado
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  EmojiObjects as LightbulbIcon, // Nuevo para "Descubre"
  DoneAll as DoneAllIcon, // Nuevo para "Pasos"
  GroupWork as GroupWorkIcon, // Nuevo para "Comunidad"
  ContactSupport as ContactSupportIcon, // Para el footer
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Lazy loading de los modales
const LoginModal = lazy(() => import('../components/LoginModal'));
const RegisterModal = lazy(() => import('../components/RegisterModal'));


// Componente reutilizable para secciones con título
const SectionTitle = React.memo(({ title, delay = 0.2 }) => {
  const theme = useTheme();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Typography
        variant="h3"
        component="h2"
        sx={{
          textAlign: 'center',
          mb: 6,
          fontWeight: 700,
          color: theme.palette.text.primary,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </Typography>
    </motion.div>
  );
});

// Componente para las tarjetas de "Cómo funciona" o "Beneficios"
const InfoCard = React.memo(({ icon, title, description, animationDelay }) => {
  const theme = useTheme();
  const paperStyles = useMemo(() => ({
    p: { xs: 3, md: 4 },
    textAlign: 'center',
    height: '100%',
    backgroundColor: alpha(theme.palette.background.paper, 0.75),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
    borderRadius: 4, // esquinas más redondeadas
    transition: 'all 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.dark, 0.05)}`,
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.9),
      transform: 'translateY(-8px)',
      boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
    },
  }), [theme]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: animationDelay }}
      style={{ height: '100%' }}
    >
      <Paper elevation={0} sx={paperStyles}>
        <Box sx={{ mb: 2.5, color: theme.palette.primary.main }}>
          {icon}
        </Box>
        <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>
          {description}
        </Typography>
      </Paper>
    </motion.div>
  );
});


function HomePage() {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const handleOpenLoginModal = () => setIsLoginModalOpen(true);
  const handleOpenRegisterModal = () => setIsRegisterModalOpen(true);
  const handleCloseLoginModal = () => setIsLoginModalOpen(false);
  const handleCloseRegisterModal = () => setIsRegisterModalOpen(false);

  const handleScroll = useCallback(() => {
    if (window.scrollY > 400) {
      setShowScrollToTop(true);
    } else {
      setShowScrollToTop(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const animationVariants = useMemo(() => ({
    container: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: 0.1 } },
    },
    item: {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    },
    scrollArrow: {
      y: [0, 10, 0],
      opacity: [0.5, 1, 0.5],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
  }), []);
  
  const backgroundStyles = useMemo(() => ({
    minHeight: '100vh',
    width: '100%',
    margin: 0,
    padding: 0,
    background: `linear-gradient(105deg,
      ${alpha(theme.palette.primary.main, 0.3)} 20%,
      ${alpha(theme.palette.secondary.main, 0.3)} 50%,
      ${alpha(theme.palette.primary.dark, 0.4)} 80%)`, // Sutilizado el gradiente
    position: 'relative', // Cambiado de absolute a relative para flujo normal
    overflowX: 'hidden',
    '&::before': { // Efecto de grano sutil o textura
      content: '""',
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      // background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      // opacity: 0.03, // Muy sutil
      zIndex: 0,
    },
  }), [theme.palette]);


  const heroTitleStyles = useMemo(() => ({
    fontWeight: 900,
    color: theme.palette.text.primary, // Texto blanco para contraste con fondo nuevo
    textShadow: `2px 2px 8px ${alpha(theme.palette.common.black, 0.3)}`, // Sombra para legibilidad
    mb: 3, // Reducido margen inferior
    letterSpacing: '-0.02em',
    fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4.5rem' }, // Ligeramente más grande
  }), [theme.palette]);

  const benefits = useMemo(() => [
    {
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      title: 'Aprendizaje Personalizado',
      description: 'Adapta tu ruta educativa con herramientas y contenido curado para tus metas específicas.',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      title: 'Seguimiento Intuitivo',
      description: 'Visualiza tu progreso en tiempo real y mantente motivado con métricas claras y alcanzables.',
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      title: 'Comunidad Colaborativa',
      description: 'Conéctate, comparte y aprende junto a docentes y estudiantes en un entorno interactivo y de apoyo.',
    },
  ], []);
  
  const howItWorksSteps = useMemo(() => [
    {
      icon: <RegisterIcon sx={{ fontSize: 40 }} />,
      title: 'Regístrate Fácilmente',
      description: 'Crea tu cuenta en minutos y accede a un mundo de conocimiento.',
    },
    {
      icon: <LightbulbIcon sx={{ fontSize: 40 }} />,
      title: 'Explora y Aprende',
      description: 'Descubre rutas de aprendizaje, cursos y recursos diseñados por expertos.',
    },
    {
      icon: <DoneAllIcon sx={{ fontSize: 40 }} />,
      title: 'Colabora y Crece',
      description: 'Participa en grupos, interactúa con mentores y alcanza tus objetivos.',
    },
  ], []);


  return (
    <Box sx={{ ...backgroundStyles, position: 'relative', zIndex: 1 }}> {/* Asegurar que el contenido esté sobre el ::before */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, position: 'relative', zIndex: 2 }}>
        <motion.div
          variants={animationVariants.container}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <Box sx={{
            textAlign: 'center',
            minHeight: { xs: '70vh', md: '80vh' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            px: 2, // Padding horizontal para móviles
            mb: { xs: 8, md: 12 }
          }}>
            <motion.div variants={animationVariants.item}>
              <Typography variant="h1" component="h1" sx={heroTitleStyles}>
                Transforma Tu <br /> Experiencia de Aprendizaje
              </Typography>
            </motion.div>

            <motion.div variants={animationVariants.item}>
              <Typography
                variant="h5" // Ligeramente más pequeño pero impactante
                sx={{
                  color: alpha(theme.palette.text.primary, 0.85), // Texto blanco semi-transparente
                  fontWeight: 400,
                  maxWidth: 700, // Ancho máximo del subtítulo
                  mx: 'auto',
                  mb: 5,
                  lineHeight: 1.7,
                  textShadow: `1px 1px 4px ${alpha(theme.palette.common.black, 0.2)}`,
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                }}
              >
                Una plataforma innovadora diseñada para la colaboración fluida y el crecimiento personalizado. Participa, aprende y alcanza tus metas educativas como nunca antes.
              </Typography>
            </motion.div>

            <motion.div variants={animationVariants.item}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
              >
                {!isAuthenticated ? (
                  <>
                    <Button
                      variant="contained"
                      color="secondary" // Color secundario para destacar
                      size="large"
                      startIcon={<LoginIcon />}
                      onClick={handleOpenLoginModal}
                      sx={{ py: 1.5, px: 4, borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: `0 8px 25px ${alpha(theme.palette.secondary.main, 0.4)}`, '&:hover': { boxShadow: `0 12px 35px ${alpha(theme.palette.secondary.main, 0.5)}`, transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}
                    >
                      Iniciar Sesión
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit" // Para que tome color del texto (blanco en este caso)
                      size="large"
                      startIcon={<RegisterIcon />}
                      onClick={handleOpenRegisterModal}
                      sx={{ py: 1.5, px: 4, borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: '1rem', borderColor: alpha(theme.palette.text.primary, 0.5), color: theme.palette.text.primary, '&:hover': { borderColor: theme.palette.common.white, backgroundColor: alpha(theme.palette.text.primary, 0.1), transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}
                    >
                      Registrarse
                    </Button>
                  </>
                ) : (
                   <Button
                      component={RouterLink}  // Indica que el botón actuará como Link
                      to="/profile"           // Define la ruta de navegación
                      variant="contained"
                      color="secondary"
                      size="large"
                      sx={{
                        py: 1.5,
                        px: 6,
                        borderRadius: 8,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        boxShadow: `0 8px 25px ${alpha(theme.palette.secondary.main, 0.4)}`,
                        '&:hover': {
                          boxShadow: `0 12px 35px ${alpha(theme.palette.secondary.main, 0.5)}`,
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Ir a mi Perfil
                    </Button>
                )}
              </Stack>
            </motion.div>

            <motion.div
              variants={animationVariants}
              animate="scrollArrow"
              style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', color: alpha(theme.palette.text.primary, 0.7) }}
            >
              <KeyboardArrowDownIcon sx={{ fontSize: 48 }} />
            </motion.div>
          </Box>

          {/* Section: Descubre una Nueva Forma de Aprender */}
          <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
            <SectionTitle title="Descubre una Nueva Dimensión del Aprendizaje" />
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Typography variant="h6" sx={{ color: theme.palette.text.secondary, maxWidth: 750, mx: 'auto', mb: 6, lineHeight: 1.8 }}>
                Nuestra plataforma está construida sobre la idea de que el aprendizaje debe ser una experiencia atractiva, accesible y adaptada a ti. Rompemos barreras para conectar a educadores y estudiantes en un ecosistema vibrante y de apoyo mutuo.
              </Typography>
              {/* Aquí podrías añadir una ilustración o un video corto */}
              <Box sx={{ maxWidth: 500, mx: 'auto', my: 4, p: 2, background: alpha(theme.palette.primary.main, 0.05), borderRadius: 3 }}>
                 <LightbulbIcon sx={{ fontSize: 80, color: theme.palette.text.primary, opacity: 0.6 }} />
                 <Typography variant="caption" display="block" sx={{mt: 1, color: theme.palette.text.hint}}>
                    Visual representativo de la innovación
                 </Typography>
              </Box>
            </motion.div>
          </Box>

          {/* Section: Pasos Simples Hacia el Éxito */}
          <Box sx={{ py: { xs: 6, md: 10 } }}>
            <SectionTitle title="Pasos Simples Hacia el Éxito" />
            <Grid container spacing={4} justifyContent="center">
              {howItWorksSteps.map((step, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <InfoCard
                    icon={step.icon}
                    title={step.title}
                    description={step.description}
                    animationDelay={index * 0.2}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Section: Experimenta la Ventaja */}
          <Box sx={{ py: { xs: 6, md: 10 } }}>
            <SectionTitle title="Experimenta la Ventaja" />
            <Grid container spacing={4} justifyContent="center">
              {benefits.map((benefit, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <InfoCard
                    icon={benefit.icon}
                    title={benefit.title}
                    description={benefit.description}
                    animationDelay={index * 0.2 + 0.1} // ligero offset
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          
          {/* Section: Únete a Nuestra Comunidad (CTA) */}
          <Box sx={{ py: { xs: 8, md: 12 }, textAlign: 'center', backgroundColor: alpha(theme.palette.primary.dark, 0.1), borderRadius: 5, my:8, p: {xs:3, md:6} }}>
             <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <GroupWorkIcon sx={{ fontSize: 60, color: theme.palette.secondary.main, mb: 3 }} />
                <Typography variant="h3" component="h2" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 3 }}>
                    ¿Listo para Empezar?
                </Typography>
                <Typography variant="h6" sx={{ color: theme.palette.text.secondary, maxWidth: 600, mx: 'auto', mb: 5, lineHeight: 1.7 }}>
                    Únete a miles de estudiantes y educadores que están redefiniendo el futuro del aprendizaje. ¡Tu viaje comienza ahora!
                </Typography>
                {!isAuthenticated && (
                    <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        startIcon={<RegisterIcon />}
                        onClick={handleOpenRegisterModal}
                        sx={{ py: 2, px: 6, borderRadius: 8, textTransform: 'none', fontWeight: 700, fontSize: '1.1rem', boxShadow: `0 10px 30px ${alpha(theme.palette.secondary.main, 0.35)}`, '&:hover': { boxShadow: `0 15px 40px ${alpha(theme.palette.secondary.main, 0.45)}`, transform: 'translateY(-3px)' }, transition: 'all 0.3s ease-in-out' }}
                    >
                        Crear Cuenta Gratis
                    </Button>
                )}
             </motion.div>
          </Box>

        </motion.div>

        {/* Footer */}
        <Box sx={{
          mt: {xs: 6, md: 10},
          py: {xs: 3, md: 5},
          textAlign: 'center',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`
        }}>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.5 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb:1 }}>
              © {new Date().getFullYear()} TuPlataformaLMS. Todos los derechos reservados.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                <Link href="/privacy-policy" color="textSecondary" variant="body2">Política de Privacidad</Link>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>|</Typography>
                <Link href="/terms-of-service" color="textSecondary" variant="body2">Términos de Servicio</Link>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>|</Typography>
                 <Link component="button" variant="body2" onClick={() => alert('Redirigir a contacto o abrir modal de contacto')} sx={{display: 'flex', alignItems: 'center', color: 'text.secondary'}}>
                    <ContactSupportIcon sx={{fontSize: '1rem', mr: 0.5}}/> Soporte
                </Link>
            </Stack>
          </motion.div>
        </Box>

        {/* Modales */}
        <Suspense fallback={<Box sx={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}><Skeleton variant="rectangular" width={400} height={300} /></Box>}>
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
            color="secondary" // Usar color secundario para coherencia
            size="medium"
            aria-label="scroll back to top"
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: 30, // Ligeramente más arriba
              right: 30, // Ligeramente más a la izquierda
              zIndex: theme.zIndex.tooltip + 1,
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