import React, { useState } from 'react';
import { Container, Box, Typography, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import backgroundImage from '../assets/fondo.png';

// Importa los componentes de los modales
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';

function HomePage() {
  // Define estados para controlar si los modales están abiertos
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Funciones para abrir los modales
  const handleOpenLoginModal = () => setIsLoginModalOpen(true);
  const handleOpenRegisterModal = () => setIsRegisterModalOpen(true);

  // Funciones para cerrar los modales
  const handleCloseLoginModal = () => setIsLoginModalOpen(false);
  const handleCloseRegisterModal = () => setIsRegisterModalOpen(false);

  return (
    <Box
      sx={{
        // Asegurarse de ocupar todo el espacio disponible
        width: '100%',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden', // Elimina cualquier scrollbar
        // Configuración del fondo
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Importante para el posicionamiento
        position: 'absolute', // Cambiado a absolute para cubrir toda la ventana
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3,
      }}
    >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      style={{ width: '100%', height: '100%' }} // Asegura que la animación cubra todo
    >
      <Container
        maxWidth={false} // Cambiado a false para ocupar todo el ancho
        disableGutters={true} // Desactiva los márgenes laterales
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 0, // Elimina el padding
        }}
      >
        <Box sx={{ 
          mb: 4,
          width: '100%', 
          maxWidth: 'md', // Mantiene el contenido centrado con un ancho máximo
          mx: 'auto' // Centra horizontalmente
        }}>
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Typography 
              variant="h2" 
              component="h1" 
              color="white" 
              gutterBottom
              sx={{
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                fontWeight: 'bold',
                // Alternativa con borde:
                // WebkitTextStroke: '1px black',
              }}
            >
              Bienvenido al Sistema de Gestión de Aprendizaje
            </Typography>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Typography 
              variant="h5" 
              component="p" 
              color="white" 
              paragraph
              sx={{
                textShadow: '1px 1px 3px rgba(0, 0, 0, 0.7)',
                // Puedes aumentar el peso de la fuente para mayor legibilidad
                fontWeight: 500,
              }}
            >
              Organiza, gestiona y facilita el proceso de enseñanza-aprendizaje
              en entornos virtuales para docentes y estudiantes.
            </Typography>
          </motion.div>
        </Box>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleOpenLoginModal}
            >
              Iniciar Sesión
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={handleOpenRegisterModal}
            >
              Registrarse
            </Button>
          </Stack>
        </motion.div>

        {/* Renderiza los componentes de los modales aquí */}
        <LoginModal open={isLoginModalOpen} onClose={handleCloseLoginModal} />
        <RegisterModal open={isRegisterModalOpen} onClose={handleCloseRegisterModal} />

      </Container>
    </motion.div>
    </Box>
  );
}

export default HomePage;