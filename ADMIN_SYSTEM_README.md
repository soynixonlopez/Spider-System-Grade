# Sistema de Administrador - Spider System

## Descripción General

Se ha implementado un nuevo sistema de administrador que permite gestionar estudiantes por promociones, asignar profesores a asignaturas y automatizar la asignación de estudiantes a asignaturas. Este sistema reemplaza el modelo anterior donde cada profesor gestionaba todos los estudiantes.

## Nuevas Funcionalidades

### 1. Dashboard de Administrador (`dashboard-admin.html`)

El administrador tiene acceso a un dashboard completo con las siguientes secciones:

#### Estadísticas Generales
- Total de estudiantes
- Total de promociones
- Total de asignaturas
- Total de profesores

#### Gestión de Promociones
- Crear nuevas promociones (ej: Prom25 AM/PM)
- Especificar año de graduación
- Eliminar promociones (con eliminación en cascada)

#### Gestión de Asignaturas
- Crear asignaturas y asignar profesores
- Seleccionar promociones para cada asignatura
- Eliminar asignaturas (con eliminación en cascada)

#### Gestión de Estudiantes
- Agregar estudiantes individuales o en masa
- Asignar estudiantes a promociones específicas
- Visualizar estudiantes por promoción

### 2. Sistema de Promociones

#### Estructura de Datos
```javascript
// Colección: promotions
{
  name: "Prom25",
  turn: "AM", // o "PM"
  graduationYear: 2025,
  createdAt: timestamp
}
```

#### Funcionalidades
- **Creación**: El administrador puede crear promociones con nombre, turno y año de graduación
- **Eliminación**: Al eliminar una promoción, se eliminan automáticamente:
  - Todos los estudiantes de esa promoción
  - Referencias a la promoción en asignaturas
  - Asignaciones estudiante-asignatura

### 3. Sistema de Asignaturas Mejorado

#### Estructura de Datos
```javascript
// Colección: subjects
{
  name: "Matemáticas",
  teacherId: "teacher_uid",
  promotions: ["promotion_id_1", "promotion_id_2"],
  createdAt: timestamp
}
```

#### Funcionalidades
- **Asignación de Profesores**: Cada asignatura tiene un profesor asignado
- **Asignación de Promociones**: Una asignatura puede estar disponible para múltiples promociones
- **Asignación Automática**: Cuando se crea una asignatura, todos los estudiantes de las promociones seleccionadas son automáticamente asignados a esa asignatura

### 4. Sistema de Estudiantes por Promoción

#### Estructura de Datos
```javascript
// Colección: users (estudiantes)
{
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan.perez2026@motta.superate.org.pa",
  promotionId: "promotion_id",
  role: "student",
  passcode: "ABC123",
  isActive: true,
  createdAt: timestamp
}

// Colección: studentSubjects
{
  studentId: "student_uid",
  subjectId: "subject_uid",
  createdAt: timestamp
}
```

#### Funcionalidades
- **Generación Automática de Emails**: Los emails se generan automáticamente en el formato `nombre.apellido2026@motta.superate.org.pa`
- **Asignación a Promociones**: Cada estudiante pertenece a una promoción específica
- **Asignación Automática de Asignaturas**: Los estudiantes son automáticamente asignados a todas las asignaturas de su promoción

### 5. Dashboard de Profesor Modificado

#### Cambios Principales
- **Filtrado por Asignaturas Asignadas**: Los profesores solo ven las asignaturas que les han sido asignadas
- **Filtrado por Estudiantes Asignados**: Los profesores solo ven los estudiantes que están en sus asignaturas
- **Compatibilidad con Sistema Anterior**: Mantiene funcionalidad del sistema de períodos académicos para transición gradual

#### Nuevas Funciones
```javascript
// Cargar asignaturas asignadas al profesor
async function loadAssignedSubjects()

// Cargar estudiantes asignados al profesor
async function loadAssignedStudents()
```

## Estructura de Archivos

### Nuevos Archivos
- `public/dashboard-admin.html` - Dashboard del administrador
- `public/js/admin-dashboard.js` - Lógica del dashboard de administrador
- `ADMIN_SYSTEM_README.md` - Esta documentación

### Archivos Modificados
- `public/js/auth.js` - Agregado soporte para rol de admin
- `public/js/teacher-dashboard.js` - Modificado para usar sistema de promociones
- `firestore.rules` - Agregadas reglas para nuevas colecciones
- `firestore.indexes.json` - Agregados índices para nuevas consultas

## Reglas de Firestore

### Nuevas Colecciones
```javascript
// Promociones - Solo administradores
match /promotions/{promotionId} {
  allow read, write, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Asignaciones estudiante-asignatura - Solo administradores
match /studentSubjects/{assignmentId} {
  allow read, write, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### Colecciones Modificadas
```javascript
// Usuarios - Agregado acceso para administradores
match /users/{userId} {
  allow read, write, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Asignaturas - Agregado acceso para administradores
match /subjects/{subjectId} {
  allow read, write, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## Índices de Firestore

### Nuevos Índices
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "promotionId", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "subjects",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "promotions", "arrayConfig": "CONTAINS" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "studentSubjects",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "studentId", "order": "ASCENDING" },
    { "fieldPath": "subjectId", "order": "ASCENDING" }
  ]
}
```

## Flujo de Trabajo del Administrador

### 1. Crear Promociones
1. Ir al dashboard de administrador
2. Hacer clic en "Nueva Promoción"
3. Ingresar nombre (ej: "Prom25"), turno (AM/PM) y año de graduación
4. Crear la promoción

### 2. Crear Asignaturas
1. Hacer clic en "Nueva Asignatura"
2. Ingresar nombre de la asignatura
3. Seleccionar profesor asignado
4. Seleccionar promociones que tendrán esta asignatura
5. Crear la asignatura (automáticamente asigna estudiantes)

### 3. Agregar Estudiantes
1. Hacer clic en "Agregar Estudiantes"
2. Seleccionar promoción
3. Elegir método (individual o en masa)
4. Ingresar datos de estudiantes
5. Los estudiantes son automáticamente asignados a todas las asignaturas de su promoción

## Flujo de Trabajo del Profesor

### 1. Acceso al Dashboard
- Los profesores solo ven las asignaturas que les han sido asignadas
- Solo ven los estudiantes que están en sus asignaturas
- Mantienen todas las funcionalidades de calificación

### 2. Gestión de Calificaciones
- Pueden calificar solo a los estudiantes de sus asignaturas
- Las calificaciones se mantienen por período académico
- Pueden ver estadísticas de sus asignaturas

## Migración del Sistema Anterior

### Compatibilidad
- El sistema mantiene compatibilidad con el sistema de períodos académicos
- Los profesores pueden seguir usando el sistema anterior mientras se migra
- Los datos existentes no se pierden

### Transición Gradual
1. **Fase 1**: Implementar sistema de administrador
2. **Fase 2**: Migrar estudiantes existentes a promociones
3. **Fase 3**: Asignar profesores a asignaturas específicas
4. **Fase 4**: Desactivar sistema anterior

## Consideraciones Técnicas

### Rendimiento
- Las consultas están optimizadas con índices apropiados
- Se usa `writeBatch` para operaciones atómicas
- Las asignaciones automáticas se realizan en lotes

### Seguridad
- Solo administradores pueden gestionar promociones y asignaciones
- Los profesores solo ven sus datos asignados
- Validación de roles en todas las operaciones

### Escalabilidad
- El sistema puede manejar múltiples promociones
- Soporte para múltiples turnos por promoción
- Estructura preparada para futuras expansiones

## Próximos Pasos

### Mejoras Planificadas
1. **Interfaz de Migración**: Herramienta para migrar datos existentes
2. **Reportes Avanzados**: Estadísticas por promoción y asignatura
3. **Notificaciones**: Sistema de notificaciones para cambios
4. **API REST**: Endpoints para integración con otros sistemas

### Optimizaciones
1. **Caché**: Implementar caché para consultas frecuentes
2. **Paginación**: Para listas grandes de estudiantes
3. **Búsqueda Avanzada**: Filtros más sofisticados

## Soporte

Para preguntas o problemas con el nuevo sistema de administrador, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última Actualización**: 2024  
**Compatibilidad**: Firebase 10.7.0+
