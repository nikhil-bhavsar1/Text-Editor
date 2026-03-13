import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if the config is valid
let app: any = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let githubProvider: GithubAuthProvider | null = null;

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here') {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        githubProvider = new GithubAuthProvider();

        // Add scopes for GitHub provider if needed (e.g., to read/write repos)
        githubProvider.addScope('repo'); // This is required to push to GitHub!
    } else {
        console.warn('Firebase configuration is missing or invalid. Authentication features will be disabled.');
    }
} catch (error) {
    console.error('Failed to initialize Firebase:', error);
}

export { auth, googleProvider, githubProvider };
