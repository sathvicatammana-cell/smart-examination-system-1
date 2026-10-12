import { Router } from 'express';
import { staffController } from '../controllers/staffController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, staffController.getAll);
router.post('/', authenticateToken, requireRole('admin'), staffController.create);
router.post('/assign-room', authenticateToken, requireRole('admin'), staffController.assignRoom);
router.put('/:id', authenticateToken, requireRole('admin'), staffController.update);

export default router;
