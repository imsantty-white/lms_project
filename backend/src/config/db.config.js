require('dotenv').config(); // Carga las variables de entorno del archivo .env
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Intenta conectar a MongoDB usando la URI del archivo .env
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Conexión a MongoDB exitosa!');

  } catch (err) {
    // Si hay un error en la conexión
    console.error('Error al conectar a MongoDB:', err.message);
    // Opcional: Salir del proceso si la conexión falla es crítico
    // process.exit(1);
  }
};

module.exports = connectDB; // Exporta la función para usarla en server.js