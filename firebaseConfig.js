import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
    apiKey: "AIzaSyCLrVl6Q4LL5-Tjj25pvriAwnS1y92YRkg",
    authDomain: "event2k25-9342d.firebaseapp.com",
    projectId: "event2k25-9342d",
    storageBucket: "event2k25-9342d.firebasestorage.app",
    messagingSenderId: "995819514771",
    appId: "1:995819514771:web:7c2caf1dd08404edca1666",
    measurementId: "G-SMMY656GPC"
  };
  

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);        
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };