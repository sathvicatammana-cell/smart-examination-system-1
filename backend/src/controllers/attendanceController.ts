import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import {
  ExaminationRecord,
  RoomRecord,
  AttendanceRecord,
  AttendanceSubmissionRecord
} from '@/src/types/index.ts';

export const attendanceController = {
  // Fetch room attendance sheet
  async getRoomAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { examId, roomId } = req.params;
      const user = req.user;

      const exam = await dbService.getDocument<ExaminationRecord>('examinations', examId);
      if (!exam) {
        res.status(404).json({ error: 'Examination not found' });
        return;
      }

      const room = await dbService.getDocument<RoomRecord>('rooms', roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Check In-Charge authorization: In-charge must be assigned to this room
      if (user && user.role === 'incharge') {
        const matchesAssignedRoom = user.assignedRoom && room.roomNumber.toLowerCase() === user.assignedRoom.toLowerCase();
        const isAssigned = exam.assignedInCharges?.some(
          (assign: any) => assign.roomId === roomId && (assign.inChargeId === user.uid || assign.inChargeName === user.name)
        );
        // If not matching assigned room and assignedInCharges is explicitly configured for another in-charge:
        if (!matchesAssignedRoom && exam.assignedInCharges && exam.assignedInCharges.length > 0 && !isAssigned) {
          const roomAssignment = exam.assignedInCharges.find((a: any) => a.roomId === roomId);
          if (roomAssignment && roomAssignment.inChargeId !== user.uid) {
            res.status(403).json({ error: 'Forbidden: You are not the assigned In-Charge for this room.' });
            return;
          }
        }
      }

      // Get attendance records for this exam & room
      const records = await dbService.queryCollection<AttendanceRecord>('attendance', a =>
        a.examId === examId && a.roomId === roomId
      );

      // Sort by seat number
      records.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));

      // Check submission status
      const submission = await dbService.getDocument<AttendanceSubmissionRecord>(
        'attendanceSubmissions',
        `${examId}_${roomId}`
      );

      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;
      const unmarkedCount = records.filter(r => r.status === 'unmarked').length;

      res.json({
        exam,
        room,
        records,
        counts: {
          total: records.length,
          present: presentCount,
          absent: absentCount,
          unmarked: unmarkedCount,
        },
        isFinalized: Boolean(submission && submission.submittedAt),
        submission: submission || null,
      });
    } catch (err: any) {
      console.error('[attendanceController.getRoomAttendance]', err);
      res.status(500).json({ error: 'Failed to retrieve attendance: ' + err.message });
    }
  },

  // Update attendance (before final submission)
  async updateAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { examId, roomId } = req.params;
      const { updates } = req.body; // Array of { studentId, status }
      const user = req.user;

      // Check if already finalized
      const submission = await dbService.getDocument<AttendanceSubmissionRecord>(
        'attendanceSubmissions',
        `${examId}_${roomId}`
      );

      if (submission && submission.submittedAt && user?.role !== 'admin') {
        res.status(400).json({
          error: 'Attendance has already been finalized and submitted. Authorized admin unlock is required for corrections.'
        });
        return;
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ error: 'Updates must be a non-empty array of status changes.' });
        return;
      }

      for (const item of updates) {
        const { studentId, status } = item;
        if (!['present', 'absent', 'unmarked'].includes(status)) {
          continue;
        }

        const docId = `${examId}_${roomId}_${studentId}`;
        const existingRecord = await dbService.getDocument<AttendanceRecord>('attendance', docId);
        if (existingRecord) {
          await dbService.updateDocument('attendance', docId, {
            status,
            markedBy: user?.name || 'In-Charge',
            markedAt: new Date().toISOString(),
          });
        }
      }

      res.json({ message: 'Attendance records updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update attendance: ' + err.message });
    }
  },

  // Finalize and submit attendance
  async submitAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { examId, roomId } = req.params;
      const user = req.user;

      const records = await dbService.queryCollection<AttendanceRecord>('attendance', a =>
        a.examId === examId && a.roomId === roomId
      );

      if (records.length === 0) {
        res.status(400).json({ error: 'No allocated students found in this room.' });
        return;
      }

      // CRITICAL SUBMISSION RULE: Check if ANY student is unmarked!
      const unmarkedStudents = records.filter(r => r.status === 'unmarked');
      if (unmarkedStudents.length > 0) {
        res.status(400).json({
          error: `Submission blocked: ${unmarkedStudents.length} student(s) remain unmarked. Every student must be explicitly marked Present or Absent before final submission.`,
          unmarkedCount: unmarkedStudents.length,
          unmarkedRollNumbers: unmarkedStudents.map(s => s.rollNumber),
        });
        return;
      }

      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;

      const room = await dbService.getDocument<RoomRecord>('rooms', roomId);
      const submissionId = `${examId}_${roomId}`;

      const submission: AttendanceSubmissionRecord = {
        id: submissionId,
        examId,
        roomId,
        roomNumber: room?.roomNumber || 'Room',
        inChargeId: user?.uid || 'incharge_system',
        inChargeName: user?.name || 'Examination In-Charge',
        inChargeRollNumber: user?.rollNumber || '',
        totalAllocated: records.length,
        presentCount,
        absentCount,
        submittedAt: new Date().toISOString(),
        verified: true,
      };

      await dbService.setDocument('attendanceSubmissions', submissionId, submission);

      // Log in auditLogs
      await dbService.setDocument('auditLogs', `log_${Date.now()}`, {
        action: 'ATTENDANCE_SUBMISSION',
        performedBy: user?.name || 'In-Charge',
        userRole: user?.role || 'incharge',
        details: `Finalized attendance for Exam ${examId}, Room ${room?.roomNumber}: Present: ${presentCount}, Absent: ${absentCount}`,
        timestamp: new Date().toISOString(),
      });

      res.json({
        message: 'Attendance finalized and submitted successfully. Report statements are now updated.',
        submission,
      });
    } catch (err: any) {
      console.error('[attendanceController.submitAttendance]', err);
      res.status(500).json({ error: 'Failed to submit attendance: ' + err.message });
    }
  },

  // Direct Room attendance submission from professor portal
  async submitRoomAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { roomNumber, records, examId } = req.body;
      const user = req.user;

      if (!roomNumber) {
        res.status(400).json({ error: 'roomNumber is required' });
        return;
      }

      if (!Array.isArray(records) || records.length === 0) {
        res.status(400).json({ error: 'No student attendance records provided to submit.' });
        return;
      }

      // Check unmarked
      const unmarked = records.filter(r => !r.status || r.status === 'unmarked');
      if (unmarked.length > 0) {
        res.status(400).json({
          error: `Submission blocked: ${unmarked.length} student(s) remain unmarked. Every student must be explicitly marked Present (✓) or Absent (✗) before final submission.`,
        });
        return;
      }

      const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const room = allRooms.find(r => r.roomNumber.toLowerCase() === String(roomNumber).toLowerCase()) || {
        id: `room_${String(roomNumber).toLowerCase()}`,
        roomNumber: String(roomNumber),
        block: 'Academic Block',
        capacity: 60,
        isAvailable: true,
      };

      const allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
      const targetExam = (examId ? allExams.find(e => e.id === examId) : null) || allExams[0] || {
        id: 'exam_ds',
        name: 'Data Structures',
        courseCode: 'CS201',
        courseName: 'Data Structures',
        examDate: '10 Oct 2026',
        session: 'FN',
      };

      // Persist individual attendance records
      for (const rec of records) {
        const attId = `${targetExam.id}_${room.id}_${rec.studentId || rec.rollNumber}`;
        await dbService.setDocument('attendance', attId, {
          id: attId,
          examId: targetExam.id,
          roomId: room.id,
          roomNumber: room.roomNumber,
          studentId: rec.studentId || `stu_${rec.rollNumber}`,
          rollNumber: rec.rollNumber,
          studentName: rec.studentName || rec.name,
          department: rec.department || 'CSE',
          seatNumber: rec.seatNumber || '',
          status: rec.status, // 'present' or 'absent'
          markedBy: user?.name || 'Examination In-Charge',
          markedAt: new Date().toISOString(),
        });
      }

      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;

      const submissionId = `${targetExam.id}_${room.id}`;
      const submission: AttendanceSubmissionRecord = {
        id: submissionId,
        examId: targetExam.id,
        roomId: room.id,
        roomNumber: room.roomNumber,
        inChargeId: user?.uid || 'incharge_system',
        inChargeName: user?.name || 'Examination In-Charge',
        inChargeRollNumber: user?.rollNumber || '',
        totalAllocated: records.length,
        presentCount,
        absentCount,
        submittedAt: new Date().toISOString(),
        verified: true,
      };

      await dbService.setDocument('attendanceSubmissions', submissionId, submission);

      // Audit log
      await dbService.setDocument('auditLogs', `log_${Date.now()}`, {
        action: 'ATTENDANCE_SUBMISSION',
        performedBy: user?.name || 'In-Charge',
        userRole: user?.role || 'incharge',
        details: `Finalized attendance for Room ${room.roomNumber} (${targetExam.name}): Present: ${presentCount}, Absent: ${absentCount} by ${user?.name} (${user?.rollNumber})`,
        timestamp: new Date().toISOString(),
      });

      res.json({
        message: `Attendance for Room ${room.roomNumber} finalized and submitted successfully! ${absentCount} absentee(s) reported to Admin.`,
        submission,
      });
    } catch (err: any) {
      console.error('[attendanceController.submitRoomAttendance]', err);
      res.status(500).json({ error: 'Failed to submit room attendance: ' + err.message });
    }
  }
};
