import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCbGcZaDDAXWv3yj4ET2H8KFxiibwkWS9Y",
  authDomain: "happyteeth-inventory.firebaseapp.com",
  projectId: "happyteeth-inventory",
  storageBucket: "happyteeth-inventory.firebasestorage.app",
  messagingSenderId: "272703728852",
  appId: "1:272703728852:web:644a477382d512a806c99c" 
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
