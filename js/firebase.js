import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWIJ9aXbxGLTI-W9jAI7ETm5oiBwyU30s",
  authDomain: "calendarguzmantorresi.firebaseapp.com",
  projectId: "calendarguzmantorresi",
  storageBucket: "calendarguzmantorresi.firebasestorage.app",
  messagingSenderId: "694923917928",
  appId: "1:694923917928:web:a83386753bb634341519dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc };


