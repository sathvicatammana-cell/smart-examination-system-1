import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { StudentRecord } from '../../types/index.js';
import { Modal } from '../common/Modal.js';
import { Edit, Search, RefreshCw, AlertCircle, Check, DoorOpen, Users } from 'lucide-react';

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Modal: Allocate / Reallocate room to student
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('Unallocated');

  const loadStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, roomsRes] = await Promise.all([
        api.getStudents({
          search: search || undefined,
          department: departmentFilter || undefined,
          year: yearFilter || undefined,
          section: sectionFilter || undefined,
        }),
        api.getRooms().catch(() => ({ rooms: [] })),
      ]);
      setStudents(res.students || []);
      setAvailableRooms((roomsRes.rooms || []).map(r => r.roomNumber));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [departmentFilter, yearFilter, sectionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const openAllocateModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setSelectedRoomNumber(student.roomNumber || 'Unallocated');
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSaveRoomAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setError(null);

    try {
      if (selectedRoomNumber === 'Unallocated' || !selectedRoomNumber) {
        await api.unassignStudentFromRoom({ studentId: editingStudent.id });
        setSuccess(`Cleared room allocation for ${editingStudent.name} (${editingStudent.rollNumber}).`);
      } else {
        await api.assignStudentsToRoom({
          roomNumber: selectedRoomNumber,
          studentIds: [editingStudent.id],
        });
        setSuccess(`Assigned ${editingStudent.name} (${editingStudent.rollNumber}) to Room ${selectedRoomNumber}.`);
      }
      setIsModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter students by room if room filter is chosen
  const filteredStudents = students.filter(s => {
    if (!roomFilter) return true;
    if (roomFilter === 'Unallocated') {
      return !s.roomNumber || s.roomNumber === 'Unallocated' || s.roomNumber === '';
    }
    return s.roomNumber && s.roomNumber.toLowerCase() === roomFilter.toLowerCase();
  });

  const allocatedCount = students.filter(s => s.roomNumber && s.roomNumber !== 'Unallocated').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Directory & Room Allocations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered students and their examination room allocations (data generated upon university account registration)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span><strong>{allocatedCount}</strong> of <strong>{students.length}</strong> Allocated</span>
          </div>

          <button
            onClick={loadStudents}
            title="Refresh student list"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-medium text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Room Filter */}
          <select
            value={roomFilter}
            onChange={e => setRoomFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500 font-medium"
          >
            <option value="">All Rooms</option>
            {availableRooms.map(rm => (
              <option key={rm} value={rm}>Room {rm}</option>
            ))}
            <option value="Unallocated">Unallocated Only</option>
          </select>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
          </select>

          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>

          <select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>
        </div>
      </div>

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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Allocated Room</th>
                <th className="py-3 px-4">Seat Number</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Class / Section</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {loading ? 'Loading registered students...' : 'No students found matching the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {student.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-3 px-4">
                      {student.roomNumber && student.roomNumber !== 'Unallocated' && student.roomNumber !== '' ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                          Room {student.roomNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic px-2 py-0.5 rounded bg-slate-50 border border-slate-100">
                          Unallocated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {student.seatNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {student.department}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {student.year} • Sec {student.section}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openAllocateModal(student)}
                        title="Allocate or Change Room"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors border border-slate-200 hover:border-emerald-200 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Allocate Room</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Allocation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Allocate Examination Room to Student"
      >
        {editingStudent && (
          <form onSubmit={handleSaveRoomAllocation} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{editingStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">University Roll Number:</span>
                <span className="font-mono font-bold text-slate-900">{editingStudent.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="text-slate-700">{editingStudent.department}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assign Examination Room *
              </label>
              <select
                value={selectedRoomNumber}
                onChange={e => setSelectedRoomNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono text-xs font-semibold"
              >
                <option value="Unallocated">Unallocated (No Room Assigned)</option>
                {availableRooms.map(rm => (
                  <option key={rm} value={rm}>Room {rm}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Allocating a room will immediately make this student visible in the assigned In-Charge portal and the student's room details.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Save Room Allocation
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
