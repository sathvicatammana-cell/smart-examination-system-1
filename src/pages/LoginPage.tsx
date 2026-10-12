import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { School, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, error, clearError, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email.trim() || !rollNumber.trim()) return;

    setSubmitting(true);
    try {
      await login(email.trim(), rollNumber.trim(), password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-3">
          <School className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Hallpass Examination Portal
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Smart Examination Section Management System • Academic Session 2026
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10 space-y-6">
          <div className="pb-3 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              University Credentials Login
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                University Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@university.edu or student@student.univ.edu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                University Roll Number / Staff ID *
              </label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 21CS101 or FAC-CSE-01"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase focus:outline-emerald-500 font-mono text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Dual verification: Validates that your email matches your registered university roll number.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {submitting || loading ? 'Verifying Credentials...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Registration Trigger */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New user?{' '}
              <button
                type="button"
                onClick={onGoToRegister}
                className="font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Register with your roll number
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
