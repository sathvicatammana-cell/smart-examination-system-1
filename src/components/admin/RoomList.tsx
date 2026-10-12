import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { RoomRecord } from '../../types/index.js';
import { Modal } from '../common/Modal.js';
import { Plus, Edit, DoorOpen, Armchair, CheckCircle2, XCircle, RefreshCw, AlertCircle, Check } from 'lucide-react';

export const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);

  const [formData, setFormData] = useState({
    roomNumber: '',
    block: 'Aryabhata Academic Block',
    capacity: 20,
    isAvailable: true,
  });

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await api.getRooms();
      setRooms(res.rooms);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      block: 'Aryabhata Academic Block',
      capacity: 20,
      isAvailable: true,
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (room: RoomRecord) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      block: room.block,
      capacity: room.capacity,
      isAvailable: room.isAvailable,
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.roomNumber.trim()) {
      setError('Room number is required.');
      return;
    }

    if (formData.capacity <= 0) {
      setError('Capacity must be greater than zero.');
      return;
    }

    try {
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, formData);
        setSuccess('Room updated successfully.');
      } else {
        await api.createRoom(formData);
        setSuccess('Room registered successfully.');
      }
      setIsModalOpen(false);
      loadRooms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleAvailability = async (room: RoomRecord) => {
    try {
      await api.updateRoom(room.id, { isAvailable: !room.isAvailable });
      setSuccess(`Room ${room.roomNumber} status set to ${!room.isAvailable ? 'Available' : 'Deactivated'}.`);
      loadRooms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalAllocated = rooms.reduce((acc, r) => acc + (r.allocatedSeats || 0), 0);
  const totalAvailable = Math.max(0, totalCapacity - totalAllocated);

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Halls & Rooms</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Capacity management, block assignments, and seating availability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRooms}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Room / Hall
          </button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Seating Capacity</span>
          <p className="text-xl font-bold text-slate-800 mt-1 font-mono">{totalCapacity}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Allocated Seats</span>
          <p className="text-xl font-bold text-sky-700 mt-1 font-mono">{totalAllocated}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Available Seats</span>
          <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">{totalAvailable}</p>
        </div>
      </div>

      {/* Feedback Alerts */}
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

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Room & Hall</th>
                <th className="py-3 px-4">Building / Block</th>
                <th className="py-3 px-4 text-center">Max Capacity</th>
                <th className="py-3 px-4 text-center">Allocated</th>
                <th className="py-3 px-4 text-center">Available</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map(room => (
                <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">
                    {room.roomNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {room.block}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-800 font-mono">
                    {room.capacity}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-sky-700">
                    {room.allocatedSeats || 0}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-emerald-700">
                    {room.availableSeats || room.capacity}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        room.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {room.isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Available
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Deactivated
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleAvailability(room)}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                          room.isAvailable
                            ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {room.isAvailable ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditModal(room)}
                        title="Edit Room"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? 'Edit Room / Hall' : 'Add New Examination Room'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Room / Hall Number *</label>
            <input
              type="text"
              required
              value={formData.roomNumber}
              onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
              placeholder="e.g. LH-101 or AUD-A"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Must be unique within the selected building block.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Building / Block *</label>
            <select
              value={formData.block}
              onChange={e => setFormData({ ...formData, block: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
            >
              <option value="Aryabhata Academic Block">Aryabhata Academic Block</option>
              <option value="Ramanujan Science Hall">Ramanujan Science Hall</option>
              <option value="Vivekananda Memorial Hall">Vivekananda Memorial Hall</option>
              <option value="Main Examination Complex">Main Examination Complex</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Maximum Seating Capacity *</label>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={formData.capacity}
              onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Capacity must be greater than zero.</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAvailableCheck"
              checked={formData.isAvailable}
              onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="isAvailableCheck" className="font-medium text-slate-700">
              Active & Available for Examination Allocation
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-xs"
            >
              {editingRoom ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
