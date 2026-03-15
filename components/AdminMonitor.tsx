
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, User } from '../types';
import { ChevronLeft, ChevronRight, Search, Calendar, Clock, MapPin, X, User as UserIcon, AlertCircle, CheckCircle, Navigation, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageModal from './ImageModal';

interface AdminMonitorProps {
  history: AttendanceRecord[];
  users: User[]; 
}

const AdminMonitor: React.FC<AdminMonitorProps> = ({ history, users }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- Helpers ---
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // --- Data Processing ---

  const filteredEmployees = users.filter(u => 
    u.role !== 'admin' && 
    u.isActive &&
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const monthRecords = useMemo(() => {
    return history.filter(h => {
        const d = new Date(h.date);
        return d.getMonth() === currentDate.getMonth() && 
               d.getFullYear() === currentDate.getFullYear();
    });
  }, [history, currentDate]);

  const employeeStats = useMemo(() => {
    const stats: Record<string, { present: number, late: number, absent: number, total: number }> = {};
    
    filteredEmployees.forEach(user => {
        const userRecs = monthRecords.filter(r => r.userId === user.id);
        stats[user.id] = {
            present: userRecs.filter(r => r.status === AttendanceStatus.PRESENT).length,
            late: userRecs.filter(r => r.status === AttendanceStatus.LATE).length,
            absent: userRecs.filter(r => r.status === AttendanceStatus.ABSENT).length,
            total: userRecs.length
        };
    });
    return stats;
  }, [filteredEmployees, monthRecords]);

  // --- Render Helpers ---

  const renderCalendar = () => {
      if (!selectedEmployee) return null;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysCount = getDaysInMonth(year, month);
      const days = Array.from({ length: daysCount }, (_, i) => i + 1);
      
      const userMonthRecs = monthRecords.filter(r => r.userId === selectedEmployee.id);

      return (
          <div className="overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar-hide">
              <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-6 min-w-[600px] md:min-w-0">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                      <div key={d} className="text-center text-[10px] font-black text-gray-400 py-1 uppercase tracking-widest">{d}</div>
                  ))}
                  {days.map(day => {
                      const dateObj = new Date(year, month, day);
                      const dayOfWeek = dateObj.getDay(); 
                      const style = day === 1 ? { gridColumnStart: dayOfWeek + 1 } : {};
                      
                      const record = userMonthRecs.find(r => new Date(r.date).getDate() === day);
                      
                      let bgClass = "bg-gray-50 border-gray-100 text-gray-400"; 
                      if (dayOfWeek === 0) bgClass = "bg-red-50/50 border-red-50 text-red-300"; 
    
                      if (record) {
                          if (record.status === AttendanceStatus.PRESENT) bgClass = "bg-green-100 border-green-200 text-green-700 font-bold";
                          else if (record.status === AttendanceStatus.LATE) bgClass = "bg-yellow-100 border-yellow-200 text-yellow-700 font-bold";
                          else if (record.status === AttendanceStatus.ABSENT) bgClass = "bg-red-100 border-red-200 text-red-700 font-bold";
                          else bgClass = "bg-blue-100 border-blue-200 text-blue-700 font-bold"; 
                      }
    
                      return (
                          <div 
                            key={day} 
                            style={style} 
                            className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-start pt-2 relative transition-all hover:brightness-95 ${bgClass}`}
                          >
                              <span className="text-xs md:text-sm font-black">{day}</span>
                              {record && (
                                 <div className="mt-1 flex flex-col items-center gap-0.5 w-full px-1">
                                    <span className="text-[8px] md:text-[10px] uppercase font-black tracking-tighter truncate w-full text-center">{record.status}</span>
                                    <span className="text-[8px] md:text-[9px] font-mono opacity-80">{record.checkInTime || '-'}</span>
                                 </div>
                              )}
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  };

  const renderLocationTimeline = (record: AttendanceRecord) => {
      const logs = record.locationLogs || [];
      if (logs.length === 0) return <p className="text-xs text-gray-400 italic p-4">Tidak ada log perjalanan.</p>;

      return (
          <div className="relative pl-4 border-l-2 border-gray-200 ml-4 space-y-6 my-4">
              {logs.map((log, idx) => (
                  <div key={idx} className="relative">
                      <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white ${log.type === 'AUTO' ? 'bg-gray-400' : 'bg-blue-500 scale-125'}`}></div>
                      <div className="text-xs">
                          <span className="font-mono font-bold text-gray-700">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${log.type === 'AUTO' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                              {log.type}
                          </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin size={10} /> {log.lat.toFixed(5)}, {log.lng.toFixed(5)}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="space-y-8 fade-in pb-20 pt-16 md:pt-0">
        {/* Header Controls */}
        <header className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-14 md:top-0 z-20">
            <div className="flex items-center justify-between w-full md:w-auto gap-6">
                <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl transition-all active:scale-90 text-gray-600 border border-gray-100 shadow-sm">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center min-w-[140px] md:min-w-[180px]">
                    <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tighter leading-none mb-1">
                        {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Monitor Performa Tim</p>
                </div>
                <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl transition-all active:scale-90 text-gray-600 border border-gray-100 shadow-sm">
                    <ChevronRight size={20} />
                </button>
            </div>
            <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cari nama karyawan..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all placeholder:text-gray-400"
                />
            </div>
        </header>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredEmployees.map((user, index) => {
                const stat = employeeStats[user.id] || { present: 0, late: 0, absent: 0, total: 0 };
                const totalWorkDays = 20;
                const rate = Math.min(100, Math.round(((stat.present + (stat.late * 0.5)) / totalWorkDays) * 100));
                
                return (
                    <div 
                        key={`${user.id}-${index}`} 
                        onClick={() => setSelectedEmployee(user)} 
                        className="bg-white rounded-[40px] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
                    >
                        <div className="p-6 flex-1">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <img 
                                        src={user.avatar} 
                                        className="w-14 h-14 rounded-3xl border-2 border-white shadow-md group-hover:scale-110 transition-transform object-cover" 
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                        }}
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                        <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-gray-900 text-base leading-tight truncate">{user.name}</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate mt-1">
                                        {user.position || 'Karyawan'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <div className="text-center bg-emerald-50 rounded-2xl py-3 border border-emerald-100/50">
                                    <span className="block text-xl font-black text-emerald-700 leading-none mb-1">{stat.present}</span>
                                    <span className="text-[8px] text-emerald-600 uppercase font-black tracking-widest">Hadir</span>
                                </div>
                                <div className="text-center bg-amber-50 rounded-2xl py-3 border border-amber-100/50">
                                    <span className="block text-xl font-black text-amber-700 leading-none mb-1">{stat.late}</span>
                                    <span className="text-[8px] text-amber-600 uppercase font-black tracking-widest">Telat</span>
                                </div>
                                <div className="text-center bg-red-50 rounded-2xl py-3 border border-red-100/50">
                                    <span className="block text-xl font-black text-red-700 leading-none mb-1">{stat.absent}</span>
                                    <span className="text-[8px] text-red-600 uppercase font-black tracking-widest">Alpha</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Persentase Kehadiran</span>
                                    <span className="text-xs font-black text-blue-600">{rate}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-50">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${rate > 80 ? 'bg-emerald-500' : rate > 60 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                        style={{ width: `${rate}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            Lihat Detail Kalender
                        </div>
                    </div>
                );
            })}
        </div>


        {/* Detail Modal */}
        <AnimatePresence>
            {selectedEmployee && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden"
                >
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedEmployee(null)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full h-full sm:h-auto sm:max-w-5xl sm:rounded-[40px] flex flex-col max-h-full sm:max-h-[90vh] relative z-10 shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img 
                                        src={selectedEmployee.avatar} 
                                        className="w-14 h-14 rounded-3xl border-2 border-white shadow-md object-cover" 
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name)}&background=random`;
                                        }}
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                        <div className={`w-3 h-3 rounded-full ${selectedEmployee.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tighter leading-none mb-1"><span>{selectedEmployee.name}</span></h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <span>{selectedEmployee.position || 'Karyawan'}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm border border-gray-100">
                                <X size={24} />
                            </button>
                        </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
                        <div className="flex items-center justify-center gap-4">
                             <div className="bg-blue-600 px-6 py-2.5 rounded-2xl shadow-xl shadow-blue-200 border border-blue-500">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">
                                    {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </h4>
                             </div>
                        </div>

                        {/* Calendar View */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Calendar size={20} />
                                </div>
                                <h4 className="font-black text-gray-900 text-lg tracking-tight uppercase tracking-widest text-xs">Kalender Absensi</h4>
                            </div>
                            <div className="bg-white rounded-[32px] border border-gray-100 p-4 md:p-6 shadow-sm">
                                {renderCalendar()}
                            </div>
                        </section>
                        
                        {/* List Detail View with Timeline */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Navigation size={20} />
                                </div>
                                <h4 className="font-black text-gray-900 text-lg tracking-tight uppercase tracking-widest text-xs">Jejak Perjalanan & Detail Harian</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                 {monthRecords
                                    .filter(r => r.userId === selectedEmployee.id)
                                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(rec => (
                                        <div key={rec.id} className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-50 pb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">
                                                            {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-lg font-black text-gray-900 leading-none">
                                                            {new Date(rec.date).getDate()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-gray-900 text-base block leading-none mb-1">
                                                            {new Date(rec.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                        <span className={`inline-flex px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-lg ${rec.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                            {rec.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                {rec.photoUrl && (
                                                    <div className="relative group/img w-16 h-16 shrink-0">
                                                        <img 
                                                            src={rec.photoUrl} 
                                                            alt="Selfie" 
                                                            className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-all" 
                                                            onClick={() => setSelectedImage(rec.photoUrl!)}
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/broken/100/100';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover/img:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                                                            <Eye size={16} className="text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock size={12} /> Waktu Kerja
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Check In</span>
                                                            <span className="text-sm font-black text-gray-900 font-mono">{rec.checkInTime || '--:--'}</span>
                                                        </div>
                                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Check Out</span>
                                                            <span className="text-sm font-black text-gray-900 font-mono">{rec.checkOutTime || '--:--'}</span>
                                                        </div>
                                                    </div>
                                                    {rec.officeName && (
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 uppercase tracking-widest">
                                                            <MapPin size={12} /> {rec.officeName}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Navigation size={12} /> Timeline Lokasi
                                                    </h5>
                                                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-2">
                                                        {renderLocationTimeline(rec)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                 }
                            </div>
                        </section>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>


        <ImageModal 
            isOpen={!!selectedImage} 
            imageUrl={selectedImage} 
            onClose={() => setSelectedImage(null)} 
        />
    </div>
  );
};

export default AdminMonitor;
