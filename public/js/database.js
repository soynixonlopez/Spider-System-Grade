import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Database operations class
export class DatabaseManager {
    constructor() {
        this.collections = {
            users: 'users',
            students: 'students',
            subjects: 'subjects',
            grades: 'grades'
        };
    }

    // User operations
    async createUser(userData) {
        try {
            const docRef = await addDoc(collection(db, this.collections.users), {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUser(userId) {
        try {
            const docRef = doc(db, this.collections.users, userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const docRef = doc(db, this.collections.users, userId);
            await updateDoc(docRef, {
                ...userData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Student operations
    async createStudent(studentData) {
        try {
            const docRef = await addDoc(collection(db, this.collections.students), {
                ...studentData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    }

    async getStudents() {
        try {
            const q = query(
                collection(db, this.collections.students),
                orderBy('name', 'asc')
            );
            const querySnapshot = await getDocs(q);
            
            const students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: doc.id, ...doc.data() });
            });
            
            return students;
        } catch (error) {
            console.error('Error getting students:', error);
            throw error;
        }
    }

    async getStudent(studentId) {
        try {
            const docRef = doc(db, this.collections.students, studentId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting student:', error);
            throw error;
        }
    }

    async updateStudent(studentId, studentData) {
        try {
            const docRef = doc(db, this.collections.students, studentId);
            await updateDoc(docRef, {
                ...studentData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    }

    async deleteStudent(studentId) {
        try {
            await deleteDoc(doc(db, this.collections.students, studentId));
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }

    // Subject operations
    async createSubject(subjectData) {
        try {
            const docRef = await addDoc(collection(db, this.collections.subjects), {
                ...subjectData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating subject:', error);
            throw error;
        }
    }

    async getSubjects() {
        try {
            const q = query(
                collection(db, this.collections.subjects),
                orderBy('name', 'asc')
            );
            const querySnapshot = await getDocs(q);
            
            const subjects = [];
            querySnapshot.forEach((doc) => {
                subjects.push({ id: doc.id, ...doc.data() });
            });
            
            return subjects;
        } catch (error) {
            console.error('Error getting subjects:', error);
            throw error;
        }
    }

    async getSubject(subjectId) {
        try {
            const docRef = doc(db, this.collections.subjects, subjectId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting subject:', error);
            throw error;
        }
    }

    async updateSubject(subjectId, subjectData) {
        try {
            const docRef = doc(db, this.collections.subjects, subjectId);
            await updateDoc(docRef, {
                ...subjectData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating subject:', error);
            throw error;
        }
    }

    async deleteSubject(subjectId) {
        try {
            await deleteDoc(doc(db, this.collections.subjects, subjectId));
        } catch (error) {
            console.error('Error deleting subject:', error);
            throw error;
        }
    }

    // Grade operations
    async createGrade(gradeData) {
        try {
            const docRef = await addDoc(collection(db, this.collections.grades), {
                ...gradeData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating grade:', error);
            throw error;
        }
    }

    async getGrades(filters = {}) {
        try {
            let q = collection(db, this.collections.grades);
            
            // Apply filters
            if (filters.studentId) {
                q = query(q, where('studentId', '==', filters.studentId));
            }
            if (filters.subjectId) {
                q = query(q, where('subjectId', '==', filters.subjectId));
            }
            if (filters.teacherId) {
                q = query(q, where('teacherId', '==', filters.teacherId));
            }
            
            // Order by date
            q = query(q, orderBy('createdAt', 'desc'));
            
            // Apply limit if specified
            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }
            
            const querySnapshot = await getDocs(q);
            
            const grades = [];
            querySnapshot.forEach((doc) => {
                grades.push({ id: doc.id, ...doc.data() });
            });
            
            return grades;
        } catch (error) {
            console.error('Error getting grades:', error);
            throw error;
        }
    }

    async getGrade(gradeId) {
        try {
            const docRef = doc(db, this.collections.grades, gradeId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting grade:', error);
            throw error;
        }
    }

    async updateGrade(gradeId, gradeData) {
        try {
            const docRef = doc(db, this.collections.grades, gradeId);
            await updateDoc(docRef, {
                ...gradeData,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating grade:', error);
            throw error;
        }
    }

    async deleteGrade(gradeId) {
        try {
            await deleteDoc(doc(db, this.collections.grades, gradeId));
        } catch (error) {
            console.error('Error deleting grade:', error);
            throw error;
        }
    }

    // Statistics and analytics
    async getStudentStats(studentId) {
        try {
            const grades = await this.getGrades({ studentId });
            
            if (grades.length === 0) {
                return {
                    totalGrades: 0,
                    average: 0,
                    highest: 0,
                    lowest: 0,
                    subjects: []
                };
            }
            
            const totalGrades = grades.length;
            const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
            const average = sum / totalGrades;
            const highest = Math.max(...grades.map(g => g.value));
            const lowest = Math.min(...grades.map(g => g.value));
            
            // Get unique subjects
            const subjects = [...new Set(grades.map(g => g.subjectId))];
            
            return {
                totalGrades,
                average: Math.round(average * 10) / 10,
                highest,
                lowest,
                subjects
            };
        } catch (error) {
            console.error('Error getting student stats:', error);
            throw error;
        }
    }

    async getSubjectStats(subjectId) {
        try {
            const grades = await this.getGrades({ subjectId });
            
            if (grades.length === 0) {
                return {
                    totalGrades: 0,
                    average: 0,
                    highest: 0,
                    lowest: 0,
                    students: []
                };
            }
            
            const totalGrades = grades.length;
            const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
            const average = sum / totalGrades;
            const highest = Math.max(...grades.map(g => g.value));
            const lowest = Math.min(...grades.map(g => g.value));
            
            // Get unique students
            const students = [...new Set(grades.map(g => g.studentId))];
            
            return {
                totalGrades,
                average: Math.round(average * 10) / 10,
                highest,
                lowest,
                students
            };
        } catch (error) {
            console.error('Error getting subject stats:', error);
            throw error;
        }
    }

    async getTeacherStats(teacherId) {
        try {
            const grades = await this.getGrades({ teacherId });
            
            if (grades.length === 0) {
                return {
                    totalGrades: 0,
                    totalStudents: 0,
                    totalSubjects: 0,
                    average: 0
                };
            }
            
            const totalGrades = grades.length;
            const students = [...new Set(grades.map(g => g.studentId))];
            const subjects = [...new Set(grades.map(g => g.subjectId))];
            const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
            const average = sum / totalGrades;
            
            return {
                totalGrades,
                totalStudents: students.length,
                totalSubjects: subjects.length,
                average: Math.round(average * 10) / 10
            };
        } catch (error) {
            console.error('Error getting teacher stats:', error);
            throw error;
        }
    }
}

// Create global database manager instance
export const dbManager = new DatabaseManager();
