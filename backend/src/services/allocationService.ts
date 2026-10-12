import { dbService } from './dbService.js';
import { ExaminationRecord, RoomRecord, StudentRecord, AllocationRecord } from '@/src/types/index.ts';

export interface AllocationPlan {
  examId: string;
  totalEligible: number;
  totalAllocated: number;
  unallocatedCount: number;
  unallocatedStudents: StudentRecord[];
  roomBreakdown: {
    room: RoomRecord;
    allocatedCount: number;
    capacity: number;
    allocations: AllocationRecord[];
  }[];
  allAllocations: AllocationRecord[];
  warnings: string[];
}

export const allocationService = {
  async generatePlan(
    examId: string,
    options: {
      selectedRoomIds?: string[];
      minimizeRooms?: boolean;
    } = {}
  ): Promise<AllocationPlan> {
    const exam = await dbService.getDocument<ExaminationRecord>('examinations', examId);
    if (!exam) {
      throw new Error(`Examination ${examId} not found`);
    }

    // 1. Retrieve eligible students
    const allStudents = await dbService.queryCollection<StudentRecord>('students');
    const eligibleStudents = allStudents.filter(student => {
      const matchDept = !exam.department || student.department.toLowerCase() === exam.department.toLowerCase();
      const matchYear = !exam.year || student.year.toLowerCase() === exam.year.toLowerCase();
      const matchSection = !exam.section || exam.section === 'All Sections' || student.section === exam.section;
      return matchDept && matchYear && matchSection;
    });

    // 2. Retrieve available rooms
    let rooms = await dbService.queryCollection<RoomRecord>('rooms', r => r.isAvailable);

    // If specific rooms were chosen, restrict to them
    if (options.selectedRoomIds && options.selectedRoomIds.length > 0) {
      rooms = rooms.filter(r => options.selectedRoomIds!.includes(r.id));
    }

    if (rooms.length === 0) {
      throw new Error('No available rooms selected or found for allocation.');
    }

    // Check for room conflicts: check if any room is already allocated to another examination on the same date and session!
    const allExams = await dbService.queryCollection<ExaminationRecord>('examinations');
    const conflictingExams = allExams.filter(e =>
      e.id !== examId &&
      e.examDate === exam.examDate &&
      e.session === exam.session &&
      e.status !== 'draft'
    );

    const conflictingExamIds = conflictingExams.map(e => e.id);
    const existingAllocationsInSession = await dbService.queryCollection<AllocationRecord>('allocations', a =>
      conflictingExamIds.includes(a.examId)
    );

    const conflictingRoomIds = new Set(existingAllocationsInSession.map(a => a.roomId));

    // Filter out conflicting rooms
    const safeRooms = rooms.filter(r => !conflictingRoomIds.has(r.id));
    const warnings: string[] = [];
    if (safeRooms.length < rooms.length) {
      warnings.push(`${rooms.length - safeRooms.length} room(s) skipped due to conflicting exams in the same date/session.`);
    }

    // Check student conflict: Check if any student is already scheduled in another exam in the same date & session
    const conflictingStudentIds = new Set(existingAllocationsInSession.map(a => a.studentId));
    const safeStudents = eligibleStudents.filter(s => {
      if (conflictingStudentIds.has(s.id)) {
        warnings.push(`Student ${s.name} (${s.rollNumber}) skipped due to conflicting exam in the same session.`);
        return false;
      }
      return true;
    });

    // 3. Sort rooms: if minimizeRooms is true, sort descending by capacity
    if (options.minimizeRooms !== false) {
      safeRooms.sort((a, b) => b.capacity - a.capacity);
    }

    // 4. Allocate students to rooms without overcapacity
    let studentIndex = 0;
    const roomBreakdown: AllocationPlan['roomBreakdown'] = [];
    const allAllocations: AllocationRecord[] = [];

    for (const room of safeRooms) {
      if (studentIndex >= safeStudents.length) break;

      const roomAllocations: AllocationRecord[] = [];
      const studentsToSeat = Math.min(room.capacity, safeStudents.length - studentIndex);

      for (let seat = 1; seat <= studentsToSeat; seat++) {
        const student = safeStudents[studentIndex];
        // Unique seat number format: e.g. R101-01, R101-02
        const paddedSeat = String(seat).padStart(2, '0');
        const seatNumber = `${room.roomNumber}-${paddedSeat}`;

        const allocationDocId = `${examId}_${student.id}`;
        const allocation: AllocationRecord = {
          id: allocationDocId,
          examId,
          studentId: student.id,
          rollNumber: student.rollNumber,
          studentName: student.name,
          department: student.department,
          year: student.year,
          section: student.section,
          roomId: room.id,
          roomNumber: room.roomNumber,
          block: room.block,
          seatNumber,
          published: false,
          createdAt: new Date().toISOString(),
        };

        roomAllocations.push(allocation);
        allAllocations.push(allocation);
        studentIndex++;
      }

      roomBreakdown.push({
        room,
        allocatedCount: roomAllocations.length,
        capacity: room.capacity,
        allocations: roomAllocations,
      });
    }

    const unallocatedStudents = safeStudents.slice(studentIndex);
    if (unallocatedStudents.length > 0) {
      warnings.push(`Insufficient capacity: ${unallocatedStudents.length} student(s) could not be seated. Additional rooms required.`);
    }

    return {
      examId,
      totalEligible: eligibleStudents.length,
      totalAllocated: allAllocations.length,
      unallocatedCount: unallocatedStudents.length,
      unallocatedStudents,
      roomBreakdown,
      allAllocations,
      warnings,
    };
  }
};
