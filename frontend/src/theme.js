// src/theme.js
import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/open-sans';
import '@fontsource-variable/open-sans/wght-italic.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter/wght-italic.css';
import '@fontsource/cal-sans';
import '@fontsource-variable/nunito';

// Paletas de colores personalizadas
const customPrimaryColor = {
  main: '#960933',
  light: '#b83d66',
  dark: '#400416',
  contrastText: '#fff',
};
const customSecondaryColor = {
  main: '#11964b',
  light: '#46db87',
  dark: '#0b4a26',
  contrastText: '#222',
};

// Paleta para modo claro
const lightPalette = {
  mode: 'light',
  primary: customPrimaryColor,
  secondary: customSecondaryColor,
  background: {
    default: '#f7f1e9',
    paper: '#f5ede1',
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
    default: '#1f2024',
    paper: '#17181a',
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
      fontFamily: '"Inter Variable","Open Sans Variable",  "Roboto", sans-serif',
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