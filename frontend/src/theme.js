// src/theme.js
import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/open-sans';
import '@fontsource/poppins';
import '@fontsource/cal-sans';
import '@fontsource/lato';
import '@fontsource/inter';
import '@fontsource-variable/nunito';
import '@fontsource/blinker';

// --- Define tu color primario personalizado ---
// Puedes usar un código hexadecimal, nombres de colores CSS, rgb(), etc.
const customPrimaryColor = {
  main: '#5d4aab', // <-- ¡Cambia este color al que desees! (Este es un verde, por ejemplo)
  // Opcional: Puedes definir tonos claros y oscuros si quieres más control
  // light: '#80e27e',
  // dark: '#087f23',
  // Opcional: Define el color del texto que va bien sobre este color de fondo
  // contrastText: '#fff',
};

// --- Crea tu tema personalizado ---
const theme = createTheme({
  palette: { // Paleta de colores
    primary: customPrimaryColor, // Sobrescribe el color primario por defecto
    // Opcional: Puedes definir otros colores como secondary, error, warning, info, success
    // secondary: {
    //   main: '#f50057', // Ejemplo de color secundario
    // },
    // error: {
    //   main: '#f44336',
    // },
    // ... otros colores ...
  },
  // Opcional: Puedes personalizar la tipografía, espaciado, o componentes específicos aquí
  typography: {
    fontFamily: '"Cal sans", "Poppins", "Arial", Lato',
    h1: {
      fontSize: '2.5rem',
    },
  },
  components: { // Personalizar componentes específicos
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4, // Botones con esquinas más redondeadas
        },
      },
    },
  },
});

export default theme; // Exporta el tema para usarlo en tu aplicación