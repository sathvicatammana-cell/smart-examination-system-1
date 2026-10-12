import { Router, Request, Response } from 'express';
import { isFirebaseAdminInitialized, initMode, initError, PROJECT_ID } from '../config/firebase.js';
import { dbService } from '../services/dbService.js';
import { seedService } from '../services/seedService.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Hallpass Examination Section Management System',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/health/firebase', (req: Request, res: Response) => {
  res.json({
    firebaseStatus: isFirebaseAdminInitialized ? 'connected' : 'initializing',
    projectId: PROJECT_ID,
    initMode,
    isLiveFirestore: dbService.isLiveFirestore(),
    error: initError,
    guidance: !isFirebaseAdminInitialized
      ? 'To enable full production Admin SDK features, set FIREBASE_SERVICE_ACCOUNT_KEY in your backend .env file.'
      : 'Firebase Admin SDK is active and connected to project ' + PROJECT_ID,
  });
});

router.post('/seed', async (req: Request, res: Response) => {
  try {
    const result = await seedService.runSeed();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Seed failed: ' + err.message });
  }
});

export default router;
