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
                this.onUserSignedOut();
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

    // Callback when user is authenticated
    onUserAuthenticated(user) {
        console.log('User authenticated:', user.email);
        
        // Redirect based on role
        if (this.isTeacher()) {
            window.location.href = './dashboard-teacher.html';
        } else if (this.isStudent()) {
            window.location.href = './dashboard-student.html';
        }
    }

    // Callback when user signs out
    onUserSignedOut() {
        console.log('User signed out');
        window.location.href = './index.html';
    }
}

// Create global auth manager instance
export const authManager = new AuthManager();

// Global functions for HTML
window.showLoginModal = function(userType) {
    const modal = document.getElementById('loginModal');
    const title = document.getElementById('modalTitle');
    
    if (userType === 'teacher') {
        title.textContent = 'Acceso Profesores';
    } else {
        title.textContent = 'Acceso Estudiantes';
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.hideLoginModal = function() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Clear form
    document.getElementById('loginForm').reset();
};

// Show/hide loading spinner
export function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

// Show notification
export function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === 'success' ? 'bg-success-500 text-white' :
        type === 'error' ? 'bg-danger-500 text-white' :
        'bg-primary-500 text-white'
    }`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
