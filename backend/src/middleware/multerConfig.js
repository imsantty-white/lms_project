// backend/src/middleware/multerConfig.js
const multer = require('multer');
const AppError = require('../utils/appError'); // Para manejar errores de validación

// Almacenamiento en memoria: los archivos se guardan como Buffers en req.file.buffer
const storage = multer.memoryStorage();

// Filtro de tipo de archivo
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        // Imágenes
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        // Documentos
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain', // .txt
        // Presentaciones
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        // Hojas de cálculo
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        // TODO: Considerar añadir más tipos según sea necesario (ej. audio, video cortos)
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Aceptar archivo
    } else {
        // Rechazar archivo con un error específico
        cb(new AppError(`Tipo de archivo no permitido: ${file.mimetype}. Por favor, sube un archivo de tipo válido.`, 400), false);
    }
};

// Configuración de Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 10, // Límite de 10MB por archivo (ajustar según necesidad)
        // files: 5, // Límite de número de archivos por subida (si se manejan múltiples archivos)
    }
});

module.exports = upload;
```
