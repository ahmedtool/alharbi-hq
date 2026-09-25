
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file should only be imported in server-side code (Server Actions, API Routes).
// It contains sensitive credentials and will cause a build to fail if imported on the client.

let app: App;

if (getApps().length === 0) {
  // Use Application Default Credentials.
  // This works automatically in Google Cloud environments (like App Hosting)
  // and uses the local SDK credentials (from `firebase login`) in local development.
  app = initializeApp();
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db, app };
