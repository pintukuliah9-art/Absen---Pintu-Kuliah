import React, { useState } from 'react';
import { RequestRecord, RequestStatus, RequestType, User } from '../types';
import { getUserById } from '../services/store';
import { Check, X, Calendar, AlertTriangle, CheckSquare, Square, XCircle, FileText, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useToast } from './Toast';

interface AdminApprovalsProps {
  requests: RequestRecord[];
  users: User[];
  onUpdateStatus: (id: string, status: RequestStatus) => void;
}

const AdminApprovals: React.FC<AdminApprovalsProps> = ({ requests, users, onUpdateStatus }) => {
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkReject, setIsBulkReject] = useState(false);

  const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING);
  const historyRequests = requests.filter(r => r.status !== RequestStatus.PENDING);
  const approvedRequests = requests.filter(r => r.status === RequestStatus.APPROVED);
  
  const filteredPending = pendingRequests.filter(r => {
      const user = getUserById(r.userId, users);
      return user?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             r.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Logic to check for conflicts (Same dates, excluding the request itself)
  const getConflictCount = (req: RequestRecord) => {
      if (req.type !== RequestType.LEAVE) return 0;
      
      return approvedRequests.filter(approved => {
          if (approved.id === req.id) return false;
          // Simple date overlap check (assuming strings are YYYY-MM-DD)
          return (req.startDate <= approved.endDate && req.endDate >= approved.startDate);
      }).length;
  };

  const toggleSelect = (id: string) => {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === pendingRequests.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(pendingRequests.map(r => r.id));
      }
  };

  const handleBulkApprove = () => {
      selectedIds.forEach(id => onUpdateStatus(id, RequestStatus.APPROVED));
      showToast(`${selectedIds.length} pengajuan telah disetujui`, "success");
      setSelectedIds([]);
  };

  const handleBulkReject = () => {
      setIsBulkReject(true);
      setRejectReason("");
      setRejectModalOpen(true);
  };

  const openRejectModal = (id: string) => {
      setIsBulkReject(false);
      setRejectId(id);
      setRejectReason("");
      setRejectModalOpen(true);
  };

  const confirmReject = () => {
      if (isBulkReject) {
          selectedIds.forEach(id => onUpdateStatus(id, RequestStatus.REJECTED));
          showToast(`${selectedIds.length} pengajuan telah ditolak`, "info");
          setSelectedIds([]);
      } else if (rejectId) {
          onUpdateStatus(rejectId, RequestStatus.REJECTED);
          showToast("Pengajuan telah ditolak", "info");
      }
      setRejectModalOpen(false);
      setRejectId(null);
      setIsBulkReject(false);
  };

  return (
    <div className="space-y-8 fade-in relative pb-20 pt-16 md:pt-0">
        {/* Header & Bulk Actions */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tighter">
                    Persetujuan
                    <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{pendingRequests.length}</span>
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">Kelola izin, cuti, dan lembur tim Anda secara efisien.</p>
            </div>
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 bg-blue-600 px-5 py-3 rounded-2xl animate-in fade-in slide-in-from-bottom-4 shadow-xl shadow-blue-200">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{selectedIds.length} Dipilih</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleBulkReject}
                            className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 border border-white/20"
                        >
                            Tolak
                        </button>
                        <button 
                            onClick={handleBulkApprove}
                            className="bg-white text-blue-600 text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                        >
                            Setujui
                        </button>
                    </div>
                </div>
            )}
        </header>

        {/* Search Bar */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 sticky top-14 md:top-0 z-20">
            <div className="flex-1 flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                <Search size={20} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Cari nama karyawan atau jenis pengajuan..." 
                    className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        
        {/* Pending List */}
        {filteredPending.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Semua Beres!</h3>
                <p className="text-gray-400 text-sm font-medium mt-1">Tidak ada pengajuan yang perlu diproses saat ini.</p>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                     <button 
                        onClick={toggleSelectAll} 
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.length === pendingRequests.length && pendingRequests.length > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 hover:border-blue-400'}`}
                     >
                        {selectedIds.length === pendingRequests.length && pendingRequests.length > 0 ? <Check size={14} strokeWidth={4} /> : null}
                     </button>
                     <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Pilih Semua Pengajuan</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredPending.map((req, index) => {
                        const user = getUserById(req.userId, users);
                        const conflictCount = getConflictCount(req);
                        const isSelected = selectedIds.includes(req.id);

                        return (
                            <div key={`${req.id}-${index}`} className={`bg-white p-6 rounded-[40px] border transition-all relative group ${isSelected ? 'border-blue-400 shadow-2xl shadow-blue-100 ring-4 ring-blue-50' : 'border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100'}`}>
                                <div className="flex gap-5">
                                    <div className="flex flex-col items-center gap-4">
                                        <button 
                                            onClick={() => toggleSelect(req.id)} 
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 hover:border-blue-400'}`}
                                        >
                                            {isSelected ? <Check size={14} strokeWidth={4} /> : null}
                                        </button>
                                        <div className="relative">
                                            <img 
                                                src={user?.avatar} 
                                                alt="" 
                                                className="w-16 h-16 rounded-3xl border-2 border-white shadow-md object-cover" 
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                                }}
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                                <div className={`w-3 h-3 rounded-full ${user?.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-black text-gray-900 text-xl tracking-tight leading-none mb-2">{user?.name}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                                        {req.type}
                                                    </span>
                                                    {req.type === RequestType.LEAVE && (
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">
                                                            Sisa: {user?.leaveQuota || 0} Hari
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                            <Calendar size={14} className="text-blue-500" />
                                            <span>{req.startDate}</span>
                                            <span className="text-gray-200">/</span>
                                            <span>{req.endDate}</span>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl text-gray-700 text-sm font-bold mb-4 border border-gray-100 leading-relaxed relative">
                                            <div className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 rounded-lg">Alasan</div>
                                            "{req.aiEnhancedReason || req.reason}"
                                        </div>
                                        
                                        {/* Attachment Link */}
                                        {req.attachmentUrl && (
                                            <a href={req.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl mb-4 hover:bg-blue-100 transition-all border border-blue-100">
                                                <FileText size={14} /> Lihat Lampiran
                                            </a>
                                        )}
                                        
                                        {/* Conflict Warning */}
                                        {conflictCount > 0 && (
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-4 py-3 rounded-2xl mb-4 border border-orange-100">
                                                <AlertTriangle size={16} className="shrink-0" />
                                                <span>Peringatan: {conflictCount} orang lain juga cuti di tanggal ini.</span>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                {req.syncStatus === 'pending' && (
                                                    <span className="flex items-center gap-1.5 text-[9px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 animate-pulse uppercase tracking-widest">
                                                        <RefreshCw size={10} className="animate-spin" /> Pending Sync
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => openRejectModal(req.id)}
                                                    className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                >
                                                    Tolak
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        onUpdateStatus(req.id, RequestStatus.APPROVED);
                                                        showToast("Pengajuan disetujui", "success");
                                                    }}
                                                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-200"
                                                >
                                                    Setujui
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}


        {/* Rejection Modal */}
        <AnimatePresence>
            {rejectModalOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
                >
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setRejectModalOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-[40px] w-full max-w-md p-8 relative z-10 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter"><span>Tolak Pengajuan</span></h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1"><span>Berikan alasan yang jelas</span></p>
                            </div>
                            <button onClick={() => setRejectModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 transition-all">
                                <XCircle size={20}/>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mb-6 leading-relaxed"><span>Silahkan masukkan alasan penolakan agar karyawan dapat memahami keputusan ini dan melakukan perbaikan jika diperlukan.</span></p>
                        <textarea 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-red-500/10 outline-none mb-6 min-h-[120px] resize-none transition-all"
                            placeholder="Contoh: Kuota cuti tim sudah penuh untuk periode ini..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        ></textarea>
                        <div className="flex flex-col sm:flex-row gap-3">
                             <button onClick={() => setRejectModalOpen(false)} className="w-full sm:flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"><span>Batal</span></button>
                             <button 
                                onClick={confirmReject} 
                                disabled={!rejectReason} 
                                className="w-full sm:flex-1 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 disabled:opacity-50 shadow-xl shadow-red-200 transition-all active:scale-95"
                            >
                                <span>Konfirmasi Tolak</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* History List */}
        <div className="pt-12 border-t border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter">Riwayat Persetujuan</h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Daftar pengajuan yang telah diproses</p>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total: {historyRequests.length}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {historyRequests.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                        <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Belum ada riwayat pengajuan</p>
                    </div>
                 )}
                 {historyRequests.map((req, index) => {
                     const user = getUserById(req.userId, users);
                     const isApproved = req.status === RequestStatus.APPROVED;
                     return (
                        <div key={`${req.id}-${index}`} className="bg-white p-5 rounded-[32px] border border-gray-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img 
                                        src={user?.avatar} 
                                        alt="" 
                                        className="w-10 h-10 rounded-2xl grayscale group-hover:grayscale-0 transition-all object-cover border border-gray-100" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                        }}
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-lg border-2 border-white ${isApproved ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900 leading-none mb-1">{user?.name}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                        {req.type} <span className="mx-1 text-gray-200">•</span> {req.startDate}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    {req.syncStatus === 'pending' && (
                                        <RefreshCw size={12} className="text-orange-400 animate-spin" />
                                    )}
                                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                        isApproved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                        {req.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                     )
                 })}
            </div>
        </div>
    </div>

  );
};

export default AdminApprovals;