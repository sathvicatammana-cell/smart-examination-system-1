import React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { ExaminationRecord, RoomRecord, AttendanceRecord } from '../../types/index.js';

interface PrintableAttendanceSheetProps {
  exam: ExaminationRecord;
  room: RoomRecord;
  records: AttendanceRecord[];
  inChargeName?: string;
  onBack: () => void;
}

export const PrintableAttendanceSheet: React.FC<PrintableAttendanceSheetProps> = ({
  exam,
  room,
  records,
  inChargeName,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  return (
    <div className="bg-white min-h-screen p-8 text-slate-900">
      {/* Action Controls - Hidden during print */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Attendance
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Official Attendance Sheet
        </button>
      </div>

      {/* Official University Attendance Sheet Document */}
      <div className="max-w-4xl mx-auto border-2 border-slate-800 p-8 rounded-sm bg-white">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-800 pb-5">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
            University Examination Section
          </h1>
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase mt-1">
            Official Room-Wise Examination Attendance Sheet
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">Academic Session 2026–2027 • Controller of Examinations</p>
        </div>

        {/* Examination Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-4 text-xs border-b border-slate-400">
          <div>
            <span className="font-semibold text-slate-600">Examination:</span>{' '}
            <span className="font-bold text-slate-900">{exam.name}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Course Code & Name:</span>{' '}
            <span className="font-bold text-slate-900">{exam.courseCode} – {exam.courseName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Date & Session:</span>{' '}
            <span className="font-bold text-slate-900">{exam.examDate} ({exam.session === 'FN' ? 'Forenoon 09:30 AM' : 'Afternoon 02:00 PM'})</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Examination Room / Hall:</span>{' '}
            <span className="font-bold text-slate-900">{room.roomNumber} ({room.block})</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Department & Year:</span>{' '}
            <span className="font-bold text-slate-900">{exam.department} – {exam.year}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Appointed In-Charge:</span>{' '}
            <span className="font-bold text-slate-900">{inChargeName || 'Exam Invigilator'}</span>
          </div>
        </div>

        {/* Summary Count Bar */}
        <div className="flex justify-between items-center py-2.5 px-4 bg-slate-100 border-b border-slate-400 text-xs font-semibold">
          <div>Total Allocated: <span className="font-bold">{records.length}</span></div>
          <div>Present: <span className="font-bold text-emerald-800">{presentCount}</span></div>
          <div>Absent: <span className="font-bold text-rose-800">{absentCount}</span></div>
        </div>

        {/* Attendance Table */}
        <table className="w-full text-xs text-left border-collapse mt-4">
          <thead>
            <tr className="border-y-2 border-slate-800 bg-slate-50">
              <th className="py-2 px-2 border-r border-slate-300 w-10 text-center font-bold">S.No</th>
              <th className="py-2 px-3 border-r border-slate-300 font-bold">Roll Number</th>
              <th className="py-2 px-3 border-r border-slate-300 font-bold">Student Name</th>
              <th className="py-2 px-2 border-r border-slate-300 font-bold text-center">Seat No</th>
              <th className="py-2 px-3 border-r border-slate-300 font-bold text-center w-28">Status</th>
              <th className="py-2 px-4 font-bold text-center w-36">Candidate Signature</th>
            </tr>
          </thead>
          <tbody>
            {records.map((student, idx) => (
              <tr key={student.id} className="border-b border-slate-300">
                <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-slate-800">{student.rollNumber}</td>
                <td className="py-2.5 px-3 border-r border-slate-300 font-medium">{student.studentName}</td>
                <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-semibold">{student.seatNumber}</td>
                <td className="py-2.5 px-3 border-r border-slate-300 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    student.status === 'present' ? 'text-emerald-700 bg-emerald-50' :
                    student.status === 'absent' ? 'text-rose-700 bg-rose-50' : 'text-slate-400'
                  }`}>
                    {student.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-center border-b border-slate-200">
                  <div className="h-6 border-b border-dashed border-slate-400 mx-2"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Certification and Signatures Footer */}
        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 gap-12 text-xs">
          <div>
            <p className="font-semibold text-slate-800">Invigilator / In-Charge Verification:</p>
            <p className="text-slate-500 text-[11px] mt-1">
              I hereby certify that the attendance recorded above is verified in accordance with university examination guidelines and candidate admit cards.
            </p>
            <div className="mt-12 pt-2 border-t border-slate-400">
              <span className="font-semibold text-slate-700">Signature of Examination In-Charge</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-slate-800">Chief Superintendent / Observer:</p>
            <p className="text-slate-500 text-[11px] mt-1">
              Verified room seating arrangement and consolidated absentee count against sealed packets.
            </p>
            <div className="mt-12 pt-2 border-t border-slate-400">
              <span className="font-semibold text-slate-700">Signature of Chief Superintendent</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-400 font-mono">
          Hallpass Smart Examination System • Document Hash: {exam.id}-{room.roomNumber}-{Date.now()}
        </div>
      </div>
    </div>
  );
};
