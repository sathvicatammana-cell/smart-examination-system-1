import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { ExaminationRecord, RoomRecord } from '../../types/index.js';
import {
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Send,
  Lock,
  DoorOpen,
  Calendar,
  Clock,
  RotateCcw,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';

interface AttendanceMarkingProps {
  examId?: string;
  roomId?: string;
  roomNumber?: string;
  onBack?: () => void;
}

interface StudentAttendanceItem {
  studentId: string;
  rollNumber: string;
  studentName: string;
  department: string;
  seatNumber: string;
  status: 'present' | 'absent' | 'unmarked';
}

export const AttendanceMarking: React.FC<AttendanceMarkingProps> = ({
  roomNumber = 'A101',
  onBack,
}) => {
  const { user } = useAuth();

  const [exam, setExam] = useState<ExaminationRecord | null>(null);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const targetRoomNumber = user?.assignedRoom || roomNumber;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomStudentsRes, examsRes, roomsRes, absRes] = await Promise.all([
        api.getRoomStudents(targetRoomNumber),
        api.getExaminations(),
        api.getRooms().catch(() => ({ rooms: [] })),
        api.getAbsenteeReport().catch(() => ({ report: [] })),
      ]);

      const activeExam = examsRes.examinations[0] || {
        id: 'exam_ds',
        name: 'Data Structures',
        courseCode: 'CS201',
        courseName: 'Data Structures',
        examDate: '10 Oct 2026',
        session: 'FN',
        department: 'Computer Science & Engineering',
      };
      setExam(activeExam as any);

      const matchedRoom = (roomsRes.rooms || []).find(
        (r: any) => r.roomNumber.toLowerCase() === targetRoomNumber.toLowerCase()
      ) || {
        id: `room_${targetRoomNumber.toLowerCase()}`,
        roomNumber: targetRoomNumber,
        block: 'Academic Block',
        capacity: 60,
        isAvailable: true,
      };
      setRoom(matchedRoom);

      // Check if absentees report already has verified submission for this room
      const existingSubmission = (absRes.report || []).find(
        (r: any) => r.roomNumber?.toLowerCase() === targetRoomNumber.toLowerCase() && r.isSubmitted
      );
      if (existingSubmission) {
        setIsFinalized(true);
        setSubmissionInfo(existingSubmission);
      }

      const loadedStudents = (roomStudentsRes.students || []).map((s: any, idx: number) => ({
        studentId: s.id || `stu_${s.rollNumber}`,
        rollNumber: s.rollNumber,
        studentName: s.name,
        department: s.department || 'Computer Science & Engineering',
        seatNumber: s.seatNumber || `${targetRoomNumber}-${String(idx + 1).padStart(2, '0')}`,
        status: (existingSubmission ? 'present' : 'unmarked') as 'present' | 'absent' | 'unmarked',
      }));

      // If existing absentees recorded, set those as absent
      if (existingSubmission && absRes.report) {
        const absentRolls = new Set(
          absRes.report
            .filter((r: any) => r.roomNumber?.toLowerCase() === targetRoomNumber.toLowerCase())
            .map((r: any) => r.rollNumber?.toUpperCase())
        );
        loadedStudents.forEach((st: StudentAttendanceItem) => {
          if (absentRolls.has(st.rollNumber.toUpperCase())) {
            st.status = 'absent';
          }
        });
      }

      setStudents(loadedStudents);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetRoomNumber]);

  // Mark status for student
  const handleSetStatus = (studentId: string, newStatus: 'present' | 'absent') => {
    if (isFinalized) return;
    setStudents(prev =>
      prev.map(s => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    if (isFinalized) return;
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
    setSuccess('All students in this room marked as Present.');
  };

  // Reset all to unmarked
  const handleResetAll = () => {
    if (isFinalized) return;
    setStudents(prev => prev.map(s => ({ ...s, status: 'unmarked' })));
    setSuccess(null);
  };

  // Trigger submission modal
  const handleOpenSubmitModal = () => {
    setError(null);
    const unmarkedCount = students.filter(s => s.status === 'unmarked').length;
    if (unmarkedCount > 0) {
      setError(`Cannot submit attendance: ${unmarkedCount} student(s) remain unmarked. Please mark all students Present (✓) or Absent (✗) before final submission.`);
      return;
    }
    setShowConfirmModal(true);
  };

  // Perform final submission to backend
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setError(null);

    try {
      const res = await api.submitRoomAttendance({
        roomNumber: targetRoomNumber,
        records: students,
        examId: exam?.id,
      });

      setSuccess(res.message);
      setIsFinalized(true);
      setSubmissionInfo(res.submission);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const unmarkedCount = students.filter(s => s.status === 'unmarked').length;

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          Loading room attendance roster...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
              Room {targetRoomNumber}
            </span>
            <span className="text-xs font-bold text-slate-900">
              Live Examination Attendance
            </span>
            {isFinalized && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Lock className="w-3 h-3 text-emerald-600" /> Submitted & Finalized
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Course: <strong>{exam?.courseName || exam?.name || 'Data Structures'}</strong> ({exam?.courseCode || 'CS201'}) • Session: <strong>{exam?.session || 'FN'}</strong> • Date: <strong>{exam?.examDate || '10 Oct 2026'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Rooms</span>
            </button>
          )}

          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Allocated</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{students.length}</p>
        </div>

        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-medium text-emerald-700">Present (✓)</p>
          <p className="text-xl font-bold font-mono text-emerald-800 mt-0.5">{presentCount}</p>
        </div>

        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-medium text-rose-700">Absent (✗)</p>
          <p className="text-xl font-bold font-mono text-rose-800 mt-0.5">{absentCount}</p>
        </div>

        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
          <p className="text-[11px] font-medium text-amber-700">Unmarked</p>
          <p className="text-xl font-bold font-mono text-amber-800 mt-0.5">{unmarkedCount}</p>
        </div>
      </div>

      {/* Action Toolbar */}
      {!isFinalized && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Present
            </button>

            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </button>
          </div>

          <button
            onClick={handleOpenSubmitModal}
            disabled={saving || students.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Submit Attendance</span>
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Seat No</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Allocated Room</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No students have been allocated to Room {targetRoomNumber} yet.
                    Please ask the Examination Admin to assign students in Room Allocation.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const isPresent = student.status === 'present';
                  const isAbsent = student.status === 'absent';
                  const isUnmarked = student.status === 'unmarked';

                  return (
                    <tr
                      key={student.studentId}
                      className={`transition-colors ${
                        isAbsent ? 'bg-rose-50/30' : isPresent ? 'hover:bg-slate-50/50' : 'bg-amber-50/20'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {student.seatNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {student.rollNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {student.studentName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Room {targetRoomNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                            <Check className="w-3 h-3" /> Present
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full text-[11px]">
                            <X className="w-3 h-3" /> Absent
                          </span>
                        )}
                        {isUnmarked && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">
                            Unmarked
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isFinalized ? (
                          <span className="text-[11px] text-slate-400 italic">Locked</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {/* Tick Button for Present */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.studentId, 'present')}
                              title="Mark Present (Tick)"
                              className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            {/* Cross Button for Absent */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.studentId, 'absent')}
                              title="Mark Absent (Cross)"
                              className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700'
                              }`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Submit Examination Attendance
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to finalize and submit attendance for <strong>Room {targetRoomNumber}</strong>?
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Allocated Students:</span>
                <span className="font-bold text-slate-800">{students.length}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Present Count:</span>
                <span className="font-bold">{presentCount}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Absent Count:</span>
                <span className="font-bold">{absentCount}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Submitted By:</span>
                <span className="font-bold text-slate-800">{user?.name} ({user?.rollNumber})</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Note: The submitted absentee list will be forwarded immediately to the Examination Admin.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {saving ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
