// backend/src/routes/fileUploadRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware'); // Proteger rutas
const upload = require('../middleware/multerConfig'); // Configuración de Multer
const fileUploadController = require('../controllers/fileUploadController');

// @route   POST /api/files/upload
// @desc    Subir un archivo genérico
// @access  Privado (cualquier usuario autenticado)
// Espera un campo 'file' en el FormData, y opcionalmente campos de texto para metadatos.
router.post(
    '/upload',
    protect, // Asegura que el usuario esté autenticado
    upload.single('file'), // Middleware de Multer para procesar un solo archivo del campo 'file'
    fileUploadController.uploadFile
);

// Aquí se podrían añadir más rutas relacionadas con archivos en el futuro, por ejemplo:
// GET /api/files/:id - Obtener metadatos de un archivo
// GET /api/files/download/:id - Descargar un archivo (si se implementa el servicio de descarga)
// DELETE /api/files/:id - Eliminar un archivo (con permisos adecuados)

module.exports = router;
```
