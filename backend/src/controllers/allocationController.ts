import { Request, Response } from 'express';
import { allocationService } from '../services/allocationService.js';
import { dbService } from '../services/dbService.js';
import { seedService } from '../services/seedService.js';
import { ExaminationRecord, AllocationRecord, AttendanceRecord, RoomRecord, StudentRecord } from '@/src/types/index.ts';

export const allocationController = {
  async preview(req: Request, res: Response): Promise<void> {
    try {
      const { examId, selectedRoomIds, minimizeRooms } = req.body;
      if (!examId) {
        res.status(400).json({ error: 'examId is required for generating allocation preview' });
        return;
      }

      const plan = await allocationService.generatePlan(examId, {
        selectedRoomIds,
        minimizeRooms: minimizeRooms !== false,
      });

      res.json({ plan });
    } catch (err: any) {
      console.error('[allocationController.preview]', err);
      res.status(400).json({ error: err.message });
    }
  },

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { examId, selectedRoomIds, minimizeRooms } = req.body;
      if (!examId) {
        res.status(400).json({ error: 'examId is required to confirm allocation' });
        return;
      }

      const exam = await dbService.getDocument<ExaminationRecord>('examinations', examId);
      if (!exam) {
        res.status(404).json({ error: 'Examination not found' });
        return;
      }

      // Generate the deterministic plan
      const plan = await allocationService.generatePlan(examId, {
        selectedRoomIds,
        minimizeRooms: minimizeRooms !== false,
      });

      if (plan.allAllocations.length === 0) {
        res.status(400).json({ error: 'No allocations were generated. Please check eligible students and available rooms.' });
        return;
      }

      // 1. Remove previous allocations for this exam
      const existingAllocations = await dbService.queryCollection<AllocationRecord>('allocations', a => a.examId === examId);
      if (existingAllocations.length > 0) {
        await dbService.batchDelete('allocations', existingAllocations.map(a => a.id));
      }

      // 2. Persist new allocations with deterministic IDs
      const itemsToSet = plan.allAllocations.map(alloc => ({
        id: alloc.id,
        data: alloc,
      }));
      await dbService.batchSet('allocations', itemsToSet);

      // Also sync roomNumber and seatNumber to students collection and users
      for (const alloc of plan.allAllocations) {
        await dbService.updateDocument('students', alloc.studentId, {
          roomNumber: alloc.roomNumber,
          seatNumber: alloc.seatNumber,
        }).catch(() => {});
        await dbService.updateDocument('users', alloc.studentId, {
          assignedRoom: alloc.roomNumber,
        }).catch(() => {});
      }

      // 3. Initialize attendance records as 'unmarked' for each allocation
      const existingAttendance = await dbService.queryCollection<AttendanceRecord>('attendance', a => a.examId === examId);
      if (existingAttendance.length > 0) {
        await dbService.batchDelete('attendance', existingAttendance.map(a => a.id));
      }

      const attendanceItems = plan.allAllocations.map(alloc => ({
        id: `${examId}_${alloc.roomId}_${alloc.studentId}`,
        data: {
          examId,
          roomId: alloc.roomId,
          studentId: alloc.studentId,
          rollNumber: alloc.rollNumber,
          studentName: alloc.studentName,
          department: alloc.department,
          seatNumber: alloc.seatNumber,
          status: 'unmarked',
        }
      }));
      await dbService.batchSet('attendance', attendanceItems);

      // 4. Update examination status to 'allocated' and assignedRooms
      const assignedRoomIds = plan.roomBreakdown.map(b => b.room.id);
      await dbService.updateDocument('examinations', examId, {
        status: 'allocated',
        assignedRooms: assignedRoomIds,
      });

      res.status(200).json({
        message: `Successfully allocated ${plan.totalAllocated} students across ${plan.roomBreakdown.length} room(s).`,
        allocatedCount: plan.totalAllocated,
        unallocatedCount: plan.unallocatedCount,
        warnings: plan.warnings,
      });
    } catch (err: any) {
      console.error('[allocationController.confirm]', err);
      res.status(500).json({ error: 'Failed to confirm allocation: ' + err.message });
    }
  },

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { examId } = req.body;
      if (!examId) {
        res.status(400).json({ error: 'examId is required to publish allocations' });
        return;
      }

      const allocations = await dbService.queryCollection<AllocationRecord>('allocations', a => a.examId === examId);
      if (allocations.length === 0) {
        res.status(400).json({ error: 'Cannot publish: No allocations exist for this examination. Run allocation first.' });
        return;
      }

      // Mark all allocations as published: true
      const updateItems = allocations.map(a => ({
        id: a.id,
        data: {
          ...a,
          published: true,
        }
      }));
      await dbService.batchSet('allocations', updateItems);

      // Update exam status to 'published'
      await dbService.updateDocument('examinations', examId, {
        status: 'published',
      });

      res.json({
        message: `Published allocations for ${allocations.length} students. Exam is now active for in-charges and students.`,
        count: allocations.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to publish allocations: ' + err.message });
    }
  },

  async getByExamId(req: Request, res: Response): Promise<void> {
    try {
      const { examId } = req.params;
      const allocations = await dbService.queryCollection<AllocationRecord>('allocations', a => a.examId === examId);
      res.json({ allocations });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve allocations: ' + err.message });
    }
  },

  async assignStudentsToRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomNumber, studentIds } = req.body;
      if (!roomNumber || !Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400).json({ error: 'roomNumber and studentIds array are required' });
        return;
      }

      const allRooms = await dbService.queryCollection<RoomRecord>('rooms');
      const room = allRooms.find(r => r.roomNumber.toLowerCase() === String(roomNumber).trim().toLowerCase());
      if (!room) {
        res.status(404).json({ error: `Room ${roomNumber} not found` });
        return;
      }

      const allStudents = await dbService.queryCollection<StudentRecord>('students');
      const currentAssigned = allStudents.filter(s => s.roomNumber?.toLowerCase() === room.roomNumber.toLowerCase());

      if (room.capacity && currentAssigned.length + studentIds.length > room.capacity) {
        res.status(400).json({
          error: `Room capacity exceeded! Room ${room.roomNumber} capacity: ${room.capacity}, currently assigned: ${currentAssigned.length}, attempting to add: ${studentIds.length}`
        });
        return;
      }

      let allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
      if (allExams.length === 0) {
        await seedService.runSeed();
        allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
      }
      let seatCounter = currentAssigned.length;

      for (const sId of studentIds) {
        seatCounter++;
        const student = allStudents.find(s => s.id === sId || s.rollNumber === sId);
        if (!student) continue;

        const seatNum = `${room.roomNumber}-${String(seatCounter).padStart(2, '0')}`;

        await dbService.updateDocument('students', student.id, {
          roomNumber: room.roomNumber,
          seatNumber: seatNum,
        });

        // Mirror to user profile if exists
        await dbService.updateDocument('users', student.id, {
          assignedRoom: room.roomNumber,
        }).catch(() => {});

        // Add allocation records for active examinations
        for (const exam of allExams) {
          const allocId = `${exam.id}_${student.id}`;
          const allocRecord: AllocationRecord = {
            id: allocId,
            examId: exam.id,
            studentId: student.id,
            rollNumber: student.rollNumber,
            studentName: student.name,
            department: student.department || 'CSE',
            year: student.year || 'II',
            section: student.section || 'A',
            roomId: room.id,
            roomNumber: room.roomNumber,
            block: room.block,
            seatNumber: seatNum,
            published: true,
            createdAt: new Date().toISOString(),
          };
          await dbService.setDocument('allocations', allocId, allocRecord);

          const attId = `${exam.id}_${room.id}_${student.id}`;
          await dbService.setDocument('attendance', attId, {
            id: attId,
            examId: exam.id,
            roomId: room.id,
            studentId: student.id,
            rollNumber: student.rollNumber,
            studentName: student.name,
            department: student.department,
            seatNumber: seatNum,
            status: 'unmarked',
          });

          if (!exam.assignedRooms?.includes(room.id)) {
            await dbService.updateDocument('examinations', exam.id, {
              assignedRooms: Array.from(new Set([...(exam.assignedRooms || []), room.id])),
              status: exam.status === 'draft' ? 'allocated' : exam.status,
            });
          }
        }
      }

      res.json({
        message: `Successfully assigned ${studentIds.length} student(s) to Room ${room.roomNumber}`,
        assignedRoom: room.roomNumber,
      });
    } catch (err: any) {
      console.error('[allocationController.assignStudentsToRoom]', err);
      res.status(500).json({ error: 'Failed to assign students: ' + err.message });
    }
  },

  async unassignStudentFromRoom(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.body;
      if (!studentId) {
        res.status(400).json({ error: 'studentId is required' });
        return;
      }

      const allStudents = await dbService.queryCollection<StudentRecord>('students');
      const student = allStudents.find(s => s.id === studentId || s.rollNumber === studentId);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      await dbService.updateDocument('students', student.id, {
        roomNumber: '',
        seatNumber: '',
      });

      const allocations = await dbService.queryCollection<AllocationRecord>('allocations', a =>
        a.studentId === student.id || a.rollNumber === student.rollNumber
      );
      if (allocations.length > 0) {
        await dbService.batchDelete('allocations', allocations.map(a => a.id));
      }

      const attendance = await dbService.queryCollection<AttendanceRecord>('attendance', a =>
        a.studentId === student.id || a.rollNumber === student.rollNumber
      );
      if (attendance.length > 0) {
        await dbService.batchDelete('attendance', attendance.map(a => a.id));
      }

      res.json({ message: `Student ${student.name} removed from room allocation.` });
    } catch (err: any) {
      console.error('[allocationController.unassignStudentFromRoom]', err);
      res.status(500).json({ error: 'Failed to unassign student: ' + err.message });
    }
  },

  async getByRoomNumber(req: Request, res: Response): Promise<void> {
    try {
      const { roomNumber } = req.params;
      const targetRoom = String(roomNumber).trim().toLowerCase();
      const allStudents = await dbService.queryCollection<StudentRecord>('students');
      const allAllocations = await dbService.queryCollection<AllocationRecord>('allocations');

      const studentMap = new Map<string, StudentRecord>();

      allStudents.forEach(s => {
        if (s.roomNumber && s.roomNumber.toLowerCase() === targetRoom) {
          studentMap.set(s.rollNumber.toUpperCase(), s);
        }
      });

      allAllocations.forEach(a => {
        if (
          (a.roomNumber && a.roomNumber.toLowerCase() === targetRoom) ||
          (a.roomId && a.roomId.toLowerCase() === `room_${targetRoom}`)
        ) {
          const key = (a.rollNumber || a.studentId).toUpperCase();
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              id: a.studentId,
              rollNumber: a.rollNumber,
              name: a.studentName,
              email: '',
              department: a.department,
              year: a.year || 'II Year',
              section: a.section || 'A',
              roomNumber: a.roomNumber,
              seatNumber: a.seatNumber,
            });
          }
        }
      });

      const students = Array.from(studentMap.values());
      students.sort((a, b) => (a.seatNumber || '').localeCompare(b.seatNumber || '', undefined, { numeric: true }));

      res.json({ students });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch students for room: ' + err.message });
    }
  }
};
