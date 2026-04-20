const admin = require('firebase-admin');

const getPrivateKey = () => {
  let key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  // Handle both literal \n in .env and actual newlines
  key = key.replace(/\\n/g, '\n');
  key = key.replace(/n\\r/g, '\n');
  // Add PEM headers if not present
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    key = '-----BEGIN PRIVATE KEY-----\n' + key + '\n-----END PRIVATE KEY-----';
  }
  return key;
};

const serviceAccount = {
  type: 'service_account',
  project_id: 'jarvis-cc51c',
  private_key: getPrivateKey(),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40jarvis-cc51c.iam.gserviceaccount.com`
};

const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[Firebase] Admin initialized successfully');
    } catch (error) {
      console.error('[Firebase] Initialization error:', error.message);
    }
  }
};

const verifyIdToken = async (idToken) => {
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    throw new Error('Invalid Firebase token');
  }
};

const getUserByEmail = async (email) => {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (error) {
    return null;
  }
};

module.exports = {
  initializeFirebase,
  verifyIdToken,
  getUserByEmail,
  admin
};