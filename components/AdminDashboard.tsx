
import React, { useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, User, AppSettings, TaskStatus } from '../types';
import { Users, UserCheck, Clock, AlertCircle, Bell, Calendar, MapPin, CheckCircle2, XCircle, Activity, Download, ShieldAlert, CheckSquare, Plus, FileText, Settings } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../services/store';
import { getLocalDateString } from '../services/dateUtils';

interface AdminDashboardProps {
  history: AttendanceRecord[];
  users: User[];
  settings: AppSettings;
  currentUser: User | null;
  onNavigateToReports?: () => void;
  onNavigateToTasks?: () => void;
  onNavigateToEmployees?: () => void;
  onNavigateToSettings?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  history, 
  users, 
  settings, 
  currentUser, 
  onNavigateToReports,
  onNavigateToTasks,
  onNavigateToEmployees,
  onNavigateToSettings
}) => {
  const { state } = useStore();
  const { tasks, workReports } = state;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const today = getLocalDateString();
  const todayRecords = history.filter(h => h.date === today);
  const activeEmployees = users.filter(u => u.role === 'employee' && u.isActive);
  
  // Enhanced Stats Calculation
  const stats = useMemo(() => {
      const present = todayRecords.filter(h => h.status === AttendanceStatus.PRESENT || h.status === AttendanceStatus.LATE).length;
      const late = todayRecords.filter(h => h.status === AttendanceStatus.LATE).length;
      const onLeave = todayRecords.filter(h => h.status === AttendanceStatus.LEAVE || h.status === AttendanceStatus.SICK).length;
      const absent = activeEmployees.length - present - onLeave; // Rough estimate for "Not yet checked in" or "Alpha"

      return { present, late, onLeave, absent, total: activeEmployees.length };
  }, [todayRecords, activeEmployees]);

  // Enhanced Alerts Logic
  const alerts = useMemo(() => {
      const generatedAlerts: { type: 'danger' | 'warning' | 'info', message: string, user: User, time: string }[] = [];
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const dayIndex = now.getDay(); // 0 = Sunday

      activeEmployees.forEach(emp => {
          // Find employee's shift (default to first shift if not found for now, or skip)
          const shift = settings.shifts?.find(s => s.assignedUserIds.includes(emp.id)) || settings.shifts[0];
          
          if (!shift || !shift.workDays.includes(dayIndex)) return;

          const [startH, startM] = (shift.startTime || '08:00').split(':').map(Number);
          const startTotalMinutes = startH * 60 + startM;
          
          const hasRecord = todayRecords.find(r => r.userId === emp.id);

          // 1. Late Check-In Warning (If current time > shift start + grace period AND no record)
          const gracePeriod = settings.gracePeriodMinutes || 15;
          if (currentTotalMinutes > (startTotalMinutes + gracePeriod) && !hasRecord) {
              generatedAlerts.push({
                  type: 'danger',
                  message: 'Belum Check-In (Terlambat)',
                  user: emp,
                  time: `${shift.startTime} WIB`
              });
          }

          // 2. Late Record Alert
          if (hasRecord && hasRecord.status === AttendanceStatus.LATE) {
               generatedAlerts.push({
                  type: 'warning',
                  message: `Terlambat Masuk (${hasRecord.checkInTime})`,
                  user: emp,
                  time: `${shift.startTime} WIB`
              });
          }
      });

      return generatedAlerts.slice(0, 5); // Limit to top 5
  }, [activeEmployees, settings, todayRecords]);

  // Enhanced Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        
        const dayRecords = history.filter(h => h.date === dateStr);
        
        data.push({
            name: dayName,
            Hadir: dayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
            Terlambat: dayRecords.filter(r => r.status === AttendanceStatus.LATE).length,
            SakitIzin: dayRecords.filter(r => r.status === AttendanceStatus.SICK || r.status === AttendanceStatus.LEAVE).length,
        });
    }
    return data;
  }, [history]);

  // Live Feed Data (Latest 5 check-ins)
  const liveFeed = [...todayRecords]
    .sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''))
    .slice(0, 5);

  // Work Stats
  const workStats = useMemo(() => {
      const todayReports = workReports.filter(r => r.date === today);
      const completed = todayReports.filter(r => r.status === TaskStatus.DONE).length;
      
      let totalAssigned = 0;
      activeEmployees.forEach(emp => {
          const userTasks = tasks.filter(task => {
              if (!task.isActive) return false;
              if (task.assignedUserIds.includes(emp.id)) return true;
              if (task.assignedRoleIds.includes(emp.jobRoleId || '')) return true;
              if (task.assignedDepartmentIds.includes(emp.departmentId || '')) return true;
              return false;
          });
          totalAssigned += userTasks.length;
      });

      const percentage = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      return { completed, total: totalAssigned, percentage };
  }, [workReports, tasks, activeEmployees, today]);

  return (
    <div className="space-y-4 md:space-y-8 fade-in pb-24 md:pb-8 pt-14 md:pt-0 px-2 md:px-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-4">
            <div className="w-full">
                <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">Dashboard Admin</h2>
                <p className="text-gray-400 text-[9px] md:text-sm font-black uppercase tracking-widest mt-0.5 md:mt-1">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                    <div className="flex items-center gap-2 bg-blue-50 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-blue-100">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <p className="text-[9px] md:text-xs font-black text-blue-600 uppercase tracking-widest">
                            {activeEmployees.length} Karyawan Aktif
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onNavigateToReports}
                    className="flex items-center justify-center gap-1.5 md:gap-2 bg-white border border-gray-100 text-slate-700 px-3 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                    <Download size={14} className="md:w-4 md:h-4" />
                    Laporan
                </button>
            </div>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <button 
                onClick={onNavigateToTasks}
                className="p-4 md:p-8 bg-white rounded-[1.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-100/50 transition-all group text-left relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 md:mb-6 shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform relative z-10">
                    <Plus size={20} className="md:w-7 md:h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-xs md:text-base relative z-10">Tambah Tugas</h4>
                <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 md:mt-1 relative z-10">Delegasi Kerja</p>
            </button>
            <button 
                onClick={onNavigateToEmployees}
                className="p-4 md:p-8 bg-white rounded-[1.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-100/50 transition-all group text-left relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-3 md:mb-6 shadow-lg shadow-emerald-200 group-hover:rotate-12 transition-transform relative z-10">
                    <Users size={20} className="md:w-7 md:h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-xs md:text-base relative z-10">Data Karyawan</h4>
                <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 md:mt-1 relative z-10">Kelola Staff</p>
            </button>
            <button 
                onClick={onNavigateToReports}
                className="p-4 md:p-8 bg-white rounded-[1.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-purple-100/50 transition-all group text-left relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-3 md:mb-6 shadow-lg shadow-purple-200 group-hover:rotate-12 transition-transform relative z-10">
                    <FileText size={20} className="md:w-7 md:h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-xs md:text-base relative z-10">Laporan</h4>
                <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 md:mt-1 relative z-10">Rekap Absensi</p>
            </button>
            <button 
                onClick={onNavigateToSettings}
                className="p-4 md:p-8 bg-white rounded-[1.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-orange-100/50 transition-all group text-left relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 transition-transform group-hover:scale-110"></div>
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-orange-600 text-white flex items-center justify-center mb-3 md:mb-6 shadow-lg shadow-orange-200 group-hover:rotate-12 transition-transform relative z-10">
                    <Settings size={20} className="md:w-7 md:h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-xs md:text-base relative z-10">Pengaturan</h4>
                <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 md:mt-1 relative z-10">Sistem & Kantor</p>
            </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-6">
            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 hover:shadow-lg transition-all group">
                <div className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform"><UserCheck size={20} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Hadir</p>
                    <p className="text-xl md:text-3xl font-black text-slate-900">{stats.present}</p>
                    <p className="hidden md:flex text-[10px] text-emerald-600 font-black items-center gap-1 uppercase tracking-widest mt-1"><CheckCircle2 size={10}/> Tepat</p>
                </div>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 hover:shadow-lg transition-all group">
                <div className="p-2 md:p-3 bg-amber-50 text-amber-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform"><Clock size={20} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Telat</p>
                    <p className="text-xl md:text-3xl font-black text-slate-900">{stats.late}</p>
                    <p className="hidden md:flex text-[10px] text-amber-600 font-black items-center gap-1 uppercase tracking-widest mt-1"><AlertCircle size={10}/> Perhatian</p>
                </div>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 hover:shadow-lg transition-all group">
                <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform"><Calendar size={20} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Izin</p>
                    <p className="text-xl md:text-3xl font-black text-slate-900">{stats.onLeave}</p>
                    <p className="hidden md:flex text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Terjadwal</p>
                </div>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 hover:shadow-lg transition-all group">
                <div className="p-2 md:p-3 bg-rose-50 text-rose-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform"><XCircle size={20} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Alpha</p>
                    <p className="text-xl md:text-3xl font-black text-slate-900">{stats.absent}</p>
                    <p className="hidden md:flex text-[10px] text-rose-600 font-black uppercase tracking-widest mt-1">Belum Absen</p>
                </div>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 hover:shadow-lg transition-all group col-span-2 lg:col-span-1">
                <div className="p-2 md:p-3 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform"><CheckSquare size={20} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Progres</p>
                    <p className="text-xl md:text-3xl font-black text-slate-900">{workStats.percentage}%</p>
                    <p className="hidden md:flex text-[10px] text-purple-600 font-black items-center gap-1 uppercase tracking-widest mt-1"><Activity size={10}/> {workStats.completed}/{workStats.total}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4 md:mb-8">
                    <h3 className="font-black text-slate-900 text-sm md:text-xl tracking-tight">Tren Kehadiran</h3>
                    <div className="flex gap-1.5 md:gap-2">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full"></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-amber-500 rounded-full"></div>
                    </div>
                </div>
                <div className="h-56 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorTelat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={8} fontWeight="900" tick={{fill: '#94a3b8'}} dy={10} textAnchor="middle" />
                            <YAxis axisLine={false} tickLine={false} fontSize={8} fontWeight="900" tick={{fill: '#94a3b8'}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }} 
                                cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="right" 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '10px' }}
                            />
                            <Area type="monotone" dataKey="Hadir" stackId="1" stroke="#10B981" strokeWidth={3} fill="url(#colorHadir)" />
                            <Area type="monotone" dataKey="Terlambat" stackId="1" stroke="#F59E0B" strokeWidth={3} fill="url(#colorTelat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Right Column: Alerts & Live Feed */}
            <div className="space-y-4 md:space-y-8">
                {/* Super Admin System Health */}
                {isSuperAdmin && (
                    <div className="bg-slate-900 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-bl-full -mr-6 -mt-6 md:-mr-10 md:-mt-10 transition-transform group-hover:scale-110"></div>
                        <h3 className="font-black flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-[10px] md:text-sm uppercase tracking-[0.2em] relative z-10">
                            <ShieldAlert size={16} className="text-rose-500 md:w-5 md:h-5"/> System Health
                        </h3>
                        <div className="space-y-4 md:space-y-5 relative z-10">
                            <div className="space-y-1.5 md:space-y-2">
                                <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Database Sync</span>
                                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={8}/> Optimal</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 md:h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full w-[98%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5 md:space-y-2">
                                <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Server Load</span>
                                    <span className="text-blue-400">12%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 md:h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full w-[12%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                </div>
                            </div>

                            <div className="pt-3 md:pt-4 border-t border-slate-800 mt-3 md:mt-4">
                                <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">Last Audit: Today, 09:00</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Alerts Card */}
                <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-slate-900 flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-sm md:text-lg tracking-tight">
                        <Bell size={18} className="text-amber-500 md:w-5 md:h-5"/> Peringatan Dini
                    </h3>
                    <div className="space-y-3 max-h-[250px] md:max-h-[300px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                        {alerts.length === 0 ? (
                            <div className="text-center py-6 md:py-10 text-gray-400">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                    <CheckCircle2 size={24} className="md:w-8 md:h-8" />
                                </div>
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Sistem Aman</p>
                            </div>
                        ) : alerts.map((alert, idx) => (
                            <div key={idx} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border flex items-start gap-3 md:gap-4 transition-all hover:scale-[1.02] ${alert.type === 'danger' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                                <div className={`mt-0.5 p-1.5 md:p-2 rounded-lg md:rounded-xl ${alert.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                    <AlertCircle size={14} className="md:w-4 md:h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-slate-900">{alert.message}</p>
                                    <p className="text-[8px] md:text-[10px] text-gray-500 mt-0.5 md:mt-1 font-black uppercase tracking-widest">{alert.user.name} • {alert.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Feed Card */}
                <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-slate-900 flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-sm md:text-lg tracking-tight">
                        <Activity size={18} className="text-blue-500 md:w-5 md:h-5"/> Aktivitas Terbaru
                    </h3>
                    <div className="space-y-4 md:space-y-5">
                        {liveFeed.length === 0 ? (
                            <p className="text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center py-6 md:py-8">Belum ada aktivitas</p>
                        ) : liveFeed.map((record, idx) => {
                            const user = users.find(u => u.id === record.userId);
                            return (
                                <div key={idx} className="flex items-center gap-3 md:gap-4 pb-3 md:pb-4 border-b border-slate-50 last:border-0 last:pb-0 group">
                                    <div className="relative">
                                        <img 
                                            src={user?.avatar || 'https://ui-avatars.com/api/?name=User'} 
                                            alt="" 
                                            className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-slate-100 object-cover shadow-sm group-hover:scale-110 transition-transform"
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                            }}
                                        />
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white ${
                                            record.status === AttendanceStatus.PRESENT ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] md:text-xs font-black text-slate-900 truncate">{user?.name || 'Unknown'}</p>
                                        <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                                            <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                <Clock size={8} className="md:w-2.5 md:h-2.5"/> {record.checkInTime}
                                            </p>
                                            <span className="text-gray-200">•</span>
                                            <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1 truncate">
                                                <MapPin size={8} className="md:w-2.5 md:h-2.5"/> {record.officeName || 'Kantor'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest ${
                                        record.status === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                        record.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}>
                                        {record.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;
