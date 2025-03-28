// This script sets up the admin password in Firestore
// Run this script once to initialize the admin password

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const crypto = require('crypto');

// Your Firebase configuration
const firebaseConfig = {
  // Copy your Firebase config here from lib/firebase.ts
  // apiKey, authDomain, projectId, etc.
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// The admin password you want to set
const adminPassword = "5566"; // Change this to your desired admin password

// Hash the password (in a real app, use a proper password hashing library like bcrypt)
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + "hyre_admin_salt")
    .digest('hex');
}

async function setupAdminPassword() {
  try {
    const passwordHash = hashPassword(adminPassword);
    
    // Set the admin settings document with the password hash
    await setDoc(doc(db, "settings", "admin"), {
      passwordHash,
      updatedAt: new Date().toISOString()
    });
    
    console.log("Admin password has been set up successfully!");
    console.log("The admin password is:", adminPassword);
    console.log("Make sure to keep this password secure and do not share it.");
  } catch (error) {
    console.error("Error setting up admin password:", error);
  }
}

setupAdminPassword();
