
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

  const currentUser = impersonatedUser || state.currentUser;

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
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
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
                return <Dashboard user={currentUser} history={myHistory} settings={appSettings} onUpdateLocationLog={addLocationLog} />;
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
                return <AdminDashboard history={attendanceHistory} users={users} settings={appSettings} />;
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
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppContent />
  );
};

export default App;
