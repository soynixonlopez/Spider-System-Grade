/**
 * Teacher Dashboard JavaScript
 * 
 * Enhanced version with improved error handling, performance optimizations,
 * and better user experience for managing students, subjects, and grades.
 * 
 * Key Features:
 * - Comprehensive email validation and orphaned account detection
 * - Advanced Firebase Auth error handling
 * - Performance optimizations with debounced search
 * - Real-time UI updates without page reload
 * - Enhanced bulk student creation
 * - Improved modal management and session handling
 * 
 * Version: 2.0.0
 * Last Updated: 2024
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, limit, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Global variables
let currentTeacher = null;
let students = [];
let subjects = [];
let grades = [];
let currentStep = 1;
let selectedStudents = [];
let gradeConfiguration = {
    type: 'simple',
    categories: []
};

// Academic Period Management (Legacy - will be phased out)
let academicPeriods = [];
let currentAcademicYear = null;
let currentSemester = null;

// New Promotion-based system
let assignedSubjects = [];
let assignedStudents = [];

// Academic Period Management Functions (Legacy)
async function loadAcademicPeriods() {
    try {
        const periodsQuery = query(
            collection(db, 'academicPeriods'),
            where('teacherId', '==', currentTeacher.uid)
        );
        
        const snapshot = await getDocs(periodsQuery);
        academicPeriods = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        // Sort periods by year and semester after loading
        academicPeriods.sort((a, b) => {
            if (a.academicYear !== b.academicYear) {
                return b.academicYear - a.academicYear; // Descending by year
            }
            return b.semester - a.semester; // Descending by semester
        });
        
        console.log('Academic periods loaded:', academicPeriods.length);
        updateAcademicYearSelect();
        updatePeriodsList();
    } catch (error) {
        console.error('Error loading academic periods:', error);
        showNotification('Error al cargar los períodos académicos', 'error');
        academicPeriods = [];
    }
}

// New Promotion-based Functions
async function loadAssignedSubjects() {
    try {
        // Get subjects assigned to this teacher
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('teacherId', '==', currentTeacher.uid)
        );
        
        const snapshot = await getDocs(subjectsQuery);
        assignedSubjects = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        console.log('Assigned subjects loaded:', assignedSubjects.length);
        updateSubjectsTable();
    } catch (error) {
        console.error('Error loading assigned subjects:', error);
        showNotification('Error al cargar las asignaturas asignadas', 'error');
        assignedSubjects = [];
    }
}

async function loadAssignedStudents() {
    try {
        // Get all subjects assigned to this teacher
        const subjectIds = assignedSubjects.map(subject => subject.id);
        
        if (subjectIds.length === 0) {
            assignedStudents = [];
            updateStudentsTable();
            return;
        }
        
        // Get all student-subject assignments for this teacher's subjects
        const studentSubjectsQuery = query(
            collection(db, 'studentSubjects'),
            where('subjectId', 'in', subjectIds)
        );
        
        const studentSubjectsSnapshot = await getDocs(studentSubjectsQuery);
        const studentIds = [...new Set(studentSubjectsSnapshot.docs.map(doc => doc.data().studentId))];
        
        if (studentIds.length === 0) {
            assignedStudents = [];
            updateStudentsTable();
            return;
        }
        
        // Get student details
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('__name__', 'in', studentIds)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        assignedStudents = studentsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        // Sort students by firstName
        assignedStudents.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        console.log('Assigned students loaded:', assignedStudents.length);
        updateStudentsTable();
        updateStudentFilters();
    } catch (error) {
        console.error('Error loading assigned students:', error);
        showNotification('Error al cargar los estudiantes asignados', 'error');
        assignedStudents = [];
    }
}

function updateAcademicYearSelect() {
    const yearSelect = document.getElementById('academicYearSelect');
    if (!yearSelect) return;
    
    // Get unique years from periods
    const years = [...new Set(academicPeriods.map(p => p.academicYear))].sort((a, b) => b - a);
    
    yearSelect.innerHTML = '<option value="">Año</option>';
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });
    
    // Set current selection if available
    if (currentAcademicYear) {
        yearSelect.value = currentAcademicYear;
    }
}

function updatePeriodsList() {
    const periodsList = document.getElementById('periodsList');
    if (!periodsList) return;
    
    if (academicPeriods.length === 0) {
        periodsList.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>No hay períodos configurados</p>
            </div>
        `;
        return;
    }
    
    periodsList.innerHTML = academicPeriods.map(period => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <div>
                    <p class="font-medium text-gray-900">
                        ${period.name || `Año ${period.academicYear} - ${period.semester === '1' ? '1er' : '2do'} Semestre`}
                    </p>
                    <p class="text-sm text-gray-600">
                        ${period.academicYear} - Semestre ${period.semester}
                    </p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="setCurrentPeriod('${period.academicYear}', '${period.semester}')" class="text-primary-600 hover:text-primary-900 text-sm">
                    Seleccionar
                </button>
                <button onclick="deleteAcademicPeriod('${period.id}')" class="text-danger-600 hover:text-danger-900">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function setCurrentPeriod(academicYear, semester) {
    currentAcademicYear = academicYear;
    currentSemester = semester;
    
    // Update selectors
    const yearSelect = document.getElementById('academicYearSelect');
    const semesterSelect = document.getElementById('semesterSelect');
    const periodDisplay = document.getElementById('currentPeriodDisplay');
    
    if (yearSelect) yearSelect.value = academicYear;
    if (semesterSelect) semesterSelect.value = semester;
    
    if (periodDisplay) {
        const period = academicPeriods.find(p => p.academicYear == academicYear && p.semester == semester);
        const periodName = period?.name || `Año ${academicYear} - ${semester === '1' ? '1er' : '2do'} Semestre`;
        periodDisplay.textContent = periodName;
    }
    
    // Save to localStorage
    localStorage.setItem('currentAcademicYear', academicYear);
    localStorage.setItem('currentSemester', semester);
    
    // Reload data with new period
    loadDashboardData();
    
    showNotification(`Período cambiado a: ${periodDisplay?.textContent || `${academicYear} - Semestre ${semester}`}`, 'success');
}

function showManagePeriodsModal() {
    const modal = document.getElementById('managePeriodsModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideManagePeriodsModal() {
    const modal = document.getElementById('managePeriodsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function addAcademicPeriod(formData) {
    try {
        const periodData = {
            academicYear: parseInt(formData.get('academicYear')),
            semester: formData.get('semester'),
            name: formData.get('name')?.trim() || null,
            teacherId: currentTeacher.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // Check if period already exists
        const existingPeriod = academicPeriods.find(p => 
            p.academicYear === periodData.academicYear && 
            p.semester === periodData.semester
        );
        
        if (existingPeriod) {
            showNotification('Este período ya existe', 'error');
            return;
        }
        
        await addDoc(collection(db, 'academicPeriods'), periodData);
        showNotification('Período académico agregado exitosamente', 'success');
        
        await loadAcademicPeriods();
        
        // Set as current period if it's the first one
        if (academicPeriods.length === 0) {
            setCurrentPeriod(periodData.academicYear, periodData.semester);
        }
        
    } catch (error) {
        console.error('Error adding academic period:', error);
        showNotification('Error al agregar el período académico', 'error');
    }
}

async function deleteAcademicPeriod(periodId) {
    const period = academicPeriods.find(p => p.id === periodId);
    if (!period) {
        showNotification('Período no encontrado', 'error');
        return;
    }
    
    const confirmed = confirm(`¿Estás seguro de que quieres eliminar el período "${period.name || `Año ${period.academicYear} - Semestre ${period.semester}`}"?\n\nEsta acción eliminará todas las calificaciones y asignaturas asociadas a este período.`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Delete all grades for this period
        const gradesQuery = query(
            collection(db, 'grades'),
            where('teacherId', '==', currentTeacher.uid),
            where('academicYear', '==', period.academicYear),
            where('semester', '==', period.semester)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        
        const batch = writeBatch(db);
        gradesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete all subjects for this period
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('teacherId', '==', currentTeacher.uid),
            where('academicYear', '==', period.academicYear),
            where('semester', '==', period.semester)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        
        subjectsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete the period itself
        batch.delete(doc(db, 'academicPeriods', periodId));
        
        await batch.commit();
        
        showNotification('Período académico eliminado exitosamente', 'success');
        
        // If this was the current period, clear it
        if (currentAcademicYear == period.academicYear && currentSemester == period.semester) {
            currentAcademicYear = null;
            currentSemester = null;
            localStorage.removeItem('currentAcademicYear');
            localStorage.removeItem('currentSemester');
        }
        
        await loadAcademicPeriods();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error deleting academic period:', error);
        showNotification('Error al eliminar el período académico', 'error');
    } finally {
        showLoading(false);
    }
}

// UI Functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm animate-slide-up`;
    
    // Set border color based on type
    switch (type) {
        case 'success':
            notification.classList.add('border-success-500');
            break;
        case 'error':
            notification.classList.add('border-danger-500');
            break;
        case 'warning':
            notification.classList.add('border-warning-500');
            break;
        default:
            notification.classList.add('border-primary-500');
    }
    
    // Set icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';
            break;
        case 'error':
            icon = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>';
            break;
        case 'warning':
            icon = '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>';
            break;
        default:
            icon = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>';
    }
    
    // Handle multiline messages
    const messageLines = message.split('\n');
    const messageHTML = messageLines.map(line => `<p class="text-sm font-medium text-gray-900">${line}</p>`).join('');
    
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}-600" fill="currentColor" viewBox="0 0 20 20">
                    ${icon}
                </svg>
            </div>
            <div class="ml-3 flex-1">
                <div class="space-y-1">
                    ${messageHTML}
                </div>
            </div>
            <div class="ml-auto pl-3">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds for multiline messages, 5 seconds for single line
    const autoRemoveTime = messageLines.length > 1 ? 8000 : 5000;
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, autoRemoveTime);
}

// Generate a random passcode
function generatePasscode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Function to normalize text (remove accents and special characters)
function normalizeText(text) {
    if (!text) return '';
    
    // Convert to lowercase
    let normalized = text.toLowerCase();
    
    // Remove accents and special characters
    normalized = normalized
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]/g, '') // Keep only letters and numbers
        .trim();
    
    return normalized;
}

// Function to generate email automatically
function generateEmail(firstName, lastName) {
    if (!firstName || !lastName) return '';
    
    const normalizedFirstName = normalizeText(firstName);
    const normalizedLastName = normalizeText(lastName);
    
    if (!normalizedFirstName || !normalizedLastName) return '';
    
    return `${normalizedFirstName}.${normalizedLastName}2026@motta.superate.org.pa`;
}

// Function to update email field when name or lastname changes
function updateEmailField(nameInput, lastNameInput, emailInput) {
    const firstName = nameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    
    if (firstName && lastName) {
        const generatedEmail = generateEmail(firstName, lastName);
        emailInput.value = generatedEmail;
    }
}

// Check if email already exists in Firestore
async function checkEmailExists(email) {
    try {
        const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email.toLowerCase())
        );
        const snapshot = await getDocs(usersQuery);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking email existence:', error);
        return false; // Assume it doesn't exist if we can't check
    }
}

// Comprehensive email debugging function
async function debugEmailStatus(email) {
    console.log(`🔍 Debugging email: ${email}`);
    
    try {
        // Check Firestore
        const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email.toLowerCase())
        );
        const snapshot = await getDocs(usersQuery);
        
        console.log(`📊 Firestore check for ${email}:`);
        console.log(`   - Query returned ${snapshot.size} documents`);
        
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                console.log(`   - Found document ID: ${doc.id}`);
                console.log(`   - Document data:`, doc.data());
            });
        } else {
            console.log(`   - No documents found in Firestore`);
        }
        
        // Check if email exists in current students array
        const localStudent = students.find(s => s.email.toLowerCase() === email.toLowerCase());
        console.log(`📋 Local students array check:`);
        if (localStudent) {
            console.log(`   - Found in local array:`, localStudent);
        } else {
            console.log(`   - Not found in local array`);
        }
        
        // Try to get user by email from Firebase Auth (this will fail if user doesn't exist)
        try {
            // Note: Firebase Auth doesn't have a direct "get user by email" method
            // But we can try to sign in with a dummy password to see if the account exists
            console.log(`🔐 Firebase Auth check:`);
            console.log(`   - Note: Firebase Auth doesn't allow direct email lookup`);
            console.log(`   - The 'auth/email-already-in-use' error comes from createUserWithEmailAndPassword`);
            
        } catch (authError) {
            console.log(`   - Firebase Auth error:`, authError);
        }
        
        return {
            firestoreExists: !snapshot.empty,
            localExists: !!localStudent,
            firestoreDocs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
            localStudent: localStudent
        };
        
    } catch (error) {
        console.error('Error in debugEmailStatus:', error);
        return {
            error: error.message,
            firestoreExists: false,
            localExists: false
        };
    }
}

// Enhanced email checking function
async function checkEmailExistsEnhanced(email) {
    console.log(`🔍 Enhanced email check for: ${email}`);
    
    const debugInfo = await debugEmailStatus(email);
    
    if (debugInfo.firestoreExists) {
        console.log(`❌ Email ${email} exists in Firestore`);
        return true;
    }
    
    if (debugInfo.localExists) {
        console.log(`❌ Email ${email} exists in local array but not in Firestore`);
        console.log(`⚠️ This indicates a data inconsistency!`);
        return true;
    }
    
    console.log(`✅ Email ${email} is available`);
    return false;
}

// Function to handle orphaned Firebase Auth accounts
async function handleOrphanedAuthAccount(email) {
    console.log(`🔧 Checking for orphaned Auth account: ${email}`);
    
    // Since we can't directly check Firebase Auth from client-side,
    // we'll provide a more user-friendly approach
    const message = `
⚠️ Posible cuenta huérfana detectada

El email ${email} podría existir en Firebase Auth pero no en Firestore.
Esto puede suceder si:
- La cuenta se creó pero el documento de Firestore no se guardó
- El documento de Firestore fue eliminado manualmente
- Hubo un error durante la creación inicial

Para resolver esto:
1. Ve a Firebase Console > Authentication > Users
2. Busca el email: ${email}
3. Si existe, elimina la cuenta de Firebase Auth
4. Intenta crear el estudiante nuevamente

O contacta al administrador del sistema para que limpie la cuenta huérfana.
    `;
    
    showNotification(message, 'warning');
    return true; // Indicate that this is a potential orphaned account
}

// Improved email checking that handles orphaned accounts
async function checkEmailExistsWithOrphanedHandling(email) {
    console.log(`🔍 Checking email with orphaned handling: ${email}`);
    
    const debugInfo = await debugEmailStatus(email);
    
    if (debugInfo.firestoreExists) {
        console.log(`❌ Email ${email} exists in Firestore`);
        return { exists: true, reason: 'firestore' };
    }
    
    if (debugInfo.localExists) {
        console.log(`❌ Email ${email} exists in local array but not in Firestore`);
        console.log(`⚠️ This indicates a data inconsistency!`);
        return { exists: true, reason: 'local' };
    }
    
    // If not found in Firestore or local array, we'll assume it's available
    // The orphaned account check will only happen if Firebase Auth throws an error
    console.log(`✅ Email ${email} appears to be available`);
    return { exists: false, reason: 'available' };
}

// Check if user has permissions to modify students
async function checkStudentPermissions() {
    try {
        // Try to read a student document to test permissions
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            limit(1)
        );
        await getDocs(studentsQuery);
        return true;
    } catch (error) {
        console.error('Permission check failed:', error);
        if (error.code === 'permission-denied') {
            showNotification('❌ Error de permisos: No tienes permisos para modificar estudiantes. Contacta al administrador.', 'error');
        }
        return false;
    }
}

// Validate student data before creation
function validateStudentData(studentData) {
    const errors = [];
    
    if (!studentData.firstName?.trim()) {
        errors.push('El nombre es requerido');
    }
    
    if (!studentData.lastName?.trim()) {
        errors.push('El apellido es requerido');
    }
    
    if (!studentData.email?.trim()) {
        errors.push('El email es requerido');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.email)) {
            errors.push('El formato del email no es válido');
        }
    }
    
    if (!studentData.level) {
        errors.push('El nivel es requerido');
    }
    
    if (!studentData.turn) {
        errors.push('El turno es requerido');
    }
    
    return errors;
}

// Global variable to track if we're in the middle of bulk student creation
let isCreatingBulkStudents = false;

// Global variable to track if we're in the middle of creating individual students
let isCreatingStudent = false;

// Initialize teacher dashboard
async function initializeTeacherDashboard() {
    // Store current page to prevent unnecessary redirects
    const currentPage = window.location.href;
    
    onAuthStateChanged(auth, async (user) => {
        // Skip auth state changes during bulk student creation or individual student creation
        if (isCreatingBulkStudents || isCreatingStudent) {
            console.log('⏸️ Skipping auth state change during student creation');
            return;
        }
        
        if (!user) {
            // Only redirect to login if not already on the login page
            if (!window.location.href.includes('index.html') && !window.location.href.includes('login.html')) {
                window.location.href = 'index.html';
            }
            return;
        }

        try {
            // Get teacher data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'teacher') {
                // Only redirect to login if not already on the login page
                if (!window.location.href.includes('index.html') && !window.location.href.includes('login.html')) {
                    window.location.href = 'index.html';
                }
                return;
            }

            currentTeacher = { ...user, ...userDoc.data() };
            
            // Update UI
            const teacherNameElement = document.getElementById('teacherName');
            if (teacherNameElement) {
                teacherNameElement.textContent = `${currentTeacher.firstName} ${currentTeacher.lastName}`;
            }
            
            // Load data
            await loadDashboardData();
            
            // Ensure we stay on the dashboard page
            if (window.location.href.includes('dashboard-teacher.html')) {
                // We're already on the right page, no need to redirect
                console.log('✅ User authenticated and on dashboard page');
            }
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            showNotification('Error al cargar el dashboard', 'error');
            
            // Don't redirect on error, let the user stay on the page
            // They can try refreshing or the error might be temporary
        }
    });
}

// Test connection and permissions
async function testConnection() {
    try {
        console.log('Testing connection and permissions...');
        
        // Test basic connection by trying to read the current user's document
        const userDoc = await getDoc(doc(db, 'users', currentTeacher.uid));
        if (userDoc.exists()) {
            console.log('✅ Connection successful, user document exists');
            return true;
        } else {
            console.log('❌ User document does not exist');
            return false;
        }
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        showNotification('Error de conexión: ' + error.message, 'error');
        return false;
    }
}

// Load all dashboard data
async function loadDashboardData() {
    showLoading(true);
    try {
        // First test connection
        const connectionOk = await testConnection();
        if (!connectionOk) {
            showLoading(false);
            return;
        }
        
        // Load assigned subjects and students (new promotion-based system)
        await loadAssignedSubjects();
        await loadAssignedStudents();
        
        // Also load legacy academic periods for backward compatibility
        await loadAcademicPeriods();
        
        // Load current period from localStorage if not set
        if (!currentAcademicYear || !currentSemester) {
            const savedYear = localStorage.getItem('currentAcademicYear');
            const savedSemester = localStorage.getItem('currentSemester');
            
            if (savedYear && savedSemester) {
                setCurrentPeriod(savedYear, savedSemester);
            } else if (academicPeriods.length > 0) {
                // Set the most recent period as current
                const mostRecent = academicPeriods[0];
                setCurrentPeriod(mostRecent.academicYear, mostRecent.semester);
            } else {
                // No periods configured, show warning
                showNotification('No hay períodos académicos configurados. Por favor, crea un período académico para comenzar.', 'warning');
            }
        }
        
        // Load grades for assigned subjects
        await loadGrades();
        await updateStatistics();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error al cargar los datos', 'error');
    } finally {
        showLoading(false);
    }
}

// Load students from Firestore
async function loadStudents() {
    try {
        console.log('Loading students...');
        
        let studentsQuery;
        
        if (currentAcademicYear && currentSemester) {
            // Filter students by academic year and semester
            studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                where('academicYear', '==', currentAcademicYear),
                where('semester', '==', currentSemester)
            );
        } else {
            // Load all students for the teacher (fallback)
            studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'student')
            );
        }
        
        const snapshot = await getDocs(studentsQuery);
        students = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        // Sort students by firstName after loading
        students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        console.log(`Students loaded for period ${currentAcademicYear}-${currentSemester}:`, students.length);
        updateStudentsTable();
        updateStudentFilters();
    } catch (error) {
        console.error('Error loading students:', error);
        
        // Show specific error message based on error type
        if (error.code === 'permission-denied') {
            showNotification('Error de permisos: No tienes permisos para ver los estudiantes. Contacta al administrador.', 'error');
        } else if (error.code === 'unavailable') {
            showNotification('Error de conexión: No se pudo conectar con la base de datos.', 'error');
        } else {
            showNotification('Error al cargar los estudiantes: ' + error.message, 'error');
        }
        
        // Set empty array to prevent further errors
        students = [];
        updateStudentsTable();
        updateStudentFilters();
    }
}

// Update students table with filtering
function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    const levelFilter = document.getElementById('levelFilter')?.value || '';
    const turnFilter = document.getElementById('turnFilter')?.value || '';
    
    // Use assigned students instead of all students
    let filteredStudents = assignedStudents;
    
    // Apply level filter
    if (levelFilter) {
        filteredStudents = filteredStudents.filter(student => student.level === levelFilter);
    }
    
    // Apply turn filter
    if (turnFilter) {
        filteredStudents = filteredStudents.filter(student => student.turn === turnFilter);
    }
    
    console.log('Filtered students:', filteredStudents.length);
    
    // Add total count display
    const totalCountElement = document.getElementById('studentsTotalCount');
    if (totalCountElement) {
        totalCountElement.textContent = filteredStudents.length;
    }
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                        </svg>
                        <p class="text-lg font-medium">No se encontraron estudiantes</p>
                        <p class="text-sm">${levelFilter || turnFilter ? 'Intenta cambiar los filtros' : 'Agrega tu primer estudiante'}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredStudents.map((student, index) => `
        <tr class="hover:bg-gray-50">
            <td class="text-center font-medium text-gray-600">
                <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs">
                    ${index + 1}
                </span>
            </td>
            <td class="font-medium">${student.firstName} ${student.lastName}</td>
            <td>${student.email}</td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    ${student.level || 'N/A'}
                </span>
            </td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    ${student.turn || 'N/A'}
                </span>
            </td>
            <td>
                <div class="flex items-center space-x-2">
                    <code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">${student.passcode || 'N/A'}</code>
                    <button onclick="copyPasscode('${student.passcode}')" class="text-gray-400 hover:text-gray-600" title="Copiar passcode">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                    </button>
                </div>
            </td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.isActive !== false ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}">
                    ${student.isActive !== false ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <div class="flex space-x-2">
                    <button onclick="editStudent('${student.id}')" class="text-primary-600 hover:text-primary-900" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteStudent('${student.id}')" class="text-danger-600 hover:text-danger-900" title="Eliminar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load subjects (Legacy - now using assignedSubjects)
async function loadSubjects() {
    try {
        // Use assigned subjects instead of querying
        subjects = [...assignedSubjects];
        
        console.log(`Subjects loaded (assigned):`, subjects.length);
        updateSubjectsGrid();
        updateSubjectFilters();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Error al cargar las asignaturas', 'error');
        subjects = [];
        updateSubjectsGrid();
        updateSubjectFilters();
    }
}

// Update subjects grid
function updateSubjectsGrid() {
    const grid = document.getElementById('subjectsGrid');
    if (subjects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                    <p class="text-lg font-medium">No hay asignaturas</p>
                    <p class="text-sm">Crea tu primera asignatura</p>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = subjects.map(subject => `
        <div class="card">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${subject.name}</h3>
                    <p class="text-sm text-gray-600">${subject.code || 'Sin código'}</p>
                    ${subject.description ? `<p class="text-sm text-gray-500 mt-2">${subject.description}</p>` : ''}
                    <p class="text-sm text-gray-500 mt-1">
                        <span class="font-medium">Promociones:</span> ${subject.promotions?.length || 0}
                    </p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="editSubject('${subject.id}')" class="text-primary-600 hover:text-primary-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteSubject('${subject.id}')" class="text-danger-600 hover:text-danger-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load grades
async function loadGrades() {
    try {
        console.log('Loading grades...');
        
        let gradesQuery;
        
        if (currentAcademicYear && currentSemester) {
            // Filter by academic year and semester
            gradesQuery = query(
                collection(db, 'grades'),
                where('teacherId', '==', currentTeacher.uid),
                where('academicYear', '==', currentAcademicYear),
                where('semester', '==', currentSemester)
            );
        } else {
            // Load all grades for the teacher (fallback)
            gradesQuery = query(
                collection(db, 'grades'),
                where('teacherId', '==', currentTeacher.uid)
            );
        }
        
        const snapshot = await getDocs(gradesQuery);
        grades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort grades by createdAt after loading
        grades.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
            }
            return 0;
        });
        
        console.log(`Grades loaded for period ${currentAcademicYear}-${currentSemester}:`, grades.length);
        updateGradesTable();
    } catch (error) {
        console.error('Error loading grades:', error);
        
        // Show specific error message based on error type
        if (error.code === 'permission-denied') {
            showNotification('Error de permisos: No tienes permisos para ver las calificaciones.', 'error');
        } else if (error.code === 'failed-precondition') {
            showNotification('Error de índice: Se requiere crear un índice en Firebase. Contacta al administrador.', 'error');
        } else if (error.code === 'unavailable') {
            showNotification('Error de conexión: No se pudo conectar con la base de datos.', 'error');
        } else {
            showNotification('Error al cargar las calificaciones: ' + error.message, 'error');
        }
        
        // Set empty array to prevent further errors
        grades = [];
        updateGradesTable();
    }
}

// Update grades table
function updateGradesTable() {
    const tbody = document.getElementById('gradesTableBody');
    const subjectFilter = document.getElementById('subjectFilter')?.value || '';
    const studentFilter = document.getElementById('studentFilter')?.value || '';
    
    let filteredGrades = grades;
    
    if (subjectFilter) {
        filteredGrades = filteredGrades.filter(grade => grade.subjectId === subjectFilter);
    }
    
    if (studentFilter) {
        filteredGrades = filteredGrades.filter(grade => grade.studentId === studentFilter);
    }
    
    if (filteredGrades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="text-lg font-medium">No hay calificaciones</p>
                        <p class="text-sm">${subjectFilter || studentFilter ? 'Intenta cambiar los filtros' : 'Agrega tu primera calificación'}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredGrades.map(grade => {
        const student = students.find(s => s.id === grade.studentId);
        const subject = subjects.find(s => s.id === grade.subjectId);
        
        // Format grade display
        let gradeDisplay = grade.value;
        let gradeType = '';
        
        if (grade.type === 'categorized' && grade.categories) {
            gradeType = 'Categorizada';
            // Show breakdown on hover
            const categoryBreakdown = Object.entries(grade.categories)
                .map(([name, data]) => `${name}: ${data.grade}%`)
                .join(', ');
            gradeDisplay = `
                <span class="relative group">
                    ${grade.value.toFixed(1)}
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ${categoryBreakdown}
                        <div class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                </span>
            `;
        } else {
            gradeType = 'Simple';
        }
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="font-medium">${student ? `${student.firstName} ${student.lastName}` : 'N/A'}</td>
                <td>${subject ? subject.name : 'N/A'}</td>
                <td>
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(grade.value)}">
                            ${gradeDisplay}
                        </span>
                        ${grade.type === 'categorized' ? `
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                ${gradeType}
                            </span>
                        ` : ''}
                    </div>
                </td>
                <td>${grade.createdAt ? new Date(grade.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="editGrade('${grade.id}')" class="text-primary-600 hover:text-primary-900" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onclick="deleteGrade('${grade.id}')" class="text-danger-600 hover:text-danger-900" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get grade color
function getGradeColor(grade) {
    if (grade >= 90) return 'bg-success-100 text-success-800';
    if (grade >= 80) return 'bg-primary-100 text-primary-800';
    if (grade >= 70) return 'bg-warning-100 text-warning-800';
    return 'bg-danger-100 text-danger-800';
}

// Update statistics
function updateStatistics() {
    // Use assigned students and subjects for statistics
    document.getElementById('totalStudents').textContent = assignedStudents.length;
    document.getElementById('totalSubjects').textContent = assignedSubjects.length;
    
    const pendingGrades = grades.filter(grade => !grade.comment).length;
    document.getElementById('pendingGrades').textContent = pendingGrades;
    
    const lowGrades = grades.filter(grade => grade.value < 70).length;
    document.getElementById('lowGrades').textContent = lowGrades;
}

// Update filters
function updateStudentFilters() {
    const gradeStudent = document.getElementById('gradeStudent');
    const studentFilter = document.getElementById('studentFilter');
    
    const options = assignedStudents.map(student => 
        `<option value="${student.id}">${student.firstName} ${student.lastName}</option>`
    ).join('');
    
    if (gradeStudent) {
        gradeStudent.innerHTML = '<option value="">Seleccionar estudiante</option>' + options;
    }
    if (studentFilter) {
        studentFilter.innerHTML = '<option value="">Todos los estudiantes</option>' + options;
    }
}

function updateSubjectFilters() {
    const gradeSubject = document.getElementById('gradeSubject');
    const subjectFilter = document.getElementById('subjectFilter');
    
    const options = assignedSubjects.map(subject => 
        `<option value="${subject.id}">${subject.name}</option>`
    ).join('');
    
    if (gradeSubject) {
        gradeSubject.innerHTML = '<option value="">Seleccionar asignatura</option>' + options;
    }
    if (subjectFilter) {
        subjectFilter.innerHTML = '<option value="">Todas las asignaturas</option>' + options;
    }
}

// Modal functions
// Note: showAddGradeModal is defined later in the file with advanced functionality

// Note: hideAddGradeModal is defined later in the file with advanced functionality

function showAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('hidden');
    
    // Add event listeners for automatic email generation
    setTimeout(() => {
        const firstNameInput = document.getElementById('studentFirstName');
        const lastNameInput = document.getElementById('studentLastName');
        const emailInput = document.getElementById('studentEmail');
        
        if (firstNameInput && lastNameInput && emailInput) {
            // Remove existing event listeners to avoid duplicates
            firstNameInput.removeEventListener('input', firstNameInput._emailUpdateHandler);
            lastNameInput.removeEventListener('input', lastNameInput._emailUpdateHandler);
            
            // Create new event handlers
            firstNameInput._emailUpdateHandler = () => {
                updateEmailField(firstNameInput, lastNameInput, emailInput);
            };
            lastNameInput._emailUpdateHandler = () => {
                updateEmailField(firstNameInput, lastNameInput, emailInput);
            };
            
            // Add event listeners
            firstNameInput.addEventListener('input', firstNameInput._emailUpdateHandler);
            lastNameInput.addEventListener('input', lastNameInput._emailUpdateHandler);
        }
    }, 100); // Small delay to ensure DOM is ready
}

function hideAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('hidden');
    document.getElementById('addStudentForm').reset();
    
    // Clean up event listeners
    const firstNameInput = document.getElementById('studentFirstName');
    const lastNameInput = document.getElementById('studentLastName');
    
    if (firstNameInput && firstNameInput._emailUpdateHandler) {
        firstNameInput.removeEventListener('input', firstNameInput._emailUpdateHandler);
        delete firstNameInput._emailUpdateHandler;
    }
    
    if (lastNameInput && lastNameInput._emailUpdateHandler) {
        lastNameInput.removeEventListener('input', lastNameInput._emailUpdateHandler);
        delete lastNameInput._emailUpdateHandler;
    }
}

function showBulkAddStudentModal() {
    document.getElementById('bulkAddStudentModal').classList.remove('hidden');
    
    // Add event listeners to existing inputs for automatic email generation
    setTimeout(() => {
        const studentsList = document.getElementById('bulkStudentsList');
        if (studentsList) {
            const firstNameInputs = studentsList.querySelectorAll('input[name="bulkFirstName[]"]');
            const lastNameInputs = studentsList.querySelectorAll('input[name="bulkLastName[]"]');
            const emailInputs = studentsList.querySelectorAll('input[name="bulkEmail[]"]');
            
            // Add event listeners to each row
            for (let i = 0; i < firstNameInputs.length; i++) {
                const firstNameInput = firstNameInputs[i];
                const lastNameInput = lastNameInputs[i];
                const emailInput = emailInputs[i];
                
                if (firstNameInput && lastNameInput && emailInput) {
                    // Remove existing event listeners to avoid duplicates
                    firstNameInput.removeEventListener('input', firstNameInput._emailUpdateHandler);
                    lastNameInput.removeEventListener('input', lastNameInput._emailUpdateHandler);
                    
                    // Create new event handlers
                    firstNameInput._emailUpdateHandler = () => {
                        updateEmailField(firstNameInput, lastNameInput, emailInput);
                    };
                    lastNameInput._emailUpdateHandler = () => {
                        updateEmailField(firstNameInput, lastNameInput, emailInput);
                    };
                    
                    // Add event listeners
                    firstNameInput.addEventListener('input', firstNameInput._emailUpdateHandler);
                    lastNameInput.addEventListener('input', lastNameInput._emailUpdateHandler);
                }
            }
        }
    }, 100); // Small delay to ensure DOM is ready
}

function hideBulkAddStudentModal() {
    document.getElementById('bulkAddStudentModal').classList.add('hidden');
}

function resetBulkAddStudentModal() {
    console.log('🔄 Resetting bulk add student modal...');
    
    // Reset radio buttons
    const levelRadios = document.querySelectorAll('input[name="bulkLevel"]');
    const turnRadios = document.querySelectorAll('input[name="bulkTurn"]');
    
    levelRadios.forEach(radio => radio.checked = false);
    turnRadios.forEach(radio => radio.checked = false);
    
    // Reset student list to initial state
    const studentsList = document.getElementById('bulkStudentsList');
    if (studentsList) {
        studentsList.innerHTML = `
            <div class="flex space-x-3 items-center">
                <div class="flex-1">
                    <input type="text" name="bulkFirstName[]" placeholder="Nombre" class="input" required>
                </div>
                <div class="flex-1">
                    <input type="text" name="bulkLastName[]" placeholder="Apellido" class="input" required>
                </div>
                <div class="flex-1">
                    <input type="email" name="bulkEmail[]" placeholder="Email" class="input" required>
                </div>
                <button type="button" onclick="removeBulkStudent(this)" class="btn-danger p-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add event listeners for automatic email generation to the initial row
        const firstNameInput = studentsList.querySelector('input[name="bulkFirstName[]"]');
        const lastNameInput = studentsList.querySelector('input[name="bulkLastName[]"]');
        const emailInput = studentsList.querySelector('input[name="bulkEmail[]"]');
        
        if (firstNameInput && lastNameInput && emailInput) {
            firstNameInput.addEventListener('input', () => {
                updateEmailField(firstNameInput, lastNameInput, emailInput);
            });
            
            lastNameInput.addEventListener('input', () => {
                updateEmailField(firstNameInput, lastNameInput, emailInput);
            });
        }
        
        console.log('✅ Student list reset successfully');
    } else {
        console.error('❌ Students list element not found!');
    }
    
    console.log('✅ Modal reset completed');
}

function showAddSubjectModal() {
    document.getElementById('addSubjectModal').classList.remove('hidden');
}

function hideAddSubjectModal() {
    document.getElementById('addSubjectModal').classList.add('hidden');
    document.getElementById('addSubjectForm').reset();
}

// Edit Subject Modal Functions
function showEditSubjectModal(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) {
        showNotification('Asignatura no encontrada', 'error');
        return;
    }
    
    // Populate the form with subject data
    document.getElementById('editSubjectId').value = subject.id;
    document.getElementById('editSubjectName').value = subject.name;
    document.getElementById('editSubjectCode').value = subject.code;
    document.getElementById('editSubjectDescription').value = subject.description || '';
    
    // Show the modal
    document.getElementById('editSubjectModal').classList.remove('hidden');
}

function hideEditSubjectModal() {
    document.getElementById('editSubjectModal').classList.add('hidden');
    document.getElementById('editSubjectForm').reset();
}

// Subject Management Functions
function editSubject(subjectId) {
    showEditSubjectModal(subjectId);
}

async function deleteSubject(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) {
        showNotification('Asignatura no encontrada', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm(`¿Estás seguro de que quieres eliminar la asignatura "${subject.name}"?\n\nEsta acción no se puede deshacer y también eliminará todas las calificaciones asociadas a esta asignatura.`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        showLoading(true);
        
        // First, delete all grades associated with this subject
        const gradesQuery = query(
            collection(db, 'grades'),
            where('subjectId', '==', subjectId)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        
        // Delete grades in batches
        const batch = writeBatch(db);
        gradesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Then delete the subject
        await deleteDoc(doc(db, 'subjects', subjectId));
        
        showNotification('Asignatura eliminada exitosamente', 'success');
        await loadSubjects();
        await loadGrades(); // Reload grades to update the table
        updateStatistics();
    } catch (error) {
        console.error('Error deleting subject:', error);
        showNotification('Error al eliminar la asignatura', 'error');
    } finally {
        showLoading(false);
    }
}

// Tab functions
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to selected tab button
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Form submissions
document.addEventListener('DOMContentLoaded', function() {
    // Add Grade Form - Check if form exists before adding event listener
    const addGradeForm = document.getElementById('addGradeForm');
    if (addGradeForm) {
        addGradeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            // Validate that a period is selected
            if (!currentAcademicYear || !currentSemester) {
                showNotification('Por favor selecciona un período académico antes de agregar una calificación', 'error');
                return;
            }
            
            const gradeData = {
                studentId: formData.get('student'),
                subjectId: formData.get('subject'),
                value: parseFloat(formData.get('grade')),
                comment: formData.get('comment'),
                teacherId: currentTeacher.uid,
                academicYear: currentAcademicYear,
                semester: currentSemester,
                createdAt: serverTimestamp()
            };
            
            try {
                showLoading(true);
                await addDoc(collection(db, 'grades'), gradeData);
                showNotification('Calificación agregada exitosamente', 'success');
                hideAddGradeModal();
                await loadGrades();
                updateStatistics();
            } catch (error) {
                console.error('Error adding grade:', error);
                showNotification('Error al agregar la calificación', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
    
    // Add Student Form - Check if form exists before adding event listener
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate that a period is selected
        if (!currentAcademicYear || !currentSemester) {
            showNotification('Por favor selecciona un período académico antes de crear un estudiante', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const studentData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim().toLowerCase(),
            level: formData.get('level'),
            turn: formData.get('turn'),
            role: 'student',
            passcode: generatePasscode(),
            isActive: true,
            academicYear: currentAcademicYear,
            semester: currentSemester,
            createdAt: serverTimestamp()
        };
        
        // Validate student data
        const validationErrors = validateStudentData(studentData);
        if (validationErrors.length > 0) {
            showNotification(`Errores de validación:\n${validationErrors.join('\n')}`, 'error');
            return;
        }
        
        try {
            showLoading(true);
            
            // Set flag to prevent auth state change redirects during student creation
            isCreatingStudent = true;
            
            // Enhanced email checking
            console.log(`🔍 Checking email before creation: ${studentData.email}`);
            const emailCheck = await checkEmailExistsWithOrphanedHandling(studentData.email);
            if (emailCheck.exists) {
                showNotification(`El email ${studentData.email} ya está registrado en el sistema`, 'error');
                showLoading(false);
                isCreatingStudent = false;
                return;
            }
            
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                studentData.email, 
                studentData.passcode // Use passcode as initial password
            );
            
            // Create Firestore document
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                ...studentData,
                uid: userCredential.user.uid
            });
            
            showNotification('Estudiante creado exitosamente', 'success');
            
            // Clear form and hide modal
            document.getElementById('addStudentForm').reset();
            hideAddStudentModal();
            
            // Add the new student to the local array
            const newStudent = {
                id: userCredential.user.uid,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                email: studentData.email,
                level: studentData.level,
                turn: studentData.turn,
                passcode: studentData.passcode,
                role: 'student',
                isActive: true,
                createdAt: studentData.createdAt
            };
            
            // Add to local array
            students.push(newStudent);
            
            // Sort students by firstName
            students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
            
            // Update UI
            updateStudentsTable();
            updateStudentFilters();
            updateStatistics();
            
        } catch (error) {
            console.error('Error creating student:', error);
            
            // Use improved error handling
            const { errorMessage, shouldRetry } = handleFirebaseAuthError(error, studentData.email);
            
            if (shouldRetry) {
                showNotification(`${errorMessage}\n\n¿Deseas intentar nuevamente?`, 'warning');
            } else {
                showNotification(errorMessage, 'error');
            }
        } finally {
            showLoading(false);
            // Reset the flag after student creation is complete
            isCreatingStudent = false;
        }
    });
    }
    
    // Add Subject Form - Check if form exists before adding event listener
    const addSubjectForm = document.getElementById('addSubjectForm');
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        // Validate that a period is selected
        if (!currentAcademicYear || !currentSemester) {
            showNotification('Por favor selecciona un período académico antes de crear una asignatura', 'error');
            return;
        }
        
        const subjectData = {
            name: formData.get('name').trim(),
            code: formData.get('code').trim(),
            description: formData.get('description').trim(),
            teacherId: currentTeacher.uid,
            academicYear: currentAcademicYear,
            semester: currentSemester,
            createdAt: serverTimestamp()
        };
        
        try {
            showLoading(true);
            await addDoc(collection(db, 'subjects'), subjectData);
            showNotification('Asignatura creada exitosamente', 'success');
            hideAddSubjectModal();
            await loadSubjects();
            updateStatistics();
        } catch (error) {
            console.error('Error creating subject:', error);
            showNotification('Error al crear la asignatura', 'error');
        } finally {
            showLoading(false);
        }
    });
    }
    
    // Edit Subject Form - Check if form exists before adding event listener
    const editSubjectForm = document.getElementById('editSubjectForm');
    if (editSubjectForm) {
        editSubjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const subjectId = formData.get('id');
            const subjectData = {
                name: formData.get('name').trim(),
                code: formData.get('code').trim(),
                description: formData.get('description').trim(),
                teacherId: currentTeacher.uid,
                updatedAt: serverTimestamp()
            };
            
            try {
                showLoading(true);
                await updateDoc(doc(db, 'subjects', subjectId), subjectData);
                showNotification('Asignatura actualizada exitosamente', 'success');
                hideEditSubjectModal();
                await loadSubjects();
                updateStatistics();
            } catch (error) {
                console.error('Error updating subject:', error);
                showNotification('Error al actualizar la asignatura', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
    
    // Filter event listeners
    const levelFilter = document.getElementById('levelFilter');
    const turnFilter = document.getElementById('turnFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const studentFilter = document.getElementById('studentFilter');
    
    if (levelFilter) {
        levelFilter.addEventListener('change', updateStudentsTable);
    }
    if (turnFilter) {
        turnFilter.addEventListener('change', updateStudentsTable);
    }
    if (subjectFilter) {
        subjectFilter.addEventListener('change', updateGradesTable);
    }
    if (studentFilter) {
        studentFilter.addEventListener('change', updateGradesTable);
    }
    
    // Academic Period Selectors
    const academicYearSelect = document.getElementById('academicYearSelect');
    const semesterSelect = document.getElementById('semesterSelect');
    
    if (academicYearSelect) {
        academicYearSelect.addEventListener('change', (e) => {
            const year = e.target.value;
            const semester = semesterSelect?.value;
            
            if (year && semester) {
                setCurrentPeriod(year, semester);
            }
        });
    }
    
    if (semesterSelect) {
        semesterSelect.addEventListener('change', (e) => {
            const semester = e.target.value;
            const year = academicYearSelect?.value;
            
            if (year && semester) {
                setCurrentPeriod(year, semester);
            }
        });
    }
    
    // Add Period Form
    const addPeriodForm = document.getElementById('addPeriodForm');
    if (addPeriodForm) {
        addPeriodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            await addAcademicPeriod(formData);
            
            // Reset form
            e.target.reset();
        });
    }
});

// Bulk student functions
function addBulkStudent() {
    const container = document.getElementById('bulkStudentsList');
    const newRow = document.createElement('div');
    newRow.className = 'flex space-x-3 items-center';
    newRow.innerHTML = `
        <div class="flex-1">
            <input type="text" name="bulkFirstName[]" placeholder="Nombre" class="input" required>
        </div>
        <div class="flex-1">
            <input type="text" name="bulkLastName[]" placeholder="Apellido" class="input" required>
        </div>
        <div class="flex-1">
            <input type="email" name="bulkEmail[]" placeholder="Email" class="input" required>
        </div>
        <button type="button" onclick="removeBulkStudent(this)" class="btn-danger p-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        </button>
    `;
    container.appendChild(newRow);
    
    // Add event listeners for automatic email generation
    const firstNameInput = newRow.querySelector('input[name="bulkFirstName[]"]');
    const lastNameInput = newRow.querySelector('input[name="bulkLastName[]"]');
    const emailInput = newRow.querySelector('input[name="bulkEmail[]"]');
    
    // Add event listeners for both inputs
    firstNameInput.addEventListener('input', () => {
        updateEmailField(firstNameInput, lastNameInput, emailInput);
    });
    
    lastNameInput.addEventListener('input', () => {
        updateEmailField(firstNameInput, lastNameInput, emailInput);
    });
}

function removeBulkStudent(button) {
    const container = document.getElementById('bulkStudentsList');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

async function createBulkStudents() {
    console.log('🚀 Starting bulk student creation...');
    
    // Set flag to prevent auth state changes from redirecting
    isCreatingBulkStudents = true;
    
    const level = document.querySelector('input[name="bulkLevel"]:checked')?.value;
    const turn = document.querySelector('input[name="bulkTurn"]:checked')?.value;
    
    console.log('Selected level:', level, 'turn:', turn);
    
    if (!level || !turn) {
        showNotification('Por favor selecciona nivel y turno', 'error');
        isCreatingBulkStudents = false;
        return;
    }
    
    const firstNames = document.querySelectorAll('input[name="bulkFirstName[]"]');
    const lastNames = document.querySelectorAll('input[name="bulkLastName[]"]');
    const emails = document.querySelectorAll('input[name="bulkEmail[]"]');
    
    console.log('Found form inputs:', firstNames.length, 'rows');
    
    const studentsToCreate = [];
    for (let i = 0; i < firstNames.length; i++) {
        const firstName = firstNames[i].value.trim();
        const lastName = lastNames[i].value.trim();
        const email = emails[i].value.trim().toLowerCase();
        
        console.log(`Row ${i + 1}:`, { firstName, lastName, email });
        
        if (firstName && lastName && email) {
            studentsToCreate.push({
                firstName,
                lastName,
                email,
                level,
                turn,
                passcode: generatePasscode()
            });
        }
    }
    
    console.log('Valid students to create:', studentsToCreate.length);
    
    // Validate that a period is selected
    if (!currentAcademicYear || !currentSemester) {
        showNotification('Por favor selecciona un período académico antes de crear estudiantes', 'error');
        isCreatingBulkStudents = false;
        return;
    }
    
    if (studentsToCreate.length === 0) {
        showNotification('Por favor ingresa al menos un estudiante', 'error');
        isCreatingBulkStudents = false;
        return;
    }
    
    // Check for duplicate emails within the form
    const studentEmails = studentsToCreate.map(s => s.email);
    const uniqueEmails = new Set(studentEmails);
    if (studentEmails.length !== uniqueEmails.size) {
        showNotification('❌ Hay emails duplicados en la lista. Por favor corrige los datos.', 'error');
        isCreatingBulkStudents = false;
        return;
    }
    
    // Check for existing emails in the database before creating
    try {
        console.log('🔍 Checking for existing emails in database...');
        const existingEmails = [];
        
        for (const student of studentsToCreate) {
            try {
                console.log(`🔍 Checking email in bulk creation: ${student.email}`);
                const emailCheck = await checkEmailExistsWithOrphanedHandling(student.email);
                
                if (emailCheck.exists) {
                    existingEmails.push(student.email);
                    console.log(`⚠️ Email already exists: ${student.email}`);
                }
            } catch (error) {
                console.error(`Error checking email ${student.email}:`, error);
            }
        }
        
        if (existingEmails.length > 0) {
            const emailList = existingEmails.slice(0, 3).join(', ');
            const message = existingEmails.length > 3 
                ? `Los siguientes emails ya están registrados: ${emailList}... y ${existingEmails.length - 3} más`
                : `Los siguientes emails ya están registrados: ${emailList}`;
            
            showNotification(`❌ ${message}`, 'error');
            isCreatingBulkStudents = false;
            return;
        }
    } catch (error) {
        console.error('Error checking existing emails:', error);
        // Continue with creation even if check fails
    }
    
    try {
        showLoading(true);
        let createdCount = 0;
        let errorCount = 0;
        let errorMessages = [];
        
        console.log('Starting to create', studentsToCreate.length, 'students...');
        
        // Store current teacher session to restore later
        const currentTeacherSession = auth.currentUser;
        
        for (let i = 0; i < studentsToCreate.length; i++) {
            const studentData = studentsToCreate[i];
            console.log(`Creating student ${i + 1}/${studentsToCreate.length}:`, studentData.email);
            
            try {
                // Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(
                    auth, 
                    studentData.email, 
                    studentData.passcode
                );
                
                console.log(`✅ Auth user created for ${studentData.email}`);
                
                // Create Firestore document
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    ...studentData,
                    uid: userCredential.user.uid,
                    role: 'student',
                    isActive: true,
                    academicYear: currentAcademicYear,
                    semester: currentSemester,
                    createdAt: serverTimestamp()
                });
                
                console.log(`✅ Firestore document created for ${studentData.email}`);
                createdCount++;
                console.log(`✅ Estudiante creado: ${studentData.firstName} ${studentData.lastName} (${studentData.email})`);
                
            } catch (error) {
                console.error(`❌ Error creating student ${studentData.email}:`, error);
                errorCount++;
                
                // Use improved error handling
                const { errorMessage } = handleFirebaseAuthError(error, studentData.email);
                
                errorMessages.push(`${studentData.firstName} ${studentData.lastName}: ${errorMessage}`);
                
                // If it's an email already in use, we should stop trying to create this user
                if (error.code === 'auth/email-already-in-use') {
                    console.log(`⏭️ Skipping ${studentData.email} - already exists`);
                    continue;
                }
            }
        }
        
        // Restore teacher session if it was lost
        if (auth.currentUser !== currentTeacherSession) {
            console.log('⚠️ Teacher session was affected, attempting to restore...');
            // The onAuthStateChanged listener should handle this automatically
        }
        
        console.log('Finished creating students. Created:', createdCount, 'Errors:', errorCount);
        
        // Show success notification
        if (createdCount > 0) {
            let successMessage = `✅ ${createdCount} estudiante${createdCount > 1 ? 's' : ''} creado${createdCount > 1 ? 's' : ''} exitosamente`;
            
            if (errorCount > 0) {
                successMessage += `\n❌ ${errorCount} error${errorCount > 1 ? 'es' : ''} encontrado${errorCount > 1 ? 's' : ''}`;
            }
            
            showNotification(successMessage, 'success');
            
            // Reset modal form (but keep it open) and reload data
            resetBulkAddStudentModal();
            
            // Ensure modal stays open and is visible
            const modal = document.getElementById('bulkAddStudentModal');
            if (modal) {
                modal.classList.remove('hidden');
                console.log('✅ Modal kept open after reset');
            } else {
                console.error('❌ Modal element not found!');
            }
            
            // Verify teacher is still authenticated
            if (!auth.currentUser) {
                console.error('❌ Teacher session lost after creating students!');
                showNotification('❌ Error: Sesión del profesor perdida. Por favor inicia sesión nuevamente.', 'error');
                return;
            }
            
            // Add new students to the local array and update the UI
            console.log('✅ Adding new students to local array and updating UI...');
            
            // Create a list of successfully created students
            const successfullyCreatedStudents = [];
            
            // Add the successfully created students to the local students array
            for (let i = 0; i < studentsToCreate.length; i++) {
                const studentData = studentsToCreate[i];
                const studentId = `temp_${Date.now()}_${i}`; // Temporary ID for tracking
                
                // Check if this student was created successfully (no error in errorMessages)
                const studentError = errorMessages.find(msg => 
                    msg.includes(`${studentData.firstName} ${studentData.lastName}:`)
                );
                
                if (!studentError) {
                    // This student was created successfully
                    const newStudent = {
                        id: studentId, // We'll update this with the real UID later
                        firstName: studentData.firstName,
                        lastName: studentData.lastName,
                        email: studentData.email,
                        level: studentData.level,
                        turn: studentData.turn,
                        passcode: studentData.passcode,
                        role: 'student',
                        isActive: true,
                        createdAt: serverTimestamp()
                    };
                    
                    // Add to local array
                    students.push(newStudent);
                    successfullyCreatedStudents.push(newStudent);
                    console.log(`✅ Added ${newStudent.firstName} ${newStudent.lastName} to local array`);
                }
            }
            
            // Sort students by firstName
            students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
            
            // Update the UI
            updateStudentsTable();
            updateStudentFilters();
            updateStatistics();
            
            console.log('✅ UI updated with new students');
            
            // Show detailed error messages if any
            if (errorMessages.length > 0) {
                setTimeout(() => {
                    showNotification(`Errores detallados:\n${errorMessages.slice(0, 3).join('\n')}${errorMessages.length > 3 ? '\n...' : ''}`, 'warning');
                }, 2000);
            }
        } else {
            showNotification('❌ No se pudo crear ningún estudiante. Revisa los datos ingresados.', 'error');
        }
        
    } catch (error) {
        console.error('Error creating bulk students:', error);
        
        // Check if it's an authentication error
        if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found') {
            showNotification('❌ Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
            // Don't redirect, let the user stay on the page
        } else if (error.code === 'permission-denied') {
            showNotification('❌ Error de permisos. Contacta al administrador del sistema.', 'error');
        } else {
            showNotification('❌ Error al crear los estudiantes: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
        // Reset flag after bulk student creation is complete
        isCreatingBulkStudents = false;
        console.log('✅ Bulk student creation completed, auth state changes re-enabled');
    }
}

// Utility functions
function copyPasscode(passcode) {
    navigator.clipboard.writeText(passcode).then(() => {
        showNotification('Passcode copiado al portapapeles', 'success');
    }).catch(() => {
        showNotification('Error al copiar el passcode', 'error');
    });
}

// Edit student function
async function editStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        showNotification('Estudiante no encontrado', 'error');
        return;
    }
    
    // Show edit modal with pre-filled data
    showEditStudentModal(student);
}

// Show edit student modal
function showEditStudentModal(student) {
    // Create modal HTML if it doesn't exist
    let modal = document.getElementById('editStudentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editStudentModal';
        modal.className = 'fixed inset-0 z-50 hidden';
        modal.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 z-40" onclick="hideEditStudentModal()"></div>
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-slide-up">
                    <div class="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Editar Estudiante</h2>
                        <button onclick="hideEditStudentModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="p-6">
                        <form id="editStudentForm" class="space-y-6">
                            <input type="hidden" id="editStudentId" name="studentId">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="editFirstName" class="form-label">Nombre *</label>
                                    <input type="text" id="editFirstName" name="firstName" class="input" required>
                                </div>
                                
                                <div>
                                    <label for="editLastName" class="form-label">Apellido *</label>
                                    <input type="text" id="editLastName" name="lastName" class="input" required>
                                </div>
                            </div>
                            
                            <div>
                                <label for="editEmail" class="form-label">Email *</label>
                                <input type="email" id="editEmail" name="email" class="input" required>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="form-label">Nivel *</label>
                                    <div class="grid grid-cols-3 gap-3">
                                        <label class="radio-label">
                                            <input type="radio" name="editLevel" value="Freshman" class="radio-input">
                                            <span class="radio-text">Freshman</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="editLevel" value="Junior" class="radio-input">
                                            <span class="radio-text">Junior</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="editLevel" value="Senior" class="radio-input">
                                            <span class="radio-text">Senior</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="form-label">Turno *</label>
                                    <div class="grid grid-cols-2 gap-3">
                                        <label class="radio-label">
                                            <input type="radio" name="editTurn" value="AM" class="radio-input">
                                            <span class="radio-text">AM</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="editTurn" value="PM" class="radio-input">
                                            <span class="radio-text">PM</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="editPasscode" class="form-label">Passcode</label>
                                    <div class="flex space-x-2">
                                        <input type="text" id="editPasscode" name="passcode" class="input flex-1" readonly>
                                        <button type="button" onclick="generateNewPasscode()" class="btn-secondary px-3">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="form-label">Estado</label>
                                    <div class="flex space-x-3">
                                        <label class="radio-label">
                                            <input type="radio" name="editIsActive" value="true" class="radio-input">
                                            <span class="radio-text">Activo</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="editIsActive" value="false" class="radio-input">
                                            <span class="radio-text">Inactivo</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex space-x-3 pt-6 border-t border-gray-200">
                                <button type="submit" class="btn-primary flex-1">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    Guardar Cambios
                                </button>
                                <button type="button" onclick="hideEditStudentModal()" class="btn-secondary">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add form submit event listener
        const form = modal.querySelector('#editStudentForm');
        form.addEventListener('submit', handleEditStudentSubmit);
    }
    
    // Fill form with student data
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editFirstName').value = student.firstName || '';
    document.getElementById('editLastName').value = student.lastName || '';
    document.getElementById('editEmail').value = student.email || '';
    document.getElementById('editPasscode').value = student.passcode || '';
    
    // Set radio buttons
    const levelRadio = document.querySelector(`input[name="editLevel"][value="${student.level}"]`);
    if (levelRadio) levelRadio.checked = true;
    
    const turnRadio = document.querySelector(`input[name="editTurn"][value="${student.turn}"]`);
    if (turnRadio) turnRadio.checked = true;
    
    const activeRadio = document.querySelector(`input[name="editIsActive"][value="${student.isActive !== false}"]`);
    if (activeRadio) activeRadio.checked = true;
    
    // Show modal
    modal.classList.remove('hidden');
}

// Hide edit student modal
function hideEditStudentModal() {
    const modal = document.getElementById('editStudentModal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const form = modal.querySelector('#editStudentForm');
        if (form) form.reset();
    }
}

// Handle edit student form submission
async function handleEditStudentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const studentId = formData.get('studentId');
    const updatedData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        email: formData.get('email').trim().toLowerCase(),
        level: formData.get('editLevel'),
        turn: formData.get('editTurn'),
        passcode: formData.get('passcode'),
        isActive: formData.get('editIsActive') === 'true',
        updatedAt: serverTimestamp()
    };
    
    // Validate data
    const validationErrors = validateStudentData(updatedData);
    if (validationErrors.length > 0) {
        showNotification(`Errores de validación:\n${validationErrors.join('\n')}`, 'error');
        return;
    }
    
    // Check if email changed and if new email already exists
    const originalStudent = students.find(s => s.id === studentId);
    if (originalStudent && originalStudent.email !== updatedData.email) {
        console.log(`🔍 Checking email before edit: ${updatedData.email}`);
        const emailCheck = await checkEmailExistsWithOrphanedHandling(updatedData.email);
        if (emailCheck.exists) {
            showNotification(`El email ${updatedData.email} ya está registrado en el sistema`, 'error');
            return;
        }
    }
    
    try {
        showLoading(true);
        
        // Check permissions before attempting update
        const hasPermissions = await checkStudentPermissions();
        if (!hasPermissions) {
            showLoading(false);
            return;
        }
        
        // Update in Firestore
        await updateDoc(doc(db, 'users', studentId), updatedData);
        
        // Update local array
        const studentIndex = students.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
            students[studentIndex] = { ...students[studentIndex], ...updatedData };
        }
        
        // Sort students by firstName
        students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        // Update UI
        updateStudentsTable();
        updateStudentFilters();
        updateStatistics();
        
        showNotification('Estudiante actualizado exitosamente', 'success');
        hideEditStudentModal();
        
    } catch (error) {
        console.error('Error updating student:', error);
        
        // Handle specific errors
        if (error.code === 'permission-denied') {
            showNotification('❌ Error de permisos: No tienes permisos para editar estudiantes. Contacta al administrador del sistema.', 'error');
        } else if (error.code === 'not-found') {
            showNotification('❌ El estudiante ya no existe en la base de datos', 'error');
        } else if (error.code === 'unavailable') {
            showNotification('❌ Error de conexión: No se pudo conectar con la base de datos', 'error');
        } else if (error.code === 'failed-precondition') {
            showNotification('❌ Error de condición: El documento no está en el estado esperado', 'error');
        } else if (error.code === 'resource-exhausted') {
            showNotification('❌ Error de recursos: Se han agotado los recursos de la base de datos', 'error');
        } else {
            showNotification('❌ Error al actualizar el estudiante: ' + (error.message || 'Error desconocido'), 'error');
        }
        
        // Log detailed error information for debugging
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    } finally {
        showLoading(false);
    }
}

// Generate new passcode for edit form
function generateNewPasscode() {
    const passcodeInput = document.getElementById('editPasscode');
    if (passcodeInput) {
        passcodeInput.value = generatePasscode();
    }
}

// Delete student function
async function deleteStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        showNotification('Estudiante no encontrado', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmDelete = confirm(`¿Estás seguro de que quieres eliminar al estudiante ${student.firstName} ${student.lastName}?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmDelete) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Check permissions before attempting delete
        const hasPermissions = await checkStudentPermissions();
        if (!hasPermissions) {
            showLoading(false);
            return;
        }
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', studentId));
        
        // Remove from local array
        students = students.filter(s => s.id !== studentId);
        
        // Update UI
        updateStudentsTable();
        updateStudentFilters();
        updateStatistics();
        
        showNotification(`Estudiante ${student.firstName} ${student.lastName} eliminado exitosamente`, 'success');
        
    } catch (error) {
        console.error('Error deleting student:', error);
        
        // Handle specific errors
        if (error.code === 'permission-denied') {
            showNotification('❌ Error de permisos: No tienes permisos para eliminar estudiantes. Contacta al administrador del sistema.', 'error');
        } else if (error.code === 'not-found') {
            showNotification('❌ El estudiante ya no existe en la base de datos', 'error');
        } else if (error.code === 'unavailable') {
            showNotification('❌ Error de conexión: No se pudo conectar con la base de datos', 'error');
        } else if (error.code === 'failed-precondition') {
            showNotification('❌ Error de condición: El documento no está en el estado esperado', 'error');
        } else if (error.code === 'resource-exhausted') {
            showNotification('❌ Error de recursos: Se han agotado los recursos de la base de datos', 'error');
        } else {
            showNotification('❌ Error al eliminar el estudiante: ' + (error.message || 'Error desconocido'), 'error');
        }
        
        // Log detailed error information for debugging
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    } finally {
        showLoading(false);
    }
}

// Advanced Grade System Functions
function initializeAdvancedGradeSystem() {
    // Add event listeners for grade type selection
    document.querySelectorAll('input[name="gradeType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            gradeConfiguration.type = this.value;
            const categorizedConfig = document.getElementById('categorizedConfig');
            if (categorizedConfig) {
                if (this.value === 'categorized') {
                    categorizedConfig.classList.remove('hidden');
                    updateTotalPercentage();
                } else {
                    categorizedConfig.classList.add('hidden');
                }
            }
        });
    });

    // Add event listeners for category percentage inputs
    document.addEventListener('input', function(e) {
        if (e.target.name === 'categoryPercentage[]') {
            updateTotalPercentage();
        }
    });

    // Add event listeners for student filters
    const levelFilter = document.getElementById('studentLevelFilter');
    const turnFilter = document.getElementById('studentTurnFilter');
    const searchInput = document.getElementById('studentSearch');

    if (levelFilter) levelFilter.addEventListener('change', updateStudentCheckboxList);
    if (turnFilter) turnFilter.addEventListener('change', updateStudentCheckboxList);
    if (searchInput) searchInput.addEventListener('input', debouncedSearch);
}

function updateTotalPercentage() {
    const percentageInputs = document.querySelectorAll('input[name="categoryPercentage[]"]');
    let total = 0;
    
    percentageInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    const totalElement = document.getElementById('totalPercentage');
    if (totalElement) {
        totalElement.textContent = total + '%';
        
        if (total > 100) {
            totalElement.classList.remove('text-primary-600');
            totalElement.classList.add('text-danger-600');
        } else if (total === 100) {
            totalElement.classList.remove('text-danger-600');
            totalElement.classList.add('text-success-600');
        } else {
            totalElement.classList.remove('text-danger-600', 'text-success-600');
            totalElement.classList.add('text-primary-600');
        }
    }
}

function addCategory() {
    const categoriesList = document.getElementById('categoriesList');
    const newCategory = document.createElement('div');
    newCategory.className = 'flex space-x-3 items-center';
    newCategory.innerHTML = `
        <div class="flex-1">
            <input type="text" name="categoryName[]" placeholder="Nombre de categoría" class="input">
        </div>
        <div class="w-24">
            <input type="number" name="categoryPercentage[]" placeholder="%" class="input" min="0" max="100" value="0">
        </div>
        <button type="button" onclick="removeCategory(this)" class="btn-danger p-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        </button>
    `;
    categoriesList.appendChild(newCategory);
    updateTotalPercentage();
}

function removeCategory(button) {
    const categoriesList = document.getElementById('categoriesList');
    if (categoriesList.children.length > 1) {
        button.parentElement.remove();
        updateTotalPercentage();
    }
}

function updateStudentCheckboxList() {
    const levelFilter = document.getElementById('studentLevelFilter')?.value || '';
    const turnFilter = document.getElementById('studentTurnFilter')?.value || '';
    const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
    
    let filteredStudents = students;
    
    // Apply filters
    if (levelFilter) {
        filteredStudents = filteredStudents.filter(student => student.level === levelFilter);
    }
    
    if (turnFilter) {
        filteredStudents = filteredStudents.filter(student => student.turn === turnFilter);
    }
    
    if (searchTerm) {
        filteredStudents = filteredStudents.filter(student => 
            student.firstName.toLowerCase().includes(searchTerm) ||
            student.lastName.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm)
        );
    }
    
    const container = document.getElementById('studentsCheckboxList');
    if (!container) return;
    
    // Update student count in modal
    const studentCountElement = document.getElementById('selectedStudentsCount');
    if (studentCountElement) {
        studentCountElement.textContent = filteredStudents.length;
    }
    
    if (filteredStudents.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                </svg>
                <p class="text-lg font-medium">No se encontraron estudiantes</p>
                <p class="text-sm">Intenta cambiar los filtros</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredStudents.map((student, index) => `
        <label class="student-checkbox-item flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        ${index + 1}
                    </span>
                </div>
                <input type="checkbox" value="${student.id}" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
                       onchange="toggleStudentSelection('${student.id}', this.checked)">
                <div class="flex-1">
                    <div class="font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                    <div class="text-sm text-gray-500">${student.email}</div>
                    <div class="flex space-x-2 mt-1">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            ${student.level || 'N/A'}
                        </span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-800">
                            ${student.turn || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </label>
    `).join('');
    
    // Restore selected state
    selectedStudents.forEach(studentId => {
        const checkbox = container.querySelector(`input[value="${studentId}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

function toggleStudentSelection(studentId, isSelected) {
    if (isSelected) {
        if (!selectedStudents.includes(studentId)) {
            selectedStudents.push(studentId);
        }
    } else {
        selectedStudents = selectedStudents.filter(id => id !== studentId);
    }
}

function selectAllStudents() {
    const checkboxes = document.querySelectorAll('#studentsCheckboxList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        toggleStudentSelection(checkbox.value, true);
    });
}

function deselectAllStudents() {
    const checkboxes = document.querySelectorAll('#studentsCheckboxList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        toggleStudentSelection(checkbox.value, false);
    });
}

function nextStep() {
    if (currentStep === 1) {
        // Validate step 1
        const subject = document.getElementById('gradeSubject').value;
        if (!subject) {
            showNotification('Por favor selecciona una asignatura', 'error');
            return;
        }
        
        if (gradeConfiguration.type === 'categorized') {
            const total = calculateTotalPercentage();
            if (total !== 100) {
                showNotification('El total de porcentajes debe ser 100%', 'error');
                return;
            }
        }
        
        currentStep = 2;
        updateStepNavigation();
        updateStudentCheckboxList();
    } else if (currentStep === 2) {
        // Validate step 2
        if (selectedStudents.length === 0) {
            showNotification('Por favor selecciona al menos un estudiante', 'error');
            return;
        }
        
        currentStep = 3;
        updateStepNavigation();
        generateGradesEntryForm();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepNavigation();
    }
}

function updateStepNavigation() {
    // Update step indicators
    const indicators = ['step1-indicator', 'step2-indicator', 'step3-indicator'];
    
    indicators.forEach((indicatorId, index) => {
        const indicator = document.getElementById(indicatorId);
        if (!indicator) return; // Skip if element doesn't exist
        
        // Find the corresponding label (span) that follows the indicator
        const label = indicator.parentElement.querySelector('span');
        
        if (index + 1 < currentStep) {
            // Completed step
            indicator.className = 'w-8 h-8 bg-success-600 text-white rounded-full flex items-center justify-center text-sm font-medium';
            if (label) label.className = 'ml-2 text-sm font-medium text-gray-900';
        } else if (index + 1 === currentStep) {
            // Current step
            indicator.className = 'w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium';
            if (label) label.className = 'ml-2 text-sm font-medium text-gray-900';
        } else {
            // Future step
            indicator.className = 'w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium';
            if (label) label.className = 'ml-2 text-sm font-medium text-gray-500';
        }
    });
    
    // Show/hide step content
    document.querySelectorAll('.step-content').forEach((content, index) => {
        if (index + 1 === currentStep) {
            content.classList.remove('hidden');
            content.classList.add('active');
        } else {
            content.classList.add('hidden');
            content.classList.remove('active');
        }
    });
}

function calculateTotalPercentage() {
    const percentageInputs = document.querySelectorAll('input[name="categoryPercentage[]"]');
    let total = 0;
    
    percentageInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    return total;
}

function generateGradesEntryForm() {
    const container = document.getElementById('gradesEntryContainer');
    const selectedStudentsData = students.filter(student => selectedStudents.includes(student.id));
    
    if (gradeConfiguration.type === 'simple') {
        generateSimpleGradesForm(container, selectedStudentsData);
    } else {
        generateCategorizedGradesForm(container, selectedStudentsData);
    }
}

function generateSimpleGradesForm(container, studentsData) {
    container.innerHTML = `
        <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Calificaciones Simples</h3>
            <div class="space-y-4">
                ${studentsData.map((student, index) => `
                    <div class="grade-entry-row flex items-center justify-between p-4 bg-white rounded-lg border">
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0">
                                <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                                    ${index + 1}
                                </span>
                            </div>
                            <div class="flex-1">
                                <div class="font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                                <div class="text-sm text-gray-500">${student.email}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <input type="number" 
                                   name="grade_${student.id}" 
                                   placeholder="0-100" 
                                   min="0" 
                                   max="100" 
                                   step="0.1" 
                                   class="input w-24 text-center"
                                   onchange="validateGrade(this)">
                            <span class="text-sm text-gray-500">/ 100</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function generateCategorizedGradesForm(container, studentsData) {
    const categories = getCategories();
    
    container.innerHTML = `
        <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Calificaciones por Categorías</h3>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b">
                            <th class="text-left p-3 font-medium text-gray-700">Estudiante</th>
                            ${categories.map(cat => `
                                <th class="text-center p-3 font-medium text-gray-700">
                                    ${cat.name}<br>
                                    <span class="text-xs text-gray-500">(${cat.percentage}%)</span>
                                </th>
                            `).join('')}
                            <th class="text-center p-3 font-medium text-gray-700">Total</th>
                        </tr>
                    </thead>
                                         <tbody>
                         ${studentsData.map((student, index) => `
                             <tr class="grade-entry-row border-b hover:bg-gray-50">
                                 <td class="p-3">
                                     <div class="flex items-center space-x-3">
                                         <div class="flex-shrink-0">
                                             <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                                                 ${index + 1}
                                             </span>
                                         </div>
                                         <div>
                                             <div class="font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                                             <div class="text-sm text-gray-500">${student.email}</div>
                                         </div>
                                     </div>
                                 </td>
                                ${categories.map(cat => `
                                    <td class="p-3 text-center">
                                        <input type="number" 
                                               name="grade_${student.id}_${cat.name}" 
                                               placeholder="0-100" 
                                               min="0" 
                                               max="100" 
                                               step="0.1" 
                                               class="category-grade-input input"
                                               onchange="calculateStudentTotal('${student.id}')">
                                    </td>
                                `).join('')}
                                <td class="p-3 text-center">
                                    <span id="total_${student.id}" class="total-grade-display text-primary-600">0.0</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function getCategories() {
    const categoryNames = document.querySelectorAll('input[name="categoryName[]"]');
    const categoryPercentages = document.querySelectorAll('input[name="categoryPercentage[]"]');
    const categories = [];
    
    categoryNames.forEach((nameInput, index) => {
        if (nameInput.value.trim()) {
            categories.push({
                name: nameInput.value.trim(),
                percentage: parseFloat(categoryPercentages[index]?.value) || 0
            });
        }
    });
    
    return categories;
}

function validateGrade(input) {
    const value = parseFloat(input.value);
    if (value < 0) input.value = 0;
    if (value > 100) input.value = 100;
}

function calculateStudentTotal(studentId) {
    if (gradeConfiguration.type !== 'categorized') return;
    
    const categories = getCategories();
    let total = 0;
    
    categories.forEach(cat => {
        const input = document.querySelector(`input[name="grade_${studentId}_${cat.name}"]`);
        const grade = parseFloat(input?.value) || 0;
        total += (grade * cat.percentage) / 100;
    });
    
    const totalElement = document.getElementById(`total_${studentId}`);
    if (totalElement) {
        totalElement.textContent = total.toFixed(1);
    }
}

async function saveGrades() {
    const subjectId = document.getElementById('gradeSubject').value;
    const selectedStudentsData = students.filter(student => selectedStudents.includes(student.id));
    
    try {
        showLoading(true);
        let savedCount = 0;
        
        for (const student of selectedStudentsData) {
            const gradeData = {
                studentId: student.id,
                subjectId: subjectId,
                teacherId: currentTeacher.uid,
                createdAt: serverTimestamp(),
                type: gradeConfiguration.type
            };
            
            if (gradeConfiguration.type === 'simple') {
                const gradeInput = document.querySelector(`input[name="grade_${student.id}"]`);
                const gradeValue = parseFloat(gradeInput?.value);
                
                if (gradeValue !== null && !isNaN(gradeValue)) {
                    gradeData.value = gradeValue;
                    gradeData.comment = '';
                    
                    await addDoc(collection(db, 'grades'), gradeData);
                    savedCount++;
                }
            } else {
                // Categorized grades
                const categories = getCategories();
                const categoryGrades = {};
                let totalGrade = 0;
                
                categories.forEach(cat => {
                    const input = document.querySelector(`input[name="grade_${student.id}_${cat.name}"]`);
                    const grade = parseFloat(input?.value) || 0;
                    categoryGrades[cat.name] = {
                        grade: grade,
                        percentage: cat.percentage
                    };
                    totalGrade += (grade * cat.percentage) / 100;
                });
                
                if (totalGrade > 0) {
                    gradeData.value = totalGrade;
                    gradeData.categories = categoryGrades;
                    gradeData.comment = '';
                    
                    await addDoc(collection(db, 'grades'), gradeData);
                    savedCount++;
                }
            }
        }
        
        showNotification(`${savedCount} calificaciones guardadas exitosamente`, 'success');
        hideAddGradeModal();
        await loadGrades();
        updateStatistics();
        
    } catch (error) {
        console.error('Error saving grades:', error);
        showNotification('Error al guardar las calificaciones', 'error');
    } finally {
        showLoading(false);
    }
}

function showAddGradeModal() {
    // Reset state
    currentStep = 1;
    selectedStudents = [];
    gradeConfiguration = {
        type: 'simple',
        categories: []
    };
    
    // Reset form
    const gradeSubject = document.getElementById('gradeSubject');
    if (gradeSubject) gradeSubject.value = '';
    
    const simpleRadio = document.querySelector('input[name="gradeType"][value="simple"]');
    if (simpleRadio) simpleRadio.checked = true;
    
    const categorizedConfig = document.getElementById('categorizedConfig');
    if (categorizedConfig) categorizedConfig.classList.add('hidden');
    
    // Show modal
    const modal = document.getElementById('addGradeModal');
    if (modal) modal.classList.remove('hidden');
    
    // Initialize step navigation
    updateStepNavigation();
    
    // Initialize advanced grade system
    initializeAdvancedGradeSystem();
}

function hideAddGradeModal() {
    const modal = document.getElementById('addGradeModal');
    if (modal) modal.classList.add('hidden');
    currentStep = 1;
    selectedStudents = [];
}

// Global functions for onclick handlers
window.showAddGradeModal = showAddGradeModal;
window.hideAddGradeModal = hideAddGradeModal;
window.showAddStudentModal = showAddStudentModal;
window.hideAddStudentModal = hideAddStudentModal;
window.showBulkAddStudentModal = showBulkAddStudentModal;
window.hideBulkAddStudentModal = hideBulkAddStudentModal;
window.resetBulkAddStudentModal = resetBulkAddStudentModal;
window.showAddSubjectModal = showAddSubjectModal;
window.hideAddSubjectModal = hideAddSubjectModal;
window.showEditSubjectModal = showEditSubjectModal;
window.hideEditSubjectModal = hideEditSubjectModal;
window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.showTab = showTab;
window.addBulkStudent = addBulkStudent;
window.removeBulkStudent = removeBulkStudent;
window.createBulkStudents = createBulkStudents;
window.copyPasscode = copyPasscode;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.showEditStudentModal = showEditStudentModal;
window.hideEditStudentModal = hideEditStudentModal;
window.generateNewPasscode = generateNewPasscode;
window.checkEmailExists = checkEmailExists;
window.checkEmailExistsEnhanced = checkEmailExistsEnhanced;
window.debugEmailStatus = debugEmailStatus;
window.handleOrphanedAuthAccount = handleOrphanedAuthAccount;
window.checkEmailExistsWithOrphanedHandling = checkEmailExistsWithOrphanedHandling;
window.handleFirebaseAuthError = handleFirebaseAuthError;
window.cleanupData = cleanupData;
window.logPerformance = logPerformance;
window.normalizeText = normalizeText;
window.generateEmail = generateEmail;
window.updateEmailField = updateEmailField;
window.showManagePeriodsModal = showManagePeriodsModal;
window.hideManagePeriodsModal = hideManagePeriodsModal;
window.setCurrentPeriod = setCurrentPeriod;
window.deleteAcademicPeriod = deleteAcademicPeriod;

// Debug function to check academic periods
window.debugAcademicPeriods = async function() {
    try {
        console.log('🔍 Debug: Verificando períodos académicos...');
        console.log('Current teacher ID:', currentTeacher?.uid);
        
        const periodsQuery = query(collection(db, 'academicPeriods'));
        const snapshot = await getDocs(periodsQuery);
        
        console.log(`📊 Total períodos en la base de datos: ${snapshot.docs.length}`);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Teacher: ${data.teacherId}, Year: ${data.academicYear}, Semester: ${data.semester}, Name: ${data.name}`);
        });
        
        console.log('📋 Períodos filtrados por teacher actual:', academicPeriods);
        console.log('📋 Años únicos:', [...new Set(academicPeriods.map(p => p.academicYear))]);
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
    }
};
window.signOut = () => {
    // Show confirmation dialog
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        firebaseSignOut(auth).then(() => {
            // Clear any stored data
            localStorage.removeItem('teacherSession');
            sessionStorage.clear();
            
            // Clear dashboard flag
            sessionStorage.removeItem('onDashboard');
            
            // Redirect to login page
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
            showNotification('Error al cerrar sesión', 'error');
        });
    }
};
// Advanced grade system global functions
window.nextStep = nextStep;
window.previousStep = previousStep;
window.addCategory = addCategory;
window.removeCategory = removeCategory;
window.selectAllStudents = selectAllStudents;
window.deselectAllStudents = deselectAllStudents;
window.toggleStudentSelection = toggleStudentSelection;
window.validateGrade = validateGrade;
window.calculateStudentTotal = calculateStudentTotal;
window.saveGrades = saveGrades;

// Prevent accidental navigation away from dashboard
window.addEventListener('beforeunload', function(e) {
    // Only show warning if user is authenticated and on dashboard
    // AND if there are unsaved changes (like form data being edited)
    if (auth.currentUser && window.location.href.includes('dashboard-teacher.html')) {
        // Check if there are any active forms with data
        const hasUnsavedChanges = checkForUnsavedChanges();
        
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.';
            return e.returnValue;
        }
    }
});

// Check if there are unsaved changes in forms
function checkForUnsavedChanges() {
    // Check if any modal is open with form data
    const openModals = document.querySelectorAll('.modal:not(.hidden)');
    
    for (const modal of openModals) {
        const forms = modal.querySelectorAll('form');
        for (const form of forms) {
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                if (value && value.trim() !== '') {
                    return true; // Found unsaved data
                }
            }
        }
    }
    
    // Check if any input fields have data
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea');
    for (const input of inputs) {
        if (input.value && input.value.trim() !== '') {
            return true; // Found unsaved data
        }
    }
    
    return false; // No unsaved changes
}

// Prevent back button from leaving dashboard
window.addEventListener('popstate', function(e) {
    if (auth.currentUser && window.location.href.includes('dashboard-teacher.html')) {
        // Push current state back to prevent navigation
        history.pushState(null, null, window.location.href);
        showNotification('Usa el botón de "Cerrar Sesión" para salir del dashboard', 'info');
    }
});

// Handle page reload to maintain session
window.addEventListener('load', function() {
    // If we're on the dashboard page, ensure we stay there
    if (window.location.href.includes('dashboard-teacher.html')) {
        // Store that we're on the dashboard to prevent redirects
        sessionStorage.setItem('onDashboard', 'true');
        
        // If user is authenticated, they should stay on dashboard
        if (auth.currentUser) {
            console.log('✅ Page reloaded, user authenticated, staying on dashboard');
        }
    }
});

// Clear dashboard flag when leaving
window.addEventListener('beforeunload', function() {
    if (window.location.href.includes('dashboard-teacher.html')) {
        sessionStorage.removeItem('onDashboard');
    }
});

// Initialize dashboard
initializeTeacherDashboard();

// Improved Firebase Auth error handling
function handleFirebaseAuthError(error, email) {
    console.error(`Firebase Auth error for ${email}:`, error);
    
    let errorMessage = 'Error desconocido';
    let shouldRetry = false;
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            errorMessage = `El email ${email} ya está registrado en Firebase Auth. Esto puede indicar una cuenta huérfana.`;
            // Show orphaned account instructions
            handleOrphanedAuthAccount(email);
            break;
        case 'auth/invalid-email':
            errorMessage = `Email inválido: ${email}`;
            break;
        case 'auth/weak-password':
            errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            break;
        case 'auth/network-request-failed':
            errorMessage = 'Error de conexión. Verifica tu internet';
            shouldRetry = true;
            break;
        case 'auth/too-many-requests':
            errorMessage = 'Demasiados intentos. Intenta más tarde';
            break;
        case 'auth/operation-not-allowed':
            errorMessage = 'Operación no permitida. Contacta al administrador';
            break;
        case 'auth/user-disabled':
            errorMessage = 'La cuenta ha sido deshabilitada';
            break;
        case 'auth/user-not-found':
            errorMessage = 'Usuario no encontrado';
            break;
        case 'auth/wrong-password':
            errorMessage = 'Contraseña incorrecta';
            break;
        case 'auth/account-exists-with-different-credential':
            errorMessage = 'Ya existe una cuenta con este email usando un método de autenticación diferente';
            break;
        case 'auth/requires-recent-login':
            errorMessage = 'Se requiere un inicio de sesión reciente para esta operación';
            break;
        case 'auth/credential-already-in-use':
            errorMessage = 'Esta credencial ya está en uso por otra cuenta';
            break;
        default:
            errorMessage = `Error de Firebase Auth: ${error.message || 'Error desconocido'}`;
    }
    
    return { errorMessage, shouldRetry };
}

// Data cleanup and performance optimization
function cleanupData() {
    // Clear any temporary data
    selectedStudents = [];
    currentStep = 1;
    gradeConfiguration = {
        type: 'simple',
        categories: []
    };
    
    // Clear any cached data that might be stale
    console.log('🧹 Data cleanup completed');
}

// Performance optimization: Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimized search function
const debouncedSearch = debounce(function(searchTerm) {
    updateStudentCheckboxList();
}, 300);

// Add performance monitoring
function logPerformance(operation, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`⏱️ ${operation} completed in ${duration.toFixed(2)}ms`);
}

