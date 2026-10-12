import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { ExaminationRecord, RoomRecord, ExamSession, ExamType, ExamStatus } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { Modal } from '../common/Modal.js';
import { Plus, Edit, Trash2, Calendar, Clock, RefreshCw, AlertCircle, Check } from 'lucide-react';

interface ExaminationListProps {
  onSelectForAllocation?: (examId: string) => void;
}

export const ExaminationList: React.FC<ExaminationListProps> = ({ onSelectForAllocation }) => {
  const [exams, setExams] = useState<ExaminationRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExaminationRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'End-Semester' as ExamType,
    courseCode: '',
    courseName: '',
    examDate: new Date().toISOString().split('T')[0],
    session: 'FN' as ExamSession,
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    section: 'All Sections',
    selectedRooms: [] as string[],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsRes, roomsRes] = await Promise.all([
        api.getExaminations(),
        api.getRooms({ availableOnly: true }),
      ]);
      setExams(examsRes.examinations);
      setRooms(roomsRes.rooms);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({
      name: '',
      type: 'End-Semester',
      courseCode: '',
      courseName: '',
      examDate: new Date().toISOString().split('T')[0],
      session: 'FN',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      section: 'All Sections',
      selectedRooms: [],
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exam: ExaminationRecord) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      type: exam.type,
      courseCode: exam.courseCode,
      courseName: exam.courseName,
      examDate: exam.examDate,
      session: exam.session,
      department: exam.department,
      year: exam.year,
      section: exam.section || 'All Sections',
      selectedRooms: exam.assignedRooms || [],
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.courseCode || !formData.courseName || !formData.examDate) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    try {
      if (editingExam) {
        await api.updateExamination(editingExam.id, {
          ...formData,
          assignedRooms: formData.selectedRooms,
        });
        setSuccess('Examination updated successfully.');
      } else {
        await api.createExamination({
          ...formData,
          assignedRooms: formData.selectedRooms,
        });
        setSuccess('Examination created successfully.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete examination "${name}"? This will also remove any linked allocations.`)) {
      return;
    }

    try {
      await api.deleteExamination(id);
      setSuccess('Examination deleted successfully.');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Master Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure examination schedules, course codes, sessions, and room assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
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
            Schedule Examination
          </button>
        </div>
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

      {/* Examinations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Course & Examination</th>
                <th className="py-3 px-4">Date & Session</th>
                <th className="py-3 px-4">Department & Class</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Allocated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No examinations scheduled yet. Click "Schedule Examination" above.
                  </td>
                </tr>
              ) : (
                exams.map(exam => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{exam.courseCode} – {exam.courseName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{exam.name} ({exam.type})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {exam.examDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {exam.session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800">{exam.department}</div>
                      <div className="text-[11px] text-slate-500">{exam.year} • {exam.section}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={exam.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-semibold text-slate-700 font-mono">
                        {exam.allocatedCount || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectForAllocation && (
                          <button
                            onClick={() => onSelectForAllocation(exam.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Allocate
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(exam)}
                          title="Edit Examination"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id, exam.name)}
                          title="Delete Examination"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? 'Edit Examination' : 'Schedule New Examination'}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Examination Title *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Distributed Systems & Cloud Architecture"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course Code *</label>
              <input
                type="text"
                required
                value={formData.courseCode}
                onChange={e => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                placeholder="e.g. CS-301"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase focus:outline-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course Name *</label>
              <input
                type="text"
                required
                value={formData.courseName}
                onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="e.g. Distributed Systems"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Examination Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as ExamType })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="End-Semester">End-Semester</option>
                <option value="Mid-Term">Mid-Term</option>
                <option value="Internal Assessment">Internal Assessment</option>
                <option value="Supplementary">Supplementary</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.examDate}
                onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Session *</label>
              <select
                value={formData.session}
                onChange={e => setFormData({ ...formData, session: e.target.value as ExamSession })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="FN">Forenoon (FN: 09:30 AM)</option>
                <option value="AN">Afternoon (AN: 02:00 PM)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Year</label>
              <select
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Section</label>
              <select
                value={formData.section}
                onChange={e => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="All Sections">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>
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
              {editingExam ? 'Save Changes' : 'Create Examination'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
