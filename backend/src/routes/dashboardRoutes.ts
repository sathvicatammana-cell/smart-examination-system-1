import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/admin', authenticateToken, requireRole('admin'), dashboardController.getAdminDashboard);
router.get('/incharge', authenticateToken, requireRole(['admin', 'incharge']), dashboardController.getInChargeDashboard);
router.get('/student', authenticateToken, dashboardController.getStudentDashboard);

export default router;
