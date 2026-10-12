import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { School, User, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Map roles to display name
  const displayRole = user?.role === 'admin' ? 'Admin' : user?.role === 'incharge' ? 'Professor' : 'Student';
  const displayIdentifier = user?.rollNumber || (user?.role === 'incharge' ? 'prof123' : user?.role === 'admin' ? '25eu10035' : '25eu10035');

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Portal Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight leading-tight block">Hallpass</span>
            <p className="text-xs text-slate-500 font-normal leading-tight">Smart Examination Section Management</p>
          </div>
        </div>

        {/* Right Section: User Identifier, Role Pill, and Avatar */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-slate-700">
                {displayIdentifier}
              </span>

              {/* Exact role badge style matching the mockup: light blue pill */}
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {displayRole}
              </span>

              {/* User Avatar Circle button */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  title={user.name}
                  className="w-9 h-9 rounded-full border border-sky-200 bg-sky-50 text-sky-700 flex items-center justify-center hover:bg-sky-100 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
