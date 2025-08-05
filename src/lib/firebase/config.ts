import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAIe-WxxfD6ID1QLWp7-PSykPvtW4mcECA",
  authDomain: "unica-1ef93.firebaseapp.com",
  projectId: "unica-1ef93",
  storageBucket: "unica-1ef93.firebasestorage.app",
  messagingSenderId: "390538059390",
  appId: "1:390538059390:web:da8ea2cb9d609cd462022f",
  measurementId: "G-EGSBCH5T7B"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;