// backend/src/server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db.config');

require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        const httpServer = http.createServer(app);

        const io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
            },
        });

        global.io = io; // Make io globally accessible

        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            // --- ¡AJUSTE CLAVE AQUÍ! ---
            // Obtener el userId de los parámetros de la query enviados desde el frontend
            const userId = socket.handshake.query.userId;
            if (userId) {
                // Unir el socket a una sala con el ID del usuario
                socket.join(userId);
                console.log(`Socket ${socket.id} joined room for user: ${userId}`);
            } else {
                console.warn(`Socket connected without userId in query: ${socket.id}`);
            }
            // --- FIN AJUSTE CLAVE ---

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
                // Opcional: remover el socket de la sala al desconectar
                if (userId) {
                    socket.leave(userId);
                    console.log(`Socket ${socket.id} left room for user: ${userId}`);
                }
            });
        });

        httpServer.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Visita http://localhost:${PORT}/`);
        });
    } catch (err) {
        console.error('Error al iniciar el servidor:', err.message);
        process.exit(1);
    }
};

startServer();