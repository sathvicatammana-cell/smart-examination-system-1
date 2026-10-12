import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { RoomRecord, StudentRecord, UserProfile } from '../../types/index.js';
import {
  Search,
  Users,
  Check,
  AlertCircle,
  RefreshCw,
  DoorOpen,
  UserCheck,
  UserX,
} from 'lucide-react';

interface AllocationManagerProps {
  initialExamId?: string;
}

export const AllocationManager: React.FC<AllocationManagerProps> = () => {
  // Mode: 1. Allocate Students & Faculty to a Room | 2. View Allocated Students for a Room
  const [activeTab, setActiveTab] = useState<'allocate' | 'view'>('allocate');

  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([]);
  const [inchargeStaff, setInchargeStaff] = useState<UserProfile[]>([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');

  // View Allocated Room state
  const [viewRoomNumber, setViewRoomNumber] = useState<string>('');
  const [allocatedStudentsForView, setAllocatedStudentsForView] = useState<StudentRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, studentsRes, staffRes] = await Promise.all([
        api.getRooms(),
        api.getStudents(),
        api.getStaff({ role: 'incharge' }).catch(() => ({ staff: [] })),
      ]);

      const loadedRooms = roomsRes.rooms || [];
      const loadedStudents = studentsRes.students || [];
      const loadedStaff = staffRes.staff || [];

      setRooms(loadedRooms);
      setAllStudents(loadedStudents);
      setInchargeStaff(loadedStaff);

      if (loadedRooms.length > 0) {
        if (!selectedRoomNumber) setSelectedRoomNumber(loadedRooms[0].roomNumber);
        if (!viewRoomNumber) setViewRoomNumber(loadedRooms[0].roomNumber);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute selected room details
  const activeRoom = rooms.find(
    r => r.roomNumber.toLowerCase() === selectedRoomNumber.toLowerCase()
  ) || rooms[0];

  // Faculty currently assigned to the active room
  const assignedFacultyForActiveRoom = inchargeStaff.find(
    s => s.assignedRoom && s.assignedRoom.toLowerCase() === (activeRoom?.roomNumber || '').toLowerCase()
  );

  // Already assigned students to the selected room
  const alreadyAssignedToActiveRoom = allStudents.filter(
    s => s.roomNumber && s.roomNumber.toLowerCase() === (activeRoom?.roomNumber || '').toLowerCase()
  );

  const activeRoomCapacity = activeRoom?.capacity || 60;
  const activeRoomAssignedCount = alreadyAssignedToActiveRoom.length;
  const activeRoomRemaining = Math.max(0, activeRoomCapacity - activeRoomAssignedCount);

  // Available students to allocate (unallocated)
  const unassignedStudents = allStudents.filter(s => {
    const isUnassigned = !s.roomNumber || s.roomNumber === 'Unallocated' || s.roomNumber === '';
    if (!isUnassigned) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRoll = s.rollNumber.toLowerCase().includes(q);
      const matchDept = s.department?.toLowerCase().includes(q);
      return matchName || matchRoll || matchDept;
    }
    return true;
  });

  // Handle single student checkbox toggle
  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      if (selectedStudentIds.length + 1 > activeRoomRemaining) {
        setError(`Cannot select more students! Room ${activeRoom?.roomNumber} only has ${activeRoomRemaining} seats remaining.`);
        return;
      }
      setError(null);
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  // Handle select all checkbox
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === unassignedStudents.length) {
      setSelectedStudentIds([]);
    } else {
      const allowed = unassignedStudents.slice(0, activeRoomRemaining).map(s => s.id);
      setSelectedStudentIds(allowed);
    }
  };

  // Assign students to active room
  const handleAssignStudents = async () => {
    if (!activeRoom || selectedStudentIds.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      await api.assignStudentsToRoom({
        roomNumber: activeRoom.roomNumber,
        studentIds: selectedStudentIds,
      });
      setSuccess(`Successfully assigned ${selectedStudentIds.length} student(s) to Room ${activeRoom.roomNumber}`);
      setSelectedStudentIds([]);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Assign In-Charge Faculty to active room (Rule: each in-charge assigned to a single room at a time)
  const handleAssignFaculty = async () => {
    if (!activeRoom || !selectedFacultyId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await api.assignStaffToRoom({
        staffId: selectedFacultyId,
        roomNumber: activeRoom.roomNumber,
      });
      setSuccess(res.message);
      setSelectedFacultyId('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Unassign In-Charge Faculty from active room
  const handleUnassignFaculty = async (staffId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.assignStaffToRoom({
        staffId,
        roomNumber: 'Unallocated',
      });
      setSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update view allocated room students
  useEffect(() => {
    if (!viewRoomNumber) return;
    const roomStudents = allStudents.filter(
      s => s.roomNumber && s.roomNumber.toLowerCase() === viewRoomNumber.toLowerCase()
    );
    setAllocatedStudentsForView(roomStudents);
  }, [viewRoomNumber, allStudents]);

  // Unassign student from room
  const handleUnassignStudent = async (student: StudentRecord) => {
    setSaving(true);
    try {
      await api.unassignStudentFromRoom({ studentId: student.id });
      setSuccess(`Removed ${student.name} from Room ${viewRoomNumber}`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const facultyForViewRoom = inchargeStaff.find(
    s => s.assignedRoom && s.assignedRoom.toLowerCase() === viewRoomNumber.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            setActiveTab('allocate');
            setError(null);
            setSuccess(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'allocate'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>1. Allocate Students & Faculty to a Room</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('view');
            setError(null);
            setSuccess(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'view'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>2. View Allocated Students for a Room</span>
        </button>

        <button
          onClick={loadData}
          title="Refresh"
          className="ml-auto p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notifications */}
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

      {/* =========================================================================
          PANEL 1: Allocate Students & In-Charge Faculty to Room
          ========================================================================= */}
      {activeTab === 'allocate' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Room & Invigilation Allocation</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an examination room, allocate an in-charge professor, and assign registered students.
            </p>
          </div>

          {/* Step 1: Select Room Number & Room Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <label className="text-xs font-bold text-slate-800">Select Room Number</label>
              </div>

              <select
                value={selectedRoomNumber}
                onChange={e => {
                  setSelectedRoomNumber(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full text-xs font-mono font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-800"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.roomNumber}>
                    {room.roomNumber} (Block: {room.block} - Capacity: {room.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Room Details Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 pb-1 border-b border-slate-100">Room Details</h3>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Room:</span>
                <span className="font-bold text-slate-900 font-mono">{activeRoom?.roomNumber}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Capacity:</span>
                <span className="font-bold text-slate-900 font-mono">{activeRoomCapacity}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Students Assigned:</span>
                <span className="font-bold text-blue-600 font-mono">{activeRoomAssignedCount}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Seats Remaining:</span>
                <span className="font-bold text-emerald-600 font-mono">{activeRoomRemaining}</span>
              </div>
            </div>
          </div>

          {/* Step 2: Allocate Faculty In-Charge to this Room (User Request: "allocate in-charges to specific rooms same like students... each in-charge should assign to a single room at a particular time") */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-xs font-bold text-slate-800">
                  Allocate Faculty In-Charge for Room {activeRoom?.roomNumber}
                </h2>
              </div>

              <span className="text-[11px] text-slate-400">
                Rule: Each in-charge is assigned to a single room at a particular time
              </span>
            </div>

            {/* Current In-Charge Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Currently Assigned Faculty In-Charge:</p>
                {assignedFacultyForActiveRoom ? (
                  <div className="flex items-center gap-2 mt-1">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      {assignedFacultyForActiveRoom.name}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
                      ID: {assignedFacultyForActiveRoom.rollNumber}
                    </span>
                    <span className="text-slate-500 text-xs">
                      • {assignedFacultyForActiveRoom.department}
                    </span>
                  </div>
                ) : (
                  <p className="font-semibold text-amber-700 mt-1 italic">
                    No faculty in-charge allocated yet to Room {activeRoom?.roomNumber}.
                  </p>
                )}
              </div>

              {assignedFacultyForActiveRoom && (
                <button
                  type="button"
                  onClick={() => handleUnassignFaculty(assignedFacultyForActiveRoom.uid)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 transition-colors cursor-pointer text-xs"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Unassign In-Charge
                </button>
              )}
            </div>

            {/* Assign/Change Faculty Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <select
                value={selectedFacultyId}
                onChange={e => setSelectedFacultyId(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-800 font-medium"
              >
                <option value="">-- Select In-Charge Professor to Allocate --</option>
                {inchargeStaff.map(faculty => {
                  const isCurrent = faculty.assignedRoom?.toLowerCase() === activeRoom?.roomNumber.toLowerCase();
                  const isOtherRoom = faculty.assignedRoom && !isCurrent;
                  return (
                    <option key={faculty.uid} value={faculty.uid}>
                      {faculty.name} ({faculty.rollNumber})
                      {isCurrent ? ` [Already in Room ${activeRoom.roomNumber}]` : isOtherRoom ? ` [Currently in Room ${faculty.assignedRoom}]` : ' [Unallocated]'}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={handleAssignFaculty}
                disabled={!selectedFacultyId || saving}
                className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                {saving ? 'Allocating...' : `Assign In-Charge to Room ${activeRoom?.roomNumber}`}
              </button>
            </div>
          </div>

          {/* Step 3: Select Students for Room */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-xs font-bold text-slate-800">
                Select Registered Students for Room {activeRoom?.roomNumber}
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search registered students by name or roll number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-800"
              />
            </div>

            {/* Students Table with Checkboxes */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            unassignedStudents.length > 0 &&
                            selectedStudentIds.length === unassignedStudents.length
                          }
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-4">Roll Number</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Year</th>
                      <th className="py-2.5 px-4">Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unassignedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          {allStudents.length === 0
                            ? 'No registered students found.'
                            : 'All registered students are currently allocated to rooms.'}
                        </td>
                      </tr>
                    ) : (
                      unassignedStudents.map(student => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <tr
                            key={student.id}
                            onClick={() => toggleStudentSelection(student.id)}
                            className={`cursor-pointer transition-colors ${
                              isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by tr onClick
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 pointer-events-none"
                              />
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              {student.rollNumber}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {student.name}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {student.department}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {student.year}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono">
                              {student.section}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {selectedStudentIds.length} student(s) selected of {unassignedStudents.length} available
              </span>

              <button
                type="button"
                onClick={handleAssignStudents}
                disabled={selectedStudentIds.length === 0 || saving}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {saving
                  ? 'Assigning...'
                  : `Assign Selected Students to Room ${activeRoom?.roomNumber}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PANEL 2: 2. Admin – View Allocated Students for a Room
          ========================================================================= */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Room Allocation Overview</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect assigned faculty in-charge and student roster for any room
              </p>
            </div>
          </div>

          {/* Select Room */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <label className="text-xs font-bold text-slate-800">Select Room Number to Inspect</label>
            </div>

            <select
              value={viewRoomNumber}
              onChange={e => setViewRoomNumber(e.target.value)}
              className="w-full text-xs font-mono font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-800"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.roomNumber}>
                  {room.roomNumber} (Block: {room.block})
                </option>
              ))}
            </select>
          </div>

          {/* Faculty In-Charge for Viewed Room */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Assigned Faculty In-Charge for Room {viewRoomNumber}:</p>
              {facultyForViewRoom ? (
                <div className="flex items-center gap-2 mt-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    {facultyForViewRoom.name}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
                    ID: {facultyForViewRoom.rollNumber}
                  </span>
                  <span className="text-slate-500 text-xs">
                    • {facultyForViewRoom.department}
                  </span>
                </div>
              ) : (
                <p className="font-semibold text-amber-700 mt-1 italic">
                  No faculty in-charge assigned yet for Room {viewRoomNumber}.
                </p>
              )}
            </div>

            <span className="font-mono text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              {allocatedStudentsForView.length} Students Allocated
            </span>
          </div>

          {/* Table of Allocated Students */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Seat Number</th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Class / Section</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocatedStudentsForView.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No students are allocated to Room {viewRoomNumber} yet.
                      </td>
                    </tr>
                  ) : (
                    allocatedStudentsForView.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {student.seatNumber || `${viewRoomNumber}-${String(idx + 1).padStart(2, '0')}`}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {student.rollNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {student.department}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600">
                          {student.year} • Sec {student.section}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnassignStudent(student)}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer font-medium"
                          >
                            Unassign
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
