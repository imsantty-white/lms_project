# Sistema de Gestión de Aprendizaje (LMS)

## Introducción

Este proyecto es un Sistema de Gestión de Aprendizaje (LMS) diseñado para facilitar la creación, gestión y seguimiento de contenido educativo, cursos y la interacción entre docentes y estudiantes. Permite a los docentes construir rutas de aprendizaje estructuradas y a los estudiantes participar en actividades y seguir su progreso.

El sistema está actualmente en desarrollo, preparándose para su despliegue inicial en AWS. Se ha realizado un análisis de seguridad y rendimiento para identificar áreas de mejora antes de la implementación.

## Características Clave Actuales

El sistema cuenta con una arquitectura de backend (Node.js) y frontend (React) e incluye las siguientes funcionalidades principales:

*   **Gestión de Usuarios:**
    *   Registro y autenticación de usuarios (Estudiantes, Docentes, Administradores).
    *   Perfiles de usuario.
    *   Aprobación de cuentas de docentes por administradores.
    *   Gestión de estado de cuentas (activar/desactivar).
*   **Gestión de Grupos:**
    *   Creación de grupos por docentes con códigos de acceso únicos.
    *   Solicitudes de unión a grupos por estudiantes y aprobación/rechazo por docentes.
    *   Listado de miembros del grupo.
    *   Archivado y restauración de grupos.
*   **Rutas de Aprendizaje:**
    *   Creación de rutas de aprendizaje por docentes, asociadas a grupos.
    *   Estructuración de rutas en Módulos y Temas.
    *   Asignación de contenido (recursos y actividades) a los temas.
    *   Gestión del orden de módulos, temas y asignaciones.
*   **Gestión de Contenido:**
    *   Banco de Recursos (creación de contenido HTML, enlaces, videos).
    *   Banco de Actividades (creación de Quizzes, Cuestionarios, Trabajos).
    *   Asignación de contenido de los bancos a las rutas de aprendizaje.
    *   Configuración de parámetros para actividades asignadas (fechas, puntos, intentos, tiempo límite).
    *   Gestión del estado de las asignaciones (Borrador, Abierto, Cerrado).
*   **Interacción y Progreso del Estudiante:**
    *   Visualización de rutas de aprendizaje y su contenido.
    *   Realización de actividades (Quizzes, Cuestionarios, envío de Trabajos).
    *   Seguimiento del progreso en las rutas de aprendizaje.
    *   Recepción de calificaciones y retroalimentación.
*   **Funcionalidades para Docentes:**
    *   Panel de control para gestionar grupos, rutas y contenido.
    *   Visualización de entregas de estudiantes.
    *   Calificación manual de actividades.
*   **Funcionalidades para Administradores:**
    *   Dashboard con estadísticas del sistema.
    *   Gestión completa de usuarios, grupos y planes de suscripción.
    *   Revisión de mensajes de contacto.
    *   Envío de notificaciones del sistema y anuncios.
*   **Notificaciones:**
    *   Sistema de notificaciones en tiempo real (usando WebSockets) para eventos relevantes (ej. nuevas entregas, solicitudes de unión, contenido nuevo/actualizado, calificaciones).
*   **Suscripciones y Planes (para Docentes):**
    *   Sistema de planes con límites de uso (ej. número de grupos, rutas, etc.).
    *   Asignación de un plan gratuito por defecto a nuevos docentes.
    *   Verificación del estado de la suscripción para acceso a funcionalidades.

## Tecnologías Utilizadas

*   **Backend:**
    *   Node.js
    *   Express.js
    *   MongoDB (con Mongoose)
    *   JSON Web Tokens (JWT) para autenticación
    *   Socket.IO para comunicación en tiempo real
    *   bcrypt para hashing de contraseñas
*   **Frontend:**
    *   React
    *   React Router para enrutamiento
    *   Material-UI (MUI) para componentes de interfaz de usuario
    *   Axios para peticiones HTTP
    *   Socket.IO Client
    *   Vite como herramienta de construcción
*   **Base de Datos:**
    *   MongoDB

## Estado Actual

En desarrollo, preparándose para despliegue en AWS. Se está trabajando en la optimización y aseguramiento del sistema.

## Próximos Pasos (Post-Análisis Inicial)

1.  Implementar las mejoras de seguridad y rendimiento identificadas.
2.  Configurar el entorno de despliegue en AWS.
3.  Realizar pruebas exhaustivas en un entorno de staging.
4.  Desplegar la aplicación.
5.  Configurar monitoreo, logging y alertas en producción.
```
