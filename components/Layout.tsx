
import React, { useState, useEffect } from 'react';
import { Home, Calendar, ClipboardList, Settings, LogOut, User as UserIcon, Users, FileCheck, Briefcase, RefreshCw, AlertCircle, Eye, Menu, X, ChevronLeft, ChevronRight, CheckSquare, List, Activity } from 'lucide-react';
import { User } from '../types';
import { useStore } from '../services/store';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  impersonatedUser?: User | null;
  onExitImpersonation?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, impersonatedUser, onExitImpersonation }) => {
  const { state } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Auto-minimize sidebar when entering settings (sub-menu heavy page)
  useEffect(() => {
    if (activeTab === 'settings') {
      setIsSidebarMinimized(true);
    } else {
      // Optional: restore if you want it to be expanded by default on other pages
      // setIsSidebarMinimized(false);
    }
  }, [activeTab]);
  
  if (!user) return <>{children}</>;

  const employeeNav = [
    { id: 'dashboard', label: 'Dasbor', icon: Home },
    { id: 'attendance', label: 'Absensi', icon: UserIcon },
    { id: 'work-reports', label: 'Laporan Kerja', icon: CheckSquare },
    { id: 'history', label: 'Riwayat', icon: Calendar },
    { id: 'requests', label: 'Pengajuan', icon: ClipboardList },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const adminNav = [
    { id: 'admin-dashboard', label: 'Admin Dasbor', icon: Home },
    { id: 'admin-monitor', label: 'Monitor Absensi', icon: Users },
    { id: 'admin-work-monitor', label: 'Monitor Kerja', icon: Activity },
    { id: 'admin-tasks', label: 'Kelola Tugas', icon: List },
    { id: 'admin-employees', label: 'Data Karyawan', icon: Briefcase },
    { id: 'admin-reports', label: 'Laporan', icon: FileCheck }, // New Menu
    { id: 'admin-approvals', label: 'Persetujuan', icon: ClipboardList },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  
  const isModuleAllowed = (tabId: string) => {
    if (user.role === 'superadmin') return true; 
    
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
    
    const moduleId = moduleMap[tabId] || tabId;
    const permissions = state.appSettings.rolePermissions?.find(p => p.role === user.role);
    
    if (!permissions) return true; 
    return permissions.allowedModules.includes(moduleId);
  };

  const navItems = (isAdmin ? adminNav : employeeNav).filter(item => isModuleAllowed(item.id));

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 ${impersonatedUser ? 'pt-12 md:pt-0' : ''}`}>
      {/* Impersonation Banner */}
      {impersonatedUser && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white py-2 px-4 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Eye size={16} />
            </div>
            <p className="text-sm font-bold">
              Mode Lihat: <span className="underline">{impersonatedUser.name}</span>
            </p>
          </div>
          <button 
            onClick={onExitImpersonation}
            className="bg-white text-blue-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-sm"
          >
            Keluar Mode Lihat
          </button>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className={`hidden md:flex flex-col transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 print:hidden ${isSidebarMinimized ? 'w-20' : 'w-64'}`}>
        <div className={`p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between ${isSidebarMinimized ? 'px-4' : ''}`}>
          {!isSidebarMinimized && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">Pintu Kuliah</h1>
              <div className="flex items-center gap-1 mt-1">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                   user.role === 'superadmin' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                   user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 
                   'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                 }`}>
                    {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Employee'}
                 </span>
              </div>
            </motion.div>
          )}
          {isSidebarMinimized && (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">A</div>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isSidebarMinimized ? item.label : ''}
              className={`w-full flex items-center transition-all duration-200 group ${
                isSidebarMinimized ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
              } rounded-xl ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 shadow-sm font-medium dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <item.icon size={20} className={isSidebarMinimized ? 'flex-shrink-0' : ''} />
              {!isSidebarMinimized && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        {/* Toggle Button */}
        <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-700 flex justify-center">
          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-blue-600 transition-all active:scale-90"
          >
            {isSidebarMinimized ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Sync Status Indicator */}
        <div className={`px-6 py-2 ${isSidebarMinimized ? 'px-4 flex justify-center' : ''}`}>
            {state.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <RefreshCw size={12} className="animate-spin" /> {!isSidebarMinimized && 'Sinkronisasi Data...'}
                </div>
            ) : state.syncError ? (
                <div className="flex items-center gap-2 text-xs text-red-500 font-bold" title={state.syncError}>
                    <AlertCircle size={12} /> {!isSidebarMinimized && 'Error Koneksi'}
                </div>
            ) : (
                <div className={`flex ${isSidebarMinimized ? 'justify-center' : 'flex-col gap-0.5'}`}>
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
                        <RefreshCw size={12} /> {!isSidebarMinimized && 'Terhubung'}
                    </div>
                    {!isSidebarMinimized && <span className="text-[10px] text-gray-400 pl-5">Auto-sync aktif</span>}
                </div>
            )}
        </div>

        <div className={`p-4 border-t border-gray-100 dark:border-gray-700 ${isSidebarMinimized ? 'px-2' : ''}`}>
          <div className={`flex items-center gap-3 mb-2 ${isSidebarMinimized ? 'justify-center px-0' : 'px-4 py-3'}`}>
            <img 
              src={user.avatar} 
              alt="User" 
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 object-cover flex-shrink-0" 
            />
            {!isSidebarMinimized && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {(user.position || '').startsWith('http') ? '' : user.position}
                </p>
              </motion.div>
            )}
          </div>
          <button
            onClick={onLogout}
            title={isSidebarMinimized ? 'Keluar' : ''}
            className={`w-full flex items-center transition-colors rounded-lg ${
              isSidebarMinimized ? 'justify-center p-2' : 'gap-3 px-4 py-2'
            } text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}
          >
            <LogOut size={16} />
            {!isSidebarMinimized && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen pb-24 md:pb-0 relative print:h-auto print:overflow-visible">
        {state.syncError && (
          <div className="sticky top-0 z-50 bg-red-600 text-white p-4 shadow-lg flex items-start gap-4 animate-in slide-in-from-top duration-300">
            <div className="bg-white/20 p-2 rounded-xl">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-black uppercase tracking-widest text-sm mb-1">Gagal Sinkronisasi Database</h3>
              <p className="text-sm font-medium opacity-90 leading-relaxed">
                {state.syncError}
              </p>
              {state.syncError.includes("Anyone") && (
                <div className="mt-3 p-3 bg-black/20 rounded-lg text-xs font-mono leading-relaxed border border-white/10">
                  <p className="font-bold mb-1 text-white underline">Cara Memperbaiki:</p>
                  <ol className="list-decimal list-inside space-y-1 opacity-90">
                    <li>Buka Google Apps Script Anda</li>
                    <li>Klik tombol <span className="font-bold">Deploy</span> &gt; <span className="font-bold">Manage Deployments</span></li>
                    <li>Edit deployment aktif (ikon pensil)</li>
                    <li>Pastikan <span className="font-bold">Who has access</span> diatur ke <span className="font-bold">Anyone</span></li>
                    <li>Klik <span className="font-bold">Deploy</span> dan salin URL baru jika berubah</li>
                  </ol>
                </div>
              )}
            </div>
            <button 
                onClick={() => window.location.reload()}
                className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95 shadow-sm flex items-center gap-2"
            >
                <RefreshCw size={14} /> Coba Lagi
            </button>
          </div>
        )}
        <div className="max-w-6xl mx-auto p-4 md:p-8 print:p-0 print:max-w-none">
           {children}
        </div>
      </main>

      {/* Mobile Nav Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 z-[60] shadow-sm print:hidden">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter">Pintu Kuliah</h1>
          <div className="flex items-center gap-3">
              {state.isLoading && <RefreshCw size={16} className="animate-spin text-blue-500" />}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300"
              >
                  <Menu size={20} />
              </button>
          </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-gray-800 z-[101] md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div>
                      <h2 className="font-black text-xl text-gray-800 dark:text-white">Menu Utama</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role}</p>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <X size={24} className="text-gray-400" />
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
                        activeTab === item.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-bold'
                          : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon size={22} />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4 mb-6">
                      <img 
                        src={user.avatar} 
                        className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" 
                        alt=""
                      />
                      <div className="min-w-0">
                          <p className="font-bold text-gray-800 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                      <LogOut size={18} /> Keluar Aplikasi
                  </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav (Mobile) - Quick Access */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-700 px-4 py-2 flex justify-around items-center z-50 safe-area-bottom print:hidden">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              activeTab === item.id ? 'text-blue-600 scale-110' : 'text-gray-400'
            }`}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">{(item.label || '').split(' ')[0]}</span>
          </button>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-2 text-gray-400"
        >
          <Menu size={22} />
          <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Lainnya</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
