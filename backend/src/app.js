// backend/src/app.js
const express = require('express');
const app = express(); // Crea una instancia de la aplicación Express
require('dotenv').config();

// --- IMPORTAR Y CONFIGURAR CORS ---
const cors = require('cors');

// Middleware: Permite que Express entienda JSON en las peticiones
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- USAR EL MIDDLEWARE CORS ---
// Configura CORS para permitir peticiones solo desde tu frontend de desarrollo
// Es crucial que la URL sea exactamente el origen de tu frontend (protocolo, dominio, puerto).
// Si tu frontend de Vite corre en http://localhost:5173, USA EXACTAMENTE ESA URL AQUÍ.
app.use(cors({
  origin: 'http://localhost:5173' // <-- Permite solo peticiones desde este origen específico
}));
// NOTA: Para desarrollo, a veces se usa app.use(cors()); para permitir cualquier origen,
// pero especificar el origen es mejor práctica incluso en desarrollo si conoces la URL del frontend.
// --- FIN USAR EL MIDDLEWARE CORS ---



const authRoutes = require('./routes/authRoutes'); // Importa las rutas de autenticación
const groupRoutes = require('./routes/groupRoutes'); // Importa las rutas de grupos
const learningPathRoutes = require('./routes/learningPathRoutes'); // Importa rutas de rutas de aprendizaje
const contentRoutes = require('./routes/contentRoutes'); // Importa rutas de contenido
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const progressRoutes = require('./routes/progressRoutes');
const activityRoutes = require('./routes/activityRoutes');

app.use('/api/auth', authRoutes); // Monta las rutas de autenticación bajo el prefijo /api/auth

// Usar rutas de administración
// Todas las rutas en adminRoutes.js se prefijarán con /api/admin
app.use('/api/admin', adminRoutes);

app.use('/api/groups', groupRoutes); // Monta las rutas de grupos bajo el prefijo /api/groups
// Usar rutas de rutas de aprendizaje (Paths, Modules, Themes)

// Todas las rutas en learningPathRoutes.js se prefijarán con /api/learning-paths
app.use('/api/learning-paths', learningPathRoutes);

// Usar rutas de contenido (Resources, Activities Bank)
// Todas las rutas en contentRoutes.js se prefijarán con /api/content
app.use('/api/content', contentRoutes);

// Usar rutas de entregas (Submissions)
// Todas las rutas en submissionRoutes.js se prefijarán con /api/submissions
app.use('/api/submissions', submissionRoutes);


// Usar rutas de progreso
// Todas las rutas en progressRoutes.js se prefijarán con /api/progress
app.use('/api/progress', progressRoutes);

// Usar rutas de actividades (Interacción Estudiante)
// Todas las rutas en activityRoutes.js se prefijarán con /api/activities
app.use('/api/activities', activityRoutes);

// Ruta de prueba simple
app.get('/', (req, res) => {
  res.send('API del Sistema de Gestión de Aprendizaje funcionando!');
});

module.exports = app; // Exporta la aplicación Express configurada