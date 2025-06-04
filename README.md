# LMS Project

Sistema de Gestión de Aprendizaje (LMS, Sin Nombre por ahora)

## Descripción

Este repositorio contiene el backend y frontend de un Sistema de Gestión de Aprendizaje (LMS) desarrollado en Node.js/Express y React, con MongoDB como base de datos. El sistema permite la gestión de usuarios (estudiantes, docentes y administradores), grupos, rutas de aprendizaje, actividades, entregas y seguimiento del progreso estudiantil.

## Características principales

- **Autenticación y autorización JWT** con roles (Estudiante, Docente, Administrador)  
  _(Próximamente integración con autenticación Firebase)_
- **Gestión de usuarios**: registro, login, aprobación de docentes, activación/desactivación de cuentas
- **Gestión de grupos** y membresías (solicitudes de unión, aprobación/rechazo, remoción de estudiantes)
- **Rutas de aprendizaje**: módulos y temas jerárquicos, edición y reordenamiento visual
- **Banco de contenido** para docentes (recursos y actividades: contenido, enlaces, videos, cuestionarios, quiz, trabajos)
- **Asignación y entrega de actividades** (quiz, cuestionario, trabajo) con fechas de inicio/fin, intentos, tiempo límite y puntaje máximo
- **Calificación automática y manual** de actividades y retroalimentación docente
- **Seguimiento del progreso** de los estudiantes por tema, módulo y ruta de aprendizaje
- **Paneles de administración** para gestión de usuarios y grupos
- **Notificaciones en tiempo real** (en desarrollo)
- **Documentación interactiva de la API** con Swagger

## Funcionalidades del Frontend

- **Interfaz de usuario en React** con Material UI (MUI) y Vite
- **Paneles diferenciados** para Administrador, Docente y Estudiante
- **Gestión visual de rutas de aprendizaje**: creación, edición, asignación de módulos, temas y actividades
- **Banco de contenido**: creación, edición y reutilización de recursos y actividades
- **Asignación de actividades** a temas con configuración avanzada (fechas, intentos, tiempo, puntaje)
- **Visualización y calificación de entregas** de estudiantes (incluye retroalimentación)
- **Seguimiento visual del progreso** para estudiantes y docentes
- **Gestión de grupos**: solicitudes, aprobación/rechazo, invitaciones y remoción de miembros
- **Sistema de notificaciones** (en desarrollo)
- **Soporte para modo claro/oscuro**
- **Validaciones avanzadas** en formularios y feedback visual con Toasts
- **Carga y manejo de estados de error y acceso** en todas las vistas
- **Rutas protegidas** según el rol del usuario

## Tecnologías utilizadas

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (JSON Web Tokens)
- Swagger (OpenAPI)
- express-mongo-sanitize y otras medidas de seguridad
- React + Vite + Material UI (MUI)
- Axios, React Router, React Toastify

## Instalación

### Backend

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/lms_project.git
   cd lms_project/backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la carpeta `backend` con el siguiente contenido:
   ```
   MONGODB_URI=tu_uri_de_mongodb
   JWT_SECRET=tu_secreto_jwt
   PORT=3000
   ```

4. Inicia el servidor:
   ```bash
   npm start
   ```

### Frontend

1. En otra terminal, ve a la carpeta `frontend`:
   ```bash
   cd ../frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia la aplicación de React:
   ```bash
   npm run dev
   ```

4. El frontend estará disponible en `http://localhost:5173` (por defecto).

## Uso

- La API estará disponible en `http://localhost:3000`.
- La documentación Swagger está en `http://localhost:3000/api-docs`.
- El frontend estará disponible en `http://localhost:5173`.

## Estructura del proyecto

```
lms_project/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── config/
│   │   └── app.js
│   ├── .env
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── theme.js
│   │   └── index.css
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vitest.config.js
└── README.md
```

## Seguridad

- Las credenciales y secretos se gestionan mediante variables de entorno (`.env`).
- El archivo `.env` está en `.gitignore` y **no debe subirse al repositorio**.
- Se utiliza `express-mongo-sanitize` para proteger contra NoSQL Injection.
- El frontend no almacena credenciales sensibles en el código fuente.

---