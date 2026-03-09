import React, { useEffect, useState, useRef, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatus, AppSettings, LocationLog, TaskStatus, TaskCategory } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, MapPin, Sparkles, CheckCircle, XCircle, CloudSun, Flame, Briefcase, RefreshCw, Crosshair, Calendar, Coffee, LogOut, AlertTriangle, ArrowRight, Sun, Moon, Cloud, Activity, CheckSquare, ClipboardList, History, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { analyzePerformance } from '../services/geminiService';
import { useStore } from '../services/store';
import { motion } from 'motion/react';

interface DashboardProps {
  user: User;
  history: AttendanceRecord[];
  settings: AppSettings;
  onUpdateLocationLog?: (recordId: string, log: LocationLog) => void;
  onNavigateToReports?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, history, settings, onUpdateLocationLog, onNavigateToReports }) => {
  const { state, fetchData } = useStore();
  const { tasks, workReports } = state;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiInsight, setAiInsight] = useState<string>("Sedang menganalisis data...");
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isUpdatingLoc, setIsUpdatingLoc] = useState(false);
  const [lastLocUpdate, setLastLocUpdate] = useState<string | null>(null);

  const handleRefreshData = async () => {
      setIsRefreshingData(true);
      try {
          await fetchData();
      } finally {
          setIsRefreshingData(false);
      }
  };

  const refreshAiInsight = async () => {
    if (history.length === 0) {
        setAiInsight("Selamat datang! Mulai absensi untuk melihat analisis AI.");
        return;
    }
    
    setIsRefreshingAi(true);
    const summary = history.slice(0, 10).map(h => 
      `${(h.date || '').split('T')[0]}: ${h.status} (${h.checkInTime || '-'} - ${h.checkOutTime || '-'})`
    ).join('\n');

    try {
        const result = await analyzePerformance(summary, user.name);
        setAiInsight(result);
    } catch (e) {
        setAiInsight("Gagal memuat analisis AI.");
    } finally {
        setIsRefreshingAi(false);
    }
  };

  // Identify today's status & shift
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = history.find(h => h.date.startsWith(todayStr));
  const userShift = settings.shifts?.find(s => s.assignedUserIds.includes(user.id));
  const isWorkDay = userShift?.workDays.includes(currentTime.getDay());

  // --- Location Tracking Logic ---
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Work Progress Logic
  const todayStrOnly = new Date().toISOString().split('T')[0];
  const assignedTasks = tasks.filter(task => {
      if (!task.isActive) return false;
      if (task.assignedUserIds.includes(user.id)) return true;
      if (task.assignedRoleIds.includes(user.jobRoleId || '')) return true;
      if (task.assignedDepartmentIds.includes(user.departmentId || '')) return true;
      return false;
  });

  const dailyReports = workReports.filter(r => r.userId === user.id && r.date === todayStrOnly);
  const taskStats = useMemo(() => {
      const completed = dailyReports.filter(r => r.status === TaskStatus.DONE).length;
      const total = assignedTasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { completed, total, percentage };
  }, [dailyReports, assignedTasks]);

  const captureLocation = (type: 'AUTO' | 'MANUAL') => {
      if (!todayRecord || todayRecord.checkOutTime || !onUpdateLocationLog) return;
      
      setIsUpdatingLoc(true);
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const log: LocationLog = {
                  id: `loc-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  type: type
              };
              onUpdateLocationLog(todayRecord.id, log);
              setLastLocUpdate(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
              setIsUpdatingLoc(false);
          },
          (err) => {
              console.error("Loc update failed", err);
              setIsUpdatingLoc(false);
          }
      );
  };

  useEffect(() => {
    // Clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Auto Location Tracker (Every 10 minutes if Checked In & Not Checked Out)
    if (todayRecord && !todayRecord.checkOutTime) {
        // Initial Capture
        if (!todayRecord.locationLogs || todayRecord.locationLogs.length === 0) {
            captureLocation('AUTO');
        }

        intervalRef.current = setInterval(() => {
            captureLocation('AUTO');
        }, 10 * 60 * 1000); // 10 Minutes
    }

    return () => {
        clearInterval(timer);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [todayRecord]); // Re-run if record status changes

  // --- End Logic ---

  useEffect(() => {
    refreshAiInsight();

    let currentStreak = 0;
    const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const rec of sorted) {
        if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.LATE) currentStreak++;
        else break;
    }
    setStreak(currentStreak);
  }, [history]);

  const stats = useMemo(() => {
    const present = history.filter(h => h.status === AttendanceStatus.PRESENT).length;
    const late = history.filter(h => h.status === AttendanceStatus.LATE).length;
    const absent = history.filter(h => h.status === AttendanceStatus.ABSENT).length;
    const leave = history.filter(h => h.status === AttendanceStatus.LEAVE || h.status === AttendanceStatus.SICK).length;
    
    // Calculate Monthly Rate
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonthHistory = history.filter(h => {
        const d = new Date(h.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const workDaysThisMonth = thisMonthHistory.filter(h => h.status !== AttendanceStatus.ABSENT).length;
    const totalDaysThisMonth = thisMonthHistory.length || 1;
    const rate = Math.round((workDaysThisMonth / totalDaysThisMonth) * 100);

    return { present, late, absent, leave, rate };
  }, [history]);

  const chartData = [
    { name: 'Hadir', value: stats.present, color: '#10B981' }, 
    { name: 'Telat', value: stats.late, color: '#F59E0B' },   
    { name: 'Izin/Sakit', value: stats.leave, color: '#3B82F6' },
    { name: 'Alpha', value: stats.absent, color: '#EF4444' }, 
  ].filter(d => d.value > 0);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return "Semangat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const getWorkProgress = () => {
      if (!userShift || !todayRecord || todayRecord.checkOutTime) return 0;
      
      const [startH, startM] = (userShift.startTime || '08:00').split(':').map(Number);
      const [endH, endM] = (userShift.endTime || '17:00').split(':').map(Number);
      
      const start = new Date(); start.setHours(startH, startM, 0);
      const end = new Date(); end.setHours(endH, endM, 0);
      const now = new Date();

      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      
      const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
      return progress;
  };

  const getWorkCountdown = () => {
    if (!userShift) return "No Shift";
    if (!isWorkDay) return "Libur";
    if (!todayRecord) return "Belum Absen";
    if (todayRecord.checkOutTime) return "Selesai";

    const now = new Date();
    const [endHour, endMin] = (userShift.endTime || '17:00').split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);

    if (now > endTime) return "Lembur";

    const diff = endTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m lagi`;
  };

  // Render Status Widget Content
  const renderStatusWidget = () => {
      if (!isWorkDay) {
          return (
              <div className="h-full flex flex-col justify-center items-center text-gray-500">
                  <Calendar size={32} className="mb-2 text-gray-400" />
                  <h3 className="font-bold text-lg">Hari Libur</h3>
                  <p className="text-xs">Nikmati waktu istirahatmu!</p>
              </div>
          );
      }

      if (todayRecord) {
          if (todayRecord.checkOutTime) {
              return (
                  <div className="h-full flex flex-col justify-center items-center text-green-600">
                      <CheckCircle size={40} className="mb-2" />
                      <h3 className="font-bold text-lg">Kerja Selesai</h3>
                      <p className="text-xs text-green-700 font-medium">Sampai jumpa besok!</p>
                  </div>
              );
          } else {
              const progress = getWorkProgress();
              return (
                  <div className="text-white h-full flex flex-col justify-between relative z-10">
                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                               <Briefcase size={14} />
                               <span className="font-bold text-xs">Sedang Bekerja</span>
                           </div>
                           <div className="text-xs font-mono opacity-80">{Math.round(progress)}%</div>
                       </div>
                       
                       <div className="text-center my-4">
                           <div className="text-4xl font-bold tracking-tight">{getWorkCountdown()}</div>
                           <p className="text-xs opacity-80 mt-1">Menuju jam pulang</p>
                       </div>

                       <div className="w-full bg-black/20 rounded-full h-1.5 mb-4 overflow-hidden">
                           <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                       </div>

                       <div className="flex justify-between text-xs opacity-90 border-t border-white/20 pt-2">
                           <span>Jadwal Pulang:</span>
                           <span className="font-bold">{userShift?.endTime}</span>
                       </div>
                  </div>
              );
          }
      }

      return (
          <div className="h-full flex flex-col justify-center items-center text-gray-400">
              <div className="bg-yellow-50 p-3 rounded-full mb-2">
                <AlertTriangle size={24} className="text-yellow-500" />
              </div>
              <h3 className="font-bold text-gray-600">Belum Absen</h3>
              <p className="text-xs text-center px-4 mt-1">Silakan lakukan check-in di menu Absensi untuk memulai hari.</p>
          </div>
      );
  };

  return (
    <div className="space-y-6 fade-in pb-20">
      {/* Enhanced Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Calendar size={14} />
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">{getGreeting()}, {(user.name || 'User').split(' ')[0]}! 👋</h2>
            <button 
                onClick={handleRefreshData}
                disabled={isRefreshingData}
                className={`p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all ${isRefreshingData ? 'animate-spin' : ''}`}
                title="Refresh Data"
            >
                <RefreshCw size={16} />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">
              {(user.position || '').startsWith('http') ? '' : user.position} • {userShift?.name || 'Belum ada jadwal'}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
           <div className="text-right">
              <div className="text-2xl font-mono font-bold text-blue-600 leading-none">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-gray-400 text-right">WIB</div>
           </div>
           <div className="h-8 w-px bg-gray-200"></div>
           <div className="flex flex-col items-center">
             {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? (
                 <Sun size={20} className="text-orange-400" />
             ) : (
                 <Moon size={20} className="text-indigo-400" />
             )}
             <span className="text-xs font-semibold text-gray-600">Jakarta</span>
           </div>
        </div>
      </header>

      {/* Top Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Streak Widget */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-bl-full -mr-5 -mt-5 transition-transform group-hover:scale-110"></div>
           <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-2">
                 <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Flame size={20} className="animate-pulse text-yellow-200" /></div>
                 <span className="font-bold text-white/90 text-sm">Streak Kehadiran</span>
              </div>
              <div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{streak}</span>
                    <span className="text-sm opacity-90 font-medium">hari beruntun</span>
                 </div>
                 <p className="text-[10px] opacity-75 mt-1">Pertahankan konsistensimu!</p>
              </div>
           </div>
        </div>

        {/* Status Widget */}
        <div className={`rounded-2xl p-5 border border-gray-100 shadow-sm transition-all relative overflow-hidden ${todayRecord && !todayRecord.checkOutTime ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white'}`}>
            {todayRecord && !todayRecord.checkOutTime && (
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            )}
            {renderStatusWidget()}
        </div>

        {/* Schedule Widget */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-500" />
                    <span className="font-bold text-gray-700 text-sm">Jadwal Hari Ini</span>
                </div>
                {userShift && (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">{userShift.name}</span>
                )}
            </div>
            {userShift ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm group">
                        <span className="text-gray-500 flex items-center gap-2 group-hover:text-blue-600 transition-colors"><Clock size={14}/> Masuk</span>
                        <span className="font-mono font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded">{userShift.startTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm group">
                        <span className="text-gray-500 flex items-center gap-2 group-hover:text-orange-600 transition-colors"><Coffee size={14}/> Istirahat</span>
                        <span className="font-mono font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded">{userShift.breakStart}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm group">
                        <span className="text-gray-500 flex items-center gap-2 group-hover:text-green-600 transition-colors"><LogOut size={14}/> Pulang</span>
                        <span className="font-mono font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded">{userShift.endTime}</span>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-xs italic">
                    Tidak ada jadwal aktif.
                </div>
            )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
              onClick={onNavigateToReports}
              className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
          >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <ClipboardList size={24} />
              </div>
              <h4 className="font-black text-gray-900 text-sm">Lapor Tugas</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Update Progres</p>
          </button>
          <button 
              className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
          >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <Calendar size={24} />
              </div>
              <h4 className="font-black text-gray-900 text-sm">Ajukan Izin</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Cuti & Sakit</p>
          </button>
          <button 
              className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
          >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <History size={24} />
              </div>
              <h4 className="font-black text-gray-900 text-sm">Riwayat</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Absensi Anda</p>
          </button>
          <button 
              className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group text-left"
          >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <SettingsIcon size={24} />
              </div>
              <h4 className="font-black text-gray-900 text-sm">Pengaturan</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Profil & Akun</p>
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-500"/> Analisis Kehadiran
                </h3>
                <div className="flex gap-2">
                    <div className="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        Rate: {stats.rate}%
                    </div>
                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Sisa Cuti: {user.leaveQuota} Hari
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-4 pointer-events-none">
                        <span className="text-3xl font-bold text-gray-800">{history.length}</span>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Hari</p>
                    </div>
                </div>

                <div className="flex flex-col justify-center space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative group">
                        <div className="absolute -top-2 -right-2 bg-white p-1 rounded-full border border-blue-100 shadow-sm">
                            <Sparkles size={14} className="text-blue-500" />
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-blue-600 uppercase">AI Insight</h4>
                            <button 
                                onClick={refreshAiInsight}
                                disabled={isRefreshingAi}
                                className={`p-1.5 rounded-lg bg-white/50 text-blue-600 hover:bg-white transition-all ${isRefreshingAi ? 'animate-spin' : 'opacity-0 group-hover:opacity-100'}`}
                                title="Refresh AI Analysis"
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>
                        <p className={`text-sm text-gray-700 leading-relaxed italic ${isRefreshingAi ? 'opacity-50' : ''}`}>
                            "{aiInsight}"
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center hover:bg-green-100 transition-colors">
                             <span className="block text-2xl font-bold text-green-600">{stats.present}</span>
                             <span className="text-xs text-green-700 font-medium">Hadir Tepat Waktu</span>
                         </div>
                         <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-center hover:bg-yellow-100 transition-colors">
                             <span className="block text-2xl font-bold text-yellow-600">{stats.late}</span>
                             <span className="text-xs text-yellow-700 font-medium">Terlambat</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Work Progress Widget */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-10 -mt-10 transition-transform group-hover:scale-110 opacity-50"></div>
            
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Progres Kerja</h3>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Pantauan Tugas Hari Ini</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center relative z-10">
                {assignedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-[32px] flex items-center justify-center mb-4 border border-dashed border-gray-200">
                            <ClipboardList size={40} />
                        </div>
                        <h4 className="text-sm font-black text-gray-900">Tidak Ada Tugas</h4>
                        <p className="text-xs text-gray-400 font-medium mt-1">Nikmati hari santai Anda!</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="relative flex justify-center">
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    className="text-gray-100"
                                />
                                <motion.circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={439.82}
                                    initial={{ strokeDashoffset: 439.82 }}
                                    animate={{ strokeDashoffset: 439.82 - (439.82 * taskStats.percentage) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="text-emerald-500"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-gray-900">{taskStats.percentage}%</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selesai</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                                <p className="text-2xl font-black text-gray-900">{taskStats.total}</p>
                            </div>
                            <div className="bg-emerald-50 p-5 rounded-[24px] border border-emerald-100">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Selesai</p>
                                <p className="text-2xl font-black text-emerald-700">{taskStats.completed}</p>
                            </div>
                        </div>

                        <button 
                            onClick={onNavigateToReports}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Lapor Progres <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Location Widget */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><MapPin size={20} /></div>
                <h3 className="text-lg font-bold text-gray-900">Lokasi Saya</h3>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 relative group cursor-pointer hover:bg-blue-100 transition-colors">
                     {todayRecord && !todayRecord.checkOutTime && (
                         <span className="absolute top-0 right-0 w-5 h-5 bg-green-500 border-4 border-white rounded-full animate-pulse"></span>
                     )}
                     <MapPin size={32} className="group-hover:scale-110 transition-transform" />
                </div>
                
                <h4 className="font-bold text-gray-900 mb-1">
                    {todayRecord?.location ? 'Terlacak' : 'Belum Check-In'}
                </h4>
                
                {todayRecord?.location ? (
                    <div className="mb-6">
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${todayRecord.location.lat},${todayRecord.location.lng}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 bg-blue-50 px-3 py-1 rounded-full"
                        >
                            {todayRecord.location.lat.toFixed(5)}, {todayRecord.location.lng.toFixed(5)}
                            <ArrowRight size={10} />
                        </a>
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 mb-6 px-4">
                        Lokasi akan aktif otomatis setelah Anda melakukan check-in.
                    </p>
                )}

                {todayRecord && !todayRecord.checkOutTime && (
                    <button 
                        onClick={() => captureLocation('MANUAL')}
                        disabled={isUpdatingLoc}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isUpdatingLoc ? <RefreshCw size={16} className="animate-spin" /> : <Crosshair size={16} />}
                        Update Posisi Sekarang
                    </button>
                )}
                
                {lastLocUpdate && (
                    <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                        <Clock size={10}/> Terakhir diperbarui: {lastLocUpdate}
                    </p>
                )}
            </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  Aktivitas Terakhir Anda
              </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {history.slice(0, 4).map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : 
                              rec.status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                              {rec.status}
                          </span>
                      </div>
                      <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Check In:</span>
                              <span className="font-bold text-gray-800">{rec.checkInTime || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Check Out:</span>
                              <span className="font-bold text-gray-800">{rec.checkOutTime || '-'}</span>
                          </div>
                      </div>
                      {rec.officeName && (
                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                              <MapPin size={10} /> {rec.officeName}
                          </div>
                      )}
                  </div>
              ))}
              {history.length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-400 text-sm italic">
                      Belum ada riwayat aktivitas.
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;