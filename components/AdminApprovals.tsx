import React, { useState } from 'react';
import { RequestRecord, RequestStatus, RequestType, User } from '../types';
import { getUserById } from '../services/store';
import { Check, X, Calendar, AlertTriangle, CheckSquare, Square, XCircle, FileText, Search, RefreshCw } from 'lucide-react';

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
    <div className="space-y-8 fade-in relative pb-10 pt-14 md:pt-0">
        {/* Header & Bulk Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="w-full">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 tracking-tighter">
                    Menunggu Persetujuan
                    <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-black">{pendingRequests.length}</span>
                </h2>
                <p className="text-gray-500 text-xs font-medium mt-1">Kelola izin, cuti, dan lembur karyawan.</p>
            </div>
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between w-full md:w-auto gap-3 bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                    <span className="text-blue-800 text-xs font-black uppercase tracking-widest whitespace-nowrap">{selectedIds.length} dipilih</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleBulkReject}
                            className="bg-white border border-red-200 text-red-600 text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        >
                            Tolak
                        </button>
                        <button 
                            onClick={handleBulkApprove}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-200"
                        >
                            Setujui
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
            <Search size={18} className="text-gray-400" />
            <input 
                type="text" 
                placeholder="Cari nama karyawan atau jenis pengajuan..." 
                className="flex-1 bg-transparent outline-none text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        {/* Pending List */}
        {filteredPending.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Tidak ada pengajuan yang sesuai pencarian.</p>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                     <button onClick={toggleSelectAll} className="text-gray-500 hover:text-blue-600 transition-colors">
                        {selectedIds.length === pendingRequests.length && pendingRequests.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                     </button>
                     <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pilih Semua</span>
                </div>

                {filteredPending.map((req, index) => {
                    const user = getUserById(req.userId, users);
                    const conflictCount = getConflictCount(req);
                    const isSelected = selectedIds.includes(req.id);

                    return (
                        <div key={`${req.id}-${index}`} className={`bg-white p-6 rounded-xl border transition-all ${isSelected ? 'border-blue-400 shadow-md bg-blue-50/30' : 'border-gray-100 shadow-sm'}`}>
                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <button onClick={() => toggleSelect(req.id)} className="text-gray-400 hover:text-blue-600">
                                        {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                    </button>
                                </div>
                                <div className="flex-shrink-0">
                                    <img 
                                        src={user?.avatar} 
                                        alt="" 
                                        className="w-12 h-12 rounded-full border border-gray-200 object-cover" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                        }}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">{user?.name}</h4>
                                            <div className="flex gap-2 mt-1">
                                                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                                    {req.type}
                                                </span>
                                                {req.type === RequestType.LEAVE && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                        Sisa Kuota: {user?.leaveQuota || 0} Hari
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Calendar size={12} /> {req.startDate} - {req.endDate}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg text-gray-700 text-sm italic mb-3 border border-gray-100">
                                        "{req.aiEnhancedReason || req.reason}"
                                    </div>
                                    
                                    {/* Attachment Link */}
                                    {req.attachmentUrl && (
                                        <a href={req.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold mb-3 block hover:underline flex items-center gap-1">
                                            <FileText size={14} /> Lihat Lampiran Bukti
                                        </a>
                                    )}
                                    
                                    {/* Conflict Warning */}
                                    {conflictCount > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg mb-3 border border-orange-100">
                                            <AlertTriangle size={14} />
                                            <span className="font-semibold">Peringatan:</span>
                                            {conflictCount} karyawan lain juga cuti pada tanggal ini.
                                        </div>
                                    )}

                                    <div className="flex flex-col items-end gap-2">
                                        {req.syncStatus === 'pending' && (
                                            <span className="flex items-center gap-1 text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 animate-pulse">
                                                <RefreshCw size={8} className="animate-spin" /> PENDING SYNC
                                            </span>
                                        )}
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => {
                                                    onUpdateStatus(req.id, RequestStatus.APPROVED);
                                                    showToast("Pengajuan disetujui", "success");
                                                }}
                                                className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                            >
                                                <Check size={14} /> Setujui
                                            </button>
                                            <button 
                                                onClick={() => openRejectModal(req.id)}
                                                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 py-1.5 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                            >
                                                <X size={14} /> Tolak
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Rejection Modal */}
        {rejectModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Tolak Pengajuan</h3>
                        <button onClick={() => setRejectModalOpen(false)}><XCircle className="text-gray-400 hover:text-gray-600"/></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Silahkan masukkan alasan penolakan agar karyawan dapat memahami keputusan ini.</p>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-4"
                        rows={3}
                        placeholder="Contoh: Kuota cuti tim sudah penuh..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    ></textarea>
                    <div className="flex gap-3">
                         <button onClick={() => setRejectModalOpen(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Batal</button>
                         <button onClick={confirmReject} disabled={!rejectReason} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">Tolak Pengajuan</button>
                    </div>
                </div>
            </div>
        )}

        {/* History List */}
        <div className="pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Riwayat Persetujuan</h2>
            <div className="space-y-3 opacity-80">
                 {historyRequests.length === 0 && <p className="text-gray-400 text-sm">Belum ada riwayat.</p>}
                 {historyRequests.map((req, index) => {
                     const user = getUserById(req.userId, users);
                     return (
                        <div key={`${req.id}-${index}`} className="bg-white p-4 rounded-lg border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <img 
                                    src={user?.avatar} 
                                    alt="" 
                                    className="w-8 h-8 rounded-full grayscale object-cover" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
                                    }}
                                />
                                <div>
                                    <p className="text-sm font-bold text-gray-700">{user?.name}</p>
                                    <p className="text-xs text-gray-500">{req.type} • {req.startDate}</p>
                                </div>
                            </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2">
                                            {req.syncStatus === 'pending' && (
                                                <span className="flex items-center gap-1 text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 animate-pulse">
                                                    <RefreshCw size={8} className="animate-spin" /> SYNCING...
                                                </span>
                                            )}
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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