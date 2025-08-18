# Script de despliegue para Firebase
Write-Host "🚀 Iniciando despliegue en Firebase..." -ForegroundColor Green

# Verificar si Firebase CLI está instalado
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI detectado: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI no está instalado. Instálalo con: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Verificar si estás logueado en Firebase
try {
    $user = firebase projects:list
    if ($user -match "No projects found") {
        Write-Host "❌ No estás logueado en Firebase. Ejecuta: firebase login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Autenticado en Firebase" -ForegroundColor Green
} catch {
    Write-Host "❌ Error de autenticación. Ejecuta: firebase login" -ForegroundColor Red
    exit 1
}

# Construir el proyecto (si es necesario)
Write-Host "📦 Preparando archivos para despliegue..." -ForegroundColor Yellow

# Verificar que la carpeta public existe
if (-not (Test-Path "public")) {
    Write-Host "❌ La carpeta 'public' no existe" -ForegroundColor Red
    exit 1
}

# Desplegar en Firebase
Write-Host "🌐 Desplegando en Firebase..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
    Write-Host "🌍 Tu aplicación está disponible en: https://spider-system-grade.web.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Error en el despliegue" -ForegroundColor Red
    exit 1
}
