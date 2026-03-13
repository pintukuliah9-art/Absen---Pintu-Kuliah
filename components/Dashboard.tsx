import React, { useEffect, useState, useRef, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatus, AppSettings, LocationLog, TaskStatus, TaskCategory } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, MapPin, Sparkles, CheckCircle, XCircle, CloudSun, Flame, Briefcase, RefreshCw, Crosshair, Calendar, Coffee, LogOut, AlertTriangle, ArrowRight, Sun, Moon, Cloud, Activity, CheckSquare, ClipboardList, History, Settings as SettingsIcon, ChevronRight, Target } from 'lucide-react';
import { analyzePerformance } from '../services/geminiService';
import { useStore } from '../services/store';
import { motion } from 'motion/react';

interface DashboardProps {
  user: User;
  history: AttendanceRecord[];
  settings: AppSettings;
  onUpdateLocationLog?: (recordId: string, log: LocationLog) => void;
  onNavigateToReports?: () => void;
  onNavigateToHistory?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, history, settings, onUpdateLocationLog, onNavigateToReports, onNavigateToHistory }) => {
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
              <div className="h-full flex flex-col justify-center items-center text-slate-500">
                  <div className="p-4 bg-slate-50 rounded-3xl mb-4">
                    <Calendar size={40} className="text-slate-300" />
                  </div>
                  <h3 className="font-black text-xl text-slate-900 uppercase tracking-widest">Hari Libur</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Waktunya Recharge!</p>
              </div>
          );
      }

      if (todayRecord) {
          if (todayRecord.checkOutTime) {
              return (
                  <div className="h-full flex flex-col justify-center items-center text-emerald-600">
                      <div className="p-4 bg-emerald-50 rounded-3xl mb-4">
                        <CheckCircle size={40} className="text-emerald-500" />
                      </div>
                      <h3 className="font-black text-xl text-slate-900 uppercase tracking-widest">Kerja Selesai</h3>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1">Sampai Jumpa Besok!</p>
                  </div>
              );
          } else {
              const progress = getWorkProgress();
              return (
                  <div className="text-white h-full flex flex-col justify-between relative z-10">
                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                               <span className="font-black text-[10px] uppercase tracking-widest">Aktif Bekerja</span>
                           </div>
                           <div className="text-[10px] font-black font-mono opacity-60 tracking-widest">{Math.round(progress)}%</div>
                       </div>
                       
                       <div className="text-center my-4">
                           <div className="text-4xl md:text-5xl font-black tracking-tighter drop-shadow-lg">{getWorkCountdown()}</div>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-2">Menuju Jam Pulang</p>
                       </div>

                       <div className="space-y-3">
                           <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/5">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${progress}%` }}
                                 transition={{ duration: 1, ease: "easeOut" }}
                                 className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full"
                               ></motion.div>
                           </div>

                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                               <span>Shift Berakhir:</span>
                               <span className="text-white">{userShift?.endTime}</span>
                           </div>
                       </div>
                  </div>
              );
          }
      }

      return (
          <div className="h-full flex flex-col justify-center items-center text-slate-400">
              <div className="bg-amber-50 p-5 rounded-[2rem] mb-4 border border-amber-100 shadow-inner">
                <AlertTriangle size={32} className="text-amber-500" />
              </div>
              <h3 className="font-black text-xl text-slate-900 uppercase tracking-widest">Belum Absen</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 text-center px-4">Mulai hari Anda sekarang!</p>
          </div>
      );
  };

  return (
    <div className="space-y-4 md:space-y-10 fade-in pb-24 md:pb-12 px-1 md:px-0">
      {/* Enhanced Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-6">
        <div className="w-full md:w-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-400 text-[8px] md:text-xs mb-0.5 md:mb-2 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]"
          >
            <Calendar size={10} className="text-blue-600 md:w-3 md:h-3" />
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </motion.div>
          <div className="flex items-center justify-between md:justify-start gap-3">
            <h2 className="text-lg md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
              {getGreeting()}, <span className="text-blue-600">{(user.name || 'User').split(' ')[0]}</span>!
            </h2>
            <button 
                onClick={handleRefreshData}
                disabled={isRefreshingData}
                className={`p-1.5 md:p-3 rounded-lg md:rounded-2xl bg-white border border-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-90 ${isRefreshingData ? 'animate-spin' : ''}`}
                title="Refresh Data"
            >
                <RefreshCw size={14} className="md:w-4 md:h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-2">
            <p className="text-slate-400 text-[8px] md:text-xs font-black uppercase tracking-widest">
                {(user.position || '').startsWith('http') ? '' : user.position}
            </p>
            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
            <p className="text-blue-600 text-[8px] md:text-xs font-black uppercase tracking-widest">
                {userShift?.name || 'Reguler'}
            </p>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 md:gap-5 bg-white p-2.5 md:p-5 rounded-2xl md:rounded-[32px] shadow-lg md:shadow-xl shadow-slate-200/50 border border-slate-100 w-full md:w-auto group hover:shadow-xl transition-all"
        >
           <div className="flex-1 md:flex-none text-right">
              <div className="text-xl md:text-4xl font-mono font-black text-slate-900 leading-none tracking-tighter">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[8px] font-black text-slate-400 text-right uppercase tracking-[0.1em] md:tracking-[0.2em] mt-0.5 md:mt-1 flex items-center justify-end gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                WIB • Jakarta
              </div>
           </div>
           <div className="h-8 md:h-12 w-px bg-slate-100"></div>
           <div className="flex flex-col items-center justify-center bg-slate-50 w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
             {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? (
                 <Sun size={18} className="text-amber-500 group-hover:text-white transition-colors md:w-5 md:h-5" />
             ) : (
                 <Moon size={18} className="text-indigo-500 group-hover:text-white transition-colors md:w-5 md:h-5" />
             )}
           </div>
        </motion.div>
      </header>

      {/* Top Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Streak Widget */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl md:rounded-[40px] p-5 md:p-8 text-white relative overflow-hidden shadow-xl md:shadow-2xl shadow-orange-200/50 group h-[110px] md:h-auto flex flex-col justify-between"
        >
           <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-bl-full -mr-6 -mt-6 md:-mr-8 md:-mt-8 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12"></div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-2 md:gap-3">
                 <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-xl border border-white/30">
                    <Flame size={14} className="animate-pulse text-yellow-300 md:w-4.5 md:h-4.5" />
                 </div>
                 <div>
                    <span className="font-black text-white text-[8px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] block">Hadir Beruntun</span>
                 </div>
              </div>
           </div>
 
           <div className="relative z-10 flex items-baseline gap-1.5 md:gap-2">
              <span className="text-4xl md:text-7xl font-black tracking-tighter drop-shadow-lg">{streak}</span>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-white/90">Hari</span>
              </div>
           </div>
        </motion.div>
 
        {/* Status Widget */}
        <motion.div 
          whileHover={{ y: -5 }}
          className={`rounded-3xl md:rounded-[40px] p-5 md:p-8 border shadow-lg md:shadow-xl transition-all relative overflow-hidden h-[110px] md:h-auto flex flex-col justify-center ${
            todayRecord && !todayRecord.checkOutTime 
              ? 'bg-slate-900 text-white border-slate-800 shadow-slate-200' 
              : 'bg-white border-slate-100 shadow-slate-100'
          }`}
        >
            {todayRecord && !todayRecord.checkOutTime && (
                <>
                    <div className="absolute -bottom-8 -right-8 md:-bottom-12 md:-right-12 w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full"></div>
                </>
            )}
            {renderStatusWidget()}
        </motion.div>
 
        {/* Schedule Widget */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white rounded-3xl md:rounded-[40px] p-5 md:p-8 border border-slate-100 shadow-lg md:shadow-xl shadow-slate-100 flex flex-col sm:col-span-2 lg:col-span-1 h-[110px] md:h-auto group"
        >
            <div className="flex items-center justify-between mb-3 md:mb-6 pb-1.5 md:pb-4 border-b border-slate-50">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <Briefcase size={14} className="md:w-4 md:h-4" />
                    </div>
                    <div>
                        <span className="font-black text-slate-900 text-[8px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] block">Jadwal Kerja</span>
                    </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
 
            {userShift ? (
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5 md:gap-3">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <span className="text-slate-400 font-black text-[7px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em]">Masuk</span>
                        <span className="font-mono font-black text-slate-900 text-[9px] md:text-sm">{userShift.startTime}</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <span className="text-slate-400 font-black text-[7px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em]">Rehat</span>
                        <span className="font-mono font-black text-slate-900 text-[9px] md:text-sm">{userShift.breakStart}</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <span className="text-slate-400 font-black text-[7px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em]">Pulang</span>
                        <span className="font-mono font-black text-slate-900 text-[9px] md:text-sm">{userShift.endTime}</span>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-1.5">
                    <AlertTriangle size={20} className="opacity-20 md:w-6 md:h-6" />
                    <p className="text-[7px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">Jadwal Kosong</p>
                </div>
            )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
          {[
            { icon: ClipboardList, label: 'Tugas', sub: 'Update', color: 'blue', action: onNavigateToReports },
            { icon: Calendar, label: 'Izin', sub: 'Cuti', color: 'emerald' },
            { icon: History, label: 'Riwayat', sub: 'Absen', color: 'purple' },
            { icon: SettingsIcon, label: 'Profil', sub: 'Akun', color: 'orange' }
          ].map((item, i) => (
            <motion.button 
                key={i}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.action}
                className="p-2.5 md:p-8 bg-white rounded-2xl md:rounded-[40px] border border-slate-100 shadow-lg md:shadow-xl shadow-slate-100/50 hover:shadow-xl transition-all group text-left relative overflow-hidden"
            >
                <div className={`w-8 h-8 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center mb-1.5 md:mb-6 group-hover:bg-${item.color}-600 group-hover:text-white transition-all duration-500 shadow-md md:shadow-lg shadow-${item.color}-100`}>
                    <item.icon size={16} className="md:w-7 md:h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-[9px] md:text-base leading-tight uppercase tracking-widest">{item.label}</h4>
                <p className="text-[6px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] mt-0.5 md:mt-2">{item.sub}</p>
            </motion.button>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Stats Chart */}
        <div className="lg:col-span-2 bg-white p-5 md:p-10 rounded-3xl md:rounded-[50px] shadow-2xl shadow-slate-100 border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-6 mb-5 md:mb-10">
                <div>
                    <h3 className="text-base md:text-2xl font-black text-slate-900 flex items-center gap-2 md:gap-4">
                        <div className="p-1.5 md:p-2 bg-amber-50 rounded-lg md:rounded-xl"><Sparkles size={16} className="text-amber-500 md:w-6 md:h-6"/></div>
                        Analisis Performa
                    </h3>
                    <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-8 md:ml-12">Statistik 30 hari terakhir</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none text-[7px] md:text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 md:px-5 py-1.5 md:py-2.5 rounded-lg md:rounded-2xl border border-emerald-100 text-center uppercase tracking-[0.2em] shadow-sm">
                        Rate: {stats.rate}%
                    </div>
                    <div className="flex-1 sm:flex-none text-[7px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-3 md:px-5 py-1.5 md:py-2.5 rounded-lg md:rounded-2xl border border-blue-100 text-center uppercase tracking-[0.2em] shadow-sm">
                        Cuti: {user.leaveQuota}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
                <div className="h-40 md:h-80 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={6}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    padding: '6px 10px',
                                    fontWeight: '900',
                                    fontSize: '7px',
                                    textTransform: 'uppercase'
                                }} 
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={20} 
                                iconType="circle" 
                                wrapperStyle={{
                                    fontSize: '6px', 
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    paddingTop: '8px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-2 pointer-events-none">
                        <span className="text-xl md:text-5xl font-black text-slate-900 tracking-tighter">{history.length}</span>
                        <p className="text-[6px] text-slate-400 uppercase font-black tracking-[0.2em]">Total</p>
                    </div>
                </div>
 
                <div className="flex flex-col justify-center space-y-3 md:space-y-8">
                    <div className="bg-slate-900 text-white p-4 md:p-8 rounded-2xl md:rounded-[40px] relative group overflow-hidden shadow-2xl shadow-slate-200">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full -mr-6 -mt-6 transition-transform duration-700 group-hover:scale-150"></div>
                        <div className="flex justify-between items-center mb-2 md:mb-4 relative z-10">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="p-1 bg-white/10 rounded-lg backdrop-blur-md"><Sparkles size={10} className="text-amber-400" /></div>
                                <h4 className="text-[6px] md:text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">AI Insight</h4>
                            </div>
                            <button 
                                onClick={refreshAiInsight}
                                disabled={isRefreshingAi}
                                className={`p-1 rounded-lg bg-white/10 text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-md ${isRefreshingAi ? 'animate-spin' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                <RefreshCw size={8} />
                            </button>
                        </div>
                        <p className={`text-[9px] md:text-base text-white font-bold leading-relaxed italic relative z-10 ${isRefreshingAi ? 'opacity-50' : ''}`}>
                            "{aiInsight}"
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-5">
                         <div className="bg-emerald-50 p-2.5 md:p-6 rounded-xl md:rounded-3xl border border-emerald-100 text-center hover:bg-emerald-600 hover:text-white transition-all group cursor-default shadow-sm">
                             <span className="block text-lg md:text-4xl font-black text-emerald-600 group-hover:text-white transition-all">{stats.present}</span>
                             <span className="text-[6px] md:text-[10px] text-emerald-700 group-hover:text-white/80 font-black uppercase tracking-widest mt-0.5 md:mt-2 block">Hadir</span>
                         </div>
                         <div className="bg-amber-50 p-2.5 md:p-6 rounded-xl md:rounded-3xl border border-amber-100 text-center hover:bg-amber-600 hover:text-white transition-all group cursor-default shadow-sm">
                             <span className="block text-lg md:text-4xl font-black text-amber-600 group-hover:text-white transition-all">{stats.late}</span>
                             <span className="text-[6px] md:text-[10px] text-amber-700 group-hover:text-white/80 font-black uppercase tracking-widest mt-0.5 md:mt-2 block">Telat</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Work Progress Widget */}
        <div className="bg-white p-5 md:p-10 rounded-3xl md:rounded-[50px] border border-slate-100 shadow-2xl shadow-slate-100 flex flex-col relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 md:mb-8 relative z-10">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <Target size={16} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-tight">Progres Kerja</h3>
                        <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Target hari ini</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 bg-slate-50 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-2xl border border-slate-100">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[8px] md:text-xs font-black text-slate-600 uppercase tracking-widest">Aktif</span>
                </div>
            </div>
 
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2 md:py-0">
                {assignedTasks.length === 0 ? (
                    <div className="text-center py-4 md:py-10">
                        <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 border border-dashed border-slate-200">
                            <ClipboardList size={20} className="text-slate-300 md:w-10 md:h-10" />
                        </div>
                        <p className="text-slate-400 font-black text-[8px] md:text-xs uppercase tracking-widest">Belum ada tugas</p>
                    </div>
                ) : (
                    <>
                        <div className="relative w-32 h-32 md:w-56 md:h-56 mb-4 md:mb-8">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="45%"
                                    className="stroke-slate-100 fill-none"
                                    strokeWidth="12"
                                />
                                <motion.circle
                                    cx="50%"
                                    cy="50%"
                                    r="45%"
                                    className="stroke-blue-600 fill-none"
                                    strokeWidth="12"
                                    strokeDasharray="100 100"
                                    initial={{ strokeDashoffset: 100 }}
                                    animate={{ strokeDashoffset: 100 - taskStats.percentage }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                <span className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter">
                                    {taskStats.percentage}%
                                </span>
                                <p className="text-[7px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Selesai</p>
                            </div>
                        </div>
 
                        <div className="grid grid-cols-2 gap-2 md:gap-4 w-full">
                            <div className="bg-slate-50 p-2 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 text-center">
                                <span className="block text-sm md:text-2xl font-black text-slate-900">{taskStats.total}</span>
                                <span className="text-[6px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Total</span>
                            </div>
                            <div className="bg-blue-50 p-2 md:p-4 rounded-xl md:rounded-2xl border border-blue-100 text-center">
                                <span className="block text-sm md:text-2xl font-black text-blue-600">{taskStats.completed}</span>
                                <span className="text-[6px] md:text-[10px] text-blue-400 font-black uppercase tracking-widest">Done</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Location Widget */}
        <div className="bg-white p-5 md:p-10 rounded-3xl md:rounded-[50px] border border-slate-100 shadow-2xl shadow-slate-100 flex flex-col relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 md:mb-8 relative z-10">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <MapPin size={16} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-tight">Lokasi Presensi</h3>
                        <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Real-time</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <motion.div 
                    animate={todayRecord && !todayRecord.checkOutTime ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-14 h-14 md:w-32 md:h-32 bg-slate-900 text-white rounded-2xl md:rounded-[3rem] flex items-center justify-center mb-3 md:mb-8 relative group cursor-pointer hover:bg-blue-600 transition-all duration-500 shadow-2xl shadow-slate-300"
                >
                     {todayRecord && !todayRecord.checkOutTime && (
                         <span className="absolute -top-0.5 -right-0.5 w-3 h-3 md:w-8 md:h-8 bg-emerald-500 border-2 md:border-4 border-white rounded-full animate-pulse shadow-xl"></span>
                     )}
                     <MapPin size={20} className="md:w-12 md:h-12 group-hover:scale-110 transition-transform" />
                </motion.div>
                
                <h4 className="font-black text-slate-900 mb-1 md:mb-3 text-[10px] md:text-xl uppercase tracking-widest">
                    {todayRecord?.location ? 'Terlacak Aktif' : 'Belum Check-In'}
                </h4>
                
                {todayRecord?.location ? (
                    <div className="mb-3 md:mb-8 w-full">
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${todayRecord.location.lat},${todayRecord.location.lng}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[7px] md:text-xs text-blue-600 font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white flex items-center justify-center gap-2 md:gap-3 bg-blue-50 px-3 md:px-6 py-2 md:py-4 rounded-xl md:rounded-[2rem] transition-all border border-blue-100 shadow-sm"
                        >
                            {todayRecord.location.lat.toFixed(4)}, {todayRecord.location.lng.toFixed(4)}
                            <ArrowRight size={10} className="md:w-4 md:h-4" />
                        </a>
                    </div>
                ) : (
                    <p className="text-[6px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-3 md:mb-10 px-4 md:px-8 leading-relaxed">
                        Lokasi aktif otomatis setelah Anda check-in.
                    </p>
                )}
 
                {todayRecord && !todayRecord.checkOutTime && (
                    <button 
                        onClick={() => captureLocation('MANUAL')}
                        disabled={isUpdatingLoc}
                        className="w-full bg-slate-900 text-white py-2.5 md:py-5 rounded-xl md:rounded-[2rem] text-[7px] md:text-xs font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-2 md:gap-4 shadow-2xl shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isUpdatingLoc ? <RefreshCw size={12} className="animate-spin" /> : <Crosshair size={12} />}
                        Update Posisi
                    </button>
                )}
                
                {lastLocUpdate && (
                    <p className="text-[6px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 md:mt-6 flex items-center gap-2 md:gap-3 bg-slate-50 px-2 md:px-5 py-1 md:py-2 rounded-full border border-slate-100">
                        <Clock size={8} className="text-blue-600 md:w-3.5 md:h-3.5" /> Terakhir: {lastLocUpdate}
                    </p>
                )}
            </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white p-5 md:p-10 rounded-3xl md:rounded-[50px] border border-slate-100 shadow-2xl shadow-slate-100">
          <div className="flex items-center justify-between mb-5 md:mb-10">
              <div className="flex items-center gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl">
                      <Activity size={16} className="md:w-6 md:h-6" />
                  </div>
                  <div>
                      <h3 className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-tight">Aktivitas Terakhir</h3>
                      <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Riwayat kehadiran Anda</p>
                  </div>
              </div>
              <button 
                onClick={onNavigateToHistory}
                className="px-3 md:px-6 py-1.5 md:py-3 bg-slate-50 text-[7px] md:text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] rounded-lg md:rounded-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                Semua
              </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {history.slice(0, 4).map((rec, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all group relative overflow-hidden"
                  >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/5 rounded-bl-full -mr-8 -mt-8"></div>
                      <div className="flex justify-between items-start mb-3 md:mb-6 relative z-10">
                          <div className="flex flex-col">
                            <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5">
                                {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                            </span>
                            <span className="text-xs md:text-base font-black text-slate-900">
                                {new Date(rec.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <span className={`text-[7px] md:text-[9px] font-black px-2 md:px-4 py-0.5 md:py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                              rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 
                              rec.status === AttendanceStatus.LATE ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                              {rec.status}
                          </span>
                      </div>
                      <div className="space-y-1.5 md:space-y-3 mb-3 md:mb-6 relative z-10">
                          <div className="flex items-center justify-between text-[9px] md:text-[11px] font-black">
                              <span className="text-slate-400 uppercase tracking-[0.2em]">Masuk</span>
                              <span className="text-slate-900 bg-white px-1.5 md:px-3 py-0.5 rounded-md border border-slate-100 shadow-sm">{rec.checkInTime || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] md:text-[11px] font-black">
                              <span className="text-slate-400 uppercase tracking-[0.2em]">Pulang</span>
                              <span className="text-slate-900 bg-white px-1.5 md:px-3 py-0.5 rounded-md border border-slate-100 shadow-sm">{rec.checkOutTime || '-'}</span>
                          </div>
                      </div>
                      {rec.officeName && (
                          <div className="pt-2 md:pt-4 border-t border-slate-100 flex items-center gap-1.5 md:gap-3 text-[7px] md:text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] truncate relative z-10">
                              <MapPin size={10} className="md:w-3.5 md:h-3.5 flex-shrink-0" /> {rec.officeName}
                          </div>
                      )}
                  </motion.div>
              ))}
              {history.length === 0 && (
                  <div className="col-span-full py-8 md:py-20 text-center bg-slate-50 rounded-2xl md:rounded-[3rem] border border-dashed border-slate-200">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 md:mb-6 shadow-xl shadow-slate-200">
                        <Activity size={20} className="md:w-8 md:h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">Belum ada riwayat.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;