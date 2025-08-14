import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
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
    
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}-600" fill="currentColor" viewBox="0 0 20 20">
                    ${icon}
                </svg>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">${message}</p>
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
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
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

// Initialize teacher dashboard
async function initializeTeacherDashboard() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            // Get teacher data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'teacher') {
                window.location.href = 'index.html';
                return;
            }

            currentTeacher = { ...user, ...userDoc.data() };
            
            // Update UI
            document.getElementById('teacherName').textContent = `${currentTeacher.firstName} ${currentTeacher.lastName}`;
            
            // Load data
            await loadDashboardData();
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            showNotification('Error al cargar el dashboard', 'error');
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
        
        await Promise.all([
            loadStudents(),
            loadSubjects(),
            loadGrades(),
            updateStatistics()
        ]);
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
        
        // First, try a simple query without orderBy to test permissions
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student')
        );
        
        const snapshot = await getDocs(studentsQuery);
        students = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        // Sort students by firstName after loading
        students.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        console.log('Students loaded successfully:', students.length);
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
    
    let filteredStudents = students;
    
    // Apply level filter
    if (levelFilter) {
        filteredStudents = filteredStudents.filter(student => student.level === levelFilter);
    }
    
    // Apply turn filter
    if (turnFilter) {
        filteredStudents = filteredStudents.filter(student => student.turn === turnFilter);
    }
    
    console.log('Filtered students:', filteredStudents.length);
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-gray-500">
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
    
    tbody.innerHTML = filteredStudents.map(student => `
        <tr class="hover:bg-gray-50">
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

// Load subjects
async function loadSubjects() {
    try {
        const subjectsQuery = query(collection(db, 'subjects'), orderBy('name'));
        const snapshot = await getDocs(subjectsQuery);
        subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        updateSubjectsGrid();
        updateSubjectFilters();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Error al cargar las asignaturas', 'error');
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
                    <p class="text-sm text-gray-600">${subject.code}</p>
                    ${subject.description ? `<p class="text-sm text-gray-500 mt-2">${subject.description}</p>` : ''}
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
        
        // First try a simple query without orderBy to test permissions
        const gradesQuery = query(
            collection(db, 'grades'),
            where('teacherId', '==', currentTeacher.uid)
        );
        
        const snapshot = await getDocs(gradesQuery);
        grades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort grades by createdAt after loading
        grades.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
            }
            return 0;
        });
        
        console.log('Grades loaded successfully:', grades.length);
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
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalSubjects').textContent = subjects.length;
    
    const pendingGrades = grades.filter(grade => !grade.comment).length;
    document.getElementById('pendingGrades').textContent = pendingGrades;
    
    const lowGrades = grades.filter(grade => grade.value < 70).length;
    document.getElementById('lowGrades').textContent = lowGrades;
}

// Update filters
function updateStudentFilters() {
    const gradeStudent = document.getElementById('gradeStudent');
    const studentFilter = document.getElementById('studentFilter');
    
    const options = students.map(student => 
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
    
    const options = subjects.map(subject => 
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
function showAddGradeModal() {
    document.getElementById('addGradeModal').classList.remove('hidden');
}

function hideAddGradeModal() {
    document.getElementById('addGradeModal').classList.add('hidden');
    document.getElementById('addGradeForm').reset();
}

function showAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('hidden');
}

function hideAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('hidden');
    document.getElementById('addStudentForm').reset();
}

function showBulkAddStudentModal() {
    document.getElementById('bulkAddStudentModal').classList.remove('hidden');
}

function hideBulkAddStudentModal() {
    document.getElementById('bulkAddStudentModal').classList.add('hidden');
    document.getElementById('bulkStudentsList').innerHTML = `
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
}

function showAddSubjectModal() {
    document.getElementById('addSubjectModal').classList.remove('hidden');
}

function hideAddSubjectModal() {
    document.getElementById('addSubjectModal').classList.add('hidden');
    document.getElementById('addSubjectForm').reset();
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
    // Add Grade Form
    document.getElementById('addGradeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const gradeData = {
            studentId: formData.get('student'),
            subjectId: formData.get('subject'),
            value: parseFloat(formData.get('grade')),
            comment: formData.get('comment'),
            teacherId: currentTeacher.uid,
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
    
    // Add Student Form - FIXED: No redirection, just clear form
    document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
            createdAt: serverTimestamp()
        };
        
        try {
            showLoading(true);
            
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
            
            // Reload students data
            await loadStudents();
            updateStatistics();
            
        } catch (error) {
            console.error('Error creating student:', error);
            let errorMessage = 'Error al crear el estudiante';
            
            // Handle specific Firebase Auth errors
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'El email ya está registrado';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Contraseña muy débil';
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            showLoading(false);
        }
    });
    
    // Add Subject Form
    document.getElementById('addSubjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const subjectData = {
            name: formData.get('name').trim(),
            code: formData.get('code').trim(),
            description: formData.get('description').trim(),
            teacherId: currentTeacher.uid,
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
}

function removeBulkStudent(button) {
    const container = document.getElementById('bulkStudentsList');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

async function createBulkStudents() {
    const level = document.querySelector('input[name="bulkLevel"]:checked')?.value;
    const turn = document.querySelector('input[name="bulkTurn"]:checked')?.value;
    
    if (!level || !turn) {
        showNotification('Por favor selecciona nivel y turno', 'error');
        return;
    }
    
    const firstNames = document.querySelectorAll('input[name="bulkFirstName[]"]');
    const lastNames = document.querySelectorAll('input[name="bulkLastName[]"]');
    const emails = document.querySelectorAll('input[name="bulkEmail[]"]');
    
    const students = [];
    for (let i = 0; i < firstNames.length; i++) {
        if (firstNames[i].value && lastNames[i].value && emails[i].value) {
            students.push({
                firstName: firstNames[i].value.trim(),
                lastName: lastNames[i].value.trim(),
                email: emails[i].value.trim().toLowerCase(),
                level,
                turn,
                passcode: generatePasscode()
            });
        }
    }
    
    if (students.length === 0) {
        showNotification('Por favor ingresa al menos un estudiante', 'error');
        return;
    }
    
    try {
        showLoading(true);
        let createdCount = 0;
        let errorCount = 0;
        
        for (const studentData of students) {
            try {
                // Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(
                    auth, 
                    studentData.email, 
                    studentData.passcode
                );
                
                // Create Firestore document
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    ...studentData,
                    uid: userCredential.user.uid,
                    role: 'student',
                    isActive: true,
                    createdAt: serverTimestamp()
                });
                
                createdCount++;
            } catch (error) {
                console.error(`Error creating student ${studentData.email}:`, error);
                errorCount++;
            }
        }
        
        if (createdCount > 0) {
            showNotification(`${createdCount} estudiantes creados exitosamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`, 'success');
            hideBulkAddStudentModal();
            await loadStudents();
            updateStatistics();
        } else {
            showNotification('No se pudo crear ningún estudiante', 'error');
        }
    } catch (error) {
        console.error('Error creating bulk students:', error);
        showNotification('Error al crear los estudiantes', 'error');
    } finally {
        showLoading(false);
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

// Advanced Grade System Functions
function initializeAdvancedGradeSystem() {
    // Add event listeners for grade type selection
    document.querySelectorAll('input[name="gradeType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            gradeConfiguration.type = this.value;
            const categorizedConfig = document.getElementById('categorizedConfig');
            if (this.value === 'categorized') {
                categorizedConfig.classList.remove('hidden');
                updateTotalPercentage();
            } else {
                categorizedConfig.classList.add('hidden');
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
    if (searchInput) searchInput.addEventListener('input', updateStudentCheckboxList);
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
    
    container.innerHTML = filteredStudents.map(student => `
        <label class="student-checkbox-item flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="checkbox" value="${student.id}" class="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
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
    const labels = document.querySelectorAll('.step-navigation span');
    
    indicators.forEach((indicatorId, index) => {
        const indicator = document.getElementById(indicatorId);
        const label = labels[index];
        
        if (index + 1 < currentStep) {
            // Completed step
            indicator.className = 'w-8 h-8 bg-success-600 text-white rounded-full flex items-center justify-center text-sm font-medium';
            label.className = 'ml-2 text-sm font-medium text-gray-900';
        } else if (index + 1 === currentStep) {
            // Current step
            indicator.className = 'w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium';
            label.className = 'ml-2 text-sm font-medium text-gray-900';
        } else {
            // Future step
            indicator.className = 'w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium';
            label.className = 'ml-2 text-sm font-medium text-gray-500';
        }
    });
    
    // Show/hide step content
    document.querySelectorAll('.step-content').forEach((content, index) => {
        if (index + 1 === currentStep) {
            content.classList.add('active');
        } else {
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
                ${studentsData.map(student => `
                    <div class="grade-entry-row flex items-center justify-between p-4 bg-white rounded-lg border">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                            <div class="text-sm text-gray-500">${student.email}</div>
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
                        ${studentsData.map(student => `
                            <tr class="grade-entry-row border-b hover:bg-gray-50">
                                <td class="p-3">
                                    <div class="font-medium text-gray-900">${student.firstName} ${student.lastName}</div>
                                    <div class="text-sm text-gray-500">${student.email}</div>
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
    document.getElementById('gradeSubject').value = '';
    document.querySelector('input[name="gradeType"][value="simple"]').checked = true;
    document.getElementById('categorizedConfig').classList.add('hidden');
    
    // Show modal
    document.getElementById('addGradeModal').classList.remove('hidden');
    
    // Initialize step navigation
    updateStepNavigation();
    
    // Initialize advanced grade system
    initializeAdvancedGradeSystem();
}

function hideAddGradeModal() {
    document.getElementById('addGradeModal').classList.add('hidden');
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
window.showAddSubjectModal = showAddSubjectModal;
window.hideAddSubjectModal = hideAddSubjectModal;
window.showTab = showTab;
window.addBulkStudent = addBulkStudent;
window.removeBulkStudent = removeBulkStudent;
window.createBulkStudents = createBulkStudents;
window.copyPasscode = copyPasscode;
window.signOut = () => {
    firebaseSignOut(auth).then(() => {
        window.location.href = 'index.html';
    });
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

// Initialize dashboard
initializeTeacherDashboard();
