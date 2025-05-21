import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Si tienes un archivo CSS global

// Importa BrowserRouter
import { BrowserRouter } from 'react-router-dom';
// Importa el AuthProvider
import { AuthProvider } from './context/AuthContext';

// --- Importar ThemeProvider y CssBaseline de Material UI ---
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material'; // Componente para reset de estilos

// --- Importa tu tema personalizado ---
// Asegúrate de que la ruta sea correcta si creaste un archivo theme.js
import customTheme from './theme'; // <-- Asumiendo que creaste src/theme.js y exportaste el tema
// --- Fin Importaciones de Tema ---


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Envuelve la aplicación con BrowserRouter (para el routing) */}
    <BrowserRouter>
      {/* Envuelve con AuthProvider (para la autenticación) */}
      <AuthProvider>
        {/* --- Envuelve con ThemeProvider (para el tema de Material UI) --- */}
        <ThemeProvider theme={customTheme}> {/* Pasa tu tema personalizado aquí */}
          {/* --- Incluye CssBaseline DENTRO del ThemeProvider --- */}
          {/* CssBaseline resetea estilos por defecto del navegador; debe estar dentro del ThemeProvider */}
          <CssBaseline />
          {/* --- Fin CssBaseline --- */}
          <App /> {/* Tu componente principal de la aplicación */}
        </ThemeProvider>
        {/* --- Fin ThemeProvider --- */}
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);