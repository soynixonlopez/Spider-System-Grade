# 🚀 Instrucciones de Despliegue Automático de Firebase

## Problema
Los errores de Firebase que estás experimentando son:
1. **Error de Índices**: `The query requires an index`
2. **Error de Permisos**: `Missing or insufficient permissions`

## Solución Automática

### Opción 1: Script Automático (Recomendado)

#### Para Windows:
1. **Haz doble clic** en el archivo `deploy-firebase.bat`
2. El script se ejecutará automáticamente
3. Sigue las instrucciones en pantalla

#### Para macOS/Linux:
```bash
node deploy-firebase.js
```

### Opción 2: Comandos Manuales

Si prefieres ejecutar los comandos manualmente:

```bash
# 1. Verificar autenticación
firebase projects:list

# 2. Si no estás autenticado, hacer login
firebase login

# 3. Desplegar reglas de seguridad
firebase deploy --only firestore:rules --project spidersystem-ce9a6

# 4. Desplegar índices
firebase deploy --only firestore:indexes --project spidersystem-ce9a6
```

## Requisitos Previos

### 1. Firebase CLI Instalado
```bash
npm install -g firebase-tools
```

### 2. Permisos de Administrador
- Debes ser **propietario** o **administrador** del proyecto Firebase
- Si no tienes permisos, contacta al propietario del proyecto

### 3. Cuenta de Google
- Debes estar logueado con la cuenta que tiene acceso al proyecto

## Verificación de Permisos

### Verificar si tienes permisos:
1. Ve a [Firebase Console](https://console.firebase.google.com/project/spidersystem-ce9a6)
2. En el menú lateral, haz clic en **"Project settings"**
3. Ve a la pestaña **"Users and permissions"**
4. Verifica que tu cuenta tenga rol de **"Owner"** o **"Editor"**

### Si no tienes permisos:
1. Contacta al propietario del proyecto
2. Pídele que te dé permisos de **"Editor"** o **"Owner"**
3. O pídele que ejecute estos comandos por ti

## Solución Manual (Si los scripts fallan)

### 1. Actualizar Reglas de Seguridad
1. Ve a [Firebase Console](https://console.firebase.google.com/project/spidersystem-ce9a6)
2. **Firestore Database** → **Rules**
3. Reemplaza el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Teachers can read, write, and delete all users (to manage students)
      allow read, write, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    // Teachers can manage subjects
    match /subjects/{subjectId} {
      allow read, write, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    // Teachers can manage grades, students can read their own grades
    match /grades/{gradeId} {
      allow read, write, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' &&
        resource.data.studentId == request.auth.uid;
    }
    
    // Teachers can manage academic periods
    match /academicPeriods/{periodId} {
      allow read, write, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

4. Haz clic en **"Publish"**

### 2. Crear Índices Manualmente
1. **Firestore Database** → **Indexes**
2. Haz clic en **"Add Index"**

**Índice 1:**
- Collection ID: `subjects`
- Fields:
  - `teacherId` → Ascending
  - `academicYear` → Ascending
  - `semester` → Ascending
  - `name` → Ascending

**Índice 2:**
- Collection ID: `grades`
- Fields:
  - `teacherId` → Ascending
  - `academicYear` → Ascending
  - `semester` → Ascending

## Verificación del Despliegue

### Después del despliegue:
1. **Espera 1-2 minutos** para que los índices se construyan
2. **Actualiza tu dashboard**
3. **Prueba las funciones**:
   - Agregar un período académico
   - Cargar asignaturas
   - Cargar calificaciones

### Si sigues teniendo errores:
1. Verifica que los índices estén en estado **"Enabled"** (no "Building")
2. Revisa la consola del navegador para errores específicos
3. Contacta al administrador del proyecto

## Archivos Creados

- `deploy-firebase.js` - Script de Node.js
- `deploy-firebase.ps1` - Script de PowerShell
- `deploy-firebase.bat` - Archivo batch para Windows
- `DEPLOY_INSTRUCTIONS.md` - Este archivo de instrucciones

## Soporte

Si tienes problemas:
1. Revisa los mensajes de error en la consola
2. Verifica que tienes permisos de administrador
3. Contacta al propietario del proyecto Firebase
