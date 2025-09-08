import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables with proper fallback
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAIe-WxxfD6ID1QLWp7-PSykPvtW4mcECA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "unica-1ef93.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "unica-1ef93",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "unica-1ef93.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "390538059390",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:390538059390:web:da8ea2cb9d609cd462022f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EGSBCH5T7B"
};

// Environment variables validation with warning (not error)
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn('⚠️ Missing environment variables, using fallback config:', missingVars);
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Production environment should use environment variables for security!');
  }
}

// Initialize Firebase App (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

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
  storage = getStorage(app);
  
  console.log('✅ Firebase services initialized:', {
    app: !!app,
    auth: !!auth,
    firestore: !!db,
    storage: !!storage,
    projectId: firebaseConfig.projectId
  });

} catch (error: any) {
  console.error('❌ Firebase initialization failed:', error);
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

// Export Firebase instances
export { auth, db, storage, app };
export default app;

// Export Firebase status for debugging
export const firebaseStatus = {
  initialized: !!(app && auth && db && storage),
  projectId: firebaseConfig.projectId,
  config: firebaseConfig
};