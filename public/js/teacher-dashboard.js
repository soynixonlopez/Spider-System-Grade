import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Global variables
let currentTeacher = null;
let students = [];
let subjects = [];
let grades = [];

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

// Load all dashboard data
async function loadDashboardData() {
    showLoading(true);
    try {
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

// Load students
async function loadStudents() {
    const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        orderBy('firstName')
    );
    
    const snapshot = await getDocs(studentsQuery);
    students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    updateStudentsTable();
    updateStudentFilters();
}

// Update students table
function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    const levelFilter = document.getElementById('levelFilter').value;
    const turnFilter = document.getElementById('turnFilter').value;
    
    let filteredStudents = students;
    
    if (levelFilter) {
        filteredStudents = filteredStudents.filter(student => student.level === levelFilter);
    }
    
    if (turnFilter) {
        filteredStudents = filteredStudents.filter(student => student.turn === turnFilter);
    }
    
    tbody.innerHTML = filteredStudents.map(student => `
        <tr>
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
                    <button onclick="copyPasscode('${student.passcode}')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                    </button>
                </div>
            </td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.isActive ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}">
                    ${student.isActive ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <div class="flex space-x-2">
                    <button onclick="editStudent('${student.id}')" class="text-primary-600 hover:text-primary-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteStudent('${student.id}')" class="text-danger-600 hover:text-danger-900">
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
    const subjectsQuery = query(collection(db, 'subjects'), orderBy('name'));
    const snapshot = await getDocs(subjectsQuery);
    subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    updateSubjectsGrid();
    updateSubjectFilters();
}

// Update subjects grid
function updateSubjectsGrid() {
    const grid = document.getElementById('subjectsGrid');
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
    const gradesQuery = query(
        collection(db, 'grades'),
        where('teacherId', '==', currentTeacher.uid),
        orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(gradesQuery);
    grades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    updateGradesTable();
}

// Update grades table
function updateGradesTable() {
    const tbody = document.getElementById('gradesTableBody');
    const subjectFilter = document.getElementById('subjectFilter').value;
    const studentFilter = document.getElementById('studentFilter').value;
    
    let filteredGrades = grades;
    
    if (subjectFilter) {
        filteredGrades = filteredGrades.filter(grade => grade.subjectId === subjectFilter);
    }
    
    if (studentFilter) {
        filteredGrades = filteredGrades.filter(grade => grade.studentId === studentFilter);
    }
    
    tbody.innerHTML = filteredGrades.map(grade => {
        const student = students.find(s => s.id === grade.studentId);
        const subject = subjects.find(s => s.id === grade.subjectId);
        
        return `
            <tr>
                <td class="font-medium">${student ? `${student.firstName} ${student.lastName}` : 'N/A'}</td>
                <td>${subject ? subject.name : 'N/A'}</td>
                <td>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(grade.value)}">
                        ${grade.value}
                    </span>
                </td>
                <td>${grade.createdAt ? new Date(grade.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="editGrade('${grade.id}')" class="text-primary-600 hover:text-primary-900">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onclick="deleteGrade('${grade.id}')" class="text-danger-600 hover:text-danger-900">
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
    
    gradeStudent.innerHTML = '<option value="">Seleccionar estudiante</option>' + options;
    studentFilter.innerHTML = '<option value="">Todos los estudiantes</option>' + options;
}

function updateSubjectFilters() {
    const gradeSubject = document.getElementById('gradeSubject');
    const subjectFilter = document.getElementById('subjectFilter');
    
    const options = subjects.map(subject => 
        `<option value="${subject.id}">${subject.name}</option>`
    ).join('');
    
    gradeSubject.innerHTML = '<option value="">Seleccionar asignatura</option>' + options;
    subjectFilter.innerHTML = '<option value="">Todas las asignaturas</option>' + options;
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
    
    // Add Student Form
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
            hideAddStudentModal();
            await loadStudents();
            updateStatistics();
        } catch (error) {
            console.error('Error creating student:', error);
            showNotification('Error al crear el estudiante', 'error');
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
    document.getElementById('levelFilter').addEventListener('change', updateStudentsTable);
    document.getElementById('turnFilter').addEventListener('change', updateStudentsTable);
    document.getElementById('subjectFilter').addEventListener('change', updateGradesTable);
    document.getElementById('studentFilter').addEventListener('change', updateGradesTable);
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
            }
        }
        
        showNotification(`${createdCount} estudiantes creados exitosamente`, 'success');
        hideBulkAddStudentModal();
        await loadStudents();
        updateStatistics();
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

// Initialize dashboard
initializeTeacherDashboard();
