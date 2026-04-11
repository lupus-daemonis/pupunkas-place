import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { FIREBASE_CONFIG } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

export const filmsCol = collection(db, "films");
export const cookingCol = collection(db, "cooking");
export const placesCol = collection(db, "places");
export const statusCol = collection(db, "status_v2");
export const avatarsCol = collection(db, "avatars");

export { db, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs };