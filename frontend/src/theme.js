// src/theme.js
import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/open-sans';
import '@fontsource/poppins';
import '@fontsource/cal-sans';
import '@fontsource/lato';
import '@fontsource/inter';
import '@fontsource-variable/nunito';
import '@fontsource/blinker';

// Paletas de colores personalizadas
const customPrimaryColor = {
  main: '#5d4aab',
  light: '#7c6fd1',
  dark: '#3d2e6b',
  contrastText: '#fff',
};
const customSecondaryColor = {
  main: '#ffb300',
  light: '#ffe066',
  dark: '#c68400',
  contrastText: '#222',
};

// Paleta para modo claro
const lightPalette = {
  mode: 'light',
  primary: customPrimaryColor,
  secondary: customSecondaryColor,
  background: {
    default: '#f5f6fa',
    paper: '#fff',
  },
  text: {
    primary: '#222',
    secondary: '#736f8c',
  },
};

// Paleta para modo oscuro
const darkPalette = {
  mode: 'dark',
  primary: customPrimaryColor,
  secondary: customSecondaryColor,
  background: {
    default: '#181a20',
    paper: '#23263a',
  },
  text: {
    primary: '#fff',
    secondary: '#bdbdbd',
  },
};

// Función para crear el theme según el modo
export const getTheme = (mode = 'light') =>
  createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: {
      fontFamily: '"Cal sans", "Poppins", "Arial", Lato',
      h1: { fontSize: '2.5rem', fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            letterSpacing: 0.5,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
          },
        },
      },
      // Puedes agregar más overrides aquí para otros componentes
    },
  });