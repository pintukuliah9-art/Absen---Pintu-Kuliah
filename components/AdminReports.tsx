import React, { useState, useMemo } from 'react';
import { AttendanceRecord, User, AttendanceStatus } from '../types';
import { Download, Calendar, Filter, FileText, Printer, BarChart3, RefreshCw, Eye, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '../services/store';
import { getLocalDateString } from '../services/dateUtils';
import { useToast } from './Toast';
import ImageModal from './ImageModal';

interface AdminReportsProps {
  history: AttendanceRecord[];
  users: User[];
}

const AdminReports: React.FC<AdminReportsProps> = ({ history, users }) => {
  const { fetchData } = useStore();
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState(
    getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('table');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleRefresh = async () => {
      try {
          await fetchData();
          showToast('Data berhasil diperbarui dari server', 'success');
      } catch (e) {
          showToast('Gagal memperbarui data', 'error');
      }
  };

  const handlePrint = () => {
      window.print();
  };

  // Filter Data
  const filteredHistory = useMemo(() => {
    return history.filter(record => {
        const recordDate = (record.date || '').split('T')[0];
        const isDateInRange = recordDate >= startDate && recordDate <= endDate;
        const isUserMatch = selectedUser === 'all' || record.userId === selectedUser;
        return isDateInRange && isUserMatch;
    });
  }, [history, startDate, endDate, selectedUser]);

  // Calculate Summary
  const summary = useMemo(() => ({
    total: filteredHistory.length,
    present: filteredHistory.filter(r => r.status === AttendanceStatus.PRESENT).length,
    late: filteredHistory.filter(r => r.status === AttendanceStatus.LATE).length,
    absent: filteredHistory.filter(r => r.status === AttendanceStatus.ABSENT).length,
    leave: filteredHistory.filter(r => r.status === AttendanceStatus.LEAVE).length,
    sick: filteredHistory.filter(r => r.status === AttendanceStatus.SICK).length,
  }), [filteredHistory]);

  const chartData = [
    { name: 'Hadir', value: summary.present, color: '#10B981' },
    { name: 'Telat', value: summary.late, color: '#F59E0B' },
    { name: 'Sakit', value: summary.sick, color: '#3B82F6' },
    { name: 'Izin', value: summary.leave, color: '#8B5CF6' },
    { name: 'Alpha', value: summary.absent, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const downloadCSV = () => {
    // 1. Metadata & Summary Section
    const reportTitle = "LAPORAN ABSENSI KARYAWAN";
    const period = `Periode: ${startDate} s/d ${endDate}`;
    const generatedAt = `Dicetak pada: ${new Date().toLocaleString('id-ID')}`;
    
    const summaryHeader = ["RINGKASAN", "JUMLAH"];
    const summaryRows = [
      ["Total Hadir", summary.present],
      ["Terlambat", summary.late],
      ["Sakit", summary.sick],
      ["Izin / Cuti", summary.leave],
      ["Alpha", summary.absent],
      ["Total Data", summary.total]
    ];

    // 2. Main Data Section
    const headers = ['Tanggal', 'Nama Karyawan', 'Kantor', 'Status', 'Jam Masuk', 'Jam Pulang', 'Keterangan'];
    const rows = filteredHistory.map(record => {
      const user = users.find(u => u.id === record.userId);
      return [
        new Date(record.date).toLocaleDateString('id-ID'),
        user ? user.name : 'Unknown',
        record.officeName || '-',
        record.status,
        record.checkInTime || '-',
        record.checkOutTime || '-',
        record.notes ? `"${record.notes.replace(/"/g, '""')}"` : '-'
      ];
    });

    // 3. Combine everything
    // Use semicolon (;) for better Excel compatibility in Indonesia locale
    const sep = ';';
    
    const csvRows = [
      [reportTitle],
      [period],
      [generatedAt],
      [], // Empty line
      summaryHeader.join(sep),
      ...summaryRows.map(row => row.join(sep)),
      [], // Empty line
      ["DATA RINCIAN"],
      headers.join(sep),
      ...rows.map(row => row.join(sep))
    ];

    const csvContent = csvRows.map(row => Array.isArray(row) ? row.join(sep) : row).join('\n');
    
    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_absensi_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 fade-in pb-10 pt-14 md:pt-0">
      {/* Print Header */}
      <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Laporan Absensi Karyawan</h1>
          <p className="text-gray-600 font-medium">Periode: {new Date(startDate).toLocaleDateString('id-ID')} - {new Date(endDate).toLocaleDateString('id-ID')}</p>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="w-full">
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter">Laporan & Rekapitulasi</h2>
            <p className="text-gray-500 text-xs font-medium">Unduh dan analisis data absensi karyawan.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
                onClick={handleRefresh}
                className="bg-white border border-gray-100 text-gray-600 p-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                title="Sinkronisasi Ulang"
            >
                <RefreshCw size={18} />
            </button>
            <button 
                onClick={handlePrint}
                className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
            >
                <Printer size={18} /> Cetak PDF
            </button>
            <button 
                onClick={downloadCSV}
                className="flex-1 md:flex-none bg-green-600 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 shadow-xl shadow-green-200 transition-all active:scale-95"
            >
                <Download size={18} /> Unduh CSV
            </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end print:hidden sticky top-14 md:top-0 z-20">
          <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Dari Tanggal</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
          </div>
          <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Sampai Tanggal</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
          </div>
          <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Filter Karyawan</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)} 
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                  <option key="all" value="all">Semua Karyawan</option>
                  {users.map((u, index) => (
                      <option key={`${u.id}-${index}`} value={u.id}>{u.name}</option>
                  ))}
              </select>
          </div>
          <div className="flex items-center justify-center h-11 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
              <Filter size={14} className="mr-2"/> {filteredHistory.length} Data Ditemukan
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 md:gap-4">
              <SummaryCard label="Hadir" value={summary.present} color="bg-green-50 text-green-700" />
              <SummaryCard label="Telat" value={summary.late} color="bg-yellow-50 text-yellow-700" />
              <SummaryCard label="Sakit" value={summary.sick} color="bg-blue-50 text-blue-700" />
              <SummaryCard label="Izin" value={summary.leave} color="bg-purple-50 text-purple-700" />
              <SummaryCard label="Alpha" value={summary.absent} color="bg-red-50 text-red-700" />
              <SummaryCard label="Total" value={summary.total} color="bg-gray-100 text-gray-700" />
          </div>
          
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm print:hidden">
              <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={18} className="text-blue-600" />
                  <h3 className="font-bold text-gray-700">Visualisasi Status Absensi</h3>
              </div>
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#9CA3AF'}} />
                          <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#9CA3AF'}} />
                          <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                              {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* Data Table */}
      {viewMode === 'table' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <FileText size={18} className="text-gray-500"/>
                  <h3 className="font-bold text-gray-700">Rincian Data Absensi</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                              <th className="px-4 py-4">Tanggal</th>
                              <th className="px-4 py-4">Karyawan</th>
                              <th className="px-4 py-4">Kantor</th>
                              <th className="px-4 py-4">Foto</th>
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4">Masuk</th>
                              <th className="px-4 py-4">Pulang</th>
                              <th className="px-4 py-4">Catatan</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredHistory.length > 0 ? (
                              filteredHistory.map((record, index) => {
                                  const user = users.find(u => u.id === record.userId);
                                  return (
                                      <tr key={`${record.id}-${index}`} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                          <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                                              {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                          </td>
                                          <td className="px-4 py-4">
                                              <div className="flex items-center gap-2 min-w-[140px]">
                                                  <img 
                                                      src={user?.avatar} 
                                                      alt="" 
                                                      className="w-7 h-7 rounded-full border border-gray-100 object-cover" 
                                                      referrerPolicy="no-referrer"
                                                      onError={(e) => {
                                                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                                      }}
                                                  />
                                                  <span className="truncate font-bold text-gray-700">{user?.name || 'Unknown'}</span>
                                              </div>
                                          </td>
                                          <td className="px-4 py-4">
                                              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold whitespace-nowrap">
                                                  <MapPin size={12} />
                                                  {record.officeName || '-'}
                                              </div>
                                          </td>
                                          <td className="px-4 py-4">
                                              {record.photoUrl ? (
                                                  <div className="relative group/img w-10 h-10">
                                                      <img 
                                                          src={record.photoUrl} 
                                                          alt="Selfie" 
                                                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all" 
                                                          onClick={() => setSelectedImage(record.photoUrl!)}
                                                          referrerPolicy="no-referrer"
                                                          onError={(e) => {
                                                              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/broken/100/100';
                                                          }}
                                                      />
                                                      <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover/img:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                                                          <Eye size={12} className="text-white" />
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <span className="text-gray-300 text-[10px] font-black uppercase tracking-tighter">No Photo</span>
                                              )}
                                          </td>
                                          <td className="px-4 py-4">
                                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusColor(record.status)}`}>
                                                  {record.status}
                                              </span>
                                          </td>
                                          <td className="px-4 py-4 font-mono text-xs font-bold text-gray-600">{record.checkInTime || '-'}</td>
                                          <td className="px-4 py-4 font-mono text-xs font-bold text-gray-600">{record.checkOutTime || '-'}</td>
                                          <td className="px-4 py-4 text-xs text-gray-500 italic min-w-[150px] max-w-[250px] truncate">{record.notes || '-'}</td>
                                      </tr>
                                  );
                              })
                          ) : (
                              <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                                      Tidak ada data absensi pada periode ini.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : (
          <div className="bg-blue-50 p-12 rounded-2xl border border-blue-100 text-center animate-in zoom-in duration-500">
              <BarChart3 size={48} className="text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-blue-800 mb-2">Analisis Visual Aktif</h3>
              <p className="text-blue-600 text-sm max-w-md mx-auto">Gunakan grafik di atas untuk menganalisis tren kehadiran karyawan secara cepat dan akurat selama periode yang dipilih.</p>
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

const SummaryCard = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className={`p-3 md:p-4 rounded-2xl border border-transparent shadow-sm flex flex-col items-center md:items-start justify-center ${color}`}>
        <p className="text-[9px] md:text-xs font-black uppercase opacity-70 mb-1 tracking-tighter">{label}</p>
        <p className="text-xl md:text-2xl font-black">{value}</p>
    </div>
);

const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return 'bg-green-100 text-green-700';
      case AttendanceStatus.LATE: return 'bg-yellow-100 text-yellow-700';
      case AttendanceStatus.ABSENT: return 'bg-red-100 text-red-700';
      case AttendanceStatus.LEAVE: return 'bg-blue-100 text-blue-700';
      case AttendanceStatus.SICK: return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
};

export default AdminReports;
