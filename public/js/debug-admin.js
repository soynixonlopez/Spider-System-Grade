// Debug script for admin dashboard
// Copy and paste this code in the browser console to check Firestore data

async function debugFirestoreData() {
    console.log('=== DEBUGGING FIRESTORE DATA ===');
    
    try {
        // Check promotions
        console.log('Checking promotions...');
        const promotionsSnapshot = await getDocs(collection(db, 'promotions'));
        console.log('Promotions found:', promotionsSnapshot.size);
        promotionsSnapshot.forEach(doc => {
            console.log('Promotion:', doc.id, doc.data());
        });
        
        // Check subjects
        console.log('\nChecking subjects...');
        const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
        console.log('Subjects found:', subjectsSnapshot.size);
        subjectsSnapshot.forEach(doc => {
            console.log('Subject:', doc.id, doc.data());
        });
        
        // Check teachers
        console.log('\nChecking teachers...');
        const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
        const teachersSnapshot = await getDocs(teachersQuery);
        console.log('Teachers found:', teachersSnapshot.size);
        teachersSnapshot.forEach(doc => {
            console.log('Teacher:', doc.id, doc.data());
        });
        
        // Check students
        console.log('\nChecking students...');
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        console.log('Students found:', studentsSnapshot.size);
        studentsSnapshot.forEach(doc => {
            console.log('Student:', doc.id, doc.data());
        });
        
        // Check all users
        console.log('\nChecking all users...');
        const usersSnapshot = await getDocs(collection(db, 'users'));
        console.log('Total users found:', usersSnapshot.size);
        usersSnapshot.forEach(doc => {
            console.log('User:', doc.id, doc.data());
        });
        
    } catch (error) {
        console.error('Error debugging Firestore data:', error);
    }
}

// Make function available globally
window.debugFirestoreData = debugFirestoreData;

console.log('Debug script loaded. Run debugFirestoreData() in console to check data.');
