
import React, { useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, User, AppSettings, TaskStatus } from '../types';
import { Users, UserCheck, Clock, AlertCircle, Bell, Calendar, MapPin, CheckCircle2, XCircle, Activity, Download, ShieldAlert, CheckSquare, Plus, FileText, Settings } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../services/store';

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
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = history.filter(h => h.date.startsWith(today));
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
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        
        const dayRecords = history.filter(h => h.date.startsWith(dateStr));
        
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
    <div className="space-y-6 fade-in pb-20 pt-14 md:pt-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
            <div className="w-full">
                <h2 className="text-2xl font-black text-gray-800 tracking-tighter">Dashboard Admin</h2>
                <p className="text-gray-500 text-xs font-medium">Ringkasan aktivitas hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                    <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl uppercase tracking-widest text-center">
                        {activeEmployees.length} Karyawan Aktif
                    </p>
                </div>
                <button 
                    onClick={onNavigateToReports}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-100 text-gray-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <Download size={14} />
                    Laporan
                </button>
            </div>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
                onClick={onNavigateToTasks}
                className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
            >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                    <Plus size={24} />
                </div>
                <h4 className="font-black text-gray-900 text-sm">Tambah Tugas</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Delegasi Kerja</p>
            </button>
            <button 
                onClick={onNavigateToEmployees}
                className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
            >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                    <Users size={24} />
                </div>
                <h4 className="font-black text-gray-900 text-sm">Data Karyawan</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kelola Staff</p>
            </button>
            <button 
                onClick={onNavigateToReports}
                className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
            >
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                    <FileText size={24} />
                </div>
                <h4 className="font-black text-gray-900 text-sm">Laporan</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Rekap Absensi</p>
            </button>
            <button 
                onClick={onNavigateToSettings}
                className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
            >
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                    <Settings size={24} />
                </div>
                <h4 className="font-black text-gray-900 text-sm">Pengaturan</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sistem & Kantor</p>
            </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><UserCheck size={24} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Hadir</p>
                    <p className="text-xl md:text-2xl font-black text-gray-800">{stats.present}</p>
                    <p className="hidden md:flex text-[10px] text-green-600 items-center gap-1"><CheckCircle2 size={10}/> Tepat Waktu</p>
                </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Clock size={24} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Terlambat</p>
                    <p className="text-xl md:text-2xl font-black text-gray-800">{stats.late}</p>
                    <p className="hidden md:flex text-[10px] text-yellow-600 items-center gap-1"><AlertCircle size={10}/> Perhatian</p>
                </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Calendar size={24} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Cuti / Izin</p>
                    <p className="text-xl md:text-2xl font-black text-gray-800">{stats.onLeave}</p>
                    <p className="hidden md:flex text-[10px] text-blue-600">Terjadwal</p>
                </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl"><XCircle size={24} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Belum Absen</p>
                    <p className="text-xl md:text-2xl font-black text-gray-800">{stats.absent}</p>
                    <p className="hidden md:flex text-[10px] text-red-600">Alpha</p>
                </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><CheckSquare size={24} className="md:w-7 md:h-7" /></div>
                <div className="text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Penyelesaian Tugas</p>
                    <p className="text-xl md:text-2xl font-black text-gray-800">{workStats.percentage}%</p>
                    <p className="hidden md:flex text-[10px] text-purple-600 items-center gap-1"><Activity size={10}/> {workStats.completed}/{workStats.total} Tugas</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 text-lg">Tren Kehadiran Minggu Ini</h3>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorTelat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#9CA3AF'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#9CA3AF'}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                            <Area type="monotone" dataKey="Hadir" stackId="1" stroke="#10B981" strokeWidth={3} fill="url(#colorHadir)" />
                            <Area type="monotone" dataKey="Terlambat" stackId="1" stroke="#F59E0B" strokeWidth={3} fill="url(#colorTelat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Right Column: Alerts & Live Feed */}
            <div className="space-y-6">
                {/* Super Admin System Health */}
                {isSuperAdmin && (
                    <div className="bg-gray-900 p-5 rounded-2xl shadow-xl text-white">
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
                            <ShieldAlert size={18} className="text-red-500"/> System Health
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-gray-400">Database Sync</span>
                                <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={10}/> Optimal</span>
                            </div>
                            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-[98%]"></div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mt-4">
                                <span className="text-gray-400">Server Load</span>
                                <span className="text-blue-400">12%</span>
                            </div>
                            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full w-[12%]"></div>
                            </div>

                            <div className="pt-4 border-t border-gray-800 mt-4">
                                <p className="text-[10px] text-gray-500 font-medium">Last Security Audit: Today, 09:00</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Alerts Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <Bell size={18} className="text-orange-500"/> Peringatan Dini
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-green-200"/>
                                Tidak ada peringatan. Semua berjalan lancar.
                            </div>
                        ) : alerts.map((alert, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex items-start gap-3 ${alert.type === 'danger' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                                <div className={`mt-0.5 p-1 rounded-full ${alert.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <AlertCircle size={12} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800">{alert.message}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{alert.user.name} • Shift: {alert.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Feed Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-blue-500"/> Aktivitas Terbaru
                    </h3>
                    <div className="space-y-4">
                        {liveFeed.length === 0 ? (
                            <p className="text-gray-400 text-xs text-center py-4">Belum ada aktivitas hari ini.</p>
                        ) : liveFeed.map((record, idx) => {
                            const user = users.find(u => u.id === record.userId);
                            return (
                                <div key={idx} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                    <img 
                                        src={user?.avatar || 'https://ui-avatars.com/api/?name=User'} 
                                        alt="" 
                                        className="w-8 h-8 rounded-full bg-gray-100 object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">{user?.name || 'Unknown'}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1 flex-wrap">
                                            <Clock size={10}/> {record.checkInTime} 
                                            <span className="text-gray-300">•</span>
                                            <MapPin size={10}/> {record.officeName || 'Lokasi Terdeteksi'}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        record.status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : 
                                        record.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
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
