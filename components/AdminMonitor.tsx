
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, User } from '../types';
import { ChevronLeft, ChevronRight, Search, Calendar, Clock, MapPin, X, User as UserIcon, AlertCircle, CheckCircle, Navigation, Eye } from 'lucide-react';
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
    <div className="space-y-6 fade-in pb-10 pt-14 md:pt-0">
        {/* Header Controls */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-14 md:top-0 z-20">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-600"/></button>
                <div className="text-center min-w-[120px] md:min-w-[150px]">
                    <h2 className="text-base md:text-lg font-black text-gray-800 tracking-tighter">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Monitor Performa</p>
                </div>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} className="text-gray-600"/></button>
            </div>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" placeholder="Cari karyawan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
            </div>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((user, index) => {
                const stat = employeeStats[user.id] || { present: 0, late: 0, absent: 0, total: 0 };
                const totalWorkDays = 20;
                const rate = Math.min(100, Math.round(((stat.present + (stat.late * 0.5)) / totalWorkDays) * 100));
                
                return (
                    <div key={`${user.id}-${index}`} onClick={() => setSelectedEmployee(user)} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden">
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <img 
                                    src={user.avatar} 
                                    className="w-12 h-12 rounded-full border-2 border-gray-50 group-hover:scale-105 transition-transform object-cover" 
                                    alt=""
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                    }}
                                />
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{user.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-500">
                                            {(user.position || '').startsWith('http') ? '' : user.position}
                                        </p>
                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                                            {user.leaveQuota || 0} Cuti
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center bg-green-50 rounded-lg py-2"><span className="block text-lg font-bold text-green-700 leading-none">{stat.present}</span><span className="text-[10px] text-green-600 uppercase font-medium">Hadir</span></div>
                                <div className="text-center bg-yellow-50 rounded-lg py-2"><span className="block text-lg font-bold text-yellow-700 leading-none">{stat.late}</span><span className="text-[10px] text-yellow-600 uppercase font-medium">Telat</span></div>
                                <div className="text-center bg-red-50 rounded-lg py-2"><span className="block text-lg font-bold text-red-700 leading-none">{stat.absent}</span><span className="text-[10px] text-red-600 uppercase font-medium">Alpha</span></div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${rate}%` }}></div></div>
                        </div>
                        <div className="bg-gray-50 px-5 py-2 text-center text-xs font-medium text-gray-500 border-t border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">Lihat Detail Kalender</div>
                    </div>
                );
            })}
        </div>

        {/* Detail Modal */}
        {selectedEmployee && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 shadow-2xl">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                        <div className="flex items-center gap-4">
                            <img 
                                src={selectedEmployee.avatar} 
                                className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" 
                                alt=""
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name)}&background=random`;
                                }}
                            />
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{selectedEmployee.name}</h3>
                                <p className="text-sm text-gray-500">
                                    {(selectedEmployee.position || '').startsWith('http') ? '' : selectedEmployee.position}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex items-center justify-center gap-4 mb-6">
                             <h4 className="text-lg font-bold text-gray-800 bg-white px-4 py-1 rounded-full shadow-sm border border-gray-100">
                                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                             </h4>
                        </div>

                        {/* Calendar View */}
                        <div className="mb-2">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Kalender Absensi</h4>
                            {renderCalendar()}
                        </div>
                        
                        {/* List Detail View with Timeline */}
                        <div className="mt-8">
                             <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Navigation size={18} className="text-blue-500"/> Jejak Perjalanan (Location Logs)</h4>
                             <div className="space-y-4">
                                 {monthRecords
                                    .filter(r => r.userId === selectedEmployee.id)
                                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(rec => (
                                        <div key={rec.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                            <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-800">{new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                    {rec.photoUrl && (
                                                        <div className="relative group/img w-8 h-8">
                                                            <img 
                                                                src={rec.photoUrl} 
                                                                alt="Selfie" 
                                                                className="w-8 h-8 rounded-lg object-cover border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all" 
                                                                onClick={() => setSelectedImage(rec.photoUrl!)}
                                                                referrerPolicy="no-referrer"
                                                            />
                                                            <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover/img:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                                                                <Eye size={10} className="text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${rec.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{rec.status}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Check In/Out</p>
                                                    <div className="flex flex-col gap-1 text-sm font-mono text-gray-700">
                                                        <span>IN: {rec.checkInTime || '-'}</span>
                                                        <span>OUT: {rec.checkOutTime || '-'}</span>
                                                        {rec.officeName && (
                                                            <span className="text-[10px] text-blue-600 font-sans flex items-center gap-1 mt-1">
                                                                <MapPin size={10} /> {rec.officeName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Timeline Lokasi</p>
                                                    {renderLocationTimeline(rec)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                 }
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <ImageModal 
            isOpen={!!selectedImage} 
            imageUrl={selectedImage} 
            onClose={() => setSelectedImage(null)} 
        />
    </div>
  );
};

export default AdminMonitor;
