import React, { useState, useRef, useMemo } from 'react';
import { RequestType, RequestStatus, RequestRecord, LeaveType } from '../types';
import { Wand2, Send, Loader2, Clock, CheckCircle, XCircle, Upload, FileText, AlertCircle, Calendar as CalendarIcon, Trash2, Info, Sparkles, RefreshCw } from 'lucide-react';
import { generateLeaveReason } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';

import { useStore } from '../services/store';

interface RequestsProps {
  requests: RequestRecord[];
  leaveTypes: LeaveType[];
  userQuota: number;
  onSubmit: (data: RequestRecord) => void;
  onDelete?: (id: string) => void;
}

const Requests: React.FC<RequestsProps> = ({ requests, leaveTypes, userQuota, onSubmit, onDelete }) => {
  const { fetchData, syncPendingItems, state } = useStore();
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const handleRefresh = async () => {
      setIsRefreshing(true);
      try {
          await fetchData();
          showToast("Data diperbarui", "info");
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleSyncAll = async () => {
      const pendingCount = requests.filter(r => r.syncStatus === 'pending').length;
      if (pendingCount === 0) {
          showToast("Semua data sudah tersinkron", "info");
          return;
      }

      setIsSyncingAll(true);
      try {
          await syncPendingItems();
          showToast("Sinkronisasi selesai", "success");
      } catch (error) {
          showToast("Beberapa data gagal sinkron", "error");
      } finally {
          setIsSyncingAll(false);
      }
  };
  const [type, setType] = useState<RequestType>(RequestType.LEAVE);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rawReason, setRawReason] = useState('');
  const [refinedReason, setRefinedReason] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAIHelp = async () => {
    if (!rawReason) return;
    setIsGenerating(true);
    try {
        const result = await generateLeaveReason(rawReason, type);
        setRefinedReason(result);
        showToast("Alasan berhasil diperhalus oleh AI", "success");
    } catch (error) {
        showToast("Gagal memperhalus alasan", "error");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          showToast("Ukuran file maksimal 2MB", "error");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
        showToast("File berhasil dilampirkan", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (type === RequestType.LEAVE && !selectedLeaveTypeId) {
        showToast("Pilih kategori cuti terlebih dahulu.", "error");
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showToast("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.", "error");
        return;
    }

    const selectedLeaveType = leaveTypes.find(l => l.id === selectedLeaveTypeId);
    if (selectedLeaveType?.requiresFile && !attachment) {
        showToast("Lampiran bukti wajib diunggah untuk kategori ini.", "error");
        return;
    }

    const newRequest: RequestRecord = {
        id: `req-${Date.now()}`,
        userId: '', // Will be filled by store
        type,
        startDate,
        endDate,
        reason: rawReason,
        aiEnhancedReason: refinedReason,
        status: RequestStatus.PENDING,
        leaveTypeId: type === RequestType.LEAVE ? selectedLeaveTypeId : undefined,
        attachmentUrl: attachment || undefined
    };

    onSubmit(newRequest);
    showToast("Pengajuan berhasil dikirim", "success");
    
    // Reset
    setRawReason('');
    setRefinedReason('');
    setStartDate('');
    setEndDate('');
    setAttachment(null);
    setSelectedLeaveTypeId('');
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED: return <CheckCircle size={14} />;
      case RequestStatus.REJECTED: return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED: return 'bg-green-100 text-green-700 border-green-200';
      case RequestStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const selectedLeaveType = leaveTypes.find(l => l.id === selectedLeaveTypeId);

  const sortedRequests = useMemo(() => {
      return [...requests].sort((a, b) => b.id.localeCompare(a.id));
  }, [requests]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 pb-20">
      {/* Form Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-5 space-y-3 md:space-y-6"
      >
        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                Form Pengajuan
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
                <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 md:mb-2">Jenis Pengajuan</label>
                <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                {Object.values(RequestType).map((t) => (
                    <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-1.5 md:py-2.5 text-[10px] md:text-sm font-bold rounded-lg transition-all active:scale-95 ${
                        type === t ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    >
                    {t}
                    </button>
                ))}
                </div>
            </div>

            {/* Leave Type Selector (Only if type is LEAVE) */}
            <AnimatePresence mode="wait">
                {type === RequestType.LEAVE && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 md:space-y-2 overflow-hidden"
                    >
                        <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori Cuti</label>
                        <select 
                            value={selectedLeaveTypeId}
                            onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                            className="w-full px-3 py-2 md:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 text-[11px] md:text-sm"
                            required
                        >
                            <option value="">-- Pilih Kategori --</option>
                            {leaveTypes.map(lt => (
                                <option key={lt.id} value={lt.id}>{lt.name} {lt.isPaid ? '(Berbayar)' : '(Unpaid)'}</option>
                            ))}
                        </select>
                        {selectedLeaveType && (
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] md:text-[10px] text-gray-500">Sisa Kuota Anda:</span>
                                    <span className="text-[9px] md:text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{userQuota} Hari</span>
                                </div>
                                {selectedLeaveType.requiresFile && (
                                    <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] text-red-500 font-bold uppercase">
                                        <AlertCircle size={10} /> Wajib lampiran bukti
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 md:mb-2">Mulai</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="date" 
                        required
                        className="w-full pl-8 md:pl-10 pr-3 py-2 md:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 text-[11px] md:text-sm"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                </div>
                <div>
                <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 md:mb-2">Selesai</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="date" 
                        required
                        className="w-full pl-8 md:pl-10 pr-3 py-2 md:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 text-[11px] md:text-sm"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                </div>
            </div>

            <div>
                <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 md:mb-2">Alasan</label>
                <div className="relative">
                <textarea
                    required
                    rows={3}
                    className="w-full px-3 py-2 md:py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 text-[11px] md:text-sm resize-none"
                    placeholder="Jelaskan alasan pengajuan Anda secara singkat..."
                    value={rawReason}
                    onChange={(e) => {
                        setRawReason(e.target.value);
                        if (refinedReason) setRefinedReason(''); 
                    }}
                />
                <button
                    type="button"
                    onClick={handleAIHelp}
                    disabled={isGenerating || !rawReason}
                    className="absolute bottom-2 right-2 md:bottom-3 md:right-3 text-[8px] md:text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 md:gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-400 active:scale-95"
                >
                    {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />}
                    Perhalus Alasan
                </button>
                </div>
                <AnimatePresence>
                    {refinedReason && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 p-2.5 md:p-4 bg-indigo-50 rounded-xl border border-indigo-100 relative group"
                        >
                            <div className="flex justify-between items-start mb-0.5">
                            <span className="text-[8px] md:text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={10} className="text-indigo-500" /> Saran AI
                            </span>
                            </div>
                            <p className="text-[11px] md:text-sm text-indigo-900 leading-relaxed italic">"{refinedReason}"</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* File Upload */}
            <div className="bg-gray-50 p-2.5 md:p-4 rounded-xl border border-gray-100">
                <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 md:mb-3">Lampiran Bukti</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full sm:w-auto px-3 py-2 rounded-xl text-[11px] md:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            attachment ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {attachment ? <CheckCircle size={16} /> : <Upload size={16} />}
                        {attachment ? 'Ganti File' : 'Pilih File'}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                    />
                    <div className="flex-1">
                        {attachment ? (
                            <p className="text-[8px] md:text-[10px] text-green-600 font-bold flex items-center gap-1">
                                <CheckCircle size={9} /> File siap diunggah
                            </p>
                        ) : (
                            <p className="text-[8px] md:text-[10px] text-gray-400 leading-tight">
                                Format: JPG, PNG, PDF. <br/>Maksimal ukuran 2MB.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setRawReason('');
                        setRefinedReason('');
                        setStartDate('');
                        setEndDate('');
                        setAttachment(null);
                        setSelectedLeaveTypeId('');
                        if(fileInputRef.current) fileInputRef.current.value = '';
                        showToast("Form direset", "info");
                    }}
                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 md:py-4 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-[11px] md:text-sm"
                >
                    Reset
                </button>
                <button
                    type="submit"
                    disabled={selectedLeaveType?.requiresFile && !attachment}
                    className="flex-[2] bg-blue-600 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98] text-[11px] md:text-sm"
                >
                    <Send size={18} />
                    Kirim Pengajuan
                </button>
            </div>
            </form>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 p-2.5 md:p-4 rounded-2xl border border-blue-100 flex gap-2 md:gap-3">
            <div className="p-1 md:p-2 bg-blue-100 rounded-lg h-fit flex-shrink-0"><Info size={18} className="text-blue-600" /></div>
            <div>
                <h4 className="text-[11px] md:text-sm font-bold text-blue-800">Tips Pengajuan</h4>
                <p className="text-[9px] md:text-xs text-blue-700 leading-relaxed mt-0.5">
                    Gunakan fitur <b>Perhalus Alasan</b> untuk membuat bahasa pengajuan Anda lebih profesional di mata atasan.
                </p>
            </div>
        </div>
      </motion.div>

      {/* History List Section */}
      <div className="lg:col-span-7 space-y-3 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800">Riwayat Pengajuan</h2>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                <button 
                    onClick={handleSyncAll}
                    disabled={isSyncingAll}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] md:text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap ${
                        requests.some(r => r.syncStatus === 'pending') 
                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title="Sinkronkan data pending"
                >
                    {isSyncingAll ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    SINKRON
                </button>
                <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`p-1.5 md:p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh Data"
                >
                    <RefreshCw size={14} />
                </button>
                <div className="text-[8px] md:text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Total: {requests.length}
                </div>
            </div>
        </div>

        <div className="space-y-2.5 md:space-y-4">
            {sortedRequests.length === 0 ? (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 md:p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200"
            >
                <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText size={32} className="text-gray-300" />
                </div>
                <h3 className="text-gray-800 font-bold text-xs md:text-base">Belum Ada Pengajuan</h3>
                <p className="text-gray-500 text-[10px] md:text-xs mt-1">Semua pengajuan izin atau cuti Anda akan muncul di sini.</p>
            </motion.div>
            ) : (
            <AnimatePresence initial={false}>
                {sortedRequests.map((req, index) => (
                    <motion.div 
                        key={req.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <div className={`p-1.5 md:p-2.5 rounded-xl flex-shrink-0 ${
                                    req.type === RequestType.LEAVE ? 'bg-blue-50 text-blue-600' : 
                                    req.type === RequestType.PERMISSION ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                                }`}>
                                    <FileText size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{req.type}</span>
                                        {req.attachmentUrl && (
                                            <span className="bg-blue-50 text-blue-600 text-[7px] md:text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                                                <Upload size={8} /> DOKUMEN
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] md:text-sm text-gray-900 font-bold mt-0.5 truncate">
                                        {new Date(req.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(req.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    {req.syncStatus === 'pending' && (
                                        <span className="flex items-center gap-1 text-[7px] md:text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 animate-pulse">
                                            <RefreshCw size={8} className="animate-spin" /> PENDING
                                        </span>
                                    )}
                                    <span className={`flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase border whitespace-nowrap ${getStatusColor(req.status)}`}>
                                        {getStatusIcon(req.status)}
                                        {req.status}
                                    </span>
                                </div>
                                {req.status === RequestStatus.PENDING && onDelete && (
                                    <button 
                                        onClick={() => setConfirmDeleteId(req.id)}
                                        className="text-red-400 hover:text-red-600 p-1 transition-colors active:scale-90"
                                        title="Batalkan Pengajuan"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50/80 p-2.5 md:p-4 rounded-xl border border-gray-100 relative">
                            <p className="text-[10px] md:text-xs text-gray-700 leading-relaxed italic">
                                "{req.aiEnhancedReason || req.reason}"
                            </p>
                        </div>

                        {req.attachmentUrl && (
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <a 
                                    href={req.attachmentUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[8px] md:text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline bg-blue-50 px-2 py-1 rounded-lg active:scale-95"
                                >
                                    <FileText size={12} /> LIHAT LAMPIRAN
                                </a>
                                <span className="text-[8px] md:text-[10px] text-gray-400 font-medium whitespace-nowrap">ID: {(req.id || '').split('-')[1] || req.id}</span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
            )}
            <ConfirmModal 
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (confirmDeleteId && onDelete) {
                        onDelete(confirmDeleteId);
                        setConfirmDeleteId(null);
                    }
                }}
                title="Batalkan Pengajuan?"
                message="Apakah Anda yakin ingin membatalkan pengajuan ini? Data yang sudah dihapus tidak dapat dikembalikan."
            />
        </div>
      </div>
    </div>
  );
};

export default Requests;