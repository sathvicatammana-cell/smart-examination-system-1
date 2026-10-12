import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { AttendanceMarking } from './AttendanceMarking.js';
import {
  DoorOpen,
  RefreshCw,
  Users,
  User,
  Bell,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { StudentRecord } from '../../types/index.js';

interface InChargeDashboardProps {
  currentTab?: string;
}

export const InChargeDashboard: React.FC<InChargeDashboardProps> = ({ currentTab = 'incharge_rooms' }) => {
  const { user } = useAuth();
  const [roomStudents, setRoomStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [takingAttendance, setTakingAttendance] = useState(false);
  const [absenteeRecords, setAbsenteeRecords] = useState<any[]>([]);

  const allocatedRoomNumber = user?.assignedRoom && user.assignedRoom !== 'Unallocated'
    ? user.assignedRoom
    : 'A101';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, absRes] = await Promise.all([
        api.getRoomStudents(allocatedRoomNumber),
        api.getAbsenteeReport().catch(() => ({ report: [] })),
      ]);
      setRoomStudents(studentsRes.students || []);

      const roomAbsentees = (absRes.report || []).filter((r: any) =>
        r.roomNumber && r.roomNumber.toLowerCase() === allocatedRoomNumber.toLowerCase()
      );
      setAbsenteeRecords(roomAbsentees);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [allocatedRoomNumber]);

  // When tab changes, reset attendance taking view
  useEffect(() => {
    setTakingAttendance(false);
  }, [currentTab]);

  // If taking attendance is active on the room, render the attendance marking sheet
  if (takingAttendance) {
    return (
      <AttendanceMarking
        roomNumber={allocatedRoomNumber}
        onBack={() => {
          setTakingAttendance(false);
          loadData();
        }}
      />
    );
  }

  // 1. Absentee List Tab -> Shows recorded absentees for this room
  if (currentTab === 'absentee_list') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                Room {allocatedRoomNumber}
              </span>
              <h1 className="text-xl font-bold text-slate-900">Room Absentee Statement</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verified absent candidates recorded during invigilation and forwarded to Admin
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold font-mono">
              {absenteeRecords.length} Absentee(s) Reported
            </span>
            <button
              onClick={loadData}
              title="Refresh"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {absenteeRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Absentees Reported</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All students are marked Present, or final attendance for Room {allocatedRoomNumber} has not yet been submitted.
            </p>
            <button
              onClick={() => setTakingAttendance(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              Take Attendance Now
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Seat Number</th>
                    <th className="py-3 px-4">University Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Allocated Room</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absenteeRecords.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item.seatNumber || `${allocatedRoomNumber}-${String(idx + 1).padStart(2, '0')}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.rollNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {item.studentName || item.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Room {allocatedRoomNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.department || 'Computer Science & Engineering'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full text-[11px]">
                          <XCircle className="w-3 h-3 text-rose-600" /> Absent
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Profile Tab -> Professor Profile
  if (currentTab === 'profile') {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 max-w-xl">
        <h2 className="text-base font-bold text-slate-900">Professor / Invigilator Profile</h2>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Full Name:</span>
            <span className="font-bold text-slate-900">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Faculty ID / Roll Number:</span>
            <span className="font-mono font-bold text-slate-900">{user?.rollNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Allocated Room:</span>
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Room {allocatedRoomNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Department:</span>
            <span className="font-medium text-slate-800">{user?.department || 'Computer Science & Engineering'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">System Role:</span>
            <span className="font-medium text-slate-800">Examination Invigilator / In-Charge</span>
          </div>
        </div>
      </div>
    );
  }

  // Default Tab: My Rooms overview (Room In-Charge)
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assigned Invigilation Halls</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Examination rooms assigned to your profile for student verification and attendance recording
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 font-bold font-mono">
            Room {allocatedRoomNumber}
          </div>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hall Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Room {allocatedRoomNumber}</h3>
                <p className="text-xs text-slate-500">Aryabhata Academic Block</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Session
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Allocated Students:</span>
              <span className="font-bold font-mono text-slate-900">{roomStudents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invigilator:</span>
              <span className="font-medium text-slate-800">{user?.name} ({user?.rollNumber})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Exam:</span>
              <span className="font-medium text-slate-800">Data Structures (CS201)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setTakingAttendance(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              Take Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
