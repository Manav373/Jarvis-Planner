import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDV5Y7TzNxAFSbmvuV5uC1byLpM_CSmPrI",
  authDomain: "jarvis-cc51c.firebaseapp.com",
  projectId: "jarvis-cc51c",
  storageBucket: "jarvis-cc51c.firebasestorage.app",
  messagingSenderId: "269290130248",
  appId: "1:269290130248:web:b8d31bcebf156eef92417d",
  measurementId: "G-YV3H46BJVS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Messaging may not be supported in some environments/browsers
let messaging = null;
try {
  if (typeof window !== "undefined") {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("FCM messaging initialization failed:", e);
}

export { messaging };
export const googleProvider = new GoogleAuthProvider();

export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BC8LnyXv5uXkM9z-P3Wj8R3Z-Z3J-lH_pL0d7C3F-nS8D2N7E4R5T6Y7U8I9O0P1' // Example VAPID key
      });
      return token;
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
  }
  return null;
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        idToken
      }
    };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const signOutGoogle = async () => {
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
};

export default app;