import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDArlaidbMgHfMvy4U6HcaNS3B9j59pN60",
  authDomain: "incidencias-a781e.firebaseapp.com",
  projectId: "incidencias-a781e",
  storageBucket: "incidencias-a781e.appspot.com",
  messagingSenderId: "567280156809",
  appId: "1:567280156809:web:bb5156f7ea49597cd78658",
  measurementId: "G-NYW0PJ0TL4"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Authentication
export const auth = getAuth(app);

// Inicializa Firestore
export const db = getFirestore(app);
// Agrega Storage
export const storage = getStorage(app, "gs://incidencias-a781e.firebasestorage.app");
export const functions = getFunctions(app, "us-central1");
// Para probar en local descomenta esto Y ejecuta: firebase emulators:start --only functions
// if (location.hostname === "localhost") connectFunctionsEmulator(functions, "localhost", 5001);
