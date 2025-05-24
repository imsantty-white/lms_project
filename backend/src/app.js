// backend/src/app.js
const express = require('express');
const app = express(); // Crea una instancia de la aplicación Express
require('dotenv').config();

// --- IMPORTAR Y CONFIGURAR CORS ---
const cors = require('cors');

// --- IMPORTAR express-mongo-sanitize ---
const mongoSanitize = require('express-mongo-sanitize');

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

// --- USAR EL MIDDLEWARE express-mongo-sanitize ---
// Solo sanitiza body y params, NO query (para evitar el error)
app.use((req, res, next) => {
  mongoSanitize.sanitize(req.body, { replaceWith: '_removed_' });
  mongoSanitize.sanitize(req.params, { replaceWith: '_removed_' });
  // NO sanitices req.query aquí
  next();
});

// --- Swagger Docs ---
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API LMS',
      version: '1.0.0',
      description: 'Documentación de la API del Sistema de Gestión de Aprendizaje',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'], // Ajusta el path según donde estén tus rutas
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const authRoutes = require('./routes/authRoutes'); // Importa las rutas de autenticación
const groupRoutes = require('./routes/groupRoutes'); // Importa las rutas de grupos
const learningPathRoutes = require('./routes/learningPathRoutes'); // Importa rutas de rutas de aprendizaje
const contentRoutes = require('./routes/contentRoutes'); // Importa rutas de contenido
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const progressRoutes = require('./routes/progressRoutes');
const activityRoutes = require('./routes/activityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // Import dashboard routes

app.use('/api/auth', authRoutes);

// Usar rutas de administración
// Todas las rutas en adminRoutes.js se prefijarán con /api/admin
app.use('/api/admin', adminRoutes);

// Monta las rutas de Grupos
app.use('/api/groups', groupRoutes); // Monta las rutas de grupos bajo el prefijo /api/groups

// Todas las rutas en learningPathRoutes.js se prefijarán con /api/learning-paths (Paths, Modules, Themes)
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

// Mount notification routes
// All routes in notificationRoutes.js will be prefixed with /api/notifications
app.use('/api/notifications', notificationRoutes);

// Usar rutas de perfil
app.use('/api/profile', profileRoutes);

// Usar rutas de dashboard
// Todas las rutas en dashboardRoutes.js se prefijarán con /api/dashboard
app.use('/api/dashboard', dashboardRoutes);

// Ruta de prueba simple
app.get('/', (req, res) => {
  res.send('API del Sistema de Gestión de Aprendizaje funcionando!');
});

module.exports = app; // Exporta la aplicación Express configurada