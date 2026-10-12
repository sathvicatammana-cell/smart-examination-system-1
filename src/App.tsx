import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { ExaminationList } from './components/admin/ExaminationList.js';
import { RoomList } from './components/admin/RoomList.js';
import { StudentList } from './components/admin/StudentList.js';
import { StaffList } from './components/admin/StaffList.js';
import { AllocationManager } from './components/admin/AllocationManager.js';
import { AbsenteeReports } from './components/admin/AbsenteeReports.js';
import { InChargeDashboard } from './components/incharge/InChargeDashboard.js';
import { StudentDashboard } from './components/student/StudentDashboard.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('allocations');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [allocationTargetExamId, setAllocationTargetExamId] = useState<string | undefined>();

  // Ensure initial tab matches role default
  React.useEffect(() => {
    if (user?.role === 'student' && currentTab === 'allocations') {
      setCurrentTab('my_room_details');
    } else if (user?.role === 'incharge' && currentTab === 'allocations') {
      setCurrentTab('incharge_rooms');
    }
  }, [user?.role]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-700">Connecting to Hallpass Examination Portal...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return authView === 'login' ? (
      <LoginPage onGoToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onGoToLogin={() => setAuthView('login')} />
    );
  }

  const role = user.role;

  // Handle allocation trigger directly from exams list
  const handleSelectExamForAllocation = (examId: string) => {
    setAllocationTargetExamId(examId);
    setCurrentTab('allocations');
  };

  // Render role-specific content
  const renderMainContent = () => {
    if (role === 'admin') {
      switch (currentTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={tab => setCurrentTab(tab)} />;
        case 'examinations':
          return <ExaminationList onSelectForAllocation={handleSelectExamForAllocation} />;
        case 'rooms':
          return <RoomList />;
        case 'students':
          return <StudentList />;
        case 'staff':
          return <StaffList />;
        case 'allocations':
          return <AllocationManager initialExamId={allocationTargetExamId} />;
        case 'reports':
          return <AbsenteeReports />;
        default:
          return <AllocationManager initialExamId={allocationTargetExamId} />;
      }
    }

    if (role === 'incharge') {
      return <InChargeDashboard currentTab={currentTab} />;
    }

    if (role === 'student') {
      return <StudentDashboard currentTab={currentTab} />;
    }

    return <AdminDashboard onNavigate={tab => setCurrentTab(tab)} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            setAllocationTargetExamId(undefined);
          }}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
