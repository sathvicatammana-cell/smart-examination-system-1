import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Attendance endpoints
router.get('/:examId/:roomId', authenticateToken, requireRole(['admin', 'incharge']), attendanceController.getRoomAttendance);
router.put('/:examId/:roomId', authenticateToken, requireRole(['admin', 'incharge']), attendanceController.updateAttendance);
router.post('/submit-room', authenticateToken, requireRole(['admin', 'incharge']), attendanceController.submitRoomAttendance);
router.post('/:examId/:roomId/submit', authenticateToken, requireRole(['admin', 'incharge']), attendanceController.submitAttendance);

export default router;
