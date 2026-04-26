import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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

// Enable Offline Persistence
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Firestore persistence is not supported by this browser');
    }
  });
}

const auth = getAuth(app);

export { app, db, auth };
