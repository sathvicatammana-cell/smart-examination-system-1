import { UserProfile, ExaminationRecord, RoomRecord, StudentRecord, AllocationRecord, AdminDashboardStats, InChargeDashboardData } from '../types/index.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('hallpass_auth_token', token);
  } else {
    localStorage.removeItem('hallpass_auth_token');
  }
};

export const getSavedAuthToken = (): string | null => {
  if (currentAuthToken) return currentAuthToken;
  return localStorage.getItem('hallpass_auth_token');
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSavedAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data.error || data.message || `API request failed with status ${res.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Unable to connect to examination server at ${url}. Please ensure the server is running.`);
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (payload: any) => apiRequest<{ message: string; user: UserProfile }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getMe: () => apiRequest<{ user: UserProfile }>('/auth/me'),
  switchRole: (role: string, uid?: string) => apiRequest<{ message: string; user: UserProfile }>('/auth/switch-role', {
    method: 'POST',
    body: JSON.stringify({ role, uid }),
  }),

  // Examinations
  getExaminations: (params?: { department?: string; status?: string; date?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ examinations: ExaminationRecord[] }>(`/examinations${query ? `?${query}` : ''}`);
  },
  getExamination: (id: string) => apiRequest<{ examination: ExaminationRecord }>(`/examinations/${id}`),
  createExamination: (payload: any) => apiRequest<{ message: string; examination: ExaminationRecord }>('/examinations', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateExamination: (id: string, payload: any) => apiRequest<{ message: string; examination: ExaminationRecord }>(`/examinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteExamination: (id: string) => apiRequest<{ message: string }>(`/examinations/${id}`, {
    method: 'DELETE',
  }),

  // Rooms
  getRooms: (params?: { block?: string; availableOnly?: boolean }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ rooms: RoomRecord[] }>(`/rooms${query ? `?${query}` : ''}`);
  },
  getRoom: (id: string) => apiRequest<{ room: RoomRecord }>(`/rooms/${id}`),
  createRoom: (payload: any) => apiRequest<{ message: string; room: RoomRecord }>('/rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateRoom: (id: string, payload: any) => apiRequest<{ message: string; room: RoomRecord }>(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // Students
  getStudents: (params?: { department?: string; year?: string; section?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ students: StudentRecord[] }>(`/students${query ? `?${query}` : ''}`);
  },
  getStudent: (id: string) => apiRequest<{ student: StudentRecord }>(`/students/${id}`),
  createStudent: (payload: any) => apiRequest<{ message: string; student: StudentRecord }>('/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateStudent: (id: string, payload: any) => apiRequest<{ message: string; student: StudentRecord }>(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // Allocations
  previewAllocation: (payload: { examId: string; selectedRoomIds?: string[]; minimizeRooms?: boolean }) =>
    apiRequest<{ plan: any }>('/allocations/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirmAllocation: (payload: { examId: string; selectedRoomIds?: string[]; minimizeRooms?: boolean }) =>
    apiRequest<{ message: string; allocatedCount: number; unallocatedCount: number; warnings: string[] }>('/allocations/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  publishAllocation: (payload: { examId: string }) =>
    apiRequest<{ message: string; count: number }>('/allocations/publish', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getExamAllocations: (examId: string) =>
    apiRequest<{ allocations: AllocationRecord[] }>(`/allocations/${examId}`),
  assignStudentsToRoom: (payload: { roomNumber: string; studentIds: string[] }) =>
    apiRequest<{ message: string; assignedRoom: string }>('/allocations/assign-room', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  unassignStudentFromRoom: (payload: { studentId: string }) =>
    apiRequest<{ message: string }>('/allocations/unassign-student', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRoomStudents: (roomNumber: string) =>
    apiRequest<{ students: StudentRecord[] }>(`/allocations/room/${roomNumber}`),

  // Attendance
  getRoomAttendance: (examId: string, roomId: string) =>
    apiRequest<{
      exam: ExaminationRecord;
      room: RoomRecord;
      records: any[];
      counts: { total: number; present: number; absent: number; unmarked: number };
      isFinalized: boolean;
      submission: any;
    }>(`/attendance/${examId}/${roomId}`),
  updateAttendance: (examId: string, roomId: string, updates: { studentId: string; status: string }[]) =>
    apiRequest<{ message: string }>(`/attendance/${examId}/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    }),
  submitAttendance: (examId: string, roomId: string) =>
    apiRequest<{ message: string; submission: any }>(`/attendance/${examId}/${roomId}/submit`, {
      method: 'POST',
    }),
  submitRoomAttendance: (payload: { roomNumber: string; records: any[]; examId?: string }) =>
    apiRequest<{ message: string; submission: any }>('/attendance/submit-room', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getAbsenteeReport: (params?: { examId?: string; roomId?: string; department?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ totalAbsentees: number; report: any[]; generatedTimestamp: string }>(`/reports/absentees${query ? `?${query}` : ''}`);
  },
  getAttendanceSummaryReport: () =>
    apiRequest<{ departmentBreakdown: any[] }>('/reports/attendance'),
  getPendingSubmissionsReport: () =>
    apiRequest<{ totalPendingRooms: number; pendingRooms: any[] }>('/reports/pending'),

  // Dashboards
  getAdminDashboard: (params?: { examinationId?: string; department?: string; date?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ stats: AdminDashboardStats }>(`/dashboard/admin${query ? `?${query}` : ''}`);
  },
  getInChargeDashboard: () =>
    apiRequest<InChargeDashboardData>('/dashboard/incharge'),
  getStudentDashboard: () =>
    apiRequest<{
      student: { name: string; rollNumber: string; email: string };
      schedule: any[];
    }>('/dashboard/student'),

  // Staff
  getStaff: (params?: { department?: string; role?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ staff: UserProfile[] }>(`/staff${query ? `?${query}` : ''}`);
  },
  createStaff: (payload: any) => apiRequest<{ message: string; staff: UserProfile }>('/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateStaff: (id: string, payload: any) => apiRequest<{ message: string; staff: UserProfile }>(`/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  assignStaffToRoom: (payload: { staffId: string; roomNumber: string }) =>
    apiRequest<{ message: string; assignedRoom: string }>('/staff/assign-room', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Health & Seed
  getHealth: () => apiRequest<any>('/health'),
  getFirebaseHealth: () => apiRequest<any>('/health/firebase'),
  seedDatabase: () => apiRequest<any>('/seed', { method: 'POST' }),
};
