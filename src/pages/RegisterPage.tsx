import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types/index.js';
import { School, ArrowLeft, AlertCircle } from 'lucide-react';

interface RegisterPageProps {
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onGoToLogin }) => {
  const { register, error, clearError, loading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    role: 'student' as UserRole,
    department: 'Computer Science & Engineering',
    year: '1st Year',
    section: 'A',
    password: '',
    confirmPassword: '',
  });

  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!formData.name.trim()) {
      setLocalError('User name is required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match. Please verify both password entries.');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setLocalError('Password must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: formData.name.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        rollNumber: formData.rollNumber.trim().toUpperCase(),
        department: formData.department,
        year: formData.role === 'student' ? formData.year : undefined,
        section: formData.role === 'student' ? formData.section : undefined,
        password: formData.password,
        role: formData.role,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      department: newRole === 'admin' ? 'University Examination Section' : 'Computer Science & Engineering',
      year: newRole === 'student' ? '1st Year' : '',
      section: newRole === 'student' ? 'A' : '',
    }));
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-md mb-2">
          <School className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          University Account Registration
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Register with your institutional roll number for portal access
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10 space-y-6">
          <button
            type="button"
            onClick={onGoToLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </button>

          {displayError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Role *</label>
              <select
                value={formData.role}
                onChange={e => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500 font-medium"
              >
                <option value="student">Student (Candidate)</option>
                <option value="incharge">Examination In-Charge (Invigilator)</option>
                <option value="admin">Examination Admin (Controller of Examinations)</option>
              </select>
            </div>

            {/* USER NAME - ENFORCED IN CAPITALS ONLY */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                User Name (Full Name) *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder={
                  formData.role === 'student'
                    ? 'E.G. JOHN DOE'
                    : formData.role === 'incharge'
                    ? 'E.G. PROF. SUNITA RAO'
                    : 'E.G. DR. CONTROLLER OF EXAMS'
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg uppercase font-semibold tracking-wide focus:outline-emerald-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">User name should be in capitals only.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {formData.role === 'student' ? 'University Roll Number *' : 'Staff Roll Number / Faculty ID *'}
              </label>
              <input
                type="text"
                required
                value={formData.rollNumber}
                onChange={e => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
                placeholder={formData.role === 'student' ? 'e.g. 21CS101' : 'e.g. FAC-CSE-01 or ADM-01'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg uppercase focus:outline-emerald-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Unique institutional identification number.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">University Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="user@university.edu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg lowercase focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="University Examination Section">University Examination Section</option>
              </select>
            </div>

            {/* ACADEMIC YEAR AND SECTION - REMOVED FOR ADMIN AND IN-CHARGE, ONLY SHOWN FOR STUDENT */}
            {formData.role === 'student' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
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
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-50 mt-4 cursor-pointer"
            >
              {submitting || loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
