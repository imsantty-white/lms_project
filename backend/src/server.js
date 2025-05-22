// backend/src/server.js
const http = require('http'); // Import the http module
const { Server } = require('socket.io'); // Import Server from socket.io
const app = require('./app'); // Importa la aplicación Express configurada
const connectDB = require('./config/db.config'); // Importa la función de conexión a BD

// Carga las variables de entorno (aunque ya se hizo en db.config.js, es buena práctica aquí también)
require('dotenv').config();

const PORT = process.env.PORT || 5000; // Obtiene el puerto del .env o usa 5000 por defecto

// Inicia el servidor
const startServer = async () => {
  try {
    // Primero intenta conectar a la base de datos
    await connectDB();

    // Si la conexión a BD es exitosa, inicia el servidor Express
    const httpServer = http.createServer(app); // Create HTTP server

    const io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    global.io = io; // Make io globally accessible

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);
      // Placeholder for joining user-specific rooms if needed later
      // socket.join(socket.handshake.query.userId); 
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      console.log(`Visita http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1); // Sale del proceso si no se puede iniciar el servidor
  }
};

startServer(); // Llama a la función para iniciar todo