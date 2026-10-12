import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import {
  ExaminationRecord,
  RoomRecord,
  AttendanceRecord,
  AttendanceSubmissionRecord
} from '@/src/types/index.ts';

export const reportController = {
  // 1 & 2. Absentee reports (Room-wise and consolidated)
  async getAbsentees(req: Request, res: Response): Promise<void> {
    try {
      const { examId, roomId, department } = req.query;

      const allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
      const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const allSubmissions = await dbService.queryCollection<AttendanceSubmissionRecord>('attendanceSubmissions');
      const allAttendance = await dbService.queryCollection<AttendanceRecord>('attendance');

      // Filter only submitted/finalized rooms or all attendance marked absent
      // Per Section 12: Unmarked students must NEVER appear as absent. Only status === 'absent'
      let absentees = allAttendance.filter(a => a.status === 'absent');

      if (examId) {
        absentees = absentees.filter(a => a.examId === String(examId));
      }
      if (roomId) {
        absentees = absentees.filter(a => a.roomId === String(roomId));
      }
      if (department) {
        absentees = absentees.filter(a => a.department?.toLowerCase() === String(department).toLowerCase());
      }

      const generatedTimestamp = new Date().toISOString();

      const enrichedReport = absentees.map((item: any) => {
        const exam = allExams.find(e => e.id === item.examId) || allExams[0];
        const room = allRooms.find(r =>
          r.id === item.roomId ||
          r.roomNumber.toLowerCase() === String(item.roomNumber || item.roomId).toLowerCase()
        );
        const submission = allSubmissions.find(s =>
          s.id === `${item.examId}_${item.roomId}` ||
          (s.examId === item.examId && s.roomId === item.roomId) ||
          (room && s.roomNumber?.toLowerCase() === room.roomNumber.toLowerCase()) ||
          (item.roomNumber && s.roomNumber?.toLowerCase() === String(item.roomNumber).toLowerCase())
        );
        const inChargeAssignment = exam?.assignedInCharges?.find((a: any) =>
          a.roomId === item.roomId || (room && a.roomId === room.id)
        );

        return {
          examId: item.examId,
          roomId: item.roomId,
          examName: exam?.name || 'Data Structures',
          courseCode: exam?.courseCode || 'CS201',
          courseName: exam?.courseName || 'Data Structures',
          examDate: exam?.examDate || '10 Oct 2026',
          session: exam?.session || 'FN',
          roomNumber: room?.roomNumber || item.roomNumber || 'Room',
          block: room?.block || 'Academic Block',
          rollNumber: item.rollNumber,
          studentName: item.studentName,
          seatNumber: item.seatNumber,
          department: item.department || exam?.department || 'CSE',
          inChargeName: submission?.inChargeName || inChargeAssignment?.inChargeName || item.markedBy || 'Examination In-Charge',
          inChargeRollNumber: (submission as any)?.inChargeRollNumber || (inChargeAssignment as any)?.inChargeRollNumber || '',
          submissionTime: submission?.submittedAt || item.markedAt || null,
          isSubmitted: Boolean(submission?.submittedAt),
          generatedTimestamp,
        };
      });

      res.json({
        totalAbsentees: enrichedReport.length,
        report: enrichedReport,
        generatedTimestamp,
      });
    } catch (err: any) {
      console.error('[reportController.getAbsentees]', err);
      res.status(500).json({ error: 'Failed to generate absentee report: ' + err.message });
    }
  },

  // 3. Department-wise absentee & attendance statistics
  async getAttendanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const allAttendance = await dbService.queryCollection<AttendanceRecord>('attendance');
      const allStudents = await dbService.queryCollection('students');

      const deptMap: Record<string, { total: number; present: number; absent: number; unmarked: number }> = {};

      for (const rec of allAttendance) {
        const dept = rec.department || 'General';
        if (!deptMap[dept]) {
          deptMap[dept] = { total: 0, present: 0, absent: 0, unmarked: 0 };
        }
        deptMap[dept].total++;
        if (rec.status === 'present') deptMap[dept].present++;
        else if (rec.status === 'absent') deptMap[dept].absent++;
        else deptMap[dept].unmarked++;
      }

      const departmentBreakdown = Object.entries(deptMap).map(([department, data]) => ({
        department,
        ...data,
        attendanceRate: data.total > 0 ? Number(((data.present / data.total) * 100).toFixed(1)) : 0,
      }));

      res.json({ departmentBreakdown });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate attendance summary: ' + err.message });
    }
  },

  // 4. Pending attendance submissions report
  async getPendingSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const allExams = await dbService.queryCollection<ExaminationRecord>('examinations', e => e.status !== 'draft');
      const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const allSubmissions = await dbService.queryCollection<AttendanceSubmissionRecord>('attendanceSubmissions');
      const allAllocations = await dbService.queryCollection('allocations');

      const pendingRooms: any[] = [];

      for (const exam of allExams) {
        const examAllocations = allAllocations.filter(a => a.examId === exam.id);
        const allocatedRoomIds = Array.from(new Set(examAllocations.map(a => a.roomId)));

        for (const roomId of allocatedRoomIds) {
          const submissionKey = `${exam.id}_${roomId}`;
          const isSubmitted = allSubmissions.some(s => s.id === submissionKey && s.submittedAt);

          if (!isSubmitted) {
            const room = allRooms.find(r => r.id === roomId);
            const inChargeAssignment = exam.assignedInCharges?.find((a: any) => a.roomId === roomId);
            const roomStudents = examAllocations.filter(a => a.roomId === roomId);

            pendingRooms.push({
              examId: exam.id,
              examName: exam.name,
              courseCode: exam.courseCode,
              examDate: exam.examDate,
              session: exam.session,
              roomId,
              roomNumber: room?.roomNumber || 'Unknown Room',
              block: room?.block || 'Main Block',
              inChargeName: inChargeAssignment?.inChargeName || 'Unassigned',
              allocatedStudentsCount: roomStudents.length,
              status: 'pending_submission',
            });
          }
        }
      }

      res.json({
        totalPendingRooms: pendingRooms.length,
        pendingRooms,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch pending submissions: ' + err.message });
    }
  }
};
