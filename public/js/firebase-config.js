// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Your Firebase configuration object
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB5h8jJpYUIy6gj2Alz77pDRso5NUypcIk",
    authDomain: "spidersystem-ce9a6.firebaseapp.com",
    projectId: "spidersystem-ce9a6",
    storageBucket: "spidersystem-ce9a6.firebasestorage.app",
    messagingSenderId: "692141032958",
    appId: "1:692141032958:web:a0d5cae5f6781cc57aacaf",
    measurementId: "G-1EF2S30RC7"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Export all instances
export { app, auth, db };
