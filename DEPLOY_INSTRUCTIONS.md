# 🚀 Instrucciones de Despliegue - Spider System

## 📋 Requisitos Previos

1. **Node.js** instalado (versión 14 o superior)
2. **Firebase CLI** instalado globalmente
3. **Cuenta de Firebase** configurada

## 🔧 Configuración Inicial

### 1. Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Autenticarse en Firebase
```bash
firebase login
```

### 3. Inicializar el proyecto (si no está hecho)
```bash
firebase init hosting
```

## 🌐 Despliegue en Firebase

### Opción 1: Script Automático (Recomendado)
```powershell
# En PowerShell
.\deploy-firebase.ps1
```

### Opción 2: Comando Manual
```bash
firebase deploy --only hosting
```

## 🏠 Desarrollo Local

### Opción 1: Live Server (VS Code)
1. Instala la extensión "Live Server" en VS Code
2. Click derecho en `public/index.html`
3. Selecciona "Open with Live Server"
4. La aplicación se abrirá en `http://127.0.0.1:5500`

### Opción 2: Servidor Node.js
```bash
node server.js
```
Luego abre `http://localhost:8000`

### Opción 3: Servidor Python
```bash
python -m http.server 8000
```
Luego abre `http://localhost:8000`

## 🔧 Solución de Problemas

### Error de MIME Type en Live Server
Si ves este error:
```
Refused to apply style from '...' because its MIME type ('text/html') is not a supported stylesheet MIME type
```

**Soluciones:**
1. **Usar el servidor Node.js**: `node server.js`
2. **Configurar Live Server**: El archivo `.liveserverrc` ya está configurado
3. **Usar Firebase Hosting local**: `firebase serve`

### Firebase Hosting Local
```bash
firebase serve
```
Esto simula exactamente el entorno de producción.

## 📁 Estructura del Proyecto

```
Spider-System-Grade/
├── public/                 # Archivos para el hosting
│   ├── index.html         # Página principal
│   ├── dashboard-admin.html
│   ├── dashboard-teacher.html
│   ├── dashboard-student.html
│   ├── css/               # Estilos
│   ├── js/                # JavaScript
│   └── components/        # Componentes
├── firebase.json          # Configuración de Firebase
├── server.js             # Servidor Node.js local
└── deploy-firebase.ps1   # Script de despliegue
```

## 🌍 URLs de Producción

- **Aplicación principal**: https://spider-system-grade.web.app
- **Dashboard Admin**: https://spider-system-grade.web.app/dashboard-admin.html
- **Dashboard Profesor**: https://spider-system-grade.web.app/dashboard-teacher.html
- **Dashboard Estudiante**: https://spider-system-grade.web.app/dashboard-student.html

## 🔄 Flujo de Trabajo Recomendado

1. **Desarrollo**: Usa Live Server o `node server.js`
2. **Pruebas**: Usa `firebase serve` para simular producción
3. **Despliegue**: Usa `.\deploy-firebase.ps1`

## ⚠️ Notas Importantes

- **Firebase Hosting** maneja automáticamente los MIME types correctos
- **Live Server** puede tener problemas con MIME types en algunos casos
- **El servidor Node.js** es la opción más confiable para desarrollo local
- **Siempre prueba en `firebase serve`** antes de desplegar

## 🆘 Soporte

Si tienes problemas:
1. Verifica que Firebase CLI esté instalado: `firebase --version`
2. Verifica que estés autenticado: `firebase projects:list`
3. Usa `firebase serve` para probar localmente
4. Revisa los logs de Firebase Console
