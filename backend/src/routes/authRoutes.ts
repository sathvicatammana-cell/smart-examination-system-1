import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.get('/me', authenticateToken, authController.getMe);
router.post('/switch-role', authenticateToken, authController.switchDemoRole);

export default router;
