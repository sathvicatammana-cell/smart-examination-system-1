export type UserRole = 'admin' | 'incharge' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  rollNumber: string;
  name: string;
  role: UserRole;
  department?: string;
  year?: string;
  section?: string;
  assignedRoom?: string; // Room number allocated to in-charge (e.g. 'LH-101')
  createdAt: string;
}

export interface StudentRecord {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  year: string;
  section: string;
  roomNumber?: string; // Allocated room number (e.g. 'LH-101')
  seatNumber?: string;
  examName?: string;
  courseCode?: string;
  createdAt?: string;
}

export interface RoomRecord {
  id: string;
  roomNumber: string;
  block: string;
  capacity: number;
  isAvailable: boolean;
  allocatedSeats?: number;
  availableSeats?: number;
  createdAt?: string;
}

export type ExamSession = 'FN' | 'AN';
export type ExamStatus = 'draft' | 'allocated' | 'published' | 'completed';
export type ExamType = 'Mid-Term' | 'End-Semester' | 'Supplementary' | 'Internal Assessment';

export interface ExaminationRecord {
  id: string;
  name: string;
  type: ExamType;
  courseCode: string;
  courseName: string;
  examDate: string;
  session: ExamSession;
  department: string;
  year: string;
  section?: string;
  status: ExamStatus;
  assignedRooms: string[]; // roomIds
  assignedInCharges: {
    roomId: string;
    inChargeId: string;
    inChargeName: string;
  }[];
  totalEligibleStudents?: number;
  allocatedCount?: number;
  createdAt?: string;
}

export interface AllocationRecord {
  id: string;
  examId: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  department: string;
  year?: string;
  section?: string;
  roomId: string;
  roomNumber: string;
  block?: string;
  seatNumber: string;
  published: boolean;
  createdAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'unmarked';

export interface AttendanceRecord {
  id: string;
  examId: string;
  roomId: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  department?: string;
  seatNumber: string;
  status: AttendanceStatus;
  markedBy?: string;
  markedAt?: string;
}

export interface AttendanceSubmissionRecord {
  id: string;
  examId: string;
  roomId: string;
  roomNumber: string;
  inChargeId: string;
  inChargeName: string;
  inChargeRollNumber?: string;
  totalAllocated: number;
  presentCount: number;
  absentCount: number;
  submittedAt: string;
  verified: boolean;
}

export interface AdminDashboardStats {
  totalExaminations: number;
  totalStudents: number;
  totalRooms: number;
  totalSeatingCapacity: number;
  allocatedStudents: number;
  unallocatedStudents: number;
  presentStudents: number;
  absentStudents: number;
  pendingAttendanceSubmissions: number;
  completedAttendanceSubmissions: number;
  roomUtilization: {
    roomId: string;
    roomNumber: string;
    block: string;
    capacity: number;
    allocated: number;
    utilizationRate: number;
  }[];
  departmentStats: {
    department: string;
    students: number;
    present: number;
    absent: number;
  }[];
  examStatusCounts: {
    draft: number;
    allocated: number;
    published: number;
    completed: number;
  };
}

export interface InChargeDashboardData {
  assignedExams: {
    exam: ExaminationRecord;
    room: RoomRecord;
    allocatedCount: number;
    submissionStatus: 'pending' | 'submitted';
    submission?: AttendanceSubmissionRecord;
  }[];
}

export interface StudentScheduleItem {
  allocation: AllocationRecord;
  exam: ExaminationRecord;
  room: RoomRecord;
}

export interface AbsenteeReportItem {
  examName: string;
  courseCode: string;
  courseName: string;
  examDate: string;
  session: string;
  roomNumber: string;
  rollNumber: string;
  studentName: string;
  department: string;
  seatNumber: string;
  inChargeName: string; // Specific in-charge who submitted attendance
  inChargeRollNumber?: string;
  submissionTime?: string;
  generatedTimestamp: string;
}
