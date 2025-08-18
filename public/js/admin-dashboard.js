/**
 * Admin Dashboard JavaScript
 * 
 * Comprehensive admin system for managing:
 * - Promotions (Prom25 AM/PM)
 * - Subjects with teacher assignments
 * - Student enrollment by promotion
 * - Automatic subject assignment to students
 * 
 * Version: 1.0.0
 * Last Updated: 2024
 */

console.log('🚀 Admin dashboard script loaded successfully');

import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { onAuthStateChanged, signOut as firebaseSignOut, deleteUser, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    orderBy, 
    serverTimestamp, 
    writeBatch 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';


// Global variables
let currentAdmin = null;
let promotions = [];
let subjects = [];
let teachers = [];
let students = [];
let isInitialized = false;
let isCreatingUser = false;
let isCreatingBulkStudents = false;
let isRedirecting = false;

// Utility functions
function resetPermissionsRetryCount() {
    window.permissionsRetryCount = 0;
    console.log('🔄 Permissions retry count reset');
}

function showLoading(message = 'Procesando...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingDiv.innerHTML = `
        <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span class="text-gray-700 font-medium">${message}</span>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
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
    }, 5000);
}

function normalizeText(text) {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .trim();
}

function generateEmail(firstName, lastName, year = '2026') {
    const normalizedFirstName = normalizeText(firstName);
    const normalizedLastName = normalizeText(lastName);
    return `${normalizedFirstName}.${normalizedLastName}${year}@motta.superate.org.pa`;
}

function generatePasscode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Función para mostrar preview de emails
function previewEmails() {
    const bulkData = document.getElementById('bulkStudentsData').value.trim();
    const previewDiv = document.getElementById('emailPreview');
    const previewContent = document.getElementById('emailPreviewContent');
    const promotionSelect = document.getElementById('studentPromotion');
    
    if (!bulkData) {
        previewDiv.classList.add('hidden');
        return;
    }
    
    // Get the graduation year from the selected promotion
    const selectedPromotionId = promotionSelect ? promotionSelect.value : '';
    const selectedPromotion = promotions.find(p => p.id === selectedPromotionId);
    const graduationYear = selectedPromotion ? selectedPromotion.graduationYear.toString() : '2026';
    
    const lines = bulkData.split('\n').filter(line => line.trim());
    let previewHTML = '';
    
    lines.forEach((line, index) => {
        const fields = line.split(',').map(field => field.trim());
        const firstName = fields[0];
        const lastName = fields[1];
        
        if (firstName && lastName) {
            const email = generateEmail(firstName, lastName, graduationYear);
            previewHTML += `
                <div class="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                    <span class="text-gray-700">${firstName} ${lastName}</span>
                    <span class="text-blue-600 font-mono text-xs">${email}</span>
                </div>
            `;
        } else if (line.trim()) {
            previewHTML += `
                <div class="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                    <span class="text-red-500">❌ Formato inválido</span>
                    <span class="text-gray-500 text-xs">${line}</span>
                </div>
            `;
        }
    });
    
    if (previewHTML) {
        previewContent.innerHTML = previewHTML;
        previewDiv.classList.remove('hidden');
    } else {
        previewDiv.classList.add('hidden');
    }
}

// Función para limpiar el formulario de agregado en masa
function clearBulkForm() {
    const bulkData = document.getElementById('bulkStudentsData');
    const previewDiv = document.getElementById('emailPreview');
    
    if (bulkData) {
        bulkData.value = '';
    }
    
    if (previewDiv) {
        previewDiv.classList.add('hidden');
    }
    
    showNotification('Formulario limpiado', 'info');
}

// Modal functions
function showAddPromotionModal() {
    document.getElementById('addPromotionModal').classList.remove('hidden');
}

function hideAddPromotionModal() {
    document.getElementById('addPromotionModal').classList.add('hidden');
    document.getElementById('addPromotionForm').reset();
}

function showAddSubjectModal() {
    loadTeachersForSubjectModal();
    loadPromotionsForSubjectModal();
    document.getElementById('addSubjectModal').classList.remove('hidden');
}

function hideAddSubjectModal() {
    document.getElementById('addSubjectModal').classList.add('hidden');
    document.getElementById('addSubjectForm').reset();
}

function showAddStudentsModal() {
    loadPromotionsForStudentModal();
    document.getElementById('addStudentsModal').classList.remove('hidden');
    
    // Add event listener to update email preview when promotion changes
    const promotionSelect = document.getElementById('studentPromotion');
    if (promotionSelect) {
        promotionSelect.addEventListener('change', previewEmails);
    }
}

function hideAddStudentsModal() {
    document.getElementById('addStudentsModal').classList.add('hidden');
    document.getElementById('addStudentsForm').reset();
    
    // Limpiar también el preview de emails
    const previewDiv = document.getElementById('emailPreview');
    if (previewDiv) {
        previewDiv.classList.add('hidden');
    }
    
    // Reset method selector to individual
    const addMethod = document.getElementById('addMethod');
    if (addMethod) {
        addMethod.value = 'individual';
        const individualForm = document.getElementById('individualStudentForm');
        const bulkForm = document.getElementById('bulkStudentsForm');
        if (individualForm && bulkForm) {
            individualForm.classList.remove('hidden');
            bulkForm.classList.add('hidden');
        }
    }
    
    console.log('✅ Add students modal hidden and form reset');
}

// Edit modal functions
function hideEditPromotionModal() {
    document.getElementById('editPromotionModal').classList.add('hidden');
    document.getElementById('editPromotionForm').reset();
}

function hideEditSubjectModal() {
    document.getElementById('editSubjectModal').classList.add('hidden');
    document.getElementById('editSubjectForm').reset();
}

// Data loading functions
async function loadPromotions() {
    try {
        console.log('🔄 Loading promotions from Firestore...');
        showLoading('Cargando promociones...');
        const snapshot = await getDocs(collection(db, 'promotions'));
        console.log('📄 Raw promotions snapshot:', snapshot.docs.length, 'documents');
        
        promotions = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        console.log('✅ Promotions loaded:', promotions.length);
        console.log('📋 Promotions data:', promotions);
        
        promotions.sort((a, b) => a.name.localeCompare(b.name));
        updatePromotionsList();
    } catch (error) {
        console.error('❌ Error loading promotions:', error);
        showNotification('Error al cargar las promociones', 'error');
    } finally {
        hideLoading();
    }
}

async function loadSubjects() {
    try {
        console.log('Loading subjects...');
        showLoading('Cargando asignaturas...');
        const snapshot = await getDocs(collection(db, 'subjects'));
        subjects = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        console.log('Subjects loaded:', subjects.length);
        subjects.sort((a, b) => a.name.localeCompare(b.name));
        updateSubjectsList();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Error al cargar las asignaturas', 'error');
    } finally {
        hideLoading();
    }
}

async function loadTeachers() {
    try {
        console.log('🔄 Loading teachers from Firestore...');
        showLoading('Cargando profesores...');
        const teachersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'teacher')
        );
        const snapshot = await getDocs(teachersQuery);
        console.log('📄 Raw teachers snapshot:', snapshot.docs.length, 'documents');
        
        teachers = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        console.log('✅ Teachers loaded:', teachers.length);
        console.log('📋 Teachers data:', teachers);
        
        teachers.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        updateTeachersList();
    } catch (error) {
        console.error('❌ Error loading teachers:', error);
        showNotification('Error al cargar los profesores', 'error');
    } finally {
        hideLoading();
    }
}

async function loadStudents() {
    try {
        console.log('🔄 Loading students from Firestore...');
        showLoading('Cargando estudiantes...');
        
        // Check authentication first
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.log('⚠️ No authenticated user, attempting to re-authenticate...');
            
            // Try to re-authenticate with stored credentials
            try {
                const storedEmail = localStorage.getItem('adminEmail');
                const storedPassword = localStorage.getItem('adminPassword');
                
                if (storedEmail && storedPassword) {
                    await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
                    console.log('✅ Re-authenticated successfully');
                    // Reset retry count on successful re-authentication
                    resetPermissionsRetryCount();
                } else {
                    console.log('❌ No stored credentials found');
                    hideLoading();
                    showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                    return;
                }
            } catch (reauthError) {
                console.error('❌ Re-authentication failed:', reauthError);
                hideLoading();
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                return;
            }
        }
        
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student')
        );
        const snapshot = await getDocs(studentsQuery);
        
        students = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        console.log('✅ Students loaded:', students.length);
        console.log('📋 Students data:', students.map(s => ({
            name: `${s.firstName} ${s.lastName}`,
            level: s.level,
            promotionId: s.promotionId
        })));
        
        students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        // Update UI
        updateStudentsByPromotion();
        console.log('✅ Students UI updated');
        
        // Update promotions list to show current student counts
        updatePromotionsList();
        console.log('✅ Promotions list updated with new student counts');
        
    } catch (error) {
        console.error('❌ Error loading students:', error);
        
        // If it's a permissions error, try to handle it gracefully
        if (error.code === 'permission-denied' || error.message.includes('permissions')) {
            console.log('⚠️ Permissions error detected');
            
            // Check if we've already tried to refresh
            if (window.permissionsRetryCount === undefined) {
                window.permissionsRetryCount = 0;
            }
            
            if (window.permissionsRetryCount < 2) {
                window.permissionsRetryCount++;
                console.log(`🔄 Attempting to refresh authentication (attempt ${window.permissionsRetryCount}/2)...`);
                showNotification('Refrescando sesión...', 'warning');
                
                // Try to refresh the token
                try {
                    const currentUser = auth.currentUser;
                    if (currentUser) {
                        await currentUser.getIdToken(true);
                        console.log('✅ Token refreshed, retrying...');
                        // Retry once
                        setTimeout(() => loadStudents(), 2000);
                        return;
                    }
                } catch (refreshError) {
                    console.error('❌ Token refresh failed:', refreshError);
                }
            } else {
                console.log('❌ Max retry attempts reached, stopping retry loop');
                window.permissionsRetryCount = 0; // Reset for next time
                showNotification('Error de permisos persistente. Los estudiantes fueron creados pero la lista no se pudo actualizar. Recarga la página para ver los cambios.', 'warning');
                return;
            }
        }
        
        showNotification('Error al cargar los estudiantes', 'error');
        throw error; // Re-throw to handle in calling function
    } finally {
        hideLoading();
    }
}

// Alternative function to load students with better error handling
async function loadStudentsWithRetry(maxRetries = 1) {
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
        try {
            console.log(`🔄 Loading students (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            
            const studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'student')
            );
            const snapshot = await getDocs(studentsQuery);
            
            students = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            console.log('✅ Students loaded successfully:', students.length);
            students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
            
            // Update UI
            updateStudentsByPromotion();
            updatePromotionsList();
            
            // Reset permissions retry count on success
            resetPermissionsRetryCount();
            return;
            
        } catch (error) {
            retryCount++;
            console.error(`❌ Error loading students (attempt ${retryCount}):`, error);
            
            if (retryCount > maxRetries) {
                console.log('❌ Max retries reached, giving up');
                throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// UI update functions
// Filter functions for teachers
function filterTeachers() {
    const subjectFilter = document.getElementById('teacherSubjectFilter').value;
    const nameFilter = document.getElementById('teacherNameFilter').value.toLowerCase();
    const rows = document.querySelectorAll('#teachersTableBody tr');
    
    rows.forEach((row, index) => {
        const teacherId = row.getAttribute('data-teacher-id');
        const subjects = row.getAttribute('data-subjects').split(',');
        const name = row.getAttribute('data-name').toLowerCase();
        
        const matchesSubject = !subjectFilter || subjects.includes(subjectFilter);
        const matchesName = !nameFilter || name.includes(nameFilter);
        
        if (matchesSubject && matchesName) {
            row.style.display = '';
            // Update row number
            row.querySelector('td:first-child').textContent = index + 1;
        } else {
            row.style.display = 'none';
        }
    });
}

function clearTeacherFilters() {
    document.getElementById('teacherSubjectFilter').value = '';
    document.getElementById('teacherNameFilter').value = '';
    filterTeachers();
}

function updateTeachersList() {
    const teachersList = document.getElementById('teachersList');
    if (!teachersList) {
        console.log('⚠️ Teachers list element not found');
        return;
    }
    
    console.log('🔄 Updating teachers list UI with', teachers.length, 'teachers');
    
    if (teachers.length === 0) {
        teachersList.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <p class="text-lg font-medium mb-2">No hay profesores</p>
                <p class="text-sm">Comienza agregando tu primer profesor</p>
            </div>
        `;
        return;
    }
    
    // Create filter section
    const filterSection = `
        <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
            <div class="flex flex-wrap items-end gap-4">
                <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Filtrar por asignatura</label>
                    <select id="teacherSubjectFilter" class="input w-full" onchange="filterTeachers()">
                        <option value="">Todas las asignaturas</option>
                        ${subjects.map(subject => `
                            <option value="${subject.id}">${subject.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Buscar por nombre</label>
                    <input type="text" id="teacherNameFilter" class="input w-full" placeholder="Buscar profesor..." onkeyup="filterTeachers()">
                </div>
                <div class="flex-shrink-0">
                    <button onclick="clearTeacherFilters()" class="btn-secondary">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Limpiar filtros
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Create table
    const tableSection = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignaturas</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="teachersTableBody" class="bg-white divide-y divide-gray-200">
                        ${teachers.map((teacher, index) => {
                            const assignedSubjects = subjects.filter(s => s.teacherId === teacher.uid);
                            const subjectCount = assignedSubjects.length;
                            const subjectNames = assignedSubjects.map(s => s.name).join(', ') || 'Sin asignar';
                            return `
                                <tr class="hover:bg-gray-50" data-teacher-id="${teacher.uid}" data-subjects="${assignedSubjects.map(s => s.id).join(',')}" data-name="${teacher.firstName} ${teacher.lastName}">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${teacher.firstName} ${teacher.lastName}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${teacher.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${teacher.specialty || 'Sin especialidad'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            ${subjectCount} asignatura${subjectCount !== 1 ? 's' : ''}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div class="flex space-x-2">
                                            <button onclick="editTeacher('${teacher.uid}')" class="btn-secondary text-xs" title="Editar profesor">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </button>
                                            <button onclick="deleteTeacher('${teacher.uid}')" class="btn-danger text-xs" title="Eliminar profesor">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    teachersList.innerHTML = filterSection + tableSection;
    console.log('✅ Teachers list UI updated');
}

function updatePromotionsList() {
    const promotionsList = document.getElementById('promotionsList');
    if (!promotionsList) return;
    
    console.log('🔄 Updating promotions list...');
    console.log('📋 All students:', students.map(s => `${s.firstName} ${s.lastName} (promotionId: ${s.promotionId})`));
    console.log('📋 All promotions:', promotions.map(p => `${p.name} (id: ${p.id})`));
    
    if (promotions.length === 0) {
        promotionsList.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <p class="text-lg font-medium mb-2">No hay promociones</p>
                <p class="text-sm">Comienza creando tu primera promoción</p>
            </div>
        `;
        return;
    }
    
    promotionsList.innerHTML = promotions.map(promotion => {
        const studentCount = students.filter(s => s.promotionId === promotion.id).length;
        console.log(`📊 Promotion ${promotion.name}: ${studentCount} students (promotionId: ${promotion.id})`);
        console.log(`📋 Students in this promotion:`, students.filter(s => s.promotionId === promotion.id).map(s => `${s.firstName} ${s.lastName}`));
        return `
            <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900">${promotion.name} - ${promotion.turn}</h3>
                        <p class="text-sm text-gray-600">Graduación: ${promotion.graduationYear} • ${studentCount} estudiantes</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                        ${studentCount} estudiantes
                    </span>
                    <button onclick="editPromotion('${promotion.id}')" class="btn-secondary text-sm" title="Editar promoción">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deletePromotion('${promotion.id}')" class="btn-danger text-sm" title="Eliminar promoción">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateSubjectsList() {
    const subjectsList = document.getElementById('subjectsList');
    if (!subjectsList) return;
    
    if (subjects.length === 0) {
        subjectsList.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                <p class="text-lg font-medium mb-2">No hay asignaturas</p>
                <p class="text-sm">Crea las asignaturas para tu sistema</p>
            </div>
        `;
        return;
    }
    
    subjectsList.innerHTML = subjects.map(subject => {
        const teacher = teachers.find(t => t.uid === subject.teacherId);
        const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Sin asignar';
        const promotionCount = subject.promotions?.length || 0;
        
        return `
            <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900">${subject.name}</h3>
                        <p class="text-sm text-gray-600">Profesor: ${teacherName}</p>
                        <p class="text-sm text-gray-600">Año: ${subject.academicYear || 'N/A'} | Semestre: ${subject.semester || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Promociones: ${promotionCount}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 bg-warning-100 text-warning-800 text-xs font-medium rounded-full">
                        ${promotionCount} promociones
                    </span>
                    <button onclick="editSubject('${subject.id}')" class="btn-secondary text-sm" title="Editar asignatura">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteSubject('${subject.id}')" class="btn-danger text-sm" title="Eliminar asignatura">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter functions for students
function filterStudents() {
    const promotionFilter = document.getElementById('studentPromotionFilter').value;
    const turnFilter = document.getElementById('studentTurnFilter').value;
    const levelFilter = document.getElementById('studentLevelFilter').value;
    const nameFilter = document.getElementById('studentNameFilter').value.toLowerCase();
    const rows = document.querySelectorAll('#studentsTableBody tr');
    
    rows.forEach((row, index) => {
        const promotionId = row.getAttribute('data-promotion-id');
        const turn = row.getAttribute('data-turn');
        const level = row.getAttribute('data-level');
        const name = row.getAttribute('data-name').toLowerCase();
        
        const matchesPromotion = !promotionFilter || promotionId === promotionFilter;
        const matchesTurn = !turnFilter || turn === turnFilter;
        const matchesLevel = !levelFilter || level === levelFilter;
        const matchesName = !nameFilter || name.includes(nameFilter);
        
        if (matchesPromotion && matchesTurn && matchesLevel && matchesName) {
            row.style.display = '';
            // Update row number
            row.querySelector('td:first-child').textContent = index + 1;
        } else {
            row.style.display = 'none';
        }
    });
}

function clearStudentFilters() {
    document.getElementById('studentPromotionFilter').value = '';
    document.getElementById('studentTurnFilter').value = '';
    document.getElementById('studentLevelFilter').value = '';
    document.getElementById('studentNameFilter').value = '';
    filterStudents();
}

function updateStudentsByPromotion() {
    const studentsByPromotion = document.getElementById('studentsByPromotion');
    if (!studentsByPromotion) return;
    
    if (promotions.length === 0) {
        studentsByPromotion.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <p class="text-lg font-medium mb-2">No hay promociones</p>
                <p class="text-sm">Comienza creando promociones para organizar a los estudiantes</p>
            </div>
        `;
        return;
    }
    
    if (students.length === 0) {
        studentsByPromotion.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                </svg>
                <p class="text-lg font-medium mb-2">No hay estudiantes</p>
                <p class="text-sm">Agrega estudiantes a las promociones</p>
            </div>
        `;
        return;
    }
    
    // Create filter section
    const filterSection = `
        <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
            <div class="flex flex-wrap items-end gap-4">
                <div class="flex-1 min-w-40">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Filtrar por promoción</label>
                    <select id="studentPromotionFilter" class="input w-full" onchange="filterStudents()">
                        <option value="">Todas las promociones</option>
                        ${promotions.map(promotion => `
                            <option value="${promotion.id}">${promotion.name} - ${promotion.turn}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="flex-1 min-w-32">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Filtrar por turno</label>
                    <select id="studentTurnFilter" class="input w-full" onchange="filterStudents()">
                        <option value="">Todos los turnos</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
                <div class="flex-1 min-w-32">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Filtrar por nivel</label>
                    <select id="studentLevelFilter" class="input w-full" onchange="filterStudents()">
                        <option value="">Todos los niveles</option>
                        <option value="Freshman">Freshman</option>
                        <option value="Junior">Junior</option>
                        <option value="Senior">Senior</option>
                    </select>
                </div>
                <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Buscar por nombre</label>
                    <input type="text" id="studentNameFilter" class="input w-full" placeholder="Buscar estudiante..." onkeyup="filterStudents()">
                </div>
                <div class="flex-shrink-0">
                    <button onclick="clearStudentFilters()" class="btn-secondary">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Limpiar filtros
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Create table
    const tableSection = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turno</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="studentsTableBody" class="bg-white divide-y divide-gray-200">
                        ${students.map((student, index) => {
                            const promotion = promotions.find(p => p.id === student.promotionId);
                            const promotionName = promotion ? `${promotion.name} - ${promotion.turn}` : 'Sin promoción';
                            const turn = promotion ? promotion.turn : 'N/A';
                            const level = student.level || 'Freshman';
                            
                            // Add color coding for levels
                            let levelClass = 'text-gray-900';
                            if (level === 'Senior') {
                                levelClass = 'text-red-600 font-semibold';
                            } else if (level === 'Junior') {
                                levelClass = 'text-orange-600 font-semibold';
                            } else if (level === 'Freshman') {
                                levelClass = 'text-green-600 font-semibold';
                            }
                            
                            return `
                                <tr class="hover:bg-gray-50" data-promotion-id="${student.promotionId || ''}" data-turn="${turn}" data-level="${level}" data-name="${student.firstName} ${student.lastName}">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                                        <div class="text-sm text-gray-500">${promotionName}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 font-bold">${student.passcode || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${turn}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm ${levelClass}">${level}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div class="flex space-x-2">
                                            <button onclick="editStudent('${student.uid}')" class="btn-secondary text-xs" title="Editar estudiante">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </button>
                                            <button onclick="deleteStudent('${student.uid}')" class="btn-danger text-xs" title="Eliminar estudiante">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    studentsByPromotion.innerHTML = filterSection + tableSection;
}

function updateStats() {
    console.log('📊 Updating stats with:', {
        students: students.length,
        promotions: promotions.length,
        subjects: subjects.length,
        teachers: teachers.length
    });
    
    const totalStudentsEl = document.getElementById('totalStudents');
    const totalPromotionsEl = document.getElementById('totalPromotions');
    const totalSubjectsEl = document.getElementById('totalSubjects');
    const totalTeachersEl = document.getElementById('totalTeachers');
    
    if (totalStudentsEl) totalStudentsEl.textContent = students.length;
    if (totalPromotionsEl) totalPromotionsEl.textContent = promotions.length;
    if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
    if (totalTeachersEl) totalTeachersEl.textContent = teachers.length;
    
    console.log('✅ Stats updated successfully');
}

// Modal data loading functions
function loadTeachersForSubjectModal() {
    const teacherSelect = document.getElementById('subjectTeacher');
    if (!teacherSelect) return;
    
    teacherSelect.innerHTML = '<option value="">Seleccionar profesor</option>';
    teachers.forEach(teacher => {
        teacherSelect.innerHTML += `<option value="${teacher.uid}">${teacher.firstName} ${teacher.lastName}</option>`;
    });
}

function loadPromotionsForSubjectModal() {
    const promotionsCheckboxes = document.getElementById('promotionsCheckboxes');
    if (!promotionsCheckboxes) return;
    
    promotionsCheckboxes.innerHTML = promotions.map(promotion => `
        <label class="flex items-center">
            <input type="checkbox" name="promotions" value="${promotion.id}" class="mr-2">
            <span class="text-sm">${promotion.name} - ${promotion.turn}</span>
        </label>
    `).join('');
}

function loadPromotionsForStudentModal() {
    const promotionSelect = document.getElementById('studentPromotion');
    if (!promotionSelect) return;
    
    promotionSelect.innerHTML = '<option value="">Seleccionar promoción</option>';
    promotions.forEach(promotion => {
        promotionSelect.innerHTML += `<option value="${promotion.id}">${promotion.name} - ${promotion.turn}</option>`;
    });
}

// CRUD operations
async function addPromotion(formData) {
    try {
        showLoading('Creando promoción...');
        
        const promotionData = {
            name: formData.get('name').trim(),
            turn: formData.get('turn'),
            graduationYear: parseInt(formData.get('graduationYear')),
            createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'promotions'), promotionData);
        showNotification('Promoción creada exitosamente', 'success');
        hideAddPromotionModal();
        await loadPromotions();
        // Update statistics after successful promotion addition
        updateStats();
    } catch (error) {
        console.error('Error adding promotion:', error);
        showNotification('Error al crear la promoción', 'error');
    } finally {
        hideLoading();
    }
}

async function addSubject(formData) {
    try {
        showLoading('Creando asignatura...');
        
        const selectedPromotions = Array.from(formData.getAll('promotions'));
        
        const subjectData = {
            name: formData.get('name').trim(),
            teacherId: formData.get('teacherId'),
            academicYear: parseInt(formData.get('academicYear')),
            semester: parseInt(formData.get('semester')),
            promotions: selectedPromotions,
            createdAt: serverTimestamp()
        };
        
        const subjectRef = await addDoc(collection(db, 'subjects'), subjectData);
        
        // Automatically assign subject to all students in selected promotions
        if (selectedPromotions.length > 0) {
            await assignSubjectToStudents(subjectRef.id, selectedPromotions);
        }
        
        showNotification('Asignatura creada exitosamente', 'success');
        hideAddSubjectModal();
        await loadSubjects();
        // Update statistics after successful subject addition
        updateStats();
    } catch (error) {
        console.error('Error adding subject:', error);
        showNotification('Error al crear la asignatura', 'error');
    } finally {
        hideLoading();
    }
}

async function assignSubjectToStudents(subjectId, promotionIds) {
    try {
        const batch = writeBatch(db);
        
        // Get all students in the selected promotions
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('promotionId', 'in', promotionIds)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        
        studentsSnapshot.docs.forEach(studentDoc => {
            const studentSubjectRef = doc(collection(db, 'studentSubjects'));
            batch.set(studentSubjectRef, {
                studentId: studentDoc.id,
                subjectId: subjectId,
                createdAt: serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log(`Subject ${subjectId} assigned to ${studentsSnapshot.docs.length} students`);
    } catch (error) {
        console.error('Error assigning subject to students:', error);
        throw error;
    }
}

async function addStudents(formData) {
    try {
        const promotionId = formData.get('promotionId');
        const method = formData.get('method');
        
        console.log('🔄 Adding students with method:', method);
        console.log('📊 Promotion ID:', promotionId);
        
        // Show loading based on method
        if (method === 'individual') {
            showLoading('Agregando estudiante...');
            await addIndividualStudent(formData, promotionId);
        } else {
            showLoading('Agregando estudiantes en masa...');
            await addBulkStudents(formData, promotionId);
        }
        
        // Reset form and close modal
        const form = document.getElementById('addStudentsForm');
        if (form) form.reset();
        hideAddStudentsModal();
        
        // Always try to reload students and update UI
        console.log('🔄 Reloading students list...');
        try {
            // Use the new function with better error handling
            await loadStudentsWithRetry(1);
            console.log('✅ Students list reloaded successfully');
            
            // Update statistics after successful student addition
            updateStats();
            console.log('✅ Stats updated');
            
            showNotification('Estudiantes agregados exitosamente. Lista actualizada.', 'success');
        } catch (error) {
            console.error('❌ Error reloading students list:', error);
            
            // If it's a permissions error, show a more specific message
            if (error.code === 'permission-denied' || error.message.includes('permissions')) {
                showNotification('Estudiantes agregados exitosamente. La lista se actualizará automáticamente en unos momentos.', 'success');
                
                // Try to reload after a delay, but only once
                setTimeout(async () => {
                    try {
                        console.log('🔄 Attempting delayed reload...');
                        await loadStudentsWithRetry(0); // No additional retries
                        console.log('✅ Students list reloaded after delay');
                    } catch (retryError) {
                        console.error('❌ Delayed retry failed:', retryError);
                        showNotification('Los estudiantes fueron creados exitosamente. Recarga la página para ver la lista actualizada.', 'info');
                    }
                }, 5000); // Increased delay to 5 seconds
            } else {
                showNotification('Estudiantes agregados. La lista se actualizará al refrescar la página.', 'success');
            }
        }
    } catch (error) {
        console.error('Error adding students:', error);
        showNotification('Error al agregar estudiantes', 'error');
    } finally {
        hideLoading();
    }
}

async function addIndividualStudent(formData, promotionId) {
        if (isCreatingUser) {
            console.log('⚠️ Already creating a user, skipping...');
            return;
        }
        
        isCreatingUser = true;
        
        try {
            const firstName = formData.get('firstName').trim();
            const lastName = formData.get('lastName').trim();
            let email = formData.get('email').trim();
            const level = formData.get('level') || 'Freshman';
            
            console.log('🔄 Creating individual student with level:', level);
            
            if (!email) {
                // Get the graduation year from the selected promotion
                const selectedPromotion = promotions.find(p => p.id === promotionId);
                const graduationYear = selectedPromotion ? selectedPromotion.graduationYear.toString() : '2026';
                email = generateEmail(firstName, lastName, graduationYear);
            }
            
            const password = generatePasscode();
            
            console.log('🔄 Creating individual student:', { firstName, lastName, email, promotionId, level });
            
            // Validate required fields
            if (!firstName || !lastName) {
                throw new Error('Nombre y apellido son obligatorios');
            }
            
            // Create user with Firebase Auth (same method as register.js)
            console.log('🔄 Creating student in Firebase Auth...');
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                email, 
                password
            );
        
            const user = userCredential.user;
            console.log('✅ Student created in Auth:', user.uid);
            console.log('🔍 Current admin UID:', currentAdmin ? currentAdmin.uid : 'null');
            console.log('🔍 New student UID:', user.uid);
        
            // Create user document in Firestore (same structure as register.js)
            const userDoc = {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: email.toLowerCase(),
                promotionId: promotionId,
                role: 'student',
                passcode: password,
                level: level,
                createdAt: new Date(),
                isActive: true
            };
        
            await setDoc(doc(db, 'users', user.uid), userDoc);
            console.log('✅ Student document created in Firestore with level:', level);
            
            // Assign all subjects for this promotion to the student
            await assignPromotionSubjectsToStudent(user.uid, promotionId);
            
            // Verify that the current admin is still authenticated
            const currentUser = auth.currentUser;
            console.log('🔍 Current Firebase user after creation:', currentUser ? currentUser.uid : 'null');
            console.log('🔍 Expected admin UID:', currentAdmin ? currentAdmin.uid : 'null');
            
            console.log('✅ Student created successfully');
            showNotification('Estudiante creado exitosamente', 'success');
            
        } catch (error) {
            console.error('❌ Error creating student:', error);
            
            let message = 'Error creando estudiante';
            if (error.code === 'auth/email-already-in-use') {
                message = 'El email ya está en uso';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña es muy débil';
            } else if (error.code === 'auth/invalid-email') {
                message = 'El email no es válido';
            } else if (error.code === 'auth/admin-restricted-operation') {
                message = 'Error de configuración de Firebase. Contacta al administrador.';
            } else if (error.message) {
                message = error.message;
            }
            
            showNotification(message, 'error');
        } finally {
            isCreatingUser = false;
        }
    }

async function addBulkStudents(formData, promotionId) {
    if (isCreatingBulkStudents) {
        console.log('⚠️ Already creating bulk students, skipping...');
        return { successCount: 0, errorCount: 0 };
    }
    
    isCreatingBulkStudents = true;
    
    // Store admin UID for reference
    const adminUid = currentAdmin?.uid;
    
    try {
        const bulkData = formData.get('bulkData').trim();
        const level = formData.get('level') || 'Freshman';
        const lines = bulkData.split('\n').filter(line => line.trim());
        
        console.log(`🔄 Procesando ${lines.length} estudiantes con nivel: ${level}`);
        
        const createdStudents = [];
        let successCount = 0;
        let errorCount = 0;
    
    console.log(`🔄 Procesando ${lines.length} estudiantes...`);
    
    // First pass: Create all users in Auth
    const usersToCreate = [];
    
    for (const line of lines) {
        // Solo procesar nombre y apellido, ignorar cualquier tercer campo
        const fields = line.split(',').map(field => field.trim());
        const firstName = fields[0];
        const lastName = fields[1];
        
        if (!firstName || !lastName) {
            console.log(`⚠️  Línea ignorada (datos incompletos): ${line}`);
            continue;
        }
        
        // Get the graduation year from the selected promotion
        const selectedPromotion = promotions.find(p => p.id === promotionId);
        const graduationYear = selectedPromotion ? selectedPromotion.graduationYear.toString() : '2026';
        
        // Generar email automáticamente con el formato especificado
        const finalEmail = generateEmail(firstName, lastName, graduationYear);
        const password = generatePasscode();
        
        console.log(`📧 Generando email para ${firstName} ${lastName}: ${finalEmail}`);
        console.log(`🔑 Passcode generado: ${password}`);
        console.log(`📊 Nivel asignado: ${level}`);
        
        usersToCreate.push({
            firstName,
            lastName,
            email: finalEmail,
            password,
            level
        });
    }
    
    // Create users in Auth
    for (const userData of usersToCreate) {
        try {
            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                userData.email, 
                userData.password
            );

            const user = userCredential.user;
            console.log(`✅ Auth user created: ${user.uid}`);

            // Create user document in Firestore
            const userDoc = {
                uid: user.uid,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email.toLowerCase(),
                promotionId: promotionId,
                role: 'student',
                passcode: userData.password,
                level: userData.level,
                createdAt: new Date(),
                isActive: true
            };

            // Add to Firestore directly
            await setDoc(doc(db, 'users', user.uid), userDoc);
            console.log(`✅ Firestore document created for: ${user.uid} with level: ${userData.level}`);
            
            createdStudents.push(user.uid);
            successCount++;
            console.log(`✅ Estudiante creado: ${userData.firstName} ${userData.lastName}`);
            console.log(`   📧 Email: ${userData.email}`);
            console.log(`   🔑 Passcode: ${userData.password}`);
            
        } catch (error) {
            errorCount++;
            console.error(`❌ Error creando estudiante ${userData.firstName} ${userData.lastName}:`, error.message);
            
            // Si el error es por email duplicado, mostrar información útil
            if (error.code === 'auth/email-already-in-use') {
                console.log(`   💡 El email ${userData.email} ya existe. Verifica si el estudiante ya está registrado.`);
            }
        }
        
        // Pequeña pausa para evitar límites de rate
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📦 Firestore documents created for ${createdStudents.length} estudiantes`);
    
    // Assign subjects to newly created students
    if (createdStudents.length > 0) {
        console.log(`📋 ${createdStudents.length} students created successfully`);
        console.log('🔄 Assigning subjects to newly created students...');
        
        try {
            await assignSubjectsToNewStudents(createdStudents, promotionId);
            console.log('✅ Subject assignments completed for bulk students');
        } catch (error) {
            console.error('❌ Error assigning subjects to bulk students:', error);
            console.log('💡 You can manually assign subjects later if needed');
        }
    }
    
    // Note: Admin authentication may have changed, but we'll continue
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid !== adminUid) {
        console.log('⚠️ Admin authentication changed after bulk creation');
        console.log('💡 This is expected behavior when creating users');
        console.log('💡 Students list will be updated when admin re-authenticates');
    }
    
    // Mostrar resumen
    console.log(`🎉 Proceso completado:`);
    console.log(`   ✅ Estudiantes creados exitosamente: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📝 Total procesado: ${lines.length}`);
    
    // Mostrar notificación con resumen
    if (successCount > 0) {
        showNotification(`${successCount} estudiantes agregados exitosamente${errorCount > 0 ? ` (${errorCount} errores)` : ''}. Usa "Ver Passcodes" para ver las credenciales.`, 'success');
        
        // Show option to assign subjects if there are students created
        setTimeout(() => {
            if (confirm('¿Deseas asignar materias a los estudiantes recién creados?')) {
                assignSubjectsToNewStudents(createdStudents, promotionId);
            }
        }, 2000);
    } else {
        showNotification(`No se pudieron agregar estudiantes. Revisa la consola para más detalles.`, 'error');
    }
    
    // Return success status for the calling function
    return { successCount, errorCount };
} finally {
    isCreatingBulkStudents = false;
}
}

async function assignPromotionSubjectsToStudent(studentId, promotionId) {
    try {
        console.log(`🔄 Assigning subjects to student ${studentId} for promotion ${promotionId}`);
        
        // Get all subjects for this promotion
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('promotions', 'array-contains', promotionId)
        );
        
        const subjectsSnapshot = await getDocs(subjectsQuery);
        console.log(`📚 Found ${subjectsSnapshot.docs.length} subjects for promotion ${promotionId}`);
        
        if (subjectsSnapshot.docs.length === 0) {
            console.log('⚠️ No subjects found for this promotion');
            return;
        }
        
        // Create assignments one by one to avoid batch permission issues
        for (const subjectDoc of subjectsSnapshot.docs) {
            const studentSubjectRef = doc(collection(db, 'studentSubjects'));
            await setDoc(studentSubjectRef, {
                studentId: studentId,
                subjectId: subjectDoc.id,
                promotionId: promotionId,
                createdAt: new Date()
            });
            console.log(`✅ Assigned subject ${subjectDoc.data().name} to student ${studentId}`);
        }
        
        console.log(`✅ Successfully assigned ${subjectsSnapshot.docs.length} subjects to student ${studentId}`);
    } catch (error) {
        console.error('❌ Error assigning promotion subjects to student:', error);
        throw error; // Re-throw to handle in calling function
    }
}

async function assignSubjectsToNewStudents(studentIds, promotionId) {
    console.log(`🔄 Assigning subjects to ${studentIds.length} new students for promotion ${promotionId}...`);
    
    try {
        // Check authentication first
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.log('⚠️ No authenticated user for subject assignment, skipping...');
            showNotification('No se pudieron asignar materias automáticamente. Puedes asignarlas manualmente más tarde.', 'warning');
            return;
        }
        
        // Get all subjects for this promotion
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('promotions', 'array-contains', promotionId)
        );
        
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjects = subjectsSnapshot.docs;
        
        console.log(`📚 Found ${subjects.length} subjects for promotion ${promotionId}`);
        
        if (subjects.length === 0) {
            console.log('⚠️ No subjects found for this promotion');
            showNotification('No se encontraron materias para esta promoción. Los estudiantes fueron creados pero no tienen materias asignadas.', 'warning');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const studentId of studentIds) {
            try {
                console.log(`🔄 Assigning subjects to student ${studentId}...`);
                
                // Create assignments for each subject
                for (const subjectDoc of subjects) {
                    const studentSubjectRef = doc(collection(db, 'studentSubjects'));
                    await setDoc(studentSubjectRef, {
                        studentId: studentId,
                        subjectId: subjectDoc.id,
                        promotionId: promotionId,
                        createdAt: new Date()
                    });
                    console.log(`✅ Assigned subject ${subjectDoc.data().name} to student ${studentId}`);
                }
                successCount++;
                console.log(`✅ Successfully assigned ${subjects.length} subjects to student ${studentId}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Error assigning subjects to student ${studentId}:`, error);
                
                // If it's a permissions error, stop trying
                if (error.code === 'permission-denied' || error.message.includes('permissions')) {
                    console.log('⚠️ Permissions error detected, stopping subject assignments');
                    showNotification('Error de permisos al asignar materias. Los estudiantes fueron creados pero las materias se asignarán más tarde.', 'warning');
                    break;
                }
            }
        }
        
        console.log(`🎉 Subject assignment completed: ${successCount} successful, ${errorCount} errors`);
        
        if (successCount > 0) {
            showNotification(`${successCount} estudiantes recibieron materias exitosamente${errorCount > 0 ? ` (${errorCount} errores)` : ''}`, 'success');
        } else {
            showNotification('Error asignando materias a los estudiantes', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error in bulk subject assignment:', error);
        showNotification('Error asignando materias a los estudiantes', 'error');
        throw error;
    }
}

// Modal functions for assigning subjects
function showAssignSubjectsModal() {
    const modal = document.getElementById('assignSubjectsModal');
    const promotionSelect = document.getElementById('assignPromotion');
    const studentsSelect = document.getElementById('assignStudents');
    const subjectsCheckboxes = document.getElementById('assignSubjectsCheckboxes');
    
    // Load promotions
    promotionSelect.innerHTML = '<option value="">Seleccionar promoción</option>';
    promotions.forEach(promotion => {
        const option = document.createElement('option');
        option.value = promotion.id;
        option.textContent = `${promotion.name} - ${promotion.turn}`;
        promotionSelect.appendChild(option);
    });
    
    // Load students
    studentsSelect.innerHTML = '<option value="">Cargando estudiantes...</option>';
    const studentOptions = students.map(student => {
        const option = document.createElement('option');
        option.value = student.uid;
        option.textContent = `${student.firstName} ${student.lastName} - ${student.email}`;
        return option;
    });
    studentsSelect.innerHTML = '';
    studentOptions.forEach(option => studentsSelect.appendChild(option));
    
    // Load subjects
    subjectsCheckboxes.innerHTML = '';
    subjects.forEach(subject => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        div.innerHTML = `
            <input type="checkbox" id="assign_subject_${subject.id}" name="subjects" value="${subject.id}" class="mr-2">
            <label for="assign_subject_${subject.id}" class="text-sm">${subject.name}</label>
        `;
        subjectsCheckboxes.appendChild(div);
    });
    
    modal.classList.remove('hidden');
}

function hideAssignSubjectsModal() {
    const modal = document.getElementById('assignSubjectsModal');
    modal.classList.add('hidden');
    document.getElementById('assignSubjectsForm').reset();
}

async function handleAssignSubjects(formData) {
    const promotionId = formData.get('promotionId');
    const selectedStudents = Array.from(formData.getAll('studentIds'));
    const selectedSubjects = Array.from(formData.getAll('subjects'));
    
    if (!promotionId || selectedStudents.length === 0 || selectedSubjects.length === 0) {
        showNotification('Por favor selecciona una promoción, estudiantes y materias', 'error');
        return;
    }
    
    try {
        showLoading('Asignando materias...');
        console.log(`🔄 Assigning ${selectedSubjects.length} subjects to ${selectedStudents.length} students...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const studentId of selectedStudents) {
        for (const subjectId of selectedSubjects) {
            try {
                const studentSubjectRef = doc(collection(db, 'studentSubjects'));
                await setDoc(studentSubjectRef, {
                    studentId: studentId,
                    subjectId: subjectId,
                    promotionId: promotionId,
                    createdAt: new Date()
                });
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`❌ Error assigning subject ${subjectId} to student ${studentId}:`, error);
            }
        }
    }
    
    console.log(`🎉 Assignment completed: ${successCount} successful, ${errorCount} errors`);
    showNotification(`${successCount} asignaciones creadas exitosamente${errorCount > 0 ? ` (${errorCount} errores)` : ''}`, 'success');
    
    hideAssignSubjectsModal();
    } catch (error) {
        console.error('Error in bulk subject assignment:', error);
        showNotification('Error asignando materias a los estudiantes', 'error');
    } finally {
        hideLoading();
    }
}

// Delete operations
async function deletePromotion(promotionId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta promoción? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showLoading('Eliminando promoción...');
        const batch = writeBatch(db);
        
        // Delete promotion
        batch.delete(doc(db, 'promotions', promotionId));
        
        // Remove promotion from subjects
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('promotions', 'array-contains', promotionId)
        );
        
        const subjectsSnapshot = await getDocs(subjectsQuery);
        subjectsSnapshot.docs.forEach(subjectDoc => {
            const updatedPromotions = subjectDoc.data().promotions.filter(id => id !== promotionId);
            batch.update(doc(db, 'subjects', subjectDoc.id), {
                promotions: updatedPromotions
            });
        });
        
        // Delete students in this promotion
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('promotionId', '==', promotionId)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        console.log(`🔄 Deleting ${studentsSnapshot.docs.length} students from promotion`);
        
        studentsSnapshot.docs.forEach(studentDoc => {
            batch.delete(doc(db, 'users', studentDoc.id));
            console.log(`🗑️ Deleting student document: ${studentDoc.id}`);
        });
        
        await batch.commit();
        console.log('✅ Batch commit completed - promotion and students deleted from Firestore');
        console.log('⚠️ Note: Students remain in Firebase Auth for security reasons');
        console.log('💡 To completely delete users, use Firebase Console or Cloud Functions');
        
        showNotification('Promoción eliminada exitosamente (documentos eliminados de la base de datos)', 'success');
        
        // Show instructions for manual deletion
        setTimeout(() => {
            showNotification('💡 Para eliminar completamente los usuarios de Auth, ve a Firebase Console → Authentication → Users', 'info');
        }, 3000);
        await loadPromotions();
        await loadSubjects();
        await loadStudents();
        // Update statistics after successful deletion
        updateStats();
        // Update promotions list to show updated student counts
        updatePromotionsList();
    } catch (error) {
        console.error('Error deleting promotion:', error);
        showNotification('Error al eliminar la promoción', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteSubject(subjectId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta asignatura? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showLoading('Eliminando asignatura...');
        const batch = writeBatch(db);
        
        // Delete subject
        batch.delete(doc(db, 'subjects', subjectId));
        
        // Delete all student-subject assignments
        const studentSubjectsQuery = query(
            collection(db, 'studentSubjects'),
            where('subjectId', '==', subjectId)
        );
        
        const studentSubjectsSnapshot = await getDocs(studentSubjectsQuery);
        studentSubjectsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        showNotification('Asignatura eliminada exitosamente', 'success');
        await loadSubjects();
        // Update statistics after successful deletion
        updateStats();
    } catch (error) {
        console.error('Error deleting subject:', error);
        showNotification('Error al eliminar la asignatura', 'error');
    } finally {
        hideLoading();
    }
}

// Update operations
async function updatePromotion(formData) {
    try {
        showLoading('Actualizando promoción...');
        const promotionId = formData.get('id');
        const promotionData = {
            name: formData.get('name').trim(),
            turn: formData.get('turn'),
            graduationYear: parseInt(formData.get('graduationYear')),
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(doc(db, 'promotions', promotionId), promotionData);
        showNotification('Promoción actualizada exitosamente', 'success');
        hideEditPromotionModal();
        await loadPromotions();
        // Update statistics after successful promotion update
        updateStats();
        // Update promotions list to show current student counts
        updatePromotionsList();
    } catch (error) {
        console.error('Error updating promotion:', error);
        showNotification('Error al actualizar la promoción', 'error');
    } finally {
        hideLoading();
    }
}

async function updateSubject(formData) {
    try {
        showLoading('Actualizando asignatura...');
        const subjectId = formData.get('id');
        const selectedPromotions = Array.from(formData.getAll('promotions'));
        
        const subjectData = {
            name: formData.get('name').trim(),
            teacherId: formData.get('teacherId'),
            academicYear: parseInt(formData.get('academicYear')),
            semester: parseInt(formData.get('semester')),
            promotions: selectedPromotions,
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(doc(db, 'subjects', subjectId), subjectData);
        showNotification('Asignatura actualizada exitosamente', 'success');
        hideEditSubjectModal();
        await loadSubjects();
        // Update statistics after successful subject update
        updateStats();
    } catch (error) {
        console.error('Error updating subject:', error);
        showNotification('Error al actualizar la asignatura', 'error');
    } finally {
        hideLoading();
    }
}

// Initialize admin dashboard
function initializeAdminDashboard() {
    console.log('Initializing admin dashboard...');
    console.log('Current admin:', currentAdmin);
    
    // Check if user is admin
    if (!currentAdmin || currentAdmin.role !== 'admin') {
        console.log('User is not admin, redirecting...');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('Admin authenticated, loading data...');
    
    // Set admin name
    const adminName = document.getElementById('adminName');
    if (adminName) {
        adminName.textContent = `${currentAdmin.firstName} ${currentAdmin.lastName}`;
    }
    
    // Load all data
    loadPromotions();
    loadSubjects();
    loadTeachers();
    loadStudents();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Admin dashboard initialized successfully');
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await firebaseSignOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }
    
    // Close action menu when clicking outside
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('actionMenu');
        const btn = document.getElementById('floatingActionBtn');
        
        if (menu && btn && !menu.contains(event.target) && !btn.contains(event.target)) {
            hideActionMenu();
        }
    });
    
    // Add promotion form
    const addPromotionForm = document.getElementById('addPromotionForm');
    if (addPromotionForm) {
        addPromotionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await addPromotion(formData);
        });
    }
    
    // Add subject form
    const addSubjectForm = document.getElementById('addSubjectForm');
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await addSubject(formData);
        });
    }
    
    // Add students form
    const addStudentsForm = document.getElementById('addStudentsForm');
    if (addStudentsForm) {
        addStudentsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await addStudents(formData);
        });
    }
    
    // Add teacher form
    const addTeacherForm = document.getElementById('addTeacherForm');
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await addTeacher(formData);
        });
    }
    
    // Edit promotion form
    const editPromotionForm = document.getElementById('editPromotionForm');
    if (editPromotionForm) {
        editPromotionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await updatePromotion(formData);
        });
    }
    
    // Edit subject form
    const editSubjectForm = document.getElementById('editSubjectForm');
    if (editSubjectForm) {
        editSubjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await updateSubject(formData);
        });
    }
    
    // Edit Teacher Form
    const editTeacherForm = document.getElementById('editTeacherForm');
    if (editTeacherForm) {
        editTeacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await updateTeacher(formData);
        });
    }
    
    // Edit Student Form
    const editStudentForm = document.getElementById('editStudentForm');
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await updateStudent(formData);
        });
    }
    
    // Assign Subjects Form
    const assignSubjectsForm = document.getElementById('assignSubjectsForm');
    if (assignSubjectsForm) {
        assignSubjectsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await handleAssignSubjects(formData);
        });
    }
    
    // Method selector for adding students
    const addMethod = document.getElementById('addMethod');
    if (addMethod) {
        addMethod.addEventListener('change', (e) => {
            const individualForm = document.getElementById('individualStudentForm');
            const bulkForm = document.getElementById('bulkStudentsForm');
            
            if (e.target.value === 'individual') {
                individualForm.classList.remove('hidden');
                bulkForm.classList.add('hidden');
            } else {
                individualForm.classList.add('hidden');
                bulkForm.classList.remove('hidden');
            }
        });
    }
    
    // Sync level fields between individual and bulk forms
    const individualLevel = document.getElementById('studentLevel');
    const bulkLevel = document.getElementById('bulkStudentLevel');
    
    if (individualLevel && bulkLevel) {
        // Sync from individual to bulk
        individualLevel.addEventListener('change', (e) => {
            bulkLevel.value = e.target.value;
            console.log('🔄 Synced level from individual to bulk:', e.target.value);
        });
        
        // Sync from bulk to individual
        bulkLevel.addEventListener('change', (e) => {
            individualLevel.value = e.target.value;
            console.log('🔄 Synced level from bulk to individual:', e.target.value);
        });
    }
}

// System Stats functions
function showSystemStats() {
    loadSystemStats();
    document.getElementById('systemStatsModal').classList.remove('hidden');
}

function hideSystemStats() {
    document.getElementById('systemStatsModal').classList.add('hidden');
}

async function loadSystemStats() {
    try {
        const statsContent = document.getElementById('systemStatsContent');
        statsContent.innerHTML = '<div class="text-center py-4">Cargando estadísticas...</div>';
        
        // Calculate stats
        const totalStudents = students.length;
        const totalPromotions = promotions.length;
        const totalSubjects = subjects.length;
        const totalTeachers = teachers.length;
        
        // Calculate students per promotion
        const studentsPerPromotion = {};
        students.forEach(student => {
            const promotion = promotions.find(p => p.id === student.promotionId);
            if (promotion) {
                const key = `${promotion.name} ${promotion.turn}`;
                studentsPerPromotion[key] = (studentsPerPromotion[key] || 0) + 1;
            }
        });
        
        // Calculate subjects per teacher
        const subjectsPerTeacher = {};
        subjects.forEach(subject => {
            const teacher = teachers.find(t => t.uid === subject.teacherId);
            if (teacher) {
                const teacherName = `${teacher.firstName} ${teacher.lastName}`;
                subjectsPerTeacher[teacherName] = (subjectsPerTeacher[teacherName] || 0) + 1;
            }
        });
        
        // Generate stats HTML
        let statsHTML = `
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="text-center p-4 bg-primary-50 rounded-lg">
                    <p class="text-2xl font-bold text-primary-600">${totalStudents}</p>
                    <p class="text-sm text-gray-600">Total Estudiantes</p>
                </div>
                <div class="text-center p-4 bg-success-50 rounded-lg">
                    <p class="text-2xl font-bold text-success-600">${totalPromotions}</p>
                    <p class="text-sm text-gray-600">Promociones</p>
                </div>
                <div class="text-center p-4 bg-warning-50 rounded-lg">
                    <p class="text-2xl font-bold text-warning-600">${totalSubjects}</p>
                    <p class="text-sm text-gray-600">Asignaturas</p>
                </div>
                <div class="text-center p-4 bg-danger-50 rounded-lg">
                    <p class="text-2xl font-bold text-danger-600">${totalTeachers}</p>
                    <p class="text-sm text-gray-600">Profesores</p>
                </div>
            </div>
        `;
        
        // Students per promotion
        if (Object.keys(studentsPerPromotion).length > 0) {
            statsHTML += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Estudiantes por Promoción</h3>
                    <div class="space-y-2">
            `;
            Object.entries(studentsPerPromotion).forEach(([promotion, count]) => {
                statsHTML += `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span class="font-medium">${promotion}</span>
                        <span class="text-primary-600 font-bold">${count}</span>
                    </div>
                `;
            });
            statsHTML += '</div></div>';
        }
        
        // Subjects per teacher
        if (Object.keys(subjectsPerTeacher).length > 0) {
            statsHTML += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Asignaturas por Profesor</h3>
                    <div class="space-y-2">
            `;
            Object.entries(subjectsPerTeacher).forEach(([teacher, count]) => {
                statsHTML += `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span class="font-medium">${teacher}</span>
                        <span class="text-success-600 font-bold">${count}</span>
                    </div>
                `;
            });
            statsHTML += '</div></div>';
        }
        
        statsContent.innerHTML = statsHTML;
        
    } catch (error) {
        console.error('Error loading system stats:', error);
        document.getElementById('systemStatsContent').innerHTML = 
            '<div class="text-center py-4 text-red-600">Error al cargar estadísticas</div>';
    }
}

// Export functions
async function exportStudentsData() {
    try {
        if (students.length === 0) {
            showNotification('No hay estudiantes para exportar', 'info');
            return;
        }
        
        // Prepare CSV data with passcodes
        let csvContent = 'Nombre,Apellido,Email,Passcode,Promoción,Turno\n';
        
        students.forEach(student => {
            const promotion = promotions.find(p => p.id === student.promotionId);
            const promotionName = promotion ? `${promotion.name} ${promotion.turn}` : 'Sin promoción';
            csvContent += `${student.firstName},${student.lastName},${student.email},${student.passcode || 'N/A'},${promotionName}\n`;
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `estudiantes_con_passcodes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Datos exportados exitosamente (incluye passcodes)', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Error al exportar datos', 'error');
    }
}

// Función para mostrar passcodes de estudiantes
function showStudentPasscodes() {
    if (students.length === 0) {
        showNotification('No hay estudiantes para mostrar', 'info');
        return;
    }
    
    // Crear modal para mostrar passcodes
    const modalHTML = `
        <div id="passcodesModal" class="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="card w-full max-w-4xl animate-slide-up">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-gray-900">Passcodes de Estudiantes</h2>
                        <button onclick="hideStudentPasscodes()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600 mb-2">📋 Información importante:</p>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Los estudiantes usan su <strong>email</strong> y <strong>passcode</strong> para hacer login</li>
                            <li>• Los passcodes son generados automáticamente al crear cada estudiante</li>
                            <li>• Guarda esta información de forma segura para distribuirla a los estudiantes</li>
                        </ul>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promoción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${students.map(student => {
                                    const promotion = promotions.find(p => p.id === student.promotionId);
                                    const promotionName = promotion ? `${promotion.name} ${promotion.turn}` : 'Sin promoción';
                                    return `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-4 py-3 whitespace-nowrap">
                                                <div class="text-sm font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                                            </td>
                                            <td class="px-4 py-3 whitespace-nowrap">
                                                <div class="text-sm text-gray-900 font-mono">${student.email}</div>
                                            </td>
                                            <td class="px-4 py-3 whitespace-nowrap">
                                                <div class="text-sm text-blue-600 font-mono font-bold">${student.passcode || 'N/A'}</div>
                                            </td>
                                            <td class="px-4 py-3 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${promotionName}</div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center mt-6">
                        <button onclick="exportStudentsData()" class="btn-primary">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Exportar CSV
                        </button>
                        <button onclick="hideStudentPasscodes()" class="btn-secondary">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function hideStudentPasscodes() {
    const modal = document.getElementById('passcodesModal');
    if (modal) {
        modal.remove();
    }
}

// Additional helper functions
function addStudentsToPromotion(promotionId) {
    // Set the promotion in the modal and show it
    const promotionSelect = document.getElementById('studentPromotion');
    if (promotionSelect) {
        promotionSelect.value = promotionId;
    }
    showAddStudentsModal();
}

function removeStudentFromPromotion(studentId) {
    if (confirm('¿Estás seguro de que quieres remover este estudiante de la promoción?')) {
        // This would need to be implemented based on your data structure
        showNotification('Función de remoción de estudiantes en desarrollo', 'info');
    }
}

// Edit promotion
function editPromotion(promotionId) {
    const promotion = promotions.find(p => p.id === promotionId);
    if (!promotion) {
        showNotification('Promoción no encontrada', 'error');
        return;
    }
    
    // Populate form with promotion data
    document.getElementById('editPromotionId').value = promotion.id;
    document.getElementById('editPromotionName').value = promotion.name;
    document.getElementById('editPromotionTurn').value = promotion.turn;
    document.getElementById('editPromotionYear').value = promotion.graduationYear;
    
    // Show modal
    document.getElementById('editPromotionModal').classList.remove('hidden');
}

// Edit subject
function editSubject(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) {
        showNotification('Asignatura no encontrada', 'error');
        return;
    }
    
    // Populate form with subject data
    document.getElementById('editSubjectId').value = subject.id;
    document.getElementById('editSubjectName').value = subject.name;
    document.getElementById('editSubjectAcademicYear').value = subject.academicYear || '';
    document.getElementById('editSubjectSemester').value = subject.semester || '';
    
    // Load teachers for the select
    const editSubjectTeacher = document.getElementById('editSubjectTeacher');
    editSubjectTeacher.innerHTML = '<option value="">Seleccionar profesor</option>';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.uid;
        option.textContent = `${teacher.firstName} ${teacher.lastName}`;
        if (teacher.uid === subject.teacherId) {
            option.selected = true;
        }
        editSubjectTeacher.appendChild(option);
    });
    
    // Load promotions checkboxes
    const editPromotionsCheckboxes = document.getElementById('editPromotionsCheckboxes');
    editPromotionsCheckboxes.innerHTML = promotions.map(promotion => `
        <label class="flex items-center">
            <input type="checkbox" name="promotions" value="${promotion.id}" 
                   ${subject.promotions && subject.promotions.includes(promotion.id) ? 'checked' : ''} 
                   class="mr-2">
            <span class="text-sm">${promotion.name} - ${promotion.turn}</span>
        </label>
    `).join('');
    
    // Show modal
    document.getElementById('editSubjectModal').classList.remove('hidden');
}

// Floating Action Button functions
function toggleActionMenu() {
    const menu = document.getElementById('actionMenu');
    const btn = document.getElementById('floatingActionBtn');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        btn.classList.add('rotated');
    } else {
        hideActionMenu();
    }
}

function hideActionMenu() {
    const menu = document.getElementById('actionMenu');
    const btn = document.getElementById('floatingActionBtn');
    
    menu.classList.add('hidden');
    btn.classList.remove('rotated');
}

// Close action menu when clicking outside - moved to setupEventListeners

// ===== TEACHER MANAGEMENT FUNCTIONS =====



// Update teacher selects in modals
function updateTeacherSelects() {
    const teacherSelects = document.querySelectorAll('select[name="teacherId"]');
    
    teacherSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar profesor</option>';
        
        teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = `${teacher.firstName} ${teacher.lastName}`;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// Show add teacher modal
function showAddTeacherModal() {
    const modal = document.getElementById('addTeacherModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Clear form
        document.getElementById('addTeacherForm').reset();
    }
}

// Hide add teacher modal
function hideAddTeacherModal() {
    const modal = document.getElementById('addTeacherModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Add new teacher
async function addTeacher(formData) {
        console.log('🎯 addTeacher function called');
        console.log('🔍 isCreatingUser:', isCreatingUser);
        console.log('🔍 isRedirecting:', isRedirecting);
        
        if (isCreatingUser) {
            console.log('⚠️ Already creating a user, skipping...');
            return;
        }
        
        isCreatingUser = true;
        console.log('✅ Set isCreatingUser to true');
        
        showLoading('Agregando profesor...');
        
        try {
            const firstName = formData.get('firstName').trim();
            const lastName = formData.get('lastName').trim();
            const email = formData.get('email').trim();
            const password = formData.get('password');
            const specialty = formData.get('specialty')?.trim() || '';
            
            console.log('🔄 Creating teacher with data:', { firstName, lastName, email, specialty });
            
            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                throw new Error('Todos los campos son obligatorios');
            }
            
            // Create user with Firebase Auth (same method as register.js)
            console.log('🔄 Creating user in Firebase Auth...');
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                email, 
                password
            );
    
            const user = userCredential.user;
            console.log('✅ User created in Auth:', user.uid);
            console.log('🔍 Current admin UID:', currentAdmin ? currentAdmin.uid : 'null');
            console.log('🔍 New user UID:', user.uid);
    
            // Create user document in Firestore (same structure as register.js)
            const userDoc = {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: email.toLowerCase(),
                role: 'teacher',
                specialty: specialty,
                createdAt: new Date(),
                isActive: true
            };
    
            await setDoc(doc(db, 'users', user.uid), userDoc);
            console.log('✅ User document created in Firestore');
            
            // Verify that the current admin is still authenticated
            const currentUser = auth.currentUser;
            console.log('🔍 Current Firebase user after creation:', currentUser ? currentUser.uid : 'null');
            console.log('🔍 Expected admin UID:', currentAdmin ? currentAdmin.uid : 'null');
            
            if (currentUser && currentUser.uid === currentAdmin?.uid) {
                console.log('✅ Admin still authenticated, proceeding normally');
                showNotification('Profesor creado exitosamente', 'success');
                
                // Reset form and close modal
                const form = document.getElementById('addTeacherForm');
                if (form) form.reset();
                hideAddTeacherModal();
                
                // Reload teachers
                await loadTeachers();
                // Update statistics after successful teacher addition
                updateStats();
            } else {
                console.log('⚠️ Admin authentication changed, but continuing...');
                showNotification('Profesor creado exitosamente', 'success');
                
                // Reset form and close modal
                const form = document.getElementById('addTeacherForm');
                if (form) form.reset();
                hideAddTeacherModal();
                
                // Note: We'll reload teachers when the page refreshes or admin logs in again
                console.log('💡 Teachers list will be updated when admin re-authenticates');
            }
            
        } catch (error) {
            console.error('❌ Error creating teacher:', error);
            
            let message = 'Error creando profesor';
            if (error.code === 'auth/email-already-in-use') {
                message = 'El email ya está en uso';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña es muy débil (mínimo 6 caracteres)';
            } else if (error.code === 'auth/invalid-email') {
                message = 'El email no es válido';
            } else if (error.code === 'auth/admin-restricted-operation') {
                message = 'Error de configuración de Firebase. Contacta al administrador.';
            } else if (error.message) {
                message = error.message;
            }
            
            showNotification(message, 'error');
        } finally {
            console.log('🔄 Setting isCreatingUser to false');
            isCreatingUser = false;
            console.log('✅ Teacher creation process completed');
            hideLoading();
        }
    }

// Edit teacher
function editTeacher(teacherId) {
    const teacher = teachers.find(t => t.uid === teacherId);
    if (!teacher) {
        showNotification('Profesor no encontrado', 'error');
        return;
    }
    
    // Populate form with teacher data
    document.getElementById('editTeacherId').value = teacher.uid;
    document.getElementById('editTeacherFirstName').value = teacher.firstName;
    document.getElementById('editTeacherLastName').value = teacher.lastName;
    document.getElementById('editTeacherEmail').value = teacher.email;
    document.getElementById('editTeacherSpecialty').value = teacher.specialty || '';
    
    // Show modal
    document.getElementById('editTeacherModal').classList.remove('hidden');
}

// Edit student
function editStudent(studentId) {
    const student = students.find(s => s.uid === studentId);
    if (!student) {
        showNotification('Estudiante no encontrado', 'error');
        return;
    }
    
    // Populate form with student data
    document.getElementById('editStudentId').value = student.uid;
    document.getElementById('editStudentFirstName').value = student.firstName;
    document.getElementById('editStudentLastName').value = student.lastName;
    document.getElementById('editStudentEmail').value = student.email;
    document.getElementById('editStudentLevel').value = student.level || 'Freshman';
    
    // Load promotions for the select
    const editStudentPromotion = document.getElementById('editStudentPromotion');
    editStudentPromotion.innerHTML = '<option value="">Seleccionar promoción</option>';
    promotions.forEach(promotion => {
        const option = document.createElement('option');
        option.value = promotion.id;
        option.textContent = `${promotion.name} - ${promotion.turn}`;
        if (promotion.id === student.promotionId) {
            option.selected = true;
        }
        editStudentPromotion.appendChild(option);
    });
    
    // Show modal
    document.getElementById('editStudentModal').classList.remove('hidden');
}

// Update teacher
async function updateTeacher(formData) {
    const teacherId = formData.get('id');
    const firstName = formData.get('firstName').trim();
    const lastName = formData.get('lastName').trim();
    const email = formData.get('email').trim();
    const specialty = formData.get('specialty').trim();
    
    if (!firstName || !lastName || !email) {
        showNotification('Todos los campos obligatorios deben estar completos', 'error');
        return;
    }
    
    try {
        showLoading('Actualizando profesor...');
        console.log('🔄 Updating teacher:', firstName, lastName);
        
        // Update teacher document in Firestore
        const teacherRef = doc(db, 'users', teacherId);
        await updateDoc(teacherRef, {
            firstName: firstName,
            lastName: lastName,
            email: email.toLowerCase(),
            specialty: specialty,
            updatedAt: new Date()
        });
        
        console.log('✅ Teacher updated successfully');
        showNotification('Profesor actualizado exitosamente', 'success');
        
        // Reset form and close modal
        document.getElementById('editTeacherForm').reset();
        hideEditTeacherModal();
        
        // Reload teachers
        await loadTeachers();
        // Update statistics after successful teacher update
        updateStats();
        
    } catch (error) {
        console.error('❌ Error updating teacher:', error);
        showNotification('Error actualizando profesor', 'error');
    } finally {
        hideLoading();
    }
}

// Update student
async function updateStudent(formData) {
    const studentId = formData.get('id');
    const firstName = formData.get('firstName').trim();
    const lastName = formData.get('lastName').trim();
    const email = formData.get('email').trim();
    const promotionId = formData.get('promotionId');
    const level = formData.get('level');
    
    if (!firstName || !lastName || !email || !promotionId) {
        showNotification('Todos los campos obligatorios deben estar completos', 'error');
        return;
    }
    
    try {
        showLoading('Actualizando estudiante...');
        console.log('🔄 Updating student:', firstName, lastName);
        
        // Get current student data to check if promotion changed
        const currentStudent = students.find(s => s.uid === studentId);
        const oldPromotionId = currentStudent ? currentStudent.promotionId : null;
        
        // Update student document in Firestore
        const studentRef = doc(db, 'users', studentId);
        await updateDoc(studentRef, {
            firstName: firstName,
            lastName: lastName,
            email: email.toLowerCase(),
            promotionId: promotionId,
            level: level,
            updatedAt: new Date()
        });
        
        console.log('✅ Student updated successfully');
        
        // If promotion changed, update subject assignments
        if (oldPromotionId && oldPromotionId !== promotionId) {
            console.log('🔄 Promotion changed, updating subject assignments');
            
            // Remove old subject assignments
            const oldSubjectAssignments = query(
                collection(db, 'studentSubjects'),
                where('studentId', '==', studentId),
                where('promotionId', '==', oldPromotionId)
            );
            const oldAssignmentsSnapshot = await getDocs(oldSubjectAssignments);
            
            const batch = writeBatch(db);
            oldAssignmentsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Add new subject assignments
            const newSubjects = subjects.filter(s => 
                s.promotions && s.promotions.includes(promotionId)
            );
            
            newSubjects.forEach(subject => {
                const newAssignment = doc(collection(db, 'studentSubjects'));
                batch.set(newAssignment, {
                    studentId: studentId,
                    subjectId: subject.id,
                    promotionId: promotionId,
                    createdAt: new Date()
                });
            });
            
            await batch.commit();
            console.log('✅ Subject assignments updated');
        }
        
        showNotification('Estudiante actualizado exitosamente', 'success');
        
        // Reset form and close modal
        document.getElementById('editStudentForm').reset();
        hideEditStudentModal();
        
        // Reload students
        await loadStudents();
        // Update statistics after successful student update
        updateStats();
        // Update promotions list to show new student counts
        updatePromotionsList();
        
    } catch (error) {
        console.error('❌ Error updating student:', error);
        showNotification('Error actualizando estudiante', 'error');
    } finally {
        hideLoading();
    }
}

// Delete student
async function deleteStudent(studentId) {
    const student = students.find(s => s.uid === studentId);
    if (!student) return;
    
    if (!confirm(`¿Estás seguro de que quieres eliminar al estudiante ${student.firstName} ${student.lastName}?`)) {
        return;
    }
    
    try {
        console.log('🔄 Deleting student:', student.firstName, student.lastName);
        
        // Delete student document from Firestore
        await deleteDoc(doc(db, 'users', studentId));
        console.log('✅ Student document deleted from Firestore');
        
        // Note: We cannot delete the user from Firebase Auth from the client side
        console.log('⚠️ Note: User remains in Firebase Auth for security reasons');
        
        showNotification('Estudiante eliminado exitosamente (documento eliminado de la base de datos)', 'success');
        
        // Show instructions for manual deletion
        setTimeout(() => {
            showNotification('💡 Para eliminar completamente el usuario de Auth, ve a Firebase Console → Authentication → Users', 'info');
        }, 3000);
        
        // Reload students
        await loadStudents();
        
    } catch (error) {
        console.error('Error deleting student:', error);
        showNotification('Error eliminando estudiante', 'error');
    }
}

// Delete teacher
async function deleteTeacher(teacherId) {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;
    
    if (!confirm(`¿Estás seguro de que quieres eliminar al profesor ${teacher.firstName} ${teacher.lastName}? Esta acción eliminará al usuario tanto de la base de datos como de la autenticación.`)) {
        return;
    }
    
    try {
        console.log('🔄 Deleting teacher:', teacher.firstName, teacher.lastName);
        
        // Check if teacher has assigned subjects
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('teacherId', '==', teacherId)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        
        if (!subjectsSnapshot.empty) {
            showNotification('No se puede eliminar el profesor porque tiene asignaturas asignadas', 'error');
            return;
        }
        
        // Delete teacher document from Firestore
        await deleteDoc(doc(db, 'users', teacherId));
        console.log('✅ Teacher document deleted from Firestore');
        
        // Note: We cannot delete the user from Firebase Auth from the client side
        // due to security restrictions. The user will need to be deleted from the
        // Firebase Console or through Cloud Functions.
        console.log('⚠️ Note: User remains in Firebase Auth for security reasons');
        console.log('💡 To completely delete the user, use Firebase Console or Cloud Functions');
        
        showNotification('Profesor eliminado exitosamente (documento eliminado de la base de datos)', 'success');
        
        // Show instructions for manual deletion
        setTimeout(() => {
            showNotification('💡 Para eliminar completamente el usuario de Auth, ve a Firebase Console → Authentication → Users', 'info');
        }, 3000);
        
        // Reload teachers
        await loadTeachers();
        
    } catch (error) {
        console.error('Error deleting teacher:', error);
        showNotification('Error eliminando profesor', 'error');
    }
}

// Expose functions to window for HTML onclick handlers
console.log('🔗 Exposing functions to window...');

// Make sure all functions are available globally
window.showAddPromotionModal = function() {
    console.log('🎯 showAddPromotionModal called');
    document.getElementById('addPromotionModal').classList.remove('hidden');
};

window.hideAddPromotionModal = function() {
    console.log('🎯 hideAddPromotionModal called');
    document.getElementById('addPromotionModal').classList.add('hidden');
    document.getElementById('addPromotionForm').reset();
};

window.showAddSubjectModal = function() {
    console.log('🎯 showAddSubjectModal called');
    loadTeachersForSubjectModal();
    loadPromotionsForSubjectModal();
    document.getElementById('addSubjectModal').classList.remove('hidden');
};

window.hideAddSubjectModal = function() {
    console.log('🎯 hideAddSubjectModal called');
    document.getElementById('addSubjectModal').classList.add('hidden');
    document.getElementById('addSubjectForm').reset();
};

window.showAddTeacherModal = function() {
    console.log('🎯 showAddTeacherModal called');
    const modal = document.getElementById('addTeacherModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('addTeacherForm').reset();
    }
};

window.hideAddTeacherModal = function() {
    console.log('🎯 hideAddTeacherModal called');
    const modal = document.getElementById('addTeacherModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.showAddStudentsModal = function() {
    console.log('🎯 showAddStudentsModal called');
    loadPromotionsForStudentModal();
    document.getElementById('addStudentsModal').classList.remove('hidden');
};

window.hideAddStudentsModal = function() {
    console.log('🎯 hideAddStudentsModal called');
    document.getElementById('addStudentsModal').classList.add('hidden');
    document.getElementById('addStudentsForm').reset();
    
    const previewDiv = document.getElementById('emailPreview');
    if (previewDiv) {
        previewDiv.classList.add('hidden');
    }
};

window.hideEditPromotionModal = function() {
    console.log('🎯 hideEditPromotionModal called');
    document.getElementById('editPromotionModal').classList.add('hidden');
    document.getElementById('editPromotionForm').reset();
};

window.hideEditSubjectModal = function() {
    console.log('🎯 hideEditSubjectModal called');
    document.getElementById('editSubjectModal').classList.add('hidden');
    document.getElementById('editSubjectForm').reset();
};

window.hideEditTeacherModal = function() {
    console.log('🎯 hideEditTeacherModal called');
    document.getElementById('editTeacherModal').classList.add('hidden');
    document.getElementById('editTeacherForm').reset();
};

window.hideEditStudentModal = function() {
    console.log('🎯 hideEditStudentModal called');
    document.getElementById('editStudentModal').classList.add('hidden');
    document.getElementById('editStudentForm').reset();
};

window.deletePromotion = deletePromotion;
window.deleteSubject = deleteSubject;
window.deleteTeacher = deleteTeacher;
window.editTeacher = editTeacher;
window.editStudent = editStudent;
window.updateTeacher = updateTeacher;
window.updateStudent = updateStudent;
window.deleteStudent = deleteStudent;
window.editPromotion = editPromotion;
window.editSubject = editSubject;
window.showSystemStats = showSystemStats;
window.hideSystemStats = hideSystemStats;
window.updateTeacher = updateTeacher;
window.updateStudent = updateStudent;
window.showAssignSubjectsModal = showAssignSubjectsModal;
window.hideAssignSubjectsModal = hideAssignSubjectsModal;
window.removeStudentFromPromotion = removeStudentFromPromotion;
window.previewEmails = previewEmails;
window.clearBulkForm = clearBulkForm;
window.showStudentPasscodes = showStudentPasscodes;
window.hideStudentPasscodes = hideStudentPasscodes;
window.toggleActionMenu = function() {
    console.log('🎯 toggleActionMenu called');
    const menu = document.getElementById('actionMenu');
    const btn = document.getElementById('floatingActionBtn');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        btn.classList.add('rotated');
    } else {
        hideActionMenu();
    }
};

// Expose filter functions
window.filterTeachers = filterTeachers;
window.clearTeacherFilters = clearTeacherFilters;
window.filterStudents = filterStudents;
window.clearStudentFilters = clearStudentFilters;

window.hideActionMenu = function() {
    console.log('🎯 hideActionMenu called');
    const menu = document.getElementById('actionMenu');
    const btn = document.getElementById('floatingActionBtn');
    
    menu.classList.add('hidden');
    btn.classList.remove('rotated');
};

console.log('✅ Functions exposed to window successfully');
console.log('🔍 Available functions:', {
    showAddPromotionModal: typeof window.showAddPromotionModal,
    showAddSubjectModal: typeof window.showAddSubjectModal,
    showAddTeacherModal: typeof window.showAddTeacherModal,
    showAddStudentsModal: typeof window.showAddStudentsModal
});

// Test if functions are actually available
console.log('🧪 Testing function availability...');
try {
    console.log('showAddPromotionModal:', typeof showAddPromotionModal);
    console.log('showAddSubjectModal:', typeof showAddSubjectModal);
    console.log('showAddTeacherModal:', typeof showAddTeacherModal);
    console.log('showAddStudentsModal:', typeof showAddStudentsModal);
} catch (error) {
    console.error('❌ Error testing functions:', error);
}





// Form handlers
async function handleAddPromotion(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    await addPromotion(formData);
}

async function handleAddSubject(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    await addSubject(formData);
}

async function handleAddTeacher(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    await addTeacher(formData);
}

async function handleEditPromotion(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    await updatePromotion(formData);
}

async function handleEditSubject(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    await updateSubject(formData);
}



// Initialize dashboard
async function initializeDashboard() {
    try {
        console.log('🔄 Loading dashboard data...');
        
        // Load all data individually to see which one fails
        console.log('📚 Loading promotions...');
        await loadPromotions();
        
        console.log('📖 Loading subjects...');
        await loadSubjects();
        
        console.log('👨‍🏫 Loading teachers...');
        await loadTeachers();
        
        console.log('👨‍🎓 Loading students...');
        await loadStudents();
        
        // Update statistics
        console.log('📊 Updating statistics...');
        updateStats();
        
        // Setup event listeners
        console.log('🔗 Setting up event listeners...');
        setupEventListeners();
        
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        showNotification('Error cargando el dashboard', 'error');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Admin dashboard initializing...');
    
    // Check if returning from registration
    const tempTeacherData = localStorage.getItem('tempTeacherData');
    if (tempTeacherData) {
        const data = JSON.parse(tempTeacherData);
        if (data.returnTo === 'dashboard-admin.html') {
            localStorage.removeItem('tempTeacherData');
            showNotification('Profesor creado exitosamente', 'success');
        }
    }
    
    // Wait for Firebase Auth to initialize
    onAuthStateChanged(auth, async (user) => {
        console.log('🔐 Auth state changed, user:', user ? user.uid : 'null');
        console.log('🔍 Current admin:', currentAdmin ? currentAdmin.uid : 'null');
        console.log('🔍 Is initialized:', isInitialized);
        
        // If no user, redirect to admin login
        if (!user) {
            console.log('❌ No user authenticated, redirecting to admin login');
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = 'admin-login.html';
            }
            return;
        }
        
        // If we already have a current admin and it's the same user, don't reinitialize
        if (currentAdmin && currentAdmin.uid === user.uid && isInitialized) {
            console.log('✅ Same admin user and already initialized, skipping reinitialization');
            return;
        }
        
        // If we're currently creating a user, don't redirect
        if (isCreatingUser || isCreatingBulkStudents) {
            console.log('⚠️ Currently creating users, skipping auth state change');
            return;
        }
        
        // If this is a newly created user (not the admin), don't redirect
        if (user && currentAdmin && user.uid !== currentAdmin.uid) {
            console.log('⚠️ New user created, but admin should remain authenticated');
            console.log('💡 This is expected behavior when creating users');
            return;
        }
        
        try {
            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            console.log('📄 User document exists:', userDoc.exists());
            
            if (!userDoc.exists()) {
                console.log('❌ User document not found, redirecting to admin login');
                if (!isRedirecting) {
                    isRedirecting = true;
                    window.location.href = 'admin-login.html';
                }
                return;
            }
            
            const userData = userDoc.data();
            console.log('👤 User role:', userData.role);
            
            if (userData.role !== 'admin') {
                console.log('❌ User is not admin, redirecting to admin login');
                if (!isRedirecting) {
                    isRedirecting = true;
                    window.location.href = 'admin-login.html';
                }
                return;
            }
            
            // Set current admin
            currentAdmin = { uid: user.uid, ...userData };
            console.log('✅ Admin user authenticated successfully');
            
            // Prevent multiple initializations
            if (isInitialized) {
                console.log('⚠️ Dashboard already initialized, skipping...');
                return;
            }
            
            // Initialize dashboard
            await initializeDashboard();
            isInitialized = true;
            console.log('🎉 Dashboard initialization completed');
            
        } catch (error) {
            console.error('❌ Error checking user role:', error);
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = 'admin-login.html';
            }
        }
    });
});

// Expose functions to window object for HTML access
window.showAddPromotionModal = showAddPromotionModal;
window.hideAddPromotionModal = hideAddPromotionModal;
window.showAddSubjectModal = showAddSubjectModal;
window.hideAddSubjectModal = hideAddSubjectModal;
window.showAddTeacherModal = showAddTeacherModal;
window.hideAddTeacherModal = hideAddTeacherModal;
window.showAddStudentsModal = showAddStudentsModal;
window.hideAddStudentsModal = hideAddStudentsModal;
window.editPromotion = editPromotion;
window.deletePromotion = deletePromotion;
window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.editTeacher = editTeacher;
window.deleteTeacher = deleteTeacher;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.hideEditPromotionModal = hideEditPromotionModal;
window.hideEditSubjectModal = hideEditSubjectModal;
window.hideEditTeacherModal = hideEditTeacherModal;
window.hideEditStudentModal = hideEditStudentModal;
window.previewEmails = previewEmails;
window.clearBulkForm = clearBulkForm;
window.toggleActionMenu = toggleActionMenu;
window.hideActionMenu = hideActionMenu;
window.filterTeachers = filterTeachers;
window.clearTeacherFilters = clearTeacherFilters;
window.filterStudents = filterStudents;
window.clearStudentFilters = clearStudentFilters;
window.showStudentPasscodes = showStudentPasscodes;
window.exportStudentsData = exportStudentsData;
window.showSystemStats = showSystemStats;
window.hideSystemStats = hideSystemStats;
