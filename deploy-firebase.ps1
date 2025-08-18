# Script de despliegue automático de Firebase para Windows
# Ejecutar como: .\deploy-firebase.ps1

Write-Host "🚀 Iniciando despliegue automático de Firebase..." -ForegroundColor Cyan

# Función para escribir mensajes con colores
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Función para ejecutar comandos
function Execute-Command {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-ColorOutput "`n$Description" "Blue"
    Write-ColorOutput "Ejecutando: $Command" "Gray"
    
    try {
        $result = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Comando ejecutado exitosamente" "Green"
            Write-ColorOutput $result "Green"
            return $true
        } else {
            Write-ColorOutput "❌ Error en el comando" "Red"
            Write-ColorOutput $result "Red"
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Excepción: $($_.Exception.Message)" "Red"
        return $false
    }
}

# Paso 1: Verificar autenticación
Write-ColorOutput "`n1. Verificando autenticación de Firebase..." "Blue"
$authResult = Execute-Command "firebase projects:list" "Verificando proyectos disponibles"

if (-not $authResult) {
    Write-ColorOutput "`n❌ Usuario no autenticado. Iniciando proceso de login..." "Red"
    $loginResult = Execute-Command "firebase login" "Iniciando sesión en Firebase"
    
    if (-not $loginResult) {
        Write-ColorOutput "`n❌ No se pudo autenticar. Saliendo..." "Red"
        exit 1
    }
}

# Paso 2: Desplegar reglas de Firestore
Write-ColorOutput "`n2. Desplegando reglas de Firestore..." "Blue"
$rulesResult = Execute-Command "firebase deploy --only firestore:rules --project spidersystem-ce9a6" "Desplegando reglas de seguridad"

if (-not $rulesResult) {
    Write-ColorOutput "`n⚠️  Error al desplegar reglas. Intentando con flag --force..." "Yellow"
    $rulesResult = Execute-Command "firebase deploy --only firestore:rules --project spidersystem-ce9a6 --force" "Desplegando reglas con force"
}

# Paso 3: Desplegar índices de Firestore
Write-ColorOutput "`n3. Desplegando índices de Firestore..." "Blue"
$indexesResult = Execute-Command "firebase deploy --only firestore:indexes --project spidersystem-ce9a6" "Desplegando índices"

if (-not $indexesResult) {
    Write-ColorOutput "`n⚠️  Error al desplegar índices. Intentando con flag --force..." "Yellow"
    $indexesResult = Execute-Command "firebase deploy --only firestore:indexes --project spidersystem-ce9a6 --force" "Desplegando índices con force"
}

# Paso 4: Verificar despliegue
Write-ColorOutput "`n4. Verificando despliegue..." "Blue"
Execute-Command "firebase projects:list" "Listando proyectos para verificación"

# Resumen final
if ($rulesResult -and $indexesResult) {
    Write-ColorOutput "`n🎉 ¡Despliegue completado exitosamente!" "Green"
    Write-ColorOutput "Los cambios deberían estar activos en 1-2 minutos." "Green"
    Write-ColorOutput "`n📋 Próximos pasos:" "Cyan"
    Write-ColorOutput "1. Espera 1-2 minutos para que los índices se construyan" "White"
    Write-ColorOutput "2. Actualiza tu dashboard" "White"
    Write-ColorOutput "3. Prueba agregar un período académico" "White"
    Write-ColorOutput "4. Verifica que las asignaturas y calificaciones se cargan correctamente" "White"
} else {
    Write-ColorOutput "`n❌ El despliegue no se completó completamente" "Red"
    Write-ColorOutput "`n💡 Soluciones alternativas:" "Yellow"
    Write-ColorOutput "1. Verifica que tienes permisos de administrador en el proyecto" "Yellow"
    Write-ColorOutput "2. Contacta al propietario del proyecto para obtener permisos" "Yellow"
    Write-ColorOutput "3. Usa Firebase Console para hacer los cambios manualmente" "Yellow"
    Write-ColorOutput "`n🔗 Firebase Console: https://console.firebase.google.com/project/spidersystem-ce9a6" "Cyan"
}

Write-ColorOutput "`nPresiona cualquier tecla para continuar..." "Gray"
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
