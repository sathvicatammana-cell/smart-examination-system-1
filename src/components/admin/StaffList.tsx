import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { UserProfile, RoomRecord } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { Modal } from '../common/Modal.js';
import { Plus, Edit, RefreshCw, AlertCircle, Check, DoorOpen, Users } from 'lucide-react';

export const StaffList: React.FC = () => {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocatingFaculty, setAllocatingFaculty] = useState<UserProfile | null>(null);
  const [targetRoom, setTargetRoom] = useState<string>('');

  const [formData, setFormData] = useState({
    rollNumber: '',
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    role: 'incharge' as 'admin' | 'incharge',
    assignedRoom: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, roomsRes] = await Promise.all([
        api.getStaff({
          role: roleFilter || undefined,
          department: deptFilter || undefined,
        }),
        api.getRooms().catch(() => ({ rooms: [] })),
      ]);
      setStaff(staffRes.staff || []);
      setRooms(roomsRes.rooms || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, deptFilter]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      rollNumber: '',
      name: '',
      email: '',
      department: 'Computer Science & Engineering',
      role: 'incharge',
      assignedRoom: '',
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: UserProfile) => {
    setEditingStaff(member);
    setFormData({
      rollNumber: member.rollNumber,
      name: member.name,
      email: member.email,
      department: member.department || 'Examination Section',
      role: member.role === 'admin' ? 'admin' : 'incharge',
      assignedRoom: member.assignedRoom || '',
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openAllocateRoomModal = (member: UserProfile) => {
    setAllocatingFaculty(member);
    setTargetRoom(member.assignedRoom || '');
    setError(null);
    setSuccess(null);
    setIsAllocateModalOpen(true);
  };

  const handleSaveRoomAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingFaculty) return;

    try {
      const res = await api.assignStaffToRoom({
        staffId: allocatingFaculty.uid,
        roomNumber: targetRoom,
      });
      setSuccess(res.message);
      setIsAllocateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.rollNumber || !formData.name) {
      setError('Staff roll number (Faculty ID) and full name are required.');
      return;
    }

    try {
      if (editingStaff) {
        await api.updateStaff(editingStaff.uid, formData);
        setSuccess('Staff record updated successfully.');
      } else {
        await api.createStaff(formData);
        setSuccess('Staff member registered successfully.');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faculty & Staff Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage staff roll numbers (Faculty IDs), examination in-charges, and room allocations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Roles</option>
            <option value="incharge">Examination In-Charge</option>
            <option value="admin">Examination Admin</option>
          </select>

          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
            <option value="University Examination Section">University Examination Section</option>
          </select>
        </div>

        <span className="text-slate-500 font-mono">
          {staff.length} staff member(s) registered
        </span>
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

      {/* Table: Replaces email with Allocated Room Number per instructions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Staff Roll No (ID)</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Allocated Room</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Assigned Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {loading ? 'Loading staff directory...' : 'No staff members registered.'}
                  </td>
                </tr>
              ) : (
                staff.map(member => (
                  <tr key={member.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {member.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {member.name}
                    </td>
                    <td className="py-3 px-4">
                      {member.assignedRoom && member.assignedRoom !== 'Unallocated' ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                          Room {member.assignedRoom}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic px-2 py-0.5 rounded bg-slate-50 border border-slate-100">
                          Unallocated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {member.department || 'Examination Section'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={member.role} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {member.role === 'incharge' && (
                          <button
                            type="button"
                            onClick={() => openAllocateRoomModal(member)}
                            title="Allocate or Change Room"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors border border-slate-200 hover:border-emerald-200 cursor-pointer"
                          >
                            <DoorOpen className="w-3.5 h-3.5" />
                            <span>Allocate Room</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocate Room Modal for Faculty */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title="Allocate Room to In-Charge Faculty"
      >
        {allocatingFaculty && (
          <form onSubmit={handleSaveRoomAllocation} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Faculty Name:</span>
                <span className="font-bold text-slate-900">{allocatingFaculty.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Faculty ID / Roll Number:</span>
                <span className="font-mono font-bold text-slate-900">{allocatingFaculty.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="text-slate-700">{allocatingFaculty.department}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Examination Room *
              </label>
              <select
                value={targetRoom}
                onChange={e => setTargetRoom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono text-xs font-semibold"
              >
                <option value="">Unallocated (No Room Assigned)</option>
                {rooms.map(r => {
                  const alreadyAssignedToOther = staff.find(
                    s => s.uid !== allocatingFaculty.uid && s.assignedRoom?.toLowerCase() === r.roomNumber.toLowerCase()
                  );
                  return (
                    <option key={r.id} value={r.roomNumber}>
                      Room {r.roomNumber} ({r.block} - Capacity: {r.capacity})
                      {alreadyAssignedToOther ? ` [Currently assigned to ${alreadyAssignedToOther.name}]` : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Rule: Each in-charge is assigned to a single room at a particular time. In-charge will get the list of students with the same room number.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAllocateModalOpen(false)}
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

      {/* Edit / Create Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? 'Edit Staff Member' : 'Register New Faculty / Staff'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Staff Roll Number / Faculty ID *
            </label>
            <input
              type="text"
              required
              value={formData.rollNumber}
              onChange={e => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. FAC-CSE-03 or ADM-EXEC-02"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase focus:outline-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Unique institutional employee / staff identification number.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">User Name (Full Name & Title) *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="E.G. PROF. SUNITA RAO"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase font-semibold focus:outline-emerald-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">User name should be in capitals only.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Allocated Examination Room Number</label>
            <select
              value={formData.assignedRoom}
              onChange={e => setFormData({ ...formData, assignedRoom: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
            >
              <option value="">Unallocated</option>
              {rooms.map(r => (
                <option key={r.id} value={r.roomNumber}>
                  Room {r.roomNumber} ({r.block} - Capacity: {r.capacity})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Allocate this room number to the in-charge. In-charge will get the list of students with the same room number.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institutional Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              placeholder="e.g. s.rao@university.edu"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg lowercase focus:outline-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="University Examination Section">University Examination Section</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">System Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="incharge">Examination In-Charge</option>
                <option value="admin">Examination Admin</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-xs cursor-pointer"
            >
              {editingStaff ? 'Update Staff Member' : 'Register Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
