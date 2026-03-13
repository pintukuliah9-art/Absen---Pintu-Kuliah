import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, AppSettings } from '../types';
import { Calendar, MapPin, Timer, ArrowRight, Ruler, Filter, X, Search, Download, TrendingUp, AlertCircle, Clock, CheckCircle2, Loader2, Eye, Sparkles, ChevronRight, FileText, Map as MapIcon } from 'lucide-react';
import { OFFICE_LOCATION } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';
import ImageModal from './ImageModal';

interface HistoryProps {
  history: AttendanceRecord[];
  settings: AppSettings;
}

const History: React.FC<HistoryProps> = ({ history, settings }) => {
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filter Logic
  const filteredHistory = useMemo(() => {
      return history.filter(record => {
          const recordDate = (record.date || '').split('T')[0];
          
          const matchStart = startDate ? recordDate >= startDate : true;
          const matchEnd = endDate ? recordDate <= endDate : true;
          const matchStatus = statusFilter !== 'ALL' ? record.status === statusFilter : true;

          return matchStart && matchEnd && matchStatus;
      }).sort((a, b) => b.date.localeCompare(a.date));
  }, [history, startDate, endDate, statusFilter]);

  const resetFilters = () => {
      setStartDate('');
      setEndDate('');
      setStatusFilter('ALL');
      showToast("Filter telah direset", "info");
  };
  
  // Helper: Calculate Duration
  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
      const [h1, m1] = (start || '00:00').split(':').map(Number);
      const [h2, m2] = (end || '00:00').split(':').map(Number);
      const startDate = new Date(0, 0, 0, h1, m1, 0);
      const endDate = new Date(0, 0, 0, h2, m2, 0);
      let diff = endDate.getTime() - startDate.getTime();
      if (diff < 0) diff += 24 * 60 * 60 * 1000; // Handle overnight shifts if any
      
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      
      return { hours, minutes, text: `${hours}j ${minutes}m` };
    } catch (e) {
      return null;
    }
  };

  // Helper: Haversine Distance
  const calculateDistanceFromOffice = (lat: number, lng: number) => {
    const officeLat = settings?.officeLat || OFFICE_LOCATION.lat;
    const officeLng = settings?.officeLng || OFFICE_LOCATION.lng;

    const R = 6371; // Earth radius in km
    const dLat = (lat - officeLat) * (Math.PI / 180);
    const dLon = (lng - officeLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(officeLat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in KM
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case AttendanceStatus.LATE: return 'bg-amber-100 text-amber-700 border-amber-200';
      case AttendanceStatus.ABSENT: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Summary Stats
  const stats = useMemo(() => {
      const totalDays = filteredHistory.length;
      const lateDays = filteredHistory.filter(h => h.status === AttendanceStatus.LATE).length;
      const presentDays = filteredHistory.filter(h => h.status === AttendanceStatus.PRESENT).length;
      
      let totalMinutes = 0;
      filteredHistory.forEach(h => {
          const d = calculateDuration(h.checkInTime, h.checkOutTime);
          if (d) totalMinutes += (d.hours * 60) + d.minutes;
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      return { totalDays, lateDays, presentDays, totalHours, remainingMinutes };
  }, [filteredHistory]);

  const handleExport = () => {
      if (filteredHistory.length === 0) {
          showToast("Tidak ada data untuk diekspor", "error");
          return;
      }

      const headers = ["Tanggal", "Status", "Masuk", "Pulang", "Durasi", "Lokasi"];
      const rows = filteredHistory.map(h => [
          h.date.split('T')[0],
          h.status,
          h.checkInTime || '-',
          h.checkOutTime || '-',
          calculateDuration(h.checkInTime, h.checkOutTime)?.text || '-',
          h.location ? `${h.location.lat},${h.location.lng}` : '-'
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `riwayat_kehadiran_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Laporan berhasil diunduh", "success");
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-32 md:pb-12 px-2 md:px-0 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-1 md:mb-2">Riwayat <span className="text-blue-600">Presensi</span></h2>
            <p className="text-slate-400 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3">
                <Sparkles size={12} className="text-amber-400" />
                Pantau performa kehadiran harian Anda
            </p>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="w-full md:w-auto flex items-center justify-center gap-3 md:gap-4 bg-slate-900 text-white px-6 md:px-10 py-3.5 md:py-5 rounded-2xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 border border-white/10"
          >
              <Download size={18} /> Ekspor Laporan
          </motion.button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
          {[
              { label: 'Total Hari', value: stats.totalDays, icon: Calendar, color: 'blue' },
              { label: 'Tepat Waktu', value: stats.presentDays, icon: CheckCircle2, color: 'emerald' },
              { label: 'Terlambat', value: stats.lateDays, icon: AlertCircle, color: 'amber' },
              { label: 'Jam Kerja', value: `${stats.totalHours}j ${stats.remainingMinutes}m`, icon: Clock, color: 'indigo' }
          ].map((stat, idx) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group"
              >
                  <div className={`p-2.5 md:p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl md:rounded-[1.5rem] w-fit mb-3 md:mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                      <stat.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 md:mb-2">{stat.label}</p>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
              </motion.div>
          ))}
      </div>

      {/* Filter Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-5 md:p-10 rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-sm"
      >
          <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                      <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-1">Dari Tanggal</label>
                      <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                          <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 outline-none transition-all shadow-inner"
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-1">Sampai Tanggal</label>
                      <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                          <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 outline-none transition-all shadow-inner"
                          />
                      </div>
                  </div>
              </div>
              <div className="w-full lg:w-72 space-y-2">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] ml-1">Status Kehadiran</label>
                  <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 outline-none transition-all shadow-inner appearance-none"
                    >
                        <option value="ALL">Semua Status</option>
                        {Object.values(AttendanceStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                  </div>
              </div>
              <div className="flex items-end">
                  <button 
                      onClick={resetFilters}
                      className="px-6 md:px-10 py-3 md:py-4 text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] flex items-center gap-2 md:gap-3 transition-all w-full lg:w-auto justify-center active:scale-95 shadow-sm"
                  >
                      <X size={16} /> Reset Filter
                  </button>
              </div>
          </div>
      </motion.div>
      
      <AnimatePresence mode="wait">
        {filteredHistory.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-16 md:py-32 bg-white rounded-[2.5rem] md:rounded-[4rem] border border-slate-100 border-dashed shadow-inner"
          >
              <div className="mx-auto w-20 h-20 md:w-32 md:h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 md:mb-8 relative">
                  <div className="absolute inset-0 bg-slate-100 rounded-full animate-pulse"></div>
                  <Search className="text-slate-200 relative z-10" size={32} />
              </div>
              <h3 className="text-slate-900 text-xl md:text-3xl font-black tracking-tighter mb-2 md:mb-4">Data Tidak Ditemukan</h3>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] max-w-xs mx-auto px-4 leading-relaxed">Coba sesuaikan filter pencarian Anda untuk melihat riwayat absensi.</p>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
              {filteredHistory.map((record, index) => {
                  const duration = calculateDuration(record.checkInTime, record.checkOutTime);
                  const distance = record.location 
                      ? calculateDistanceFromOffice(record.location.lat, record.location.lng) 
                      : null;
                  const isFar = distance ? distance > (settings?.officeRadius || 0.5) : false;

                  return (
                    <motion.div 
                        key={`${record.id}-${index}`} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 8 }}
                        className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 md:gap-10 transition-all hover:shadow-2xl hover:shadow-slate-200 group relative overflow-hidden active:scale-[0.99]"
                    >
                        {/* Date Box */}
                        <div className="flex-shrink-0 w-full md:w-32 h-14 md:h-32 bg-slate-50 rounded-2xl md:rounded-[2.5rem] flex md:flex-col items-center justify-center px-4 md:px-0 text-slate-900 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 gap-3 md:gap-0 shadow-inner">
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] md:mb-1 opacity-60">{new Date(record.date || Date.now()).toLocaleDateString('id-ID', { month: 'short' })}</span>
                            <span className="text-xl md:text-5xl font-black tracking-tighter">{new Date(record.date || Date.now()).getDate()}</span>
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40 md:mt-1 hidden md:block">{new Date(record.date || Date.now()).toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                        </div>

                        {/* Info Content */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                            {/* Top Row: Status & Type */}
                            <div className="flex flex-wrap justify-between items-start gap-2 md:gap-4 mb-3 md:mb-6">
                                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                    <span className={`px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(record.status)}`}>
                                        {record.status}
                                    </span>
                                    {record.isOnlineWork && (
                                        <span className="px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-widest shadow-sm">
                                            Remote
                                        </span>
                                    )}
                                    {record.syncStatus === 'pending' && (
                                        <span className="px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-widest flex items-center gap-1 md:gap-2 shadow-sm">
                                            <Loader2 size={10} className="animate-spin" /> Syncing
                                        </span>
                                    )}
                                </div>
                                {duration && (
                                    <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 px-3 md:px-5 py-1.5 md:py-2 rounded-full border border-slate-100 shadow-inner">
                                        <Timer size={12} className="text-blue-500 md:w-3.5 md:h-3.5" />
                                        {duration.text}
                                    </div>
                                )}
                            </div>

                            {/* Middle Row: Times */}
                            <div className="flex items-center justify-between md:justify-start gap-4 md:gap-16 mb-4 md:mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 md:mb-2 flex items-center gap-1.5 md:gap-2"><Clock size={10} className="text-emerald-500 md:w-3 md:h-3" /> Masuk</span>
                                    <span className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">{record.checkInTime || '--:--'}</span>
                                </div>
                                <div className="h-8 md:h-12 w-px bg-slate-100 hidden sm:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 md:mb-2 flex items-center gap-1.5 md:gap-2"><LogOut size={10} className="text-orange-500 md:w-3 md:h-3" /> Pulang</span>
                                    <span className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">{record.checkOutTime || '--:--'}</span>
                                </div>
                                <div className="flex-1 hidden md:block"></div>
                                {record.photoUrl && (
                                    <div className="flex-shrink-0 relative group/img">
                                        <img 
                                            src={record.photoUrl} 
                                            alt="Selfie" 
                                            className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-[1.5rem] object-cover border-2 md:border-4 border-slate-50 shadow-lg md:shadow-xl transition-all cursor-pointer hover:ring-4 md:hover:ring-8 hover:ring-blue-500/10 group-hover:scale-105" 
                                            onClick={() => setSelectedImage(record.photoUrl!)}
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${record.id}/200/200`;
                                            }}
                                        />
                                        <div 
                                            className="absolute inset-0 bg-slate-900/40 rounded-xl md:rounded-[1.5rem] opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity pointer-events-none backdrop-blur-sm"
                                        >
                                            <Eye size={16} className="text-white md:w-6 md:h-6" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Bottom Row: Location & Distance details */}
                            {record.location && (
                              <div className="pt-3 md:pt-6 border-t border-slate-50 flex flex-wrap gap-x-4 md:gap-x-8 gap-y-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <div className="flex items-center gap-2 md:gap-3">
                                      <div className={`p-1 md:p-1.5 rounded-md md:rounded-lg ${isFar && !record.isOnlineWork ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"}`}>
                                          <MapPin size={12} className="md:w-3.5 md:h-3.5" />
                                      </div>
                                      <span className="text-slate-600 truncate max-w-[100px] md:max-w-none">IN: {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}</span>
                                  </div>
                                  {record.checkOutLocation && (
                                      <div className="flex items-center gap-2 md:gap-3">
                                          <div className="p-1 md:p-1.5 bg-blue-50 text-blue-500 rounded-md md:rounded-lg">
                                              <MapIcon size={12} className="md:w-3.5 md:h-3.5" />
                                          </div>
                                          <span className="text-slate-600 truncate max-w-[100px] md:max-w-none">OUT: {record.checkOutLocation.lat.toFixed(4)}, {record.checkOutLocation.lng.toFixed(4)}</span>
                                      </div>
                                  )}
                                  {distance !== null && !record.isOnlineWork && (
                                      <div className={`flex items-center gap-2 md:gap-3 ${isFar ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          <div className={`p-1 md:p-1.5 rounded-md md:rounded-lg ${isFar ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                            <Ruler size={12} className="md:w-3.5 md:h-3.5" />
                                          </div>
                                          <span>{distance.toFixed(2)} km</span>
                                      </div>
                                  )}
                                  {record.locationLogs && record.locationLogs.length > 0 && (
                                      <div className="flex items-center gap-2 md:gap-3 text-blue-600">
                                          <div className="p-1 md:p-1.5 bg-blue-50 rounded-md md:rounded-lg">
                                            <TrendingUp size={12} className="md:w-3.5 md:h-3.5" />
                                          </div>
                                          <span>{record.locationLogs.length} Log Aktif</span>
                                      </div>
                                  )}
                              </div>
                            )}
                        </div>
                        
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-slate-500/5 rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-700"></div>
                    </motion.div>
                  );
              })}
          </motion.div>
        )}
      </AnimatePresence>

      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const LogOut = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export default History;
