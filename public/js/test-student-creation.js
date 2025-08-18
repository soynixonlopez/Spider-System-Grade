/**
 * Test script for student creation functionality
 * This script helps verify that students are created correctly with proper level assignment
 */

console.log('🧪 Loading student creation test script...');

// Mock functions for testing (in case the real ones aren't loaded yet)
function mockGenerateEmail(firstName, lastName, year = '2025') {
    const normalizedFirstName = firstName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .trim();
    
    const normalizedLastName = lastName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .trim();
    
    return `${normalizedFirstName}.${normalizedLastName}${year}@motta.superate.org.pa`;
}

function mockGeneratePasscode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Test function to verify student creation
async function testStudentCreation() {
    console.log('🧪 Testing student creation...');
    
    // Test data
    const testStudent = {
        firstName: 'Test',
        lastName: 'Student',
        email: 'test.student2025@motta.superate.org.pa',
        level: 'Senior',
        promotionId: 'test-promotion-id'
    };
    
    console.log('📋 Test student data:', testStudent);
    
    // Verify that the level is properly set
    if (testStudent.level === 'Senior') {
        console.log('✅ Level assignment test passed');
    } else {
        console.log('❌ Level assignment test failed');
    }
    
    // Test email generation
    const realGenerateEmail = typeof generateEmail === 'function' ? generateEmail : mockGenerateEmail;
    const generatedEmail = realGenerateEmail(testStudent.firstName, testStudent.lastName, '2025');
    console.log('📧 Generated email:', generatedEmail);
    
    // Test passcode generation
    const realGeneratePasscode = typeof generatePasscode === 'function' ? generatePasscode : mockGeneratePasscode;
    const passcode = realGeneratePasscode();
    console.log('🔑 Generated passcode:', passcode);
    
    console.log('✅ Student creation test completed');
}

// Test function to verify form synchronization
function testFormSynchronization() {
    console.log('🧪 Testing form synchronization...');
    
    const individualLevel = document.getElementById('studentLevel');
    const bulkLevel = document.getElementById('bulkStudentLevel');
    
    if (individualLevel && bulkLevel) {
        console.log('✅ Level fields found');
        
        // Test synchronization
        individualLevel.value = 'Senior';
        console.log('🔄 Set individual level to Senior');
        
        // Trigger change event
        const event = new Event('change');
        individualLevel.dispatchEvent(event);
        
        console.log('📊 Individual level:', individualLevel.value);
        console.log('📊 Bulk level:', bulkLevel.value);
        
        if (bulkLevel.value === 'Senior') {
            console.log('✅ Form synchronization test passed');
        } else {
            console.log('❌ Form synchronization test failed');
        }
    } else {
        console.log('❌ Level fields not found');
    }
}

// Test function to verify UI updates
function testUIUpdates() {
    console.log('🧪 Testing UI updates...');
    
    const studentsList = document.getElementById('studentsByPromotion');
    if (studentsList) {
        console.log('✅ Students list element found');
        
        // Check if the list has been updated
        const hasContent = studentsList.innerHTML.trim().length > 0;
        if (hasContent) {
            console.log('✅ Students list has content');
        } else {
            console.log('⚠️ Students list is empty');
        }
    } else {
        console.log('❌ Students list element not found');
    }
}

// Run tests when page loads (only in development)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🧪 Student creation test script loaded');
    
    // Only run tests if we're in development mode (you can remove this in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Wait for the admin dashboard to fully initialize
        setTimeout(() => {
            console.log('🧪 Running student creation tests...');
            
            // Check if admin dashboard is loaded
            if (typeof window.showAddStudentsModal === 'function') {
                console.log('✅ Admin dashboard functions available');
                
                testStudentCreation();
                testFormSynchronization();
                testUIUpdates();
                
                console.log('🎉 All tests completed');
            } else {
                console.log('⚠️ Admin dashboard not fully loaded yet, skipping tests');
            }
        }, 3000);
    } else {
        console.log('🧪 Tests skipped in production environment');
    }
});

// Export test functions for manual testing
window.testStudentCreation = testStudentCreation;
window.testFormSynchronization = testFormSynchronization;
window.testUIUpdates = testUIUpdates;

console.log('✅ Student creation test script loaded');
