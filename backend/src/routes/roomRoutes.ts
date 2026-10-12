import { Router } from 'express';
import { roomController } from '../controllers/roomController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, roomController.getAll);
router.get('/:id', authenticateToken, roomController.getById);

router.post('/', authenticateToken, requireRole('admin'), roomController.create);
router.put('/:id', authenticateToken, requireRole('admin'), roomController.update);

export default router;
