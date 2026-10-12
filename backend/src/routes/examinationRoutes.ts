import { Router } from 'express';
import { examinationController } from '../controllers/examinationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Read exams
router.get('/', authenticateToken, examinationController.getAll);
router.get('/:id', authenticateToken, examinationController.getById);

// Admin-only mutation
router.post('/', authenticateToken, requireRole('admin'), examinationController.create);
router.put('/:id', authenticateToken, requireRole('admin'), examinationController.update);
router.delete('/:id', authenticateToken, requireRole('admin'), examinationController.delete);

export default router;
