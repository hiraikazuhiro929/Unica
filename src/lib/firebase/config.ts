import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration with hardcoded values for production stability
const firebaseConfig = {
  apiKey: "AIzaSyAIe-WxxfD6ID1QLWp7-PSykPvtW4mcECA",
  authDomain: "unica-1ef93.firebaseapp.com",
  projectId: "unica-1ef93",
  storageBucket: "unica-1ef93.firebasestorage.app",
  messagingSenderId: "390538059390",
  appId: "1:390538059390:web:da8ea2cb9d609cd462022f",
  measurementId: "G-EGSBCH5T7B"
};

// Initialize Firebase App (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  // Check if Firebase app already exists
  const existingApps = getApps();
  
  if (existingApps.length > 0) {
    app = existingApps[0];
    console.log('✅ Using existing Firebase app instance');
  } else {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
  }

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase services initialized:', {
    app: !!app,
    auth: !!auth,
    firestore: !!db,
    projectId: firebaseConfig.projectId
  });

} catch (error: any) {
  console.error('❌ Firebase initialization failed:', error);
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

// Export Firebase instances
export { auth, db, app };
export default app;

// Export Firebase status for debugging
export const firebaseStatus = {
  initialized: !!(app && auth && db),
  projectId: firebaseConfig.projectId,
  config: firebaseConfig
};