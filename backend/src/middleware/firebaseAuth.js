const admin = require('firebase-admin');

const firebaseAuth = async (req, res, next) => {
  const idToken = req.body.idToken || req.headers['x-firebase-token'];
  
  if (!idToken) {
    return res.status(401).json({ error: 'No Firebase token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    return res.status(401).json({ error: 'Invalid Firebase token' });
  }
};

module.exports = firebaseAuth;