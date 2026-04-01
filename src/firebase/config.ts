import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, linkWithCredential, EmailAuthProvider, GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import { getDatabase, ref, set, get, onValue, off, update, push, serverTimestamp, child, onDisconnect, remove, query, orderByChild, limitToLast } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDc7SUlLi_tE9L9GBzfwhi99vfZFvZfn7Y",
  authDomain: "support-ticket-1d282.firebaseapp.com",
  databaseURL: "https://support-ticket-1d282-default-rtdb.firebaseio.com",
  projectId: "support-ticket-1d282",
  storageBucket: "support-ticket-1d282.firebasestorage.app",
  messagingSenderId: "35056522642",
  appId: "1:35056522642:web:99f3fa371317f54c07dd4b",
  measurementId: "G-W4C3D97E6G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export {
  signInAnonymously,
  onAuthStateChanged,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  ref,
  set,
  get,
  onValue,
  off,
  update,
  push,
  serverTimestamp,
  child,
  onDisconnect,
  remove,
  query,
  orderByChild,
  limitToLast
};
