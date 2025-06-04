// backend/src/controllers/fileUploadController.js
const mongoose = require('mongoose');
const FileReference = require('../models/FileReferenceModel');
const AppError = require('../utils/appError');
const path = require('path');
const fs = require('fs').promises; // Usar promesas de fs

// Directorio base para el almacenamiento local (asegúrate de que exista o créalo)
// Considera mover esto a una variable de entorno o configuración.
const LOCAL_STORAGE_BASE_PATH = path.join(__dirname, '..', '..', 'uploads'); // Sube dos niveles desde controllers/src/backend -> backend/uploads

// Función de ayuda para asegurar que el directorio de carga exista
const ensureUploadDirExists = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') { // Ignorar error si el directorio ya existe
            console.error('Error creando directorio de carga:', error);
            throw new AppError('No se pudo crear el directorio de carga en el servidor.', 500);
        }
    }
};

// @desc    Subir un archivo (genérico)
// @route   POST /api/files/upload
// @access  Privado (se necesitará `protect` middleware en la ruta)
// @param   req.file - Archivo proporcionado por Multer (usar upload.single('nombreDelCampoFile') en la ruta)
// @param   req.body.associationType - (Opcional) Tipo de asociación (ej. 'avatar', 'submission_document')
// @param   req.body.associatedEntityId - (Opcional) ID de la entidad asociada
// @param   req.body.description - (Opcional) Descripción del archivo
// @param   req.body.isPublic - (Opcional) Booleano, default false
// @param   req.body.storageProvider - (Opcional) 'local', 's3', etc. Default 'local'.
const uploadFile = async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('No se proporcionó ningún archivo para subir.', 400));
    }
    if (!req.user || !req.user._id) {
        return next(new AppError('Usuario no autenticado. No se puede subir el archivo.', 401));
    }

    const {
        associationType,
        associatedEntityId,
        description,
        isPublic,
        storageProvider = 'local' // Default a 'local' si no se especifica
    } = req.body;

    if (associatedEntityId && !mongoose.Types.ObjectId.isValid(associatedEntityId)) {
        return next(new AppError('El ID de la entidad asociada no es válido.', 400));
    }

    try {
        let filePathOrUrl;
        let finalFileName = req.file.originalname; // Por defecto, usar originalName

        if (storageProvider === 'local') {
            // Crear un nombre de archivo único para evitar colisiones
            // Podrías usar UUID o un timestamp más el nombre original sanitizado
            const timestamp = Date.now();
            const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            finalFileName = `${timestamp}-${req.user._id}-${sanitizedOriginalName}`;

            // Determinar subdirectorio basado en associationType o uploaderId
            let subDir = 'general';
            if (associationType) {
                subDir = associationType;
            } else if (req.user._id) {
                subDir = req.user._id.toString();
            }

            const userUploadDirPath = path.join(LOCAL_STORAGE_BASE_PATH, subDir);
            await ensureUploadDirExists(userUploadDirPath); // Asegurar que el directorio exista

            filePathOrUrl = path.join(userUploadDirPath, finalFileName);

            // Guardar el archivo (buffer de memoria) al sistema de archivos local
            await fs.writeFile(filePathOrUrl, req.file.buffer);

            // Para el cliente, la ruta podría ser relativa o una URL si se sirve estáticamente
            // Por ahora, guardamos la ruta del sistema de archivos.
            // Si sirves estos archivos, filePathOrUrl debería ser la URL accesible.
            // Ejemplo: filePathOrUrl = `/uploads/${subDir}/${finalFileName}`;
        } else {
            // Aquí iría la lógica para subir a S3, Cloudinary, etc.
            // Esto requeriría SDKs adicionales y configuración de credenciales.
            // Por ahora, devolvemos un error si no es 'local'.
            return next(new AppError(`El proveedor de almacenamiento '${storageProvider}' no está implementado.`, 501));
        }

        const fileRef = new FileReference({
            originalName: req.file.originalname,
            fileName: finalFileName, // El nombre con el que se guarda en el storage
            mimeType: req.file.mimetype,
            size: req.file.size,
            storageProvider: storageProvider,
            pathOrUrl: filePathOrUrl, // Ruta en el servidor o URL del proveedor cloud
            uploaderId: req.user._id,
            associationType,
            associatedEntityId,
            description,
            isPublic: isPublic === 'true' || isPublic === true, // Convertir a booleano
        });

        await fileRef.save();

        res.status(201).json({
            message: 'Archivo subido y referencia creada exitosamente.',
            file: fileRef
        });

    } catch (error) {
        console.error('Error al subir el archivo:', error);
        // Si es un error de AppError ya lanzado (ej. de ensureUploadDirExists), pasarlo.
        if (error instanceof AppError) {
            return next(error);
        }
        // Si el error es de escritura de archivo u otro, y el archivo se guardó parcialmente,
        // se podría intentar eliminarlo, aunque es complejo manejar todos los casos.
        next(new AppError('Error interno del servidor al procesar la subida del archivo.', 500));
    }
};

// TODO: Implementar funciones adicionales según necesidad:
// - getFileReferenceById(fileId): Obtener metadatos de un archivo.
// - streamFile(fileId): Servir/transmitir un archivo (especialmente para 'local' storage).
// - deleteFileAndReference(fileId): Eliminar archivo del storage y su referencia en BD.
// - updateFileDetails(fileId): Actualizar metadatos (descripción, isPublic, etc.).
// - listFilesForUser(userId, pagination): Listar archivos subidos por un usuario.
// - listFilesForEntity(associatedEntityId, associationType, pagination): Listar archivos asociados a una entidad.

module.exports = {
    uploadFile,
    // Exportar otras funciones a medida que se implementen
};
```
