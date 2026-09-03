import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC7X1ndFahb0_2gR7K3TptupRViScDJ7Kg",
  authDomain: "timesheet-a258f.firebaseapp.com",
  projectId: "timesheet-a258f",
  storageBucket: "timesheet-a258f.appspot.com",
  messagingSenderId: "1056588691512",
  appId: "1:1056588691512:web:35cb8c1e2b5e282d8c36ad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Modern Firestore offline cache initialization
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
