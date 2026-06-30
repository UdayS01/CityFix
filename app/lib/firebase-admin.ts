import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountRaw) {
    try {
      // Decode Base64 if it doesn't start with '{' (raw JSON)
      const serviceAccountStr = serviceAccountRaw.startsWith('{') 
        ? serviceAccountRaw 
        : Buffer.from(serviceAccountRaw, 'base64').toString('utf8');
        
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize admin', error);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK operations will fail if they require credentials.');
    // Fallback to application default credentials (useful for GCP environments)
    initializeApp();
  }
}

export const adminDb = getFirestore();
