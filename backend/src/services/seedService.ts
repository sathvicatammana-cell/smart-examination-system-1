import { dbService } from './dbService.js';
import {
  ExaminationRecord,
  RoomRecord,
} from '@/src/types/index.ts';

export const seedService = {
  async runSeed(): Promise<{ success: boolean; message: string; counts: { rooms: number; examinations: number; students: number } }> {
    console.log('[SeedService] Initializing clean examination database without fake student data...');

    // 1. Initial examination halls / rooms
    const rooms: RoomRecord[] = [
      { id: 'room_a101', roomNumber: 'A101', block: 'Aryabhata Academic Block', capacity: 60, isAvailable: true },
      { id: 'room_b203', roomNumber: 'B203', block: 'Aryabhata Academic Block', capacity: 40, isAvailable: true },
      { id: 'room_c105', roomNumber: 'C105', block: 'Ramanujan Science Hall', capacity: 30, isAvailable: true },
      { id: 'room_d201', roomNumber: 'D201', block: 'Ramanujan Science Hall', capacity: 50, isAvailable: true },
    ];

    for (const room of rooms) {
      const existing = await dbService.getDocument('rooms', room.id);
      if (!existing) {
        await dbService.setDocument('rooms', room.id, room);
      }
    }

    // 2. Active university examinations
    const exams: ExaminationRecord[] = [
      {
        id: 'exam_ds',
        name: 'Data Structures',
        type: 'End-Semester',
        courseCode: 'CS201',
        courseName: 'Data Structures',
        examDate: '10 Oct 2026',
        session: 'FN',
        department: 'Computer Science & Engineering',
        year: 'II Year',
        section: 'A',
        status: 'published',
        assignedRooms: ['room_a101', 'room_b203'],
        assignedInCharges: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'exam_os',
        name: 'Operating Systems',
        type: 'End-Semester',
        courseCode: 'CS202',
        courseName: 'Operating Systems',
        examDate: '14 Oct 2026',
        session: 'FN',
        department: 'Computer Science & Engineering',
        year: 'II Year',
        section: 'A',
        status: 'published',
        assignedRooms: ['room_b203'],
        assignedInCharges: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'exam_dbms',
        name: 'Database Management',
        type: 'End-Semester',
        courseCode: 'CS203',
        courseName: 'Database Management',
        examDate: '18 Oct 2026',
        session: 'AN',
        department: 'Computer Science & Engineering',
        year: 'II Year',
        section: 'A',
        status: 'published',
        assignedRooms: ['room_c105'],
        assignedInCharges: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'exam_cn',
        name: 'Computer Networks',
        type: 'End-Semester',
        courseCode: 'CS204',
        courseName: 'Computer Networks',
        examDate: '22 Oct 2026',
        session: 'FN',
        department: 'Computer Science & Engineering',
        year: 'II Year',
        section: 'A',
        status: 'published',
        assignedRooms: ['room_a101'],
        assignedInCharges: [],
        createdAt: new Date().toISOString(),
      },
    ];

    for (const exam of exams) {
      const existing = await dbService.getDocument('examinations', exam.id);
      if (!existing) {
        await dbService.setDocument('examinations', exam.id, exam);
      }
    }

    // Default admin user so portal can be accessed immediately if needed
    const defaultAdmin = {
      uid: 'admin_exam_officer',
      email: 'admin@university.edu',
      rollNumber: 'ADMIN',
      name: 'Controller of Examinations',
      role: 'admin' as const,
      department: 'University Examination Section',
      createdAt: new Date().toISOString(),
    };
    const existingAdmin = await dbService.getDocument('users', defaultAdmin.uid);
    if (!existingAdmin) {
      await dbService.setDocument('users', defaultAdmin.uid, defaultAdmin);
    }

    // NOTE: Per user request ("dont use fake data. data will be created when people register"),
    // NO fake students, allocations, or attendance submissions are seeded.
    // Real student accounts and in-charge accounts will be registered via the portal.

    console.log('[SeedService] Clean database initialized successfully without fake data.');
    return {
      success: true,
      message: 'Clean database ready. Student and staff accounts will be created upon registration.',
      counts: {
        rooms: rooms.length,
        examinations: exams.length,
        students: 0,
      },
    };
  }
};
