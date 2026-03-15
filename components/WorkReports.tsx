import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { Task, TASK_CATEGORIES, TaskStatus, WorkReport } from '../types';
import { getLocalDateString } from '../services/dateUtils';
import { CheckCircle2, Circle, Clock, Camera, FileText, Send, AlertCircle, Calendar, ChevronRight, ClipboardList, Sparkles, ArrowRight, Trash2, Image as ImageIcon, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WorkReports: React.FC = () => {
    const { state, submitWorkReport, updateWorkReport } = useStore();
    const { tasks, workReports, currentUser } = state;

    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [isReporting, setIsReporting] = useState<string | null>(null); // Task ID being reported
    const [reportForm, setReportForm] = useState({
        notes: '',
        proofUrl: ''
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Filter tasks assigned to current user
    const assignedTasks = tasks.filter(task => {
        if (!task.isActive) return false;
        
        // Assigned to specific user
        if (task.assignedUserIds.includes(currentUser?.id || '')) return true;
        
        // Assigned to user's role
        if (task.assignedRoleIds.includes(currentUser?.jobRoleId || '')) return true;
        
        // Assigned to user's department
        if (task.assignedDepartmentIds.includes(currentUser?.departmentId || '')) return true;
        
        return false;
    });

    // Get reports for the selected date
    const dailyReports = workReports.filter(r => r.userId === currentUser?.id && r.date === selectedDate);

    const getTaskStatus = (taskId: string) => {
        const report = dailyReports.find(r => r.taskId === taskId);
        return report ? report.status : TaskStatus.TODO;
    };

    const handleStartReport = (task: Task) => {
        const existing = dailyReports.find(r => r.taskId === task.id);
        setReportForm({
            notes: existing?.notes || '',
            proofUrl: existing?.proofUrl || ''
        });
        setIsReporting(task.id);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReportForm({ ...reportForm, proofUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmitReport = (taskId: string) => {
        const existing = dailyReports.find(r => r.taskId === taskId);
        const now = new Date().toISOString();
        
        const reportData: WorkReport = {
            id: existing?.id || `report-${Date.now()}`,
            userId: currentUser?.id || '',
            taskId: taskId,
            date: selectedDate,
            status: TaskStatus.DONE,
            notes: reportForm.notes,
            proofUrl: reportForm.proofUrl,
            submittedAt: now
        };

        if (existing) {
            updateWorkReport(reportData);
        } else {
            submitWorkReport(reportData);
        }
        setIsReporting(null);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
    };

    const filteredTasks = assignedTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const dailyTasks = filteredTasks.filter(t => t.category === TASK_CATEGORIES.DAILY);
    const otherTasks = filteredTasks.filter(t => t.category !== TASK_CATEGORIES.DAILY);

    return (
        <div className="space-y-6 md:space-y-12 fade-in pb-32 md:pb-12 px-3 md:px-0 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-8">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-1 md:mb-2">
                        Laporan <span className="text-blue-600">Kerja</span>
                    </h2>
                    <p className="text-slate-400 text-[8px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3">
                        <Sparkles size={12} className="text-amber-400" />
                        Dokumentasikan progres harian
                    </p>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto"
                >
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                            <Search size={16} />
                        </div>
                        <input 
                            type="text"
                            placeholder="Cari tugas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm"
                        />
                    </div>

                    {/* Date Picker */}
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 w-full sm:w-auto">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Calendar size={16} />
                        </div>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-[10px] font-black outline-none flex-1 sm:flex-none uppercase tracking-widest pr-2"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-8">
                {[
                    { label: 'Total Tugas', value: assignedTasks.length, icon: ClipboardList, color: 'slate', bg: 'bg-white' },
                    { label: 'Selesai', value: assignedTasks.filter(t => getTaskStatus(t.id) === TaskStatus.DONE).length, icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-50' },
                    { label: 'Pending', value: assignedTasks.filter(t => getTaskStatus(t.id) === TaskStatus.TODO).length, icon: Clock, color: 'amber', bg: 'bg-amber-50' }
                ].map((stat, idx) => (
                    <motion.div 
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`${stat.bg} p-4 md:p-8 rounded-3xl border ${stat.color === 'slate' ? 'border-slate-100' : `border-${stat.color}-100`} shadow-sm flex flex-row sm:flex-col justify-between items-center sm:items-start group hover:shadow-xl transition-all duration-500`}
                    >
                        <div className="flex flex-col">
                            <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${stat.color === 'slate' ? 'text-slate-400' : `text-${stat.color}-600`}`}>
                                {stat.label}
                            </p>
                            <h3 className={`text-2xl md:text-5xl font-black tracking-tighter group-hover:scale-110 transition-transform origin-left ${stat.color === 'slate' ? 'text-slate-900' : `text-${stat.color}-700`}`}>
                                {stat.value}
                            </h3>
                        </div>
                        <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center sm:mt-6 transition-all duration-500 ${stat.color === 'slate' ? 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white' : `bg-white text-${stat.color}-500 shadow-lg shadow-${stat.color}-100`}`}>
                            <stat.icon size={20} className="md:w-7 md:h-7" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Success Notification */}
            <AnimatePresence>
                {isSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-xs shadow-2xl flex items-center gap-4 whitespace-nowrap border border-white/10"
                    >
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="uppercase tracking-[0.2em]">Laporan Berhasil Terkirim</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tasks Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
                {/* Daily Tasks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-4 px-2 md:px-4">
                        <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3">
                            <Clock size={14} className="text-blue-500" /> Tugas Harian
                        </h3>
                        <span className="bg-blue-50 text-blue-600 text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                            {dailyTasks.length} Item
                        </span>
                    </div>
                    <div className="space-y-3">
                        {dailyTasks.length === 0 ? (
                            <div className="p-8 md:p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Tidak ada tugas harian</p>
                            </div>
                        ) : (
                            dailyTasks.map((task, idx) => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    index={idx}
                                    status={getTaskStatus(task.id)} 
                                    onReport={() => handleStartReport(task)}
                                    report={dailyReports.find(r => r.taskId === task.id)}
                                />
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Other Tasks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center justify-between mb-4 px-2 md:px-4">
                        <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3">
                            <AlertCircle size={14} className="text-purple-500" /> Tugas Tambahan
                        </h3>
                        <span className="bg-purple-50 text-purple-600 text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                            {otherTasks.length} Item
                        </span>
                    </div>
                    <div className="space-y-3">
                        {otherTasks.length === 0 ? (
                            <div className="p-8 md:p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Tidak ada tugas tambahan</p>
                            </div>
                        ) : (
                            otherTasks.map((task, idx) => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    index={idx}
                                    status={getTaskStatus(task.id)} 
                                    onReport={() => handleStartReport(task)}
                                    report={dailyReports.find(r => r.taskId === task.id)}
                                />
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {isReporting && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6"
                    >
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsReporting(null)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 100 }}
                            className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden max-h-[95vh] flex flex-col border border-white/20"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-12 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 relative">
                                <div className="flex items-center justify-between mb-4 md:mb-6">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="p-3 md:p-4 bg-blue-600 text-white rounded-xl md:rounded-[1.5rem] shadow-xl shadow-blue-100">
                                            <ClipboardList size={20} className="md:w-6 md:h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter"><span>Laporan Tugas</span></h3>
                                            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1"><span>Submit progres pekerjaan Anda</span></p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsReporting(null)}
                                        className="p-3 md:p-4 bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90 shadow-sm border border-slate-100"
                                    >
                                        <ChevronRight size={20} className="rotate-90 md:w-6 md:h-6" />
                                    </button>
                                </div>
                                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                                    <p className="text-[8px] md:text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-1 md:mb-2"><span>Tugas Terpilih:</span></p>
                                    <p className="text-sm md:text-lg font-black text-slate-900 tracking-tight">
                                        <span>{tasks.find(t => t.id === isReporting)?.title}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 md:p-12 space-y-6 md:space-y-10 overflow-y-auto no-scrollbar flex-1">
                                <div className="space-y-3 md:space-y-4">
                                    <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 md:gap-3">
                                        <FileText size={12} className="text-blue-500" /> <span>Catatan Pekerjaan</span>
                                    </label>
                                    <textarea 
                                        value={reportForm.notes}
                                        onChange={e => setReportForm({...reportForm, notes: e.target.value})}
                                        className="w-full px-5 md:px-8 py-4 md:py-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[2.5rem] text-xs md:text-sm font-bold focus:ring-8 focus:ring-blue-500/5 outline-none transition-all min-h-[120px] md:min-h-[180px] placeholder:text-slate-300 shadow-inner"
                                        placeholder="Tuliskan detail pekerjaan yang telah diselesaikan..."
                                    />
                                </div>

                                <div className="space-y-3 md:space-y-4">
                                    <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 md:gap-3">
                                        <Camera size={12} className="text-purple-500" /> <span>Bukti Dokumentasi</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                        <label className="cursor-pointer group">
                                            <div className="w-full h-32 md:h-48 border-2 md:border-4 border-dashed border-slate-100 rounded-2xl md:rounded-[2.5rem] flex flex-col items-center justify-center gap-2 md:gap-4 hover:bg-slate-50 hover:border-blue-200 transition-all overflow-hidden relative shadow-inner">
                                                {reportForm.proofUrl ? (
                                                    <div className="relative w-full h-full">
                                                        <img 
                                                            src={reportForm.proofUrl} 
                                                            className="w-full h-full object-cover" 
                                                            alt="Proof" 
                                                            referrerPolicy="no-referrer"
                                                        />
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                            <div className="p-3 md:p-4 bg-white rounded-full text-slate-900 shadow-2xl">
                                                                <RefreshCw size={20} className="md:w-6 md:h-6" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="p-3 md:p-5 bg-white text-slate-300 rounded-xl md:rounded-[1.5rem] group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
                                                            <ImageIcon size={24} className="md:w-8 md:h-8" />
                                                        </div>
                                                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Upload Foto Bukti</span>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                        
                                        {reportForm.proofUrl ? (
                                            <div className="bg-rose-50 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-rose-100 flex flex-col items-center justify-center gap-2 md:gap-4 text-center">
                                                <div className="p-2 md:p-4 bg-white rounded-xl text-rose-500 shadow-sm">
                                                    <Trash2 size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <p className="text-[8px] md:text-[10px] font-black text-rose-600 uppercase tracking-widest">Hapus Foto?</p>
                                                <button 
                                                    onClick={() => setReportForm({...reportForm, proofUrl: ''})}
                                                    className="px-4 md:px-6 py-1.5 md:py-2 bg-rose-600 text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95"
                                                >
                                                    Hapus Sekarang
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center gap-2 md:gap-4 text-center opacity-50">
                                                <div className="p-2 md:p-4 bg-white rounded-xl text-slate-300 shadow-sm">
                                                    <AlertCircle size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum Ada Foto</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 md:p-12 bg-slate-50 flex flex-col sm:flex-row gap-3 md:gap-4 flex-shrink-0">
                                 <button 
                                    onClick={() => setIsReporting(null)}
                                    className="flex-1 px-6 md:px-10 py-4 md:py-6 bg-white border border-slate-100 text-slate-500 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                                >
                                    <span>Batalkan</span>
                                </button>
                                <button 
                                    onClick={() => handleSubmitReport(isReporting)}
                                    className="flex-[2] px-6 md:px-10 py-4 md:py-6 bg-blue-600 text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-blue-700 transition-all active:scale-95 shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 md:gap-4"
                                >
                                    <Send size={18} className="md:w-5 md:h-5" /> <span>Kirim Laporan</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TaskItem: React.FC<{ task: Task, status: TaskStatus, onReport: () => void, report?: WorkReport, index: number }> = ({ task, status, onReport, report, index }) => {
    const isDone = status === TaskStatus.DONE;

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ x: 4 }}
            onClick={onReport}
            className={`p-4 md:p-8 rounded-2xl md:rounded-[3rem] border transition-all cursor-pointer flex items-center gap-4 md:gap-8 group active:scale-[0.98] relative overflow-hidden ${isDone ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl'}`}
        >
            <div className={`p-3 md:p-5 rounded-xl md:rounded-[1.5rem] transition-all duration-500 flex-shrink-0 relative z-10 ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg'}`}>
                {isDone ? <CheckCircle2 size={20} className="md:w-7 md:h-7" /> : <Circle size={20} className="md:w-7 md:h-7" />}
            </div>
            
            <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                    <h4 className={`font-black text-sm md:text-lg tracking-tight transition-all truncate ${isDone ? 'text-emerald-800 line-through opacity-40' : 'text-slate-900'}`}>
                        {task.title}
                    </h4>
                    {isDone && (
                        <span className="bg-emerald-100 text-emerald-700 text-[6px] md:text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Done</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <p className={`text-[8px] md:text-[11px] font-bold uppercase tracking-widest truncate ${isDone ? 'text-emerald-600/50' : 'text-slate-400'}`}>
                        {task.description ? (task.description.length > 40 ? task.description.substring(0, 40) + '...' : task.description) : 'Klik untuk lapor'}
                    </p>
                    {isDone && report && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-1 h-1 bg-emerald-300 rounded-full"></div>
                            <span className="text-[8px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10}/> {new Date(report.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 relative z-10 ${isDone ? 'text-emerald-400' : 'text-blue-500'}`}>
                <ArrowRight size={18} className="md:w-6 md:h-6" />
            </div>

            {/* Background Accent */}
            {!isDone && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            )}
        </motion.div>
    );
};

export default WorkReports;
