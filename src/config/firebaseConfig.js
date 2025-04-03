// src/config/firebaseConfig.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import Firebase Auth
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD09QJBZIXtg9ar2YUzoPP2DcRvr0mD-70",
  authDomain: "firebasics-a3f9d.firebaseapp.com",
  projectId: "firebasics-a3f9d",
  storageBucket: "firebasics-a3f9d.appspot.com",
  messagingSenderId: "344596307239",
  appId: "1:344596307239:web:4e097389ec80cca1839d02",
  measurementId: "G-TCGBXYWDTC" // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Export the instances for use in other files
export { db, auth };
