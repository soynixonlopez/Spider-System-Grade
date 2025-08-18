// Script de prueba para verificar permisos de Firebase
import { DatabaseManager } from './database.js';
import { auth } from './firebase-config.js';

async function testFirebasePermissions() {
    console.log('🧪 Probando permisos de Firebase...');
    
    // Verificar si el usuario está autenticado
    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ Usuario no autenticado. Las pruebas se ejecutarán después del login.');
        return;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    const db = new DatabaseManager();
    
    try {
        // Probar obtener estudiantes
        console.log('📚 Probando getStudents()...');
        const students = await db.getStudents();
        console.log('✅ getStudents() exitoso:', students.length, 'estudiantes');
        
        // Probar obtener asignaturas
        console.log('📖 Probando getSubjects()...');
        const subjects = await db.getSubjects();
        console.log('✅ getSubjects() exitoso:', subjects.length, 'asignaturas');
        
        // Probar obtener calificaciones
        console.log('📊 Probando getGrades()...');
        const grades = await db.getGrades();
        console.log('✅ getGrades() exitoso:', grades.length, 'calificaciones');
        
        console.log('🎉 ¡Todos los permisos funcionan correctamente!');
        
    } catch (error) {
        console.error('❌ Error en prueba de permisos:', error);
        console.log('🔧 Verifica que:');
        console.log('   1. Las reglas de Firestore estén desplegadas');
        console.log('   2. El usuario esté autenticado');
        console.log('   3. Los dominios estén autorizados en Firebase Console');
    }
}

// Función para ejecutar pruebas después del login
function runTestsAfterAuth() {
    // Esperar un poco para que Firebase se inicialice
    setTimeout(() => {
        testFirebasePermissions();
    }, 2000);
}

// Escuchar cambios en la autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('🔐 Usuario autenticado, ejecutando pruebas de permisos...');
        runTestsAfterAuth();
    } else {
        console.log('🔓 Usuario no autenticado');
    }
});

// También ejecutar al cargar la página (por si ya está autenticado)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (auth.currentUser) {
            runTestsAfterAuth();
        }
    });
} else {
    if (auth.currentUser) {
        runTestsAfterAuth();
    }
}
