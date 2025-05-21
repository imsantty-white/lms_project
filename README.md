# LMS Project

Sistema de Gestión de Aprendizaje (LMS, Sin Nombre) — Backend

## Descripción

Este repositorio contiene el backend de un Sistema de Gestión de Aprendizaje (LMS) desarrollado en Node.js y Express, con MongoDB como base de datos. El sistema permite la gestión de usuarios (estudiantes, docentes y administradores), grupos, rutas de aprendizaje, actividades, entregas y seguimiento del progreso estudiantil.

## Características principales

- **Autenticación y autorización JWT** con roles (Estudiante, Docente, Administrador)
- **Gestión de usuarios**: registro, login, aprobación de docentes, activación/desactivación de cuentas
- **Gestión de grupos** y membresías
- **Rutas de aprendizaje**: módulos y temas jerárquicos
- **Banco de contenido** para docentes (recursos y actividades)
- **Asignación y entrega de actividades** (quiz, cuestionario, trabajo)
- **Calificación automática y manual**
- **Seguimiento del progreso** de los estudiantes
- **Documentación interactiva de la API** con Swagger

## Tecnologías utilizadas

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (JSON Web Tokens)
- Swagger (OpenAPI)
- express-mongo-sanitize y otras medidas de seguridad

## Instalación

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

## Uso

- La API estará disponible en `http://localhost:3000`.
- La documentación Swagger está en `http://localhost:3000/api-docs`.

## Estructura del proyecto

```
backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── config/
│   └── app.js
├── .env
├── .gitignore
└── package.json
```

## Seguridad

- Las credenciales y secretos se gestionan mediante variables de entorno (`.env`).
- El archivo `.env` está en `.gitignore` y **no debe subirse al repositorio**.
- Se utiliza `express-mongo-sanitize` para proteger contra NoSQL Injection.

## Próximamente

- **Frontend** en React (u otra tecnología) para la interfaz de usuario.

---