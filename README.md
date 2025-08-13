# 🕷️ Spider Grades System

Un sistema moderno y eficiente para la gestión de calificaciones escolares, construido con tecnologías web modernas y Firebase.

## 🚀 Características

### Para Profesores
- ✅ Dashboard completo con estadísticas en tiempo real
- ✅ Gestión de calificaciones por estudiante y asignatura
- ✅ Creación y administración de asignaturas
- ✅ Lista de estudiantes con información detallada
- ✅ Reportes y análisis de rendimiento
- ✅ Interfaz intuitiva y responsiva

### Para Estudiantes
- ✅ Vista personalizada de calificaciones
- ✅ Progreso académico por asignatura
- ✅ Historial de calificaciones
- ✅ Estadísticas de rendimiento
- ✅ Notificaciones de nuevas calificaciones

### Características Técnicas
- 🔐 Autenticación segura con Firebase Auth
- 📊 Base de datos en tiempo real con Firestore
- 🎨 Interfaz moderna con Tailwind CSS
- 📱 Diseño completamente responsivo
- ⚡ Rendimiento optimizado
- 🔄 Sincronización automática

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore)
- **Hosting**: Firebase Hosting (recomendado)

## 📦 Instalación

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn
- Cuenta de Firebase

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd spider-grades-system
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase

#### Crear proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Authentication (Email/Password)
4. Crea una base de datos Firestore
5. Configura las reglas de seguridad

#### Configurar credenciales
1. Ve a Configuración del proyecto > General
2. En "Tus apps", selecciona la configuración web
3. Copia la configuración de Firebase

#### Actualizar configuración
Edita `public/js/firebase-config.js` y reemplaza con tus credenciales:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "tu-sender-id",
  appId: "tu-app-id"
};
```

### 4. Configurar reglas de Firestore
En Firebase Console > Firestore Database > Reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profesores pueden gestionar estudiantes, asignaturas y calificaciones
    match /students/{studentId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    match /subjects/{subjectId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    match /grades/{gradeId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student';
    }
  }
}
```

### 5. Compilar CSS
```bash
npm run build:css
```

### 6. Ejecutar en desarrollo
```bash
npm run dev
```

El sistema estará disponible en `http://localhost:8080`

## 📁 Estructura del Proyecto

```
spider-grades-system/
├── public/                 # Archivos públicos
│   ├── index.html         # Página principal
│   ├── dashboard-teacher.html  # Dashboard del profesor
│   ├── dashboard-student.html  # Dashboard del estudiante
│   ├── css/
│   │   └── style.css      # Estilos compilados
│   └── js/
│       ├── firebase-config.js  # Configuración de Firebase
│       ├── auth.js        # Autenticación
│       ├── database.js    # Operaciones de base de datos
│       ├── app.js         # Lógica principal
│       ├── teacher-dashboard.js  # Dashboard del profesor
│       └── student-dashboard.js  # Dashboard del estudiante
├── src/
│   └── css/
│       └── input.css      # Estilos fuente de Tailwind
├── package.json
├── tailwind.config.js     # Configuración de Tailwind
└── README.md
```

## 🔧 Configuración Inicial

### Crear usuarios de prueba

1. **Crear profesor**:
   - Ve a Firebase Console > Authentication
   - Agrega un usuario con email y contraseña
   - En Firestore, crea un documento en la colección `users`:
   ```json
   {
     "email": "profesor@ejemplo.com",
     "name": "Profesor Ejemplo",
     "role": "teacher",
     "createdAt": "timestamp",
     "updatedAt": "timestamp"
   }
   ```

2. **Crear estudiante**:
   - Agrega otro usuario en Authentication
   - En Firestore, crea un documento en `users`:
   ```json
   {
     "email": "estudiante@ejemplo.com",
     "name": "Estudiante Ejemplo",
     "role": "student",
     "createdAt": "timestamp",
     "updatedAt": "timestamp"
   }
   ```

## 🚀 Despliegue

### Firebase Hosting (Recomendado)

1. Instalar Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Iniciar sesión:
```bash
firebase login
```

3. Inicializar proyecto:
```bash
firebase init hosting
```

4. Compilar para producción:
```bash
npm run build
```

5. Desplegar:
```bash
firebase deploy
```

### Otros métodos
- **Netlify**: Arrastra la carpeta `public` al dashboard
- **Vercel**: Conecta tu repositorio Git
- **GitHub Pages**: Configura en Settings > Pages

## 📊 Uso del Sistema

### Para Profesores

1. **Iniciar sesión** con credenciales de profesor
2. **Dashboard principal** muestra estadísticas generales
3. **Agregar calificaciones**:
   - Click en "Agregar Calificación"
   - Seleccionar estudiante y asignatura
   - Ingresar calificación y comentario opcional
4. **Gestionar estudiantes**:
   - Ver lista completa de estudiantes
   - Agregar nuevos estudiantes
   - Editar información existente
5. **Gestionar asignaturas**:
   - Crear nuevas asignaturas
   - Configurar parámetros
6. **Ver reportes**:
   - Promedios por asignatura
   - Distribución de calificaciones
   - Estadísticas de rendimiento

### Para Estudiantes

1. **Iniciar sesión** con credenciales de estudiante
2. **Dashboard personal** muestra:
   - Calificaciones recientes
   - Promedio general
   - Progreso por asignatura
3. **Ver calificaciones**:
   - Lista completa de calificaciones
   - Filtros por asignatura y período
   - Detalles de cada calificación
4. **Análisis de progreso**:
   - Gráficos de evolución
   - Comparativas por asignatura
   - Historial académico

## 🔒 Seguridad

- Autenticación basada en roles (profesor/estudiante)
- Reglas de Firestore para control de acceso
- Validación de datos en frontend y backend
- Protección contra inyección de código

## 🎨 Personalización

### Colores
Edita `tailwind.config.js` para cambiar la paleta de colores:

```javascript
colors: {
  primary: {
    50: '#eff6ff',
    // ... más tonos
  }
}
```

### Estilos
Modifica `src/css/input.css` para agregar estilos personalizados.

## 🐛 Solución de Problemas

### Error de configuración de Firebase
- Verifica que las credenciales sean correctas
- Asegúrate de que el proyecto esté activo
- Revisa las reglas de Firestore

### Problemas de autenticación
- Verifica que Authentication esté habilitado
- Confirma que los usuarios existan en Firestore
- Revisa los roles asignados

### Errores de compilación CSS
- Ejecuta `npm run build:css` para regenerar
- Verifica que Tailwind esté instalado correctamente

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Si tienes preguntas o necesitas ayuda:
- Abre un issue en GitHub
- Contacta al desarrollador principal
- Revisa la documentación de Firebase

## 🔄 Actualizaciones

Para mantener el sistema actualizado:

1. Actualiza dependencias:
```bash
npm update
```

2. Regenera CSS:
```bash
npm run build:css
```

3. Prueba funcionalidades críticas

---

**¡Disfruta usando Spider Grades System! 🕷️📚**
