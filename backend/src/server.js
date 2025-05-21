// backend/src/server.js
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
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      console.log(`Visita http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1); // Sale del proceso si no se puede iniciar el servidor
  }
};

startServer(); // Llama a la función para iniciar todo