// Script para verificar configuración de dominios de Firebase
import { auth } from './firebase-config.js';

function checkFirebaseDomainConfig() {
    console.log('🌐 Verificando configuración de dominios de Firebase...');
    
    const currentDomain = window.location.hostname;
    const currentPort = window.location.port;
    const fullDomain = currentPort ? `${currentDomain}:${currentPort}` : currentDomain;
    
    console.log('📍 Dominio actual:', fullDomain);
    console.log('🔗 URL completa:', window.location.href);
    
    // Verificar si estamos en localhost o 127.0.0.1
    const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    
    if (isLocalhost) {
        console.log('⚠️ Estás usando localhost. Asegúrate de que estos dominios estén autorizados en Firebase Console:');
        console.log('   - localhost');
        console.log('   - 127.0.0.1');
        console.log('   - localhost:5500 (si usas Live Server)');
        console.log('   - localhost:8000 (si usas el servidor Node.js)');
        console.log('');
        console.log('🔧 Para configurar:');
        console.log('   1. Ve a Firebase Console → Authentication → Settings');
        console.log('   2. En "Authorized domains", agrega los dominios listados arriba');
        console.log('   3. Guarda los cambios');
    } else {
        console.log('✅ Dominio de producción detectado');
    }
    
    // Verificar si hay errores de OAuth
    const hasOAuthError = document.querySelector('iframe[src*="apis.google.com"]');
    if (hasOAuthError) {
        console.log('⚠️ Se detectaron errores de OAuth. Esto indica problemas con dominios autorizados.');
    }
}

// Ejecutar verificación al cargar la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkFirebaseDomainConfig);
} else {
    checkFirebaseDomainConfig();
}
