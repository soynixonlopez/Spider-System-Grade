// Firebase imports
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// DOM elements
const registerForm = document.getElementById('registerForm');
const roleSelect = document.getElementById('role');
const specialtyGroup = document.getElementById('specialtyGroup');
const promotionGroup = document.getElementById('promotionGroup');
const promotionSelect = document.getElementById('promotion');
const submitText = document.getElementById('submitText');
const loadingText = document.getElementById('loadingText');

// Load promotions for students
async function loadPromotions() {
    try {
        const promotionsSnapshot = await getDocs(collection(db, 'promotions'));
        promotionSelect.innerHTML = '<option value="">Selecciona una promoción</option>';
        
        promotionsSnapshot.forEach(doc => {
            const promotion = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${promotion.name} - ${promotion.turn}`;
            promotionSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading promotions:', error);
    }
}

// Show/hide fields based on role
function toggleRoleFields() {
    const role = roleSelect.value;
    
    if (role === 'teacher') {
        specialtyGroup.style.display = 'block';
        promotionGroup.style.display = 'none';
    } else if (role === 'student') {
        specialtyGroup.style.display = 'none';
        promotionGroup.style.display = 'block';
    } else {
        specialtyGroup.style.display = 'none';
        promotionGroup.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Set loading state
function setLoading(loading) {
    if (loading) {
        submitText.classList.add('hidden');
        loadingText.classList.remove('hidden');
        registerForm.querySelector('button[type="submit"]').disabled = true;
    } else {
        submitText.classList.remove('hidden');
        loadingText.classList.add('hidden');
        registerForm.querySelector('button[type="submit"]').disabled = false;
    }
}

// Handle form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
        const formData = new FormData(registerForm);
        const firstName = formData.get('firstName').trim();
        const lastName = formData.get('lastName').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const role = formData.get('role');
        const specialty = formData.get('specialty')?.trim() || '';
        const promotionId = formData.get('promotion') || '';
        
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !role) {
            throw new Error('Todos los campos son obligatorios');
        }
        
        // Validate role-specific fields
        if (role === 'teacher' && !specialty) {
            throw new Error('La especialidad es obligatoria para profesores');
        }
        
        if (role === 'student' && !promotionId) {
            throw new Error('La promoción es obligatoria para estudiantes');
        }
        
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        const userDoc = {
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            email: email.toLowerCase(),
            role: role,
            createdAt: new Date(),
            isActive: true
        };
        
        // Add role-specific fields
        if (role === 'teacher') {
            userDoc.specialty = specialty;
        } else if (role === 'student') {
            userDoc.promotionId = promotionId;
        }
        
        // Save to Firestore
        await setDoc(doc(db, 'users', user.uid), userDoc);
        
        showNotification('Usuario creado exitosamente', 'success');
        
        // Reset form
        registerForm.reset();
        toggleRoleFields();
        
        // Check if returning from admin dashboard
        const tempTeacherData = localStorage.getItem('tempTeacherData');
        if (tempTeacherData) {
            const data = JSON.parse(tempTeacherData);
            if (data.returnTo === 'dashboard-admin.html') {
                localStorage.removeItem('tempTeacherData');
                // Redirect back to admin dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard-admin.html';
                }, 1500);
                return;
            }
        }
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            if (role === 'teacher') {
                window.location.href = 'dashboard-teacher.html';
            } else if (role === 'student') {
                window.location.href = 'dashboard-student.html';
            }
        }, 1500);
        
    } catch (error) {
        console.error('Error creating user:', error);
        
        let message = 'Error creando usuario';
        if (error.code === 'auth/email-already-in-use') {
            message = 'El email ya está en uso';
        } else if (error.code === 'auth/weak-password') {
            message = 'La contraseña es muy débil (mínimo 6 caracteres)';
        } else if (error.code === 'auth/invalid-email') {
            message = 'El email no es válido';
        } else if (error.message) {
            message = error.message;
        }
        
        showNotification(message, 'error');
    } finally {
        setLoading(false);
    }
});

// Event listeners
roleSelect.addEventListener('change', toggleRoleFields);

// Load promotions on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPromotions();
    
    // Check if there's teacher data from admin dashboard
    const tempTeacherData = localStorage.getItem('tempTeacherData');
    if (tempTeacherData) {
        const data = JSON.parse(tempTeacherData);
        if (data.returnTo === 'dashboard-admin.html') {
            // Pre-fill the form with teacher data
            document.getElementById('firstName').value = data.firstName;
            document.getElementById('lastName').value = data.lastName;
            document.getElementById('email').value = data.email;
            document.getElementById('password').value = data.password;
            document.getElementById('role').value = 'teacher';
            document.getElementById('specialty').value = data.specialty;
            
            // Show specialty field
            toggleRoleFields();
            
            // Update form title
            document.querySelector('h1').textContent = 'Crear Profesor - Spider System';
            document.querySelector('p').textContent = 'Creando nuevo profesor desde el panel de administración';
        }
    }
});
