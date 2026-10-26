// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 1. KAILANGAN NATIN 'TONG IMPORTS NA 'TO PARA SA AUTH AT DATABASE
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Web config is public by design (security = Firestore rules + App Check).
// Restrict this API key to your domains in Google Cloud Console → Credentials.
const firebaseConfig = {
  apiKey: "AIzaSyBdyD_rGV7lucs8fqTk2I7ZBW1YRvfiOks",
  authDomain: "crimsoncloudhr.firebaseapp.com",
  projectId: "crimsoncloudhr",
  storageBucket: "crimsoncloudhr.firebasestorage.app",
  messagingSenderId: "244371402335",
  appId: "1:244371402335:web:149687e962e2984c22b5ea",
  measurementId: "G-GQZHQS1L6H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🛡️ APP CHECK — must run BEFORE any Firestore/Auth/Storage call.
// Only requests from your real website (proven via reCAPTCHA v3) are accepted
// once enforcement is turned on in the Firebase console.
if (import.meta.env.DEV) {
  // Prints a debug token in the browser console; register it in
  // Firebase Console → App Check → Apps → ⋮ → Manage debug tokens.
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  console.warn("App Check disabled: VITE_RECAPTCHA_SITE_KEY is not set.");
}

export const analytics = getAnalytics(app);

// 2. KAILANGAN NATIN 'TONG I-EXPORT PARA MA-ACCESS NG LOGIN.TSX
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);