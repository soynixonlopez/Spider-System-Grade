import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { dbManager } from './database.js';

// Global variables
let currentStudent = null;
let studentGrades = [];
let subjects = [];
let studentStats = null;

// UI Functions
function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden';
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path id="notificationIcon" fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p id="notificationMessage" class="text-sm font-medium text-gray-900"></p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            <span class="sr-only">Close</span>
                            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
    }

    const messageEl = document.getElementById('notificationMessage');
    const iconEl = document.getElementById('notificationIcon');
    
    messageEl.textContent = message;
    
    // Set icon and colors based on type
    switch (type) {
        case 'success':
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4')?.classList.add('border-success-500');
            notification.querySelector('.border-l-4')?.classList.remove('border-danger-500', 'border-warning-500', 'border-primary-500');
            break;
        case 'error':
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4')?.classList.add('border-danger-500');
            notification.querySelector('.border-l-4')?.classList.remove('border-success-500', 'border-warning-500', 'border-primary-500');
            break;
        case 'warning':
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4')?.classList.add('border-warning-500');
            notification.querySelector('.border-l-4')?.classList.remove('border-success-500', 'border-danger-500', 'border-primary-500');
            break;
        default:
            iconEl.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>';
            notification.querySelector('.border-l-4')?.classList.add('border-primary-500');
            notification.querySelector('.border-l-4')?.classList.remove('border-success-500', 'border-danger-500', 'border-warning-500');
    }
    
    notification.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize student dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeStudentDashboard();
});

async function initializeStudentDashboard() {
    try {
        showLoading(true);
        
        // Use onAuthStateChanged to ensure Firebase is fully initialized
        onAuthStateChanged(auth, async (user) => {
            try {
                if (!user) {
                    console.log('No user authenticated, redirecting to index');
                    window.location.href = './index.html';
                    return;
                }

                console.log('User authenticated:', user.email);

                // Get user data from Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    console.log('User document does not exist, redirecting to index');
                    window.location.href = './index.html';
                    return;
                }

                const userData = userDoc.data();
                
                if (userData.role !== 'student') {
                    console.log('User is not a student, redirecting to index');
                    window.location.href = './index.html';
                    return;
                }

                console.log('Student authenticated successfully:', userData);

                currentStudent = { ...user, ...userData };
                
                // Load student name
                const studentNameElement = document.getElementById('studentName');
                if (studentNameElement) {
                    studentNameElement.textContent = `${currentStudent.firstName} ${currentStudent.lastName}`;
                }

                // Setup global sign out function
                window.signOut = async function() {
                    try {
                        await firebaseSignOut(auth);
                        window.location.href = 'index.html';
                    } catch (error) {
                        console.error('Error signing out:', error);
                    }
                };

                // Load initial data
                await loadStudentData();
                
                // Setup event listeners
                setupEventListeners();
                
                showLoading(false);
                console.log('Student dashboard initialized successfully');
            } catch (error) {
                console.error('Error in auth state change handler:', error);
                showLoading(false);
                showNotification('Error al cargar el dashboard', 'error');
            }
        });
    } catch (error) {
        console.error('Error initializing student dashboard:', error);
        showLoading(false);
        showNotification('Error al cargar el dashboard', 'error');
    }
}

async function loadStudentData() {
    try {
        showLoading(true);
        
        // Load all data in parallel
        const [gradesData, subjectsData, statsData] = await Promise.all([
            dbManager.getGrades({ studentId: currentStudent.uid }),
            dbManager.getSubjects(),
            dbManager.getStudentStats(currentStudent.uid)
        ]);
        
        studentGrades = gradesData;
        subjects = subjectsData;
        studentStats = statsData;
        
        // Update UI
        updateStatsCards();
        updateGradesTable();
        updateSubjectProgress();
        updateSubjectsGrid();
        updateAcademicHistory();
        updateFilters();
        
    } catch (error) {
        console.error('Error loading student data:', error);
        showNotification('Error al cargar los datos', 'error');
    } finally {
        showLoading(false);
    }
}

function updateStatsCards() {
    if (!studentStats) return;
    
    document.getElementById('totalSubjects').textContent = studentStats.subjects.length;
    document.getElementById('overallAverage').textContent = studentStats.average;
    document.getElementById('totalGrades').textContent = studentStats.totalGrades;
    
    // Calculate low grades (below 60)
    const lowGrades = studentGrades.filter(grade => grade.value < 60).length;
    document.getElementById('lowGrades').textContent = lowGrades;
}

function updateGradesTable() {
    const tbody = document.getElementById('gradesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (studentGrades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">
                    No hay calificaciones registradas
                </td>
            </tr>
        `;
        return;
    }
    
    studentGrades.forEach(grade => {
        const subject = subjects.find(s => s.id === grade.subjectId);
        
        if (subject) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subject.name}</td>
                <td class="${getGradeClass(grade.value)}">${grade.value}</td>
                <td>${formatDate(grade.createdAt)}</td>
                <td>${grade.comment || '-'}</td>
                <td>
                    <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(grade.value)}">
                        ${getStatusText(grade.value)}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

function updateSubjectProgress() {
    const container = document.getElementById('subjectProgress');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (studentGrades.length === 0) {
        container.innerHTML = `
            <p class="text-gray-500 text-center py-4">
                No hay datos de progreso disponibles
            </p>
        `;
        return;
    }
    
    // Group grades by subject
    const subjectGroups = {};
    studentGrades.forEach(grade => {
        if (!subjectGroups[grade.subjectId]) {
            subjectGroups[grade.subjectId] = [];
        }
        subjectGroups[grade.subjectId].push(grade);
    });
    
    // Calculate averages for each subject
    Object.keys(subjectGroups).forEach(subjectId => {
        const subject = subjects.find(s => s.id === subjectId);
        const grades = subjectGroups[subjectId];
        const average = grades.reduce((sum, g) => sum + g.value, 0) / grades.length;
        
        if (subject) {
            const progressItem = document.createElement('div');
            progressItem.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
            progressItem.innerHTML = `
                <div>
                    <h4 class="font-medium text-gray-900">${subject.name}</h4>
                    <p class="text-sm text-gray-600">${grades.length} calificaciones</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-semibold ${getGradeClass(average)}">${average.toFixed(1)}</p>
                    <div class="w-20 h-2 bg-gray-200 rounded-full mt-1">
                        <div class="h-2 bg-primary-500 rounded-full" style="width: ${average}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(progressItem);
        }
    });
}

function updateSubjectsGrid() {
    const grid = document.getElementById('subjectsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (subjects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                No hay asignaturas disponibles
            </div>
        `;
        return;
    }
    
    subjects.forEach(subject => {
        const subjectGrades = studentGrades.filter(g => g.subjectId === subject.id);
        const average = subjectGrades.length > 0 
            ? (subjectGrades.reduce((sum, g) => sum + g.value, 0) / subjectGrades.length).toFixed(1)
            : '0.0';
        
        const card = document.createElement('div');
        card.className = 'card cursor-pointer hover:shadow-md transition-shadow';
        card.onclick = () => showGradeDetail(subject.id);
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold text-gray-900">${subject.name}</h3>
                <span class="text-2xl font-bold ${getGradeClass(average)}">${average}</span>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600">Calificaciones: ${subjectGrades.length}</p>
                <p class="text-sm text-gray-600">Última: ${subjectGrades.length > 0 ? formatDate(subjectGrades[0].createdAt) : 'N/A'}</p>
            </div>
            <div class="mt-4 w-full h-2 bg-gray-200 rounded-full">
                <div class="h-2 bg-primary-500 rounded-full" style="width: ${average}%"></div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateAcademicHistory() {
    const container = document.getElementById('academicHistory');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (studentGrades.length === 0) {
        container.innerHTML = `
            <p class="text-gray-500 text-center py-4">
                No hay historial académico disponible
            </p>
        `;
        return;
    }
    
    // Sort grades by date (newest first)
    const sortedGrades = [...studentGrades].sort((a, b) => {
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
    });
    
    // Group by month
    const monthlyGroups = {};
    sortedGrades.forEach(grade => {
        const date = grade.createdAt.toDate ? grade.createdAt.toDate() : new Date(grade.createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = [];
        }
        monthlyGroups[monthKey].push(grade);
    });
    
    // Create history items
    Object.keys(monthlyGroups).forEach(monthKey => {
        const grades = monthlyGroups[monthKey];
        const average = grades.reduce((sum, g) => sum + g.value, 0) / grades.length;
        const date = new Date(monthKey + '-01');
        
        const historyItem = document.createElement('div');
        historyItem.className = 'border-l-4 border-primary-500 pl-4 py-3';
        historyItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-medium text-gray-900">${date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h4>
                    <p class="text-sm text-gray-600">${grades.length} calificaciones</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-semibold ${getGradeClass(average)}">${average.toFixed(1)}</p>
                </div>
            </div>
        `;
        container.appendChild(historyItem);
    });
}

function updateFilters() {
    // Update subject filter
    const subjectFilter = document.getElementById('subjectFilter');
    if (subjectFilter) {
        subjectFilter.innerHTML = '<option value="">Todas las asignaturas</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            subjectFilter.appendChild(option);
        });
    }
    
    // Update period filter
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
        periodFilter.innerHTML = '<option value="">Todos los períodos</option>';
        
        // Get unique months from grades
        const months = [...new Set(studentGrades.map(grade => {
            const date = grade.createdAt.toDate ? grade.createdAt.toDate() : new Date(grade.createdAt);
            return `${date.getFullYear()}-${date.getMonth() + 1}`;
        }))].sort().reverse();
        
        months.forEach(month => {
            const date = new Date(month + '-01');
            const option = document.createElement('option');
            option.value = month;
            option.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            periodFilter.appendChild(option);
        });
    }
}

function setupEventListeners() {
    // Filters
    const subjectFilter = document.getElementById('subjectFilter');
    const periodFilter = document.getElementById('periodFilter');
    
    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterGrades);
    }
    if (periodFilter) {
        periodFilter.addEventListener('change', filterGrades);
    }
}

function filterGrades() {
    const subjectFilter = document.getElementById('subjectFilter');
    const periodFilter = document.getElementById('periodFilter');
    
    const subjectId = subjectFilter ? subjectFilter.value : '';
    const period = periodFilter ? periodFilter.value : '';
    
    let filteredGrades = studentGrades;
    
    if (subjectId) {
        filteredGrades = filteredGrades.filter(g => g.subjectId === subjectId);
    }
    if (period) {
        filteredGrades = filteredGrades.filter(g => {
            const date = g.createdAt.toDate ? g.createdAt.toDate() : new Date(g.createdAt);
            const gradeMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
            return gradeMonth === period;
        });
    }
    
    updateGradesTableWithData(filteredGrades);
}

function updateGradesTableWithData(gradesData) {
    const tbody = document.getElementById('gradesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (gradesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">
                    No se encontraron calificaciones
                </td>
            </tr>
        `;
        return;
    }
    
    gradesData.forEach(grade => {
        const subject = subjects.find(s => s.id === grade.subjectId);
        
        if (subject) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subject.name}</td>
                <td class="${getGradeClass(grade.value)}">${grade.value}</td>
                <td>${formatDate(grade.createdAt)}</td>
                <td>${grade.comment || '-'}</td>
                <td>
                    <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(grade.value)}">
                        ${getStatusText(grade.value)}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

// Utility functions
function getGradeClass(grade) {
    const numGrade = parseFloat(grade);
    if (numGrade >= 90) return 'grade-excellent';
    if (numGrade >= 80) return 'grade-good';
    if (numGrade >= 70) return 'grade-average';
    return 'grade-poor';
}

function getStatusClass(grade) {
    const numGrade = parseFloat(grade);
    if (numGrade >= 90) return 'bg-success-100 text-success-800';
    if (numGrade >= 80) return 'bg-primary-100 text-primary-800';
    if (numGrade >= 70) return 'bg-warning-100 text-warning-800';
    return 'bg-danger-100 text-danger-800';
}

function getStatusText(grade) {
    const numGrade = parseFloat(grade);
    if (numGrade >= 90) return 'Excelente';
    if (numGrade >= 80) return 'Bueno';
    if (numGrade >= 70) return 'Regular';
    return 'Necesita mejorar';
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES');
}

// Modal functions
window.showGradeDetail = function(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    const subjectGrades = studentGrades.filter(g => g.subjectId === subjectId);
    
    if (!subject || subjectGrades.length === 0) {
        showNotification('No hay calificaciones para esta asignatura', 'info');
        return;
    }
    
    const average = subjectGrades.reduce((sum, g) => sum + g.value, 0) / subjectGrades.length;
    const highest = Math.max(...subjectGrades.map(g => g.value));
    const lowest = Math.min(...subjectGrades.map(g => g.value));
    
    const modal = document.getElementById('gradeDetailModal');
    const content = document.getElementById('gradeDetailContent');
    
    if (modal && content) {
        content.innerHTML = `
            <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">${subject.name}</h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Promedio:</span>
                        <span class="font-semibold ${getGradeClass(average)}">${average.toFixed(1)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Calificación más alta:</span>
                        <span class="font-semibold grade-excellent">${highest}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Calificación más baja:</span>
                        <span class="font-semibold grade-poor">${lowest}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Total de calificaciones:</span>
                        <span class="font-semibold">${subjectGrades.length}</span>
                    </div>
                </div>
                
                <div class="mt-6">
                    <h4 class="font-medium text-gray-900 mb-3">Historial de calificaciones</h4>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${subjectGrades.map(grade => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span class="text-sm">${formatDate(grade.createdAt)}</span>
                                <span class="font-semibold ${getGradeClass(grade.value)}">${grade.value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

window.hideGradeDetailModal = function() {
    const modal = document.getElementById('gradeDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
};

// Tab functions
window.showTab = function(tabName) {
    // Hide all tabs
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabContents.forEach(content => content.classList.remove('active'));
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    const selectedButton = document.getElementById(`tab-${tabName}`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedButton) selectedButton.classList.add('active');
};

// Sign out function
window.signOut = async function() {
    try {
        await firebaseSignOut(auth);
        showNotification('Sesión cerrada exitosamente', 'success');
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
};
