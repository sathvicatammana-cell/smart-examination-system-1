import { Router } from 'express';
import { studentController } from '../controllers/studentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin', 'incharge']), studentController.getAll);
router.get('/:id', authenticateToken, studentController.getById);

router.post('/', authenticateToken, requireRole('admin'), studentController.create);
router.put('/:id', authenticateToken, requireRole('admin'), studentController.update);

export default router;
