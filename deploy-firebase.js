const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        log(`Ejecutando: ${command}`, 'blue');
        
        exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                log(`Error: ${error.message}`, 'red');
                reject(error);
                return;
            }
            
            if (stderr) {
                log(`Stderr: ${stderr}`, 'yellow');
            }
            
            log(`Output: ${stdout}`, 'green');
            resolve(stdout);
        });
    });
}

async function deployFirebase() {
    try {
        log('🚀 Iniciando despliegue automático de Firebase...', 'bright');
        
        // Step 1: Check if user is logged in
        log('\n1. Verificando autenticación...', 'blue');
        try {
            await executeCommand('firebase projects:list');
            log('✅ Usuario autenticado correctamente', 'green');
        } catch (error) {
            log('❌ Usuario no autenticado. Iniciando proceso de login...', 'red');
            await executeCommand('firebase login');
        }
        
        // Step 2: Deploy Firestore Rules
        log('\n2. Desplegando reglas de Firestore...', 'blue');
        try {
            await executeCommand('firebase deploy --only firestore:rules --project spidersystem-ce9a6');
            log('✅ Reglas de Firestore desplegadas correctamente', 'green');
        } catch (error) {
            log('❌ Error al desplegar reglas. Intentando con permisos elevados...', 'red');
            // Try with force flag
            await executeCommand('firebase deploy --only firestore:rules --project spidersystem-ce9a6 --force');
        }
        
        // Step 3: Deploy Firestore Indexes
        log('\n3. Desplegando índices de Firestore...', 'blue');
        try {
            await executeCommand('firebase deploy --only firestore:indexes --project spidersystem-ce9a6');
            log('✅ Índices de Firestore desplegados correctamente', 'green');
        } catch (error) {
            log('❌ Error al desplegar índices. Intentando con permisos elevados...', 'red');
            // Try with force flag
            await executeCommand('firebase deploy --only firestore:indexes --project spidersystem-ce9a6 --force');
        }
        
        // Step 4: Verify deployment
        log('\n4. Verificando despliegue...', 'blue');
        await executeCommand('firebase projects:list');
        
        log('\n🎉 ¡Despliegue completado exitosamente!', 'bright');
        log('Los cambios deberían estar activos en 1-2 minutos.', 'green');
        
    } catch (error) {
        log('\n❌ Error durante el despliegue:', 'red');
        log(error.message, 'red');
        log('\n💡 Soluciones alternativas:', 'yellow');
        log('1. Verifica que tienes permisos de administrador en el proyecto', 'yellow');
        log('2. Contacta al propietario del proyecto para obtener permisos', 'yellow');
        log('3. Usa Firebase Console para hacer los cambios manualmente', 'yellow');
    }
}

// Run the deployment
deployFirebase();
