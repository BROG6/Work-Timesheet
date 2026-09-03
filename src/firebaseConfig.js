import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// SJR Builders Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7X1ndFahb0_2gR7K3TptupRViScDJ7Kg",
  authDomain: "timesheet-a258f.firebaseapp.com",
  projectId: "timesheet-a258f",
  storageBucket: "timesheet-a258f.appspot.com",
  messagingSenderId: "1056588691512",
  appId: "1:1056588691512:web:35cb8c1e2b5e282d8c36ad"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Firestore Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Fails if multiple tabs are open at the same time
    console.warn('Firestore offline persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // Fails if the current browser does not support IndexedDB
    console.warn('Firestore offline persistence is not supported by this browser');
  }
});
