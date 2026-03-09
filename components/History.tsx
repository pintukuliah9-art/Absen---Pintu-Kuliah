import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, AppSettings } from '../types';
import { Calendar, MapPin, Timer, ArrowRight, Ruler, Filter, X, Search, Download, TrendingUp, AlertCircle, Clock, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { OFFICE_LOCATION } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
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
      case AttendanceStatus.PRESENT: return 'bg-green-100 text-green-700 border-green-200';
      case AttendanceStatus.LATE: return 'bg-orange-100 text-orange-700 border-orange-200';
      case AttendanceStatus.ABSENT: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Riwayat Kehadiran</h2>
            <p className="text-sm text-gray-500">Pantau performa kehadiran Anda secara berkala.</p>
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
              <Download size={18} /> Ekspor CSV
          </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3"><Calendar size={20} /></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Hari</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.totalDays}</h3>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
              <div className="p-2 bg-green-50 text-green-600 rounded-lg w-fit mb-3"><CheckCircle2 size={20} /></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tepat Waktu</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.presentDays}</h3>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg w-fit mb-3"><AlertCircle size={20} /></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terlambat</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.lateDays}</h3>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3"><Clock size={20} /></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Jam Kerja</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.totalHours}j {stats.remainingMinutes}m</h3>
          </motion.div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dari Tanggal</label>
                      <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sampai Tanggal</label>
                      <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                      </div>
                  </div>
              </div>
              <div className="w-full lg:w-64">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status Kehadiran</label>
                  <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                      <option value="ALL">Semua Status</option>
                      {Object.values(AttendanceStatus).map(status => (
                          <option key={status} value={status}>{status}</option>
                      ))}
                  </select>
              </div>
              <div className="flex items-end">
                  <button 
                      onClick={resetFilters}
                      className="px-6 py-2.5 text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-sm font-bold flex items-center gap-2 transition-all w-full lg:w-auto justify-center active:scale-95"
                  >
                      <X size={16} /> Reset Filter
                  </button>
              </div>
          </div>
      </div>
      
      <AnimatePresence mode="wait">
        {filteredHistory.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed"
          >
              <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Search className="text-gray-300" size={32} />
              </div>
              <h3 className="text-gray-800 text-xl font-bold mb-2">Data Tidak Ditemukan</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">Coba ubah filter tanggal atau status untuk melihat riwayat absensi Anda.</p>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
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
                        transition={{ delay: index * 0.03 }}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 transition-all hover:shadow-md group relative overflow-hidden"
                    >
                        {/* Date Box */}
                        <div className="flex-shrink-0 w-full md:w-24 h-24 bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center text-blue-700 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1">{new Date(record.date || Date.now()).toLocaleDateString('id-ID', { month: 'short' })}</span>
                            <span className="text-3xl font-black">{new Date(record.date || Date.now()).getDate()}</span>
                            <span className="text-[10px] font-bold opacity-75 mt-1">{new Date(record.date || Date.now()).toLocaleDateString('id-ID', { weekday: 'long' })}</span>
                        </div>

                        {/* Info Content */}
                        <div className="flex-1 flex flex-col justify-between">
                            {/* Top Row: Status & Type */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(record.status)}`}>
                                        {record.status}
                                    </span>
                                    {record.isOnlineWork && (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-widest">
                                            WFH / ONLINE
                                        </span>
                                    )}
                                    {record.syncStatus === 'pending' && (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-widest flex items-center gap-1">
                                            <Loader2 size={10} className="animate-spin" /> Pending Sync
                                        </span>
                                    )}
                                </div>
                                {duration && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                        <Timer size={14} className="text-blue-500" />
                                        {duration.text}
                                    </div>
                                )}
                            </div>

                            {/* Middle Row: Times */}
                            <div className="flex items-center gap-8 mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Masuk</span>
                                    <span className="text-xl font-black text-gray-800 font-mono">{record.checkInTime || '--:--'}</span>
                                </div>
                                <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Pulang</span>
                                    <span className="text-xl font-black text-gray-800 font-mono">{record.checkOutTime || '--:--'}</span>
                                </div>
                                <div className="flex-1 hidden md:block"></div>
                                {record.photoUrl && (
                                    <div className="flex-shrink-0 relative group/img">
                                        <img 
                                            src={record.photoUrl} 
                                            alt="Selfie" 
                                            className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100 shadow-sm transition-all cursor-pointer hover:ring-4 hover:ring-blue-500/20" 
                                            onClick={() => setSelectedImage(record.photoUrl!)}
                                            referrerPolicy="no-referrer"
                                        />
                                        <div 
                                            className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity pointer-events-none"
                                        >
                                            <Eye size={20} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Bottom Row: Location & Distance details */}
                            {record.location && (
                              <div className="pt-4 border-t border-gray-50 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                  <div className="flex items-center gap-2">
                                      <MapPin size={14} className={isFar && !record.isOnlineWork ? "text-red-500" : "text-green-500"} />
                                      <span className="text-gray-600">IN: {record.location.lat.toFixed(5)}, {record.location.lng.toFixed(5)}</span>
                                  </div>
                                  {record.checkOutLocation && (
                                      <div className="flex items-center gap-2">
                                          <MapPin size={14} className="text-blue-500" />
                                          <span className="text-gray-600">OUT: {record.checkOutLocation.lat.toFixed(5)}, {record.checkOutLocation.lng.toFixed(5)}</span>
                                      </div>
                                  )}
                                  {distance !== null && !record.isOnlineWork && (
                                      <div className={`flex items-center gap-2 ${isFar ? 'text-red-600' : 'text-green-600'}`}>
                                          <Ruler size={14} />
                                          <span>{distance.toFixed(3)} km dari kantor</span>
                                      </div>
                                  )}
                                  {record.locationLogs && record.locationLogs.length > 0 && (
                                      <div className="flex items-center gap-2 text-blue-600">
                                          <TrendingUp size={14} />
                                          <span>{record.locationLogs.length} Log Pergerakan</span>
                                      </div>
                                  )}
                              </div>
                            )}
                        </div>
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
      />
    </div>
  );
};

export default History;