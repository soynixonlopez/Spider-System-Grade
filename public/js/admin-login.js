/**
 * Admin Login Logic
 * Maneja el login especial para administradores con código de acceso personalizado
 */

import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Códigos de acceso válidos para administradores
const VALID_ADMIN_PASSCODES = [
    'SPIDER2025ADMIN',
    'ADMIN2025SPIDER',
    'SUPERATE2025',
    'MOTTA2025ADMIN',
    'SPIDERADMIN2025'
];

// Elementos del DOM
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPasscodeInput = document.getElementById('adminPasscode');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const loginText = document.getElementById('loginText');
const loadingIcon = document.getElementById('loadingIcon');

// Verificar si el usuario ya está autenticado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Verificar si es admin
        checkUserRole(user.uid);
    }
});

// Función para verificar el rol del usuario
async function checkUserRole(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin') {
                // Redirigir al dashboard de admin
                window.location.href = './dashboard-admin.html';
            } else {
                // Si no es admin, cerrar sesión
                await auth.signOut();
                showNotification('Acceso denegado. Solo administradores pueden acceder.', 'error');
            }
        }
    } catch (error) {
        console.error('Error verificando rol:', error);
        showNotification('Error verificando permisos.', 'error');
    }
}

// Función para validar código de acceso
function isValidPasscode(passcode) {
    return VALID_ADMIN_PASSCODES.includes(passcode.toUpperCase());
}

// Manejar el envío del formulario
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const passcode = adminPasscodeInput.value.trim();
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value.trim();
    
    // Validar campos
    if (!passcode || !email || !password) {
        showNotification('Por favor, completa todos los campos.', 'error');
        return;
    }
    
    // Verificar código de acceso
    if (!isValidPasscode(passcode)) {
        showNotification('Código de acceso incorrecto. Contacta al administrador del sistema.', 'error');
        adminPasscodeInput.focus();
        return;
    }
    
    // Mostrar loading
    setLoading(true);
    
    try {
        // Intentar hacer login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verificar si es admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin') {
                showNotification('¡Bienvenido, Administrador!', 'success');
                setTimeout(() => {
                    window.location.href = './dashboard-admin.html';
                }, 1500);
            } else {
                // Si no es admin, cerrar sesión
                await auth.signOut();
                showNotification('Este usuario no tiene permisos de administrador.', 'error');
            }
        } else {
            // Si el documento no existe, crear admin
            await createAdminUser(user, email, passcode);
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        
        if (error.code === 'auth/user-not-found') {
            // Usuario no existe, crear nuevo admin
            try {
                await createNewAdminUser(email, password, passcode);
            } catch (createError) {
                console.error('Error creando admin:', createError);
                handleAuthError(createError);
            }
        } else {
            handleAuthError(error);
        }
    } finally {
        setLoading(false);
    }
});

// Función para crear un nuevo usuario administrador
async function createNewAdminUser(email, password, passcode) {
    try {
        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Crear documento en Firestore
        await setDoc(doc(db, 'users', user.uid), {
            firstName: 'Administrador',
            lastName: 'Sistema',
            email: email,
            role: 'admin',
            isActive: true,
            createdAt: new Date(),
            passcodeUsed: passcode.toUpperCase(),
            adminLevel: 'full'
        });
        
        showNotification('¡Administrador creado exitosamente!', 'success');
        setTimeout(() => {
            window.location.href = './dashboard-admin.html';
        }, 1500);
        
    } catch (error) {
        throw error;
    }
}

// Función para actualizar usuario existente a admin
async function createAdminUser(user, email, passcode) {
    try {
        // Actualizar documento existente
        await setDoc(doc(db, 'users', user.uid), {
            firstName: 'Administrador',
            lastName: 'Sistema',
            email: email,
            role: 'admin',
            isActive: true,
            updatedAt: new Date(),
            passcodeUsed: passcode.toUpperCase(),
            adminLevel: 'full'
        }, { merge: true });
        
        showNotification('¡Usuario actualizado a administrador!', 'success');
        setTimeout(() => {
            window.location.href = './dashboard-admin.html';
        }, 1500);
        
    } catch (error) {
        throw error;
    }
}

// Función para manejar errores de autenticación
function handleAuthError(error) {
    let message = 'Error desconocido.';
    
    switch (error.code) {
        case 'auth/invalid-email':
            message = 'Email inválido.';
            break;
        case 'auth/user-disabled':
            message = 'Usuario deshabilitado.';
            break;
        case 'auth/user-not-found':
            message = 'Usuario no encontrado.';
            break;
        case 'auth/wrong-password':
            message = 'Contraseña incorrecta.';
            break;
        case 'auth/email-already-in-use':
            message = 'El email ya está en uso.';
            break;
        case 'auth/weak-password':
            message = 'La contraseña es muy débil.';
            break;
        case 'auth/operation-not-allowed':
            message = 'La autenticación por email/password no está habilitada.';
            break;
        case 'auth/too-many-requests':
            message = 'Demasiados intentos fallidos. Intenta más tarde.';
            break;
        default:
            message = error.message;
    }
    
    showNotification(message, 'error');
}

// Función para mostrar notificaciones (usando el sistema del index)
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Función para mostrar/ocultar loading
function setLoading(loading) {
    if (loading) {
        loginBtn.disabled = true;
        loginText.textContent = 'Verificando...';
        loadingIcon.classList.remove('hidden');
    } else {
        loginBtn.disabled = false;
        loginText.textContent = 'Acceder como Administrador';
        loadingIcon.classList.add('hidden');
    }
}

// Función para generar email automático (para crear admin)
function generateAdminEmail(firstName, lastName) {
    const normalizedFirstName = firstName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    
    const normalizedLastName = lastName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    
    return `${normalizedFirstName}.${normalizedLastName}@motta.superate.org.pa`;
}

// Función para crear admin con datos personalizados (desde consola)
window.createCustomAdmin = async function(firstName, lastName, email, password) {
    try {
        console.log('🔧 Creando administrador personalizado...');
        
        // Verificar código de acceso
        const passcode = prompt('Ingresa el código de acceso de administrador:');
        if (!isValidPasscode(passcode)) {
            console.log('❌ Código de acceso incorrecto.');
            return;
        }
        
        // Datos del administrador
        const adminData = {
            email: email || generateAdminEmail(firstName, lastName),
            password: password || 'Admin123!',
            firstName: firstName,
            lastName: lastName,
            role: 'admin'
        };
        
        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password);
        
        console.log('✅ Usuario creado en Auth:', userCredential.user.uid);
        
        // Crear documento en Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            email: adminData.email,
            role: adminData.role,
            isActive: true,
            createdAt: new Date(),
            passcodeUsed: passcode.toUpperCase(),
            adminLevel: 'full'
        });
        
        console.log('✅ Documento creado en Firestore');
        
        console.log('\n🎉 Administrador personalizado creado exitosamente!');
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Contraseña:', adminData.password);
        console.log('🆔 UID:', userCredential.user.uid);
        console.log('\n🔗 Puedes acceder al dashboard de administrador en:');
        console.log('http://localhost:5000/dashboard-admin.html');
        
        // Cerrar sesión para que puedas hacer login con el nuevo admin
        await auth.signOut();
        console.log('🚪 Sesión cerrada. Ahora puedes hacer login con el nuevo administrador.');
        
    } catch (error) {
        console.error('❌ Error creando administrador personalizado:', error);
        handleAuthError(error);
    }
};

// Función para agregar nuevo código de acceso (solo para super admins)
window.addAdminPasscode = function(newPasscode) {
    if (newPasscode && newPasscode.length >= 8) {
        VALID_ADMIN_PASSCODES.push(newPasscode.toUpperCase());
        console.log('✅ Nuevo código de acceso agregado:', newPasscode.toUpperCase());
        console.log('📋 Códigos válidos:', VALID_ADMIN_PASSCODES);
    } else {
        console.log('❌ El código debe tener al menos 8 caracteres.');
    }
};

// Mostrar información en consola
console.log('🚀 Admin Login System cargado!');
console.log('');
console.log('📋 Información del sistema:');
console.log('• Códigos de acceso válidos:', VALID_ADMIN_PASSCODES);
console.log('• URL del dashboard: http://localhost:5000/dashboard-admin.html');
console.log('');
console.log('💡 Comandos disponibles:');
console.log('• createCustomAdmin("Nombre", "Apellido", "email@ejemplo.com", "password")');
console.log('• addAdminPasscode("NUEVOCODIGO") - Agregar nuevo código de acceso');
console.log('');
