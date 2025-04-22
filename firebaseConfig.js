import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCLrVl6Q4LL5-Tjj25pvriAwnS1y92YRkg",
  authDomain: "event2k25-9342d.firebaseapp.com",
  projectId: "event2k25-9342d",
  storageBucket: "event2k25-9342d.firebasestorage.app",
  messagingSenderId: "995819514771",
  appId: "1:995819514771:web:7c2caf1dd08404edca1666",
  measurementId: "G-SMMY656GPC"
};

// Only initialize once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Only initialize auth once
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app); // fallback if already initialized
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, auth, storage };
