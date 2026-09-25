
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  "projectId": "my-cockpit-vu7m6",
  "appId": "1:491260729505:web:98fdab88de0e95383038e0",
  "storageBucket": "my-cockpit-vu7m6.firebasestorage.app",
  "apiKey": "AIzaSyCHwxmb4W2PNvXRJsRufd49b7WxEVy-8ts",
  "authDomain": "my-cockpit-vu7m6.firebaseapp.com",
  "measurementId": ""
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Updated Firestore initialization with multi-tab persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});


const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);


export { app, db, storage, auth, functions };
