import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const roleInputs = document.querySelectorAll('input[name="role"]');
const loadingSpinner = document.getElementById('loadingSpinner');

// Form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        email: formData.get('email').trim().toLowerCase(),
        password: formData.get('password'),
        role: formData.get('role'),
        rememberMe: formData.get('rememberMe') === 'on'
    };

    // Validation
    if (!validateForm(loginData)) {
        return;
    }

    try {
        showLoading(true);
        
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(
            auth, 
            loginData.email, 
            loginData.password
        );

        const user = userCredential.user;

        // Get user data from Firestore to verify role
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado en la base de datos');
        }

        const userData = userDoc.data();

        // Verify role matches
        if (userData.role !== loginData.role) {
            throw new Error(`Este correo está registrado como ${userData.role === 'teacher' ? 'profesor' : 'estudiante'}`);
        }

        // Set persistence based on remember me
        if (loginData.rememberMe) {
            // Firebase automatically handles persistence
            console.log('Remember me enabled');
        }

        showNotification('Inicio de sesión exitoso', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (userData.role === 'teacher') {
                window.location.href = 'dashboard-teacher.html';
            } else {
                window.location.href = 'dashboard-student.html';
            }
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(error);
    } finally {
        showLoading(false);
    }
});

// Form validation
function validateForm(data) {
    // Check required fields
    if (!data.email || !data.password) {
        showNotification('Por favor completa todos los campos', 'error');
        return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showNotification('Por favor ingresa un correo electrónico válido', 'error');
        return false;
    }

    // Validate password length
    if (data.password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return false;
    }

    return true;
}

// Error handling
function handleLoginError(error) {
    let message = 'Error al iniciar sesión. Inténtalo de nuevo.';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'No existe una cuenta con este correo electrónico';
            break;
        case 'auth/wrong-password':
            message = 'Contraseña incorrecta';
            break;
        case 'auth/invalid-email':
            message = 'Correo electrónico inválido';
            break;
        case 'auth/user-disabled':
            message = 'Esta cuenta ha sido deshabilitada';
            break;
        case 'auth/too-many-requests':
            message = 'Demasiados intentos fallidos. Inténtalo más tarde';
            break;
        case 'auth/network-request-failed':
            message = 'Error de conexión. Verifica tu internet';
            break;
        default:
            if (error.message.includes('registrado como')) {
                message = error.message;
            } else {
                message = 'Error al iniciar sesión. Verifica tus credenciales';
            }
    }
    
    showNotification(message, 'error');
}

// UI Functions
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notificationMessage');
    const iconEl = document.getElementById('notificationIcon');
    
    messageEl.textContent = message;
    
    // Set icon and colors based on type
    switch (type) {
        case 'success':
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4').classList.add('border-success-500');
            notification.querySelector('.border-l-4').classList.remove('border-danger-500', 'border-warning-500', 'border-primary-500');
            break;
        case 'error':
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4').classList.add('border-danger-500');
            notification.querySelector('.border-l-4').classList.remove('border-success-500', 'border-warning-500', 'border-primary-500');
            break;
        case 'warning':
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4').classList.add('border-warning-500');
            notification.querySelector('.border-l-4').classList.remove('border-success-500', 'border-danger-500', 'border-primary-500');
            break;
        default:
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4').classList.add('border-primary-500');
            notification.querySelector('.border-l-4').classList.remove('border-success-500', 'border-danger-500', 'border-warning-500');
    }
    
    notification.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

// Global function for hiding notification
window.hideNotification = function() {
    document.getElementById('notification').classList.add('hidden');
};

// Removed onAuthStateChanged to prevent infinite loops
// The login process will handle redirection after successful login

// Social login handlers (placeholder for future implementation)
document.querySelectorAll('.btn-outline').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Inicio de sesión social próximamente disponible', 'info');
    });
});
