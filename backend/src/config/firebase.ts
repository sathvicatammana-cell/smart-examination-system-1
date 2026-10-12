import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'smart-examination-dac73';

let isFirebaseAdminInitialized = false;
let initMode: 'service_account_env' | 'credentials_file' | 'default_app' | 'fallback_mode' = 'fallback_mode';
let initError: string | null = null;

function initializeFirebaseAdmin(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  try {
    const serviceAccountKeyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
    if (serviceAccountKeyRaw && serviceAccountKeyRaw.length > 20 && (serviceAccountKeyRaw.startsWith('{') || serviceAccountKeyRaw.startsWith('eyJ'))) {
      try {
        let keyJsonStr = serviceAccountKeyRaw;
        if (!keyJsonStr.startsWith('{')) {
          keyJsonStr = Buffer.from(keyJsonStr, 'base64').toString('utf-8');
        }
        const serviceAccount = JSON.parse(keyJsonStr);
        const app = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || PROJECT_ID,
        });
        isFirebaseAdminInitialized = true;
        initMode = 'service_account_env';
        console.log(`[Firebase Admin] Initialized with Service Account (Project: ${serviceAccount.project_id || PROJECT_ID})`);
        return app;
      } catch (err: any) {
        console.warn(`[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY: ${err.message}`);
      }
    }

    // 2. Check for GOOGLE_APPLICATION_CREDENTIALS file
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credsPath && fs.existsSync(credsPath)) {
      const fileContent = fs.readFileSync(credsPath, 'utf-8');
      const serviceAccount = JSON.parse(fileContent);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || PROJECT_ID,
      });
      isFirebaseAdminInitialized = true;
      initMode = 'credentials_file';
      console.log(`[Firebase Admin] Initialized with credentials file: ${credsPath}`);
      return app;
    }

    // 3. Application Default / Project ID
    try {
      const app = initializeApp({
        projectId: PROJECT_ID,
      });
      isFirebaseAdminInitialized = true;
      initMode = 'default_app';
      console.log(`[Firebase Admin] Initialized with Project ID: ${PROJECT_ID}`);
      return app;
    } catch (err: any) {
      initError = err.message;
      console.warn(`[Firebase Admin] Default app initialization warning: ${err.message}`);
    }
  } catch (err: any) {
    initError = err.message;
    console.error(`[Firebase Admin] Initialization failed: ${err.message}`);
  }

  // Fallback app
  const fallbackApp = initializeApp({
    projectId: PROJECT_ID,
  }, 'hallpass-fallback');
  initMode = 'fallback_mode';
  return fallbackApp;
}

const adminApp = initializeFirebaseAdmin();

export { adminApp, isFirebaseAdminInitialized, initMode, initError, PROJECT_ID };
export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
