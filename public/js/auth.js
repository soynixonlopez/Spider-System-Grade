import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    setDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Global variables
let currentUser = null;
let userRole = null;
let isInitialized = false;

// Authentication functions
export class AuthManager {
    constructor() {
        this.setupAuthListener();
    }

    // Setup authentication state listener
    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user;
                await this.loadUserRole(user.uid);
                this.onUserAuthenticated(user);
            } else {
                currentUser = null;
                userRole = null;
                // Only redirect if we're not already on the login page
                if (isInitialized && !window.location.pathname.includes('index.html')) {
                    this.onUserSignedOut();
                }
                isInitialized = true;
            }
        });
    }

    // Load user role from Firestore
    async loadUserRole(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                userRole = userDoc.data().role;
            }
        } catch (error) {
            console.error('Error loading user role:', error);
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            showLoading(true);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw this.handleAuthError(error);
        } finally {
            showLoading(false);
        }
    }

    // Sign out
    async signOut() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    // Handle authentication errors
    handleAuthError(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No existe una cuenta con este correo electrónico.';
            case 'auth/wrong-password':
                return 'Contraseña incorrecta.';
            case 'auth/invalid-email':
                return 'Correo electrónico inválido.';
            case 'auth/too-many-requests':
                return 'Demasiados intentos fallidos. Intenta más tarde.';
            case 'auth/network-request-failed':
                return 'Error de conexión. Verifica tu internet.';
            default:
                return 'Error al iniciar sesión. Intenta de nuevo.';
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return currentUser;
    }

    // Get user role
    getUserRole() {
        return userRole;
    }

    // Check if user is teacher
    isTeacher() {
        return userRole === 'teacher';
    }

    // Check if user is student
    isStudent() {
        return userRole === 'student';
    }

    // Check if user is admin
    isAdmin() {
        return userRole === 'admin';
    }

    // Callback when user is authenticated
    onUserAuthenticated(user) {
        console.log('User authenticated:', user.email);
        
        // Redirect based on role
        if (this.isAdmin()) {
            window.location.href = './dashboard-admin.html';
        } else if (this.isTeacher()) {
            window.location.href = './dashboard-teacher.html';
        } else if (this.isStudent()) {
            window.location.href = './dashboard-student.html';
        }
    }

    // Callback when user signs out
    onUserSignedOut() {
        console.log('User signed out');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = './index.html';
        }
    }
}

// Create global auth manager instance
export const authManager = new AuthManager();

// Show/hide loading spinner
export function showLoading(show) {
    const loadingIcon = document.getElementById('loadingIcon');
    const loginText = document.getElementById('loginText');
    const loginBtn = document.getElementById('loginBtn');
    
    if (show) {
        loadingIcon.classList.remove('hidden');
        loginText.textContent = 'Iniciando sesión...';
        loginBtn.disabled = true;
    } else {
        loadingIcon.classList.add('hidden');
        loginText.textContent = 'Iniciar Sesión';
        loginBtn.disabled = false;
    }
}

// Show notification
export function showNotification(message, type = 'info') {
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
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Handle login form submission
window.handleLogin = async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value.trim();
    const password = form.password.value;
    const selectedRole = form.getAttribute('data-role') || 'teacher';
    
    if (!email || !password) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        await authManager.signIn(email, password);
        
        // Check if user role matches selected role
        const userRole = authManager.getUserRole();
        if (userRole !== selectedRole) {
            await authManager.signOut();
            showNotification(`Este usuario no tiene permisos de ${selectedRole === 'teacher' ? 'profesor' : 'estudiante'}`, 'error');
            return;
        }
        
        showNotification('Inicio de sesión exitoso', 'success');
        
    } catch (error) {
        showNotification(error, 'error');
    }
};

// Initialize login form
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', window.handleLogin);
    }
});
