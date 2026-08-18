import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let _app: FirebaseApp | null = null;
if (firebaseReady) {
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const auth: Auth | null = _app ? getAuth(_app) : null;

// Use localStorage instead of IndexedDB for the auth session — avoids a
// known Firebase "Database is closing/hidden" error on sign-in.
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export const googleProvider = _app ? new GoogleAuthProvider() : null;
export const microsoftProvider = _app
  ? new OAuthProvider("microsoft.com")
  : null;

// SmartNexus is a custom OpenID Connect provider configured in Firebase Auth.
// Its providerId must match the one shown in the Firebase console.
export const smartnexusProvider = _app
  ? new OAuthProvider(
      process.env.NEXT_PUBLIC_SMARTNEXUS_PROVIDER_ID || "oidc.smartnexus"
    )
  : null;
