// This script generates a hash for your admin password
// Run this script once to get the hash to set in your Vercel environment variables

const crypto = require('crypto');

// The admin password you want to set
const adminPassword = process.argv[2] || "5566"; // Default or pass as command line argument

// Hash the password (same function as in auth-utils.ts)
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + "hyre_admin_salt")
    .digest('hex');
}

// Generate the hash
const passwordHash = hashPassword(adminPassword);

console.log("\n=== ADMIN PASSWORD HASH ===");
console.log(passwordHash);
console.log("\nAdd this hash to your Vercel environment variables as NEXT_PUBLIC_ADMIN_PASSWORD_HASH");
console.log("The admin password is:", adminPassword);
console.log("Make sure to keep this password secure and do not share it.\n");
