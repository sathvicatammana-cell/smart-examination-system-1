import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/absentees', authenticateToken, requireRole(['admin', 'incharge']), reportController.getAbsentees);
router.get('/attendance', authenticateToken, requireRole(['admin', 'incharge']), reportController.getAttendanceSummary);
router.get('/pending', authenticateToken, requireRole('admin'), reportController.getPendingSubmissions);

export default router;
