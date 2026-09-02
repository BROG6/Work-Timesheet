
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7X1ndFahb0_2gR7K3TptupRViScDJ7Kg",
  authDomain: "timesheet-a258f.firebaseapp.com",
  projectId: "timesheet-a258f",
  storageBucket: "timesheet-a258f.firebasestorage.app",
  messagingSenderId: "986683715840",
  appId: "1:986683715840:web:36b15b9e9220fc6bc703e5",
  measurementId: "G-WQ68V6D8VC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Database so your app components can access them
export const db = getFirestore(app);
export const auth = getAuth(app);
