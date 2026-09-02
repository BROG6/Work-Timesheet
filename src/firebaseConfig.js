
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
