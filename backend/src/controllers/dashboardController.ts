import { Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import {
  ExaminationRecord,
  RoomRecord,
  StudentRecord,
  AllocationRecord,
  AttendanceRecord,
  AttendanceSubmissionRecord,
  AdminDashboardStats
} from '@/src/types/index.ts';

export const dashboardController = {
  async getAdminDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { examinationId, department, date } = req.query;

      let exams = await dbService.queryCollection<ExaminationRecord>('examinations');
      let students = await dbService.queryCollection<StudentRecord>('students');
      let rooms = await dbService.queryCollection<RoomRecord>('rooms');
      let allocations = await dbService.queryCollection<AllocationRecord>('allocations');
      let attendance = await dbService.queryCollection<AttendanceRecord>('attendance');
      let submissions = await dbService.queryCollection<AttendanceSubmissionRecord>('attendanceSubmissions');

      // Filters
      if (examinationId) {
        exams = exams.filter(e => e.id === String(examinationId));
        allocations = allocations.filter(a => a.examId === String(examinationId));
        attendance = attendance.filter(a => a.examId === String(examinationId));
        submissions = submissions.filter(s => s.examId === String(examinationId));
      }
      if (department) {
        students = students.filter(s => s.department?.toLowerCase() === String(department).toLowerCase());
        allocations = allocations.filter(a => a.department?.toLowerCase() === String(department).toLowerCase());
        attendance = attendance.filter(a => a.department?.toLowerCase() === String(department).toLowerCase());
      }
      if (date) {
        const matchingExamIds = exams.filter(e => e.examDate === String(date)).map(e => e.id);
        exams = exams.filter(e => matchingExamIds.includes(e.id));
        allocations = allocations.filter(a => matchingExamIds.includes(a.examId));
        attendance = attendance.filter(a => matchingExamIds.includes(a.examId));
        submissions = submissions.filter(s => matchingExamIds.includes(s.examId));
      }

      // Dynamic statistics calculation
      const totalExaminations = exams.length;
      const totalStudents = students.length;
      const totalRooms = rooms.length;
      const totalSeatingCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);

      // Distinct student IDs allocated across room assignments and allocations
      const allocatedStudentIds = new Set<string>();
      students.forEach(s => {
        if (s.roomNumber && s.roomNumber !== 'Unallocated' && s.roomNumber.trim() !== '') {
          allocatedStudentIds.add(s.id || s.rollNumber);
        }
      });
      allocations.forEach(a => {
        allocatedStudentIds.add(a.studentId || a.rollNumber);
      });

      const allocatedStudents = allocatedStudentIds.size;
      const unallocatedStudents = Math.max(0, totalStudents - allocatedStudents);

      const presentStudents = attendance.filter(a => a.status === 'present').length;
      const absentStudents = attendance.filter(a => a.status === 'absent').length;

      // Pending vs completed submissions
      // Count total distinct exam-room pairs allocated
      const examRoomPairs = new Set(allocations.map(a => `${a.examId}_${a.roomId}`));
      let completedAttendanceSubmissions = 0;
      let pendingAttendanceSubmissions = 0;

      examRoomPairs.forEach(pair => {
        const isDone = submissions.some(s => s.id === pair && s.submittedAt);
        if (isDone) completedAttendanceSubmissions++;
        else pendingAttendanceSubmissions++;
      });

      // Room utilization
      const roomUtilization = rooms.map(room => {
        const roomNum = (room.roomNumber || '').toLowerCase();
        const roomId = (room.id || '').toLowerCase();

        const studentIdsInRoom = new Set<string>();
        students.forEach(s => {
          if (s.roomNumber && s.roomNumber.toLowerCase() === roomNum) {
            studentIdsInRoom.add(s.id || s.rollNumber);
          }
        });
        allocations.forEach(a => {
          if (
            (a.roomId && a.roomId.toLowerCase() === roomId) ||
            (a.roomNumber && a.roomNumber.toLowerCase() === roomNum)
          ) {
            studentIdsInRoom.add(a.studentId || a.rollNumber);
          }
        });

        const count = studentIdsInRoom.size;
        const rate = room.capacity > 0 ? Number(((count / room.capacity) * 100).toFixed(1)) : 0;
        return {
          roomId: room.id,
          roomNumber: room.roomNumber,
          block: room.block,
          capacity: room.capacity,
          allocated: count,
          utilizationRate: rate,
        };
      });

      // Department stats
      const deptMap: Record<string, { students: number; present: number; absent: number }> = {};
      students.forEach(s => {
        const d = s.department || 'Other';
        if (!deptMap[d]) deptMap[d] = { students: 0, present: 0, absent: 0 };
        deptMap[d].students++;
      });
      attendance.forEach(a => {
        const d = a.department || 'Other';
        if (!deptMap[d]) deptMap[d] = { students: 0, present: 0, absent: 0 };
        if (a.status === 'present') deptMap[d].present++;
        if (a.status === 'absent') deptMap[d].absent++;
      });

      const departmentStats = Object.entries(deptMap).map(([dept, data]) => ({
        department: dept,
        ...data,
      }));

      // Exam Status Counts
      const examStatusCounts = {
        draft: exams.filter(e => e.status === 'draft').length,
        allocated: exams.filter(e => e.status === 'allocated').length,
        published: exams.filter(e => e.status === 'published').length,
        completed: exams.filter(e => e.status === 'completed').length,
      };

      const stats: AdminDashboardStats = {
        totalExaminations,
        totalStudents,
        totalRooms,
        totalSeatingCapacity,
        allocatedStudents,
        unallocatedStudents,
        presentStudents,
        absentStudents,
        pendingAttendanceSubmissions,
        completedAttendanceSubmissions,
        roomUtilization,
        departmentStats,
        examStatusCounts,
      };

      res.json({ stats });
    } catch (err: any) {
      console.error('[dashboardController.getAdminDashboard]', err);
      res.status(500).json({ error: 'Failed to compute admin dashboard statistics: ' + err.message });
    }
  },

  async getInChargeDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const allExams = await dbService.queryCollection<ExaminationRecord>('examinations', e => e.status !== 'draft');
      const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const allAllocations = await dbService.queryCollection<AllocationRecord>('allocations');
      const allSubmissions = await dbService.queryCollection<AttendanceSubmissionRecord>('attendanceSubmissions');

      const userAssignedRoom = user.assignedRoom?.trim();

      // Find rooms assigned to this in-charge
      const assignedExamsList: any[] = [];

      for (const exam of allExams) {
        // Find matching rooms:
        // 1. By user.assignedRoom matching room.roomNumber
        // 2. By assignedInCharges matching user.uid or user.name or user.rollNumber
        // 3. Or all exam rooms if in-charge has no room specified or admin
        const explicitAssignments = exam.assignedInCharges?.filter(
          (a: any) => a.inChargeId === user.uid || a.inChargeName === user.name || (user.rollNumber && a.inChargeRollNumber === user.rollNumber)
        ) || [];

        let targetRoomIds: string[] = [];

        if (userAssignedRoom) {
          // Find rooms whose roomNumber matches userAssignedRoom
          const matchedByRoomNum = allRooms.filter(r => r.roomNumber.toLowerCase() === userAssignedRoom.toLowerCase() && exam.assignedRooms?.includes(r.id)).map(r => r.id);
          targetRoomIds = Array.from(new Set([...matchedByRoomNum, ...explicitAssignments.map((a: any) => a.roomId)]));
          // If the assigned room exists in allRooms but not explicitly added to exam, still allow if allocations exist
          if (targetRoomIds.length === 0) {
            const fallbackRoom = allRooms.find(r => r.roomNumber.toLowerCase() === userAssignedRoom.toLowerCase());
            if (fallbackRoom) targetRoomIds = [fallbackRoom.id];
          }
        } else if (explicitAssignments.length > 0) {
          targetRoomIds = explicitAssignments.map((a: any) => a.roomId);
        } else {
          targetRoomIds = exam.assignedRooms || [];
        }

        for (const roomId of targetRoomIds) {
          const room = allRooms.find(r => r.id === roomId);
          if (!room) continue;

          // Check if already in list for this exam
          if (assignedExamsList.some(item => item.exam.id === exam.id && item.room.id === room.id)) continue;

          // Get students allocated who have the SAME room number
          const roomAllocations = allAllocations.filter(a =>
            a.examId === exam.id && (a.roomId === roomId || a.roomNumber === room.roomNumber)
          );
          const submission = allSubmissions.find(s => s.id === `${exam.id}_${roomId}` || (s.examId === exam.id && s.roomId === roomId));

          assignedExamsList.push({
            exam,
            room,
            allocatedCount: roomAllocations.length,
            submissionStatus: submission?.submittedAt ? 'submitted' : 'pending',
            submission: submission || null,
          });
        }
      }

      res.json({
        assignedRoom: userAssignedRoom || null,
        assignedExams: assignedExamsList,
        availableRooms: allRooms,
      });
    } catch (err: any) {
      console.error('[dashboardController.getInChargeDashboard]', err);
      res.status(500).json({ error: 'Failed to retrieve In-Charge dashboard data: ' + err.message });
    }
  },

  async getStudentDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const allAllocations = await dbService.queryCollection<AllocationRecord>('allocations', a =>
        (
          (user.rollNumber && a.rollNumber.toUpperCase() === user.rollNumber.toUpperCase()) ||
          a.studentId === user.uid
        )
      );

      const allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
      const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const allAttendance = await dbService.queryCollection<AttendanceRecord>('attendance');
      const allStudents = await dbService.queryCollection<StudentRecord>('students');
      const studentRec = allStudents.find(s => s.rollNumber?.toUpperCase() === user.rollNumber?.toUpperCase());
      const studentRoom = (studentRec?.roomNumber && studentRec.roomNumber !== 'Unallocated')
        ? studentRec.roomNumber
        : (user.assignedRoom && user.assignedRoom !== 'Unallocated' ? user.assignedRoom : '');

      let schedule: any[] = [];

      if (allAllocations.length > 0) {
        schedule = allAllocations.map(alloc => {
          const exam = allExams.find(e => e.id === alloc.examId);
          const room = allRooms.find(r => r.id === alloc.roomId);
          const attendanceRecord = allAttendance.find(a => a.examId === alloc.examId && a.studentId === alloc.studentId);

          return {
            allocation: alloc,
            exam: exam || {
              name: 'Data Structures',
              courseCode: 'CS201',
              courseName: 'Data Structures',
              examDate: '10 Oct 2026',
              session: 'FN',
            },
            room: room || {
              roomNumber: alloc.roomNumber || studentRoom || 'Unallocated',
              block: alloc.block || 'Academic Block',
              capacity: 60,
            },
            attendanceStatus: attendanceRecord?.status || 'unmarked',
          };
        });
      } else if (allExams.length > 0) {
        const roomObj = allRooms.find(r => r.roomNumber.toLowerCase() === (studentRoom || '').toLowerCase());
        schedule = allExams.map(exam => ({
          allocation: {
            roomNumber: studentRoom || 'Unallocated',
            seatNumber: studentRec?.seatNumber || (studentRoom ? `${studentRoom}-01` : '—'),
          },
          exam,
          room: roomObj || {
            roomNumber: studentRoom || 'Unallocated',
            block: 'Aryabhata Academic Block',
            capacity: 60,
          },
          attendanceStatus: 'unmarked',
        }));
      }

      res.json({
        student: {
          name: user.name,
          rollNumber: user.rollNumber,
          email: user.email,
        },
        schedule,
      });
    } catch (err: any) {
      console.error('[dashboardController.getStudentDashboard]', err);
      res.status(500).json({ error: 'Failed to retrieve student schedule: ' + err.message });
    }
  }
};
