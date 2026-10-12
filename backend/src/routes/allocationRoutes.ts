import { Router } from 'express';
import { allocationController } from '../controllers/allocationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Allocation computation & persistence
router.post('/preview', authenticateToken, requireRole('admin'), allocationController.preview);
router.post('/confirm', authenticateToken, requireRole('admin'), allocationController.confirm);
router.post('/publish', authenticateToken, requireRole('admin'), allocationController.publish);
router.get('/room/:roomNumber', authenticateToken, allocationController.getByRoomNumber);
router.post('/assign-room', authenticateToken, requireRole('admin'), allocationController.assignStudentsToRoom);
router.post('/unassign-student', authenticateToken, requireRole('admin'), allocationController.unassignStudentFromRoom);
router.get('/:examId', authenticateToken, requireRole(['admin', 'incharge']), allocationController.getByExamId);

export default router;
