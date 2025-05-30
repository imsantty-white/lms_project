// src/pages/NotFoundPage.jsx
import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Paper,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Home as HomeIcon,
    School as SchoolIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // <--- Importa useNavigate

const NotFoundPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate(); // <--- Inicializa useNavigate

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut",
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    const iconVariants = {
        hidden: { scale: 0 },
        visible: {
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.3
            }
        }
    };

    const handleGoHome = () => {
        navigate('/'); // <--- Usa navigate
    };

    const handleGoBack = () => {
        navigate(-1); // <--- Usa navigate(-1) para ir a la página anterior
    };

    return (
        <Box
            sx={{
                //minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                // background: `linear-gradient(135deg, ${theme.palette.primary.light}10 0%, ${theme.palette.secondary.light}10 100%)`,
                py: 4
            }}
        >
            <Container maxWidth="md">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: { xs: 4, md: 6 },
                            textAlign: 'center',
                            borderRadius: 3,
                            background: 'primary.main',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <motion.div variants={iconVariants}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    p: 3,
                                    borderRadius: '50%',
                                    backgroundColor: theme.palette.primary.light + '20',
                                    mb: 3
                                }}
                            >
                                <SchoolIcon
                                    sx={{
                                        fontSize: { xs: 48, md: 64 },
                                        color: theme.palette.primary.light
                                    }}
                                />
                            </Box>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Typography
                                variant={isMobile ? "h2" : "h1"}
                                component="h1"
                                sx={{
                                    fontWeight: 700,
                                    color: theme.palette.primary.light,
                                    mb: 2,
                                    fontSize: { xs: '3rem', md: '4rem' }
                                }}
                            >
                                404
                            </Typography>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Typography
                                variant="h4"
                                component="h2"
                                sx={{
                                    fontWeight: 500,
                                    color: theme.palette.text.primary,
                                    mb: 2,
                                    fontSize: { xs: '1.75rem', md: '2.125rem' }
                                }}
                            >
                                Página no encontrada
                            </Typography>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: theme.palette.text.secondary,
                                    mb: 4,
                                    maxWidth: 500,
                                    mx: 'auto',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '1rem', md: '1.125rem' }
                                }}
                            >
                                Lo sentimos, la página que estás buscando no existe o ha sido movida.
                                Puedes regresar al inicio para continuar con tu aprendizaje.
                            </Typography>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<HomeIcon />}
                                    onClick={handleGoHome}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontSize: '1.1rem',
                                        boxShadow: theme.shadows[4],
                                        '&:hover': {
                                            boxShadow: theme.shadows[8],
                                            transform: 'translateY(-2px)'
                                        },
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    Ir al inicio
                                </Button>

                                <Button
                                    variant="outlined"
                                    color='text.primary'
                                    size="large"
                                    startIcon={<ArrowBackIcon />}
                                    onClick={handleGoBack}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontSize: '1.1rem',
                                        borderWidth: 2,
                                        '&:hover': {
                                            borderWidth: 2,
                                            transform: 'translateY(-2px)'
                                        },
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    Regresar
                                </Button>
                            </Box>
                        </motion.div>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
};

export default NotFoundPage;