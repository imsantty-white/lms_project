import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { BrowserRouter as Router } from 'react-router-dom'; // Changed to Router alias
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext'; // Corrected path

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <SocketProvider> {/* SocketProvider is here */}
          <App />
        </SocketProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);