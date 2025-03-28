import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCYb_AD2mPoBv6o-oaJUBv9ZWvGcQ6LY8I",
  authDomain: "loll-8b3ea.firebaseapp.com",
  databaseURL: "https://loll-8b3ea-default-rtdb.firebaseio.com",
  projectId: "loll-8b3ea",
  storageBucket: "loll-8b3ea.firebasestorage.app",
  messagingSenderId: "953906832856",
  appId: "1:953906832856:web:4536b15a8dc9683d743ead",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const rtdb = getDatabase(app)

export { app, auth, db, rtdb }

