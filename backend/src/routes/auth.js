const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { initializeFirebase, verifyIdToken } = require('../config/firebase');

initializeFirebase();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword,
      name: name || username
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, phone, telegramId, whatsappNumber, preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { 
        ...(name && { name }),
        ...(phone && { phone }),
        ...(telegramId && { telegramId }),
        ...(whatsappNumber && { whatsappNumber }),
        ...(preferences && { preferences }),
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/google-login', async (req, res) => {
  try {
    const { idToken, email, name, photoURL } = req.body;

    if (!idToken || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError.message);
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    if (decodedToken.email !== email) {
      return res.status(401).json({ error: 'Email mismatch' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const username = email.split('@')[0] + '_' + Date.now().toString(36);
      
      user = new User({
        username,
        email,
        name: name || decodedToken.name || username,
        photoURL: photoURL || decodedToken.picture,
        isGoogleAccount: true,
        password: 'google_oauth_' + Date.now(),
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          voiceEnabled: true
        }
      });

      await user.save();
      console.log('[Auth] New Google user created:', email);
    } else {
      user.name = name || user.name;
      user.photoURL = photoURL || user.photoURL;
      user.isGoogleAccount = true;
      user.updatedAt = new Date();
      await user.save();
      console.log('[Auth] Google user logged in:', email);
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('[Auth] Google login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/push-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { token: pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'Token is required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pushTokens.includes(pushToken)) {
      user.pushTokens.push(pushToken);
      await user.save();
    }
    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;