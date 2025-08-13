import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// DOM Elements
const registerForm = document.getElementById('registerForm');
const roleInputs = document.querySelectorAll('input[name="role"]');
const studentFields = document.getElementById('studentFields');
const loadingSpinner = document.getElementById('loadingSpinner');

// Role selection handling
roleInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        const role = e.target.value;
        if (role === 'student') {
            studentFields.classList.remove('hidden');
            // Make turn and level required for students
            document.querySelectorAll('input[name="turn"], input[name="level"]').forEach(input => {
                input.required = true;
            });
        } else {
            studentFields.classList.add('hidden');
            // Remove required attribute for teachers
            document.querySelectorAll('input[name="turn"], input[name="level"]').forEach(input => {
                input.required = false;
            });
        }
    });
});

// Form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const userData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        email: formData.get('email').trim().toLowerCase(),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        role: formData.get('role'),
        turn: formData.get('turn'),
        level: formData.get('level')
    };

    // Validation
    if (!validateForm(userData)) {
        return;
    }

    try {
        showLoading(true);
        
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password
        );

        const user = userCredential.user;

        // Create user document in Firestore
        const userDoc = {
            uid: user.uid,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: userData.role,
            createdAt: new Date(),
            isActive: true
        };

        // Add student-specific data if applicable
        if (userData.role === 'student') {
            userDoc.turn = userData.turn;
            userDoc.level = userData.level;
        }

        await setDoc(doc(db, 'users', user.uid), userDoc);

        showNotification('Cuenta creada exitosamente', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (userData.role === 'teacher') {
                window.location.href = 'dashboard-teacher.html';
            } else {
                window.location.href = 'dashboard-student.html';
            }
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        handleRegistrationError(error);
    } finally {
        showLoading(false);
    }
});

// Form validation
function validateForm(data) {
    // Check required fields
    if (!data.firstName || !data.lastName || !data.email || !data.password || !data.confirmPassword) {
        showNotification('Por favor completa todos los campos requeridos', 'error');
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

    // Check password confirmation
    if (data.password !== data.confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return false;
    }

    // Validate student-specific fields if applicable
    if (data.role === 'student') {
        if (!data.turn) {
            showNotification('Por favor selecciona un turno', 'error');
            return false;
        }
        if (!data.level) {
            showNotification('Por favor selecciona un nivel', 'error');
            return false;
        }
    }

    return true;
}

// Error handling
function handleRegistrationError(error) {
    let message = 'Error al crear la cuenta. Inténtalo de nuevo.';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Este correo electrónico ya está registrado';
            break;
        case 'auth/invalid-email':
            message = 'Correo electrónico inválido';
            break;
        case 'auth/weak-password':
            message = 'La contraseña es demasiado débil';
            break;
        case 'auth/operation-not-allowed':
            message = 'El registro con correo y contraseña no está habilitado';
            break;
        case 'auth/network-request-failed':
            message = 'Error de conexión. Verifica tu internet';
            break;
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
// The registration process will handle redirection after successful registration
