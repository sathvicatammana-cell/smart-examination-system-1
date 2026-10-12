import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { AdminDashboardStats, ExaminationRecord } from '../../types/index.js';
import { StatCard } from '../common/StatCard.js';
import {
  Calendar,
  Users,
  DoorOpen,
  Armchair,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  RefreshCw,
  Filter,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [exams, setExams] = useState<ExaminationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, examsRes] = await Promise.all([
        api.getAdminDashboard({
          examinationId: selectedExamId || undefined,
          department: selectedDept || undefined,
          date: selectedDate || undefined,
        }),
        api.getExaminations(),
      ]);
      setStats(statsRes.stats);
      setExams(examsRes.examinations);
    } catch (err) {
      console.error('[AdminDashboard] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExamId, selectedDept, selectedDate]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          Loading examination section analytics...
        </div>
      </div>
    );
  }

  const s = stats || {
    totalExaminations: 0,
    totalStudents: 0,
    totalRooms: 0,
    totalSeatingCapacity: 0,
    allocatedStudents: 0,
    unallocatedStudents: 0,
    presentStudents: 0,
    absentStudents: 0,
    pendingAttendanceSubmissions: 0,
    completedAttendanceSubmissions: 0,
    roomUtilization: [],
    departmentStats: [],
    examStatusCounts: { draft: 0, allocated: 0, published: 0, completed: 0 },
  };

  const totalMarked = s.presentStudents + s.absentStudents;
  const attendanceRate = totalMarked > 0 ? ((s.presentStudents / totalMarked) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Section Controller Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time examination metrics, seating utilization, and live attendance tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Exam Filter */}
          <select
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Examinations</option>
            {exams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.courseCode} – {exam.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
          </select>

          {/* Reset Filters / Refresh */}
          <button
            onClick={() => {
              setSelectedExamId('');
              setSelectedDept('');
              setSelectedDate('');
              loadData();
            }}
            title="Refresh statistics"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (All 10 required values from Section 5) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Exams"
          value={s.totalExaminations}
          subtitle="Scheduled sessions"
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="Total Students"
          value={s.totalStudents}
          subtitle="Enrolled candidates"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Exam Rooms"
          value={s.totalRooms}
          subtitle="Designated halls"
          icon={<DoorOpen className="w-5 h-5" />}
        />
        <StatCard
          title="Total Capacity"
          value={s.totalSeatingCapacity}
          subtitle="Maximum seats"
          icon={<Armchair className="w-5 h-5" />}
        />
        <StatCard
          title="Allocated Seats"
          value={s.allocatedStudents}
          subtitle="Students seated"
          variant="sky"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Unallocated"
          value={s.unallocatedStudents}
          subtitle="Awaiting rooms"
          variant={s.unallocatedStudents > 0 ? 'amber' : 'default'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Present"
          value={s.presentStudents}
          subtitle={`${attendanceRate}% turn-out rate`}
          variant="emerald"
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatCard
          title="Absent"
          value={s.absentStudents}
          subtitle="Recorded absentees"
          variant="rose"
          icon={<UserX className="w-5 h-5" />}
        />
        <StatCard
          title="Pending Sheets"
          value={s.pendingAttendanceSubmissions}
          subtitle="Rooms unmarked/pending"
          variant={s.pendingAttendanceSubmissions > 0 ? 'amber' : 'default'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Submitted Sheets"
          value={s.completedAttendanceSubmissions}
          subtitle="Finalized attendance"
          variant="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
      </div>

      {/* Visual Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Live Attendance Ratio & Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              Attendance Turn-out Distribution
            </h2>
          </div>

          <div className="py-6 flex flex-col items-center">
            {/* Visual Ring Chart */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background ring */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Present stroke */}
                {totalMarked > 0 && (
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${(s.presentStudents / totalMarked) * 100}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{attendanceRate}%</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Present</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-4 mt-6 w-full text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-emerald-800 font-medium">Present</span>
                </div>
                <span className="font-bold text-emerald-900">{s.presentStudents}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <span className="text-rose-800 font-medium">Absent</span>
                </div>
                <span className="font-bold text-rose-900">{s.absentStudents}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Room Utilization Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Examination Room Capacity & Utilization
            </h2>
            <button
              onClick={() => onNavigate('rooms')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              Manage Rooms &rarr;
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {s.roomUtilization.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No examination rooms configured.</p>
            ) : (
              s.roomUtilization.slice(0, 5).map(room => (
                <div key={room.roomId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{room.roomNumber}</span>
                      <span className="text-slate-500 text-[11px]">({room.block})</span>
                    </div>
                    <span className="font-medium text-slate-600">
                      {room.allocated} / {room.capacity} seats ({room.utilizationRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        room.utilizationRate >= 100 ? 'bg-amber-500' :
                        room.utilizationRate > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${Math.min(100, room.utilizationRate)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action Shortcut Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('examinations')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all text-left flex items-center gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Manage Examinations</p>
            <p className="text-xs text-slate-500">Create new schedules, courses, or sessions</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('allocations')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all text-left flex items-center gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Run Room Allocation</p>
            <p className="text-xs text-slate-500">Generate seat arrangements & publish tickets</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all text-left flex items-center gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Absentee Reports</p>
            <p className="text-xs text-slate-500">Generate room-wise and consolidated statements</p>
          </div>
        </button>
      </div>
    </div>
  );
};
