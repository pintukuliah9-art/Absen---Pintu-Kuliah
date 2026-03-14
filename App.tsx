
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import Requests from './components/Requests';
import History from './components/History';
import Settings from './components/Settings';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AdminApprovals from './components/AdminApprovals';
import AdminMonitor from './components/AdminMonitor';
import AdminEmployees from './components/AdminEmployees';
import AdminReports from './components/AdminReports';
import AdminTasks from './components/AdminTasks';
import AdminWorkMonitor from './components/AdminWorkMonitor';
import WorkReports from './components/WorkReports';
import { useStore } from './services/store';
import { RequestStatus } from './types';
import { getLocalDateString } from './services/dateUtils';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SyncIndicator: React.FC<{ isSyncing: boolean }> = ({ isSyncing }) => (
  <AnimatePresence>
    {isSyncing && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 right-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-emerald-100 px-3 py-1.5 rounded-full shadow-lg text-emerald-600 text-xs font-medium"
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Sinkronisasi...</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const AppContent: React.FC = () => {
  const { 
    state, login, logout, 
    addAttendance, checkOutAttendance, updateAttendance, addLocationLog,
    addRequest, updateRequestStatus, deleteRequest,
    updateAppSettings, resetData,
    addUser, updateUser, deleteUser
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);

  // Health check on mount
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        console.log('[App] Performing backend health check (GET)...');
        const getResponse = await fetch('/api/health');
        if (getResponse.ok) {
          const data = await getResponse.json();
          console.log('[App] GET health check successful:', data);
        } else {
          console.error('[App] GET health check failed:', getResponse.status);
        }

        console.log('[App] Performing backend health check (POST)...');
        const postResponse = await fetch('/api/health', { method: 'POST' });
        if (postResponse.ok) {
          const data = await postResponse.json();
          console.log('[App] POST health check successful:', data);
        } else {
          console.error('[App] POST health check failed:', postResponse.status);
        }
      } catch (error: any) {
        console.error('[App] Health check error:', error.message);
      }
    };
    checkHealth();
  }, []);

  const currentUser = impersonatedUser || state.currentUser;

  if (state.isLoading && !state.currentUser) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-100 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-slate-800">Menyiapkan Pintu Kuliah</h2>
            <p className="text-slate-500 text-sm">Sedang memuat data dari server...</p>
            {state.syncError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-600 font-mono break-all">{state.syncError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-xs font-medium text-red-700 hover:underline"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!state.currentUser) {
    return <Login onLogin={(user) => {
        login(user);
        
        // Find first allowed tab based on role permissions
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        const permissions = state.appSettings.rolePermissions?.find(p => p.role === user.role);
        
        if (permissions && !isAdmin) {
            // Employee roles
            const employeeTabs = ['dashboard', 'attendance', 'history', 'requests', 'settings'];
            const firstAllowed = employeeTabs.find(tab => permissions.allowedModules.includes(tab));
            setActiveTab(firstAllowed || 'dashboard');
        } else if (permissions && isAdmin && user.role !== 'superadmin') {
            // Admin roles (not superadmin)
            const adminTabs = ['admin-dashboard', 'admin-monitor', 'admin-employees', 'admin-reports', 'admin-approvals', 'settings'];
            const firstAllowed = adminTabs.find(tab => {
                const moduleId = tab.replace('-', '_');
                return permissions.allowedModules.includes(moduleId) || permissions.allowedModules.includes(tab);
            });
            setActiveTab(firstAllowed || 'admin-dashboard');
        } else {
            // Superadmin or no permissions defined
            setActiveTab(isAdmin ? 'admin-dashboard' : 'dashboard');
        }
    }} />;
  }

  // Helper to find today's attendance record for the current user
  const getTodayRecord = () => {
      const today = getLocalDateString();
      
      return state.attendanceHistory.find(
          h => h.userId === state.currentUser!.id && h.date.startsWith(today)
      );
  };

  const handleAttendanceCheckIn = (record: any) => {
    addAttendance(record);
    // Stay on attendance page to show success message, or redirect:
    // setActiveTab('dashboard'); 
  };

  const handleAttendanceCheckOut = (time: string, location?: { lat: number, lng: number }, officeId?: string, officeName?: string) => {
      const todayRecord = getTodayRecord();
      if (todayRecord) {
          checkOutAttendance(todayRecord.id, time, location, officeId, officeName);
      }
  };

  const handleRequestSubmit = (data: any) => {
    // data is already a partial RequestRecord from the form
    addRequest({
        ...data,
        userId: state.currentUser!.id,
        status: RequestStatus.PENDING,
    });
  };

  const renderContent = () => {
    const { attendanceHistory, requests, appSettings, users } = state;
    
    // Check if current tab is allowed for current role
    const isModuleAllowed = (tabId: string) => {
        if (currentUser?.role === 'superadmin') return true;
        
        const moduleMap: Record<string, string> = {
            'dashboard': 'dashboard',
            'attendance': 'attendance',
            'history': 'history',
            'requests': 'requests',
            'work-reports': 'work_reports',
            'settings': 'settings',
            'admin-dashboard': 'admin_dashboard',
            'admin-monitor': 'admin_monitor',
            'admin-work-monitor': 'admin_work_monitor',
            'admin-tasks': 'admin_tasks',
            'admin-employees': 'admin_employees',
            'admin-reports': 'admin_reports',
            'admin-approvals': 'admin_approvals'
        };
        
        const moduleId = moduleMap[tabId] || tabId.replace('-', '_');
        const permissions = appSettings.rolePermissions?.find(p => p.role === currentUser?.role);
        
        if (!permissions) return true;
        return permissions.allowedModules.includes(moduleId);
    };

    // If not allowed, we don't redirect here to avoid infinite loops in render, 
    // but we can return a fallback or the Layout will handle the sidebar visibility.
    // The Login onLogin already sets a valid initial tab.

    // Employee & Other Roles (Manager, HR)
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') {
        const myHistory = attendanceHistory.filter(h => h.userId === currentUser!.id);
        const myRequests = requests.filter(r => r.userId === currentUser!.id);
        
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard 
                    user={currentUser} 
                    history={myHistory} 
                    settings={appSettings} 
                    onUpdateLocationLog={addLocationLog}
                    onNavigateToReports={() => setActiveTab('work-reports')}
                    onNavigateToHistory={() => setActiveTab('history')}
                    onNavigateToRequests={() => setActiveTab('requests')}
                    onNavigateToSettings={() => setActiveTab('settings')}
                />;
            case 'attendance':
                return (
                    <Attendance 
                        user={currentUser} 
                        settings={appSettings}
                        onCheckIn={handleAttendanceCheckIn} 
                        onCheckOut={handleAttendanceCheckOut}
                        todayRecord={getTodayRecord()}
                    />
                );
            case 'requests':
                return (
                    <Requests 
                        requests={myRequests} 
                        leaveTypes={appSettings.leaveTypes || []}
                        userQuota={currentUser.leaveQuota}
                        onSubmit={handleRequestSubmit} 
                        onDelete={deleteRequest}
                    />
                );
            case 'work-reports':
                return <WorkReports />;
            case 'history':
                return <History history={myHistory} settings={appSettings} />;
            case 'settings':
                return <Settings 
                    user={currentUser} 
                    appSettings={appSettings} 
                    onUpdateSettings={updateAppSettings} 
                    onReset={resetData} 
                    onLogout={logout}
                />;
            default:
                return <Dashboard 
                    user={currentUser} 
                    history={myHistory} 
                    settings={appSettings} 
                    onUpdateLocationLog={addLocationLog}
                    onNavigateToReports={() => setActiveTab('work-reports')}
                    onNavigateToHistory={() => setActiveTab('history')}
                    onNavigateToRequests={() => setActiveTab('requests')}
                    onNavigateToSettings={() => setActiveTab('settings')}
                />;
        }
    }

    // Admin & Superadmin Routes
    if (currentUser?.role === 'admin' || currentUser?.role === 'superadmin') {
        switch (activeTab) {
            case 'admin-dashboard':
                return <AdminDashboard 
                            history={attendanceHistory} 
                            users={users} 
                            settings={appSettings} 
                            currentUser={currentUser}
                            onNavigateToReports={() => setActiveTab('admin-reports')}
                            onNavigateToTasks={() => setActiveTab('admin-tasks')}
                            onNavigateToEmployees={() => setActiveTab('admin-employees')}
                            onNavigateToSettings={() => setActiveTab('settings')}
                        />;
            case 'admin-monitor': 
                return <AdminMonitor history={attendanceHistory} users={users} />;
            case 'admin-work-monitor':
                return <AdminWorkMonitor />;
            case 'admin-tasks':
                return <AdminTasks />;
            case 'admin-employees':
                return <AdminEmployees 
                            users={users} 
                            history={attendanceHistory}
                            onAddUser={addUser} 
                            onUpdateUser={updateUser} 
                            onDeleteUser={deleteUser} 
                            onUpdateAttendance={updateAttendance}
                            onImpersonate={(u) => {
                                setImpersonatedUser(u);
                                setActiveTab('dashboard');
                            }}
                       />;
            case 'admin-reports':
                return <AdminReports history={attendanceHistory} users={users} />;
            case 'admin-approvals':
                return <AdminApprovals requests={requests} users={users} onUpdateStatus={updateRequestStatus} />;
            case 'settings':
                return <Settings 
                    user={currentUser} 
                    appSettings={appSettings} 
                    onUpdateSettings={updateAppSettings} 
                    onReset={resetData}
                    onLogout={logout}
                />;
            default:
                return <AdminDashboard 
                            history={attendanceHistory} 
                            users={users} 
                            settings={appSettings} 
                            currentUser={currentUser}
                            onNavigateToReports={() => setActiveTab('admin-reports')}
                            onNavigateToTasks={() => setActiveTab('admin-tasks')}
                            onNavigateToEmployees={() => setActiveTab('admin-employees')}
                            onNavigateToSettings={() => setActiveTab('settings')}
                        />;
        }
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={currentUser}
        onLogout={logout}
        impersonatedUser={impersonatedUser}
        onExitImpersonation={() => {
            setImpersonatedUser(null);
            setActiveTab('admin-employees');
        }}
    >
      {renderContent()}
      <SyncIndicator isSyncing={state.isSyncing} />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppContent />
  );
};

export default App;
