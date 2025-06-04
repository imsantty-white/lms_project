const mongoose = require('mongoose');

const fileReferenceSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: [true, 'El nombre original del archivo es obligatorio.'],
        trim: true,
    },
    fileName: {
        type: String,
        required: [true, 'El nombre del archivo en el almacenamiento es obligatorio.'],
        // Considerar unique: true si el nombre del archivo en el storage debe ser único a nivel de BD,
        // aunque la unicidad a menudo se garantiza mediante prefijos o UUIDs en el nombre.
    },
    mimeType: {
        type: String,
        required: [true, 'El tipo MIME del archivo es obligatorio.'],
    },
    size: {
        type: Number,
        required: [true, 'El tamaño del archivo es obligatorio.'],
    },
    storageProvider: {
        type: String,
        enum: ['local', 's3', 'cloudinary', 'other'],
        required: [true, 'El proveedor de almacenamiento es obligatorio.'],
        default: 'local',
    },
    pathOrUrl: {
        type: String,
        required: [true, 'La ruta o URL del archivo es obligatoria.'],
    },
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El ID del cargador es obligatorio.'],
        index: true,
    },
    associationType: {
        type: String,
        enum: [
            'avatar',
            'submission_document',
            'resource_material',
            'course_image',
            'system_asset',
            'other'
        ],
        required: false,
    },
    associatedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        index: true,
    },
    description: {
        type: String,
        trim: true,
        required: false
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
});

fileReferenceSchema.index({ associationType: 1, associatedEntityId: 1 });
// Considerar un índice único compuesto si es necesario, por ejemplo, para un avatar de usuario:
// fileReferenceSchema.index({ uploaderId: 1, associationType: 1 }, { unique: true, partialFilterExpression: { associationType: 'avatar' } });


const FileReference = mongoose.model('FileReference', fileReferenceSchema);

module.exports = FileReference;
```
