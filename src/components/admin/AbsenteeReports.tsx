import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { ExaminationRecord } from '../../types/index.js';
import { FileSpreadsheet, Printer, RefreshCw, AlertCircle, Clock, Building, Users, AlertTriangle } from 'lucide-react';

export const AbsenteeReports: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'absentees' | 'dept_stats' | 'pending'>('absentees');
  const [exams, setExams] = useState<ExaminationRecord[]>([]);

  // Filters
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');

  // Data
  const [absenteeData, setAbsenteeData] = useState<{ totalAbsentees: number; report: any[]; generatedTimestamp: string }>({
    totalAbsentees: 0,
    report: [],
    generatedTimestamp: '',
  });
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [pendingRooms, setPendingRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsRes, absRes, deptRes, pendingRes] = await Promise.all([
        api.getExaminations(),
        api.getAbsenteeReport({
          examId: selectedExamId || undefined,
          department: selectedDept || undefined,
        }),
        api.getAttendanceSummaryReport(),
        api.getPendingSubmissionsReport(),
      ]);

      setExams(examsRes.examinations);
      setAbsenteeData(absRes);
      setDeptStats(deptRes.departmentBreakdown);
      setPendingRooms(pendingRes.pendingRooms);
    } catch (err) {
      console.error('[AbsenteeReports] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExamId, selectedDept]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Report Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Absentee & Audit Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified report statements compiled from finalized invigilation records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh reports"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden text-xs">
        <button
          onClick={() => setActiveReportTab('absentees')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeReportTab === 'absentees'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Consolidated & Room Absentees ({absenteeData.totalAbsentees})
        </button>
        <button
          onClick={() => setActiveReportTab('dept_stats')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeReportTab === 'dept_stats'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Department-Wise Statistics
        </button>
        <button
          onClick={() => setActiveReportTab('pending')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeReportTab === 'pending'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Submissions ({pendingRooms.length})
        </button>
      </div>

      {/* Report 1: Absentee Statement Table */}
      {activeReportTab === 'absentees' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Official Consolidated Absentee Statement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict adherence to verified final submissions. Unmarked candidates are withheld from this register.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden text-xs">
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
              >
                <option value="">All Examinations</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.courseCode} – {e.name}</option>
                ))}
              </select>

              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
              >
                <option value="">All Departments</option>
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
              </select>
            </div>
          </div>

          {absenteeData.report.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No absent candidates recorded for the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Course Code & Name</th>
                    <th className="py-2.5 px-3">Date & Session</th>
                    <th className="py-2.5 px-3">Hall / Room</th>
                    <th className="py-2.5 px-3 text-center">Seat No</th>
                    <th className="py-2.5 px-3">Submitted By In-Charge</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absenteeData.report.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-rose-700">
                        {item.rollNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {item.studentName}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="font-semibold font-mono">{item.courseCode}</span> – {item.courseName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {item.examDate} ({item.session})
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        {item.roomNumber} ({item.block})
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {item.seatNumber}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{item.inChargeName || 'Examination In-Charge'}</p>
                        {item.inChargeRollNumber && (
                          <p className="text-[10px] font-mono text-slate-500">ID: {item.inChargeRollNumber}</p>
                        )}
                        {item.submissionTime && (
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.submissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono flex justify-between">
            <span>Generated: {absenteeData.generatedTimestamp || new Date().toISOString()}</span>
            <span>Total Absentees: {absenteeData.totalAbsentees} candidate(s)</span>
          </div>
        </div>
      )}

      {/* Report 2: Department-wise Statistics */}
      {activeReportTab === 'dept_stats' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Department-Wise Examination Attendance Statistics
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total Scheduled</th>
                  <th className="py-3 px-4 text-center">Present</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center">Unmarked / In Progress</th>
                  <th className="py-3 px-4 text-center">Turn-out Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptStats.map(dept => (
                  <tr key={dept.department} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {dept.department}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                      {dept.total}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                      {dept.present}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-700">
                      {dept.absent}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-amber-700">
                      {dept.unmarked}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                      {dept.attendanceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Pending Attendance Submissions */}
      {activeReportTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Pending Room Attendance Submissions
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Rooms with active allocations where the invigilator / in-charge has not yet submitted finalized attendance.
          </p>

          {pendingRooms.length === 0 ? (
            <div className="py-8 text-center text-emerald-700 font-medium text-xs bg-emerald-50 rounded-xl">
              ✓ All allocated examination rooms have successfully submitted finalized attendance sheets!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Room & Block</th>
                    <th className="py-3 px-4">Examination Course</th>
                    <th className="py-3 px-4">Date & Session</th>
                    <th className="py-3 px-4">Assigned In-Charge</th>
                    <th className="py-3 px-4 text-center">Allocated Students</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingRooms.map((room, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {room.roomNumber} <span className="text-slate-500 font-normal">({room.block})</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold font-mono text-slate-800">{room.courseCode}</span> – {room.examName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {room.examDate} ({room.session})
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {room.inChargeName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                        {room.allocatedStudentsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Awaiting Submission
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
