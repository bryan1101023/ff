#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Firebase configuration from your previous setup
const firebaseConfig = {
  apiKey: "AIzaSyCYb_AD2mPoBv6o-oaJUBv9ZWvGcQ6LY8I",
  authDomain: "loll-8b3ea.firebaseapp.com",
  databaseURL: "https://loll-8b3ea-default-rtdb.firebaseio.com",
  projectId: "loll-8b3ea",
  storageBucket: "loll-8b3ea.firebasestorage.app",
  messagingSenderId: "953906832856",
  appId: "1:953906832856:web:4536b15a8dc9683d743ead",
};

// Admin password
const adminPassword = "1293";

// Simple hash function for the admin password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate the admin password hash
const adminPasswordHash = hashPassword(adminPassword);

// Create the .env.local file content
const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${firebaseConfig.apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${firebaseConfig.authDomain}
NEXT_PUBLIC_FIREBASE_DATABASE_URL=${firebaseConfig.databaseURL}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${firebaseConfig.projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${firebaseConfig.storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${firebaseConfig.messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${firebaseConfig.appId}

# Admin Configuration
NEXT_PUBLIC_ADMIN_PASSWORD=${adminPassword}
NEXT_PUBLIC_ADMIN_PASSWORD_HASH=${adminPasswordHash}

# IMPORTANT: Never commit this file to version control!
`;

// Path to the .env.local file
const envPath = path.join(__dirname, '..', '.env.local');

// Write the file
fs.writeFileSync(envPath, envContent);

console.log('✅ .env.local file created successfully!');
console.log('🔒 Your Firebase configuration and admin password are now securely stored.');
console.log('🚀 Restart your development server to apply these changes.');
