
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Load service account from JSON file
const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  return {
    admin,
    firestore: getFirestore(),
    auth: admin.auth()
  };
};

module.exports = initializeFirebase();