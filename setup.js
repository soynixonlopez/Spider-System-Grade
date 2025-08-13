#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🕷️  Spider Grades System - Setup\n');

// Check if Node.js is installed
try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js ${nodeVersion} detected`);
} catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js first.');
    process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
}

// Build CSS
console.log('\n🎨 Building CSS...');
try {
    execSync('npm run build:css', { stdio: 'inherit' });
    console.log('✅ CSS built successfully');
} catch (error) {
    console.error('❌ Failed to build CSS');
    process.exit(1);
}

// Check if Firebase config exists
const firebaseConfigPath = path.join(__dirname, 'public', 'js', 'firebase-config.js');
const firebaseConfig = fs.readFileSync(firebaseConfigPath, 'utf8');

if (firebaseConfig.includes('your-api-key')) {
    console.log('\n⚠️  Firebase configuration needed!');
    console.log('Please follow these steps:');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log('2. Create a new project');
    console.log('3. Enable Authentication (Email/Password)');
    console.log('4. Create a Firestore database');
    console.log('5. Get your web app configuration');
    console.log('6. Update public/js/firebase-config.js with your credentials');
    console.log('\nFor detailed instructions, see README.md');
} else {
    console.log('✅ Firebase configuration detected');
}

console.log('\n🚀 Setup complete!');
console.log('\nTo start the development server:');
console.log('  npm run dev');
console.log('\nTo build for production:');
console.log('  npm run build');
console.log('\nFor deployment instructions, see README.md');
