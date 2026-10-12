import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  FileSpreadsheet,
  Bell,
  User,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  // 1. Admin navigation (removed Students and Professors per user request)
  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'examinations', label: 'Examinations', icon: <Calendar className="w-4 h-4" /> },
    { id: 'rooms', label: 'Rooms & Halls', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'allocations', label: 'Room Allocation', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'reports', label: 'Absentee Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  // 2. Professor navigation (removed Student List and Attendance tabs per user request; attendance is triggered via Take Attendance button)
  const professorNav = [
    { id: 'incharge_rooms', label: 'Room In-Charge', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'absentee_list', label: 'Absentee List', icon: <Bell className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  // 3. Student navigation
  const studentNav = [
    { id: 'my_room_details', label: 'My Room Details', icon: <DoorOpen className="w-4 h-4" /> },
  ];

  const items = role === 'admin' ? adminNav : role === 'incharge' ? professorNav : studentNav;
  const sectionTitle = role === 'admin' ? 'ADMINISTRATION' : role === 'incharge' ? 'PROFESSOR PORTAL' : 'STUDENT PORTAL';

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {sectionTitle}
        </p>

        {items.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
