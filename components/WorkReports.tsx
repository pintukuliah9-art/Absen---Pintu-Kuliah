
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { Task, TaskCategory, TaskStatus, WorkReport } from '../types';
import { CheckCircle2, Circle, Clock, Camera, FileText, Send, AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WorkReports: React.FC = () => {
    const { state, submitWorkReport, updateWorkReport } = useStore();
    const { tasks, workReports, currentUser } = state;
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isReporting, setIsReporting] = useState<string | null>(null); // Task ID being reported
    const [reportForm, setReportForm] = useState({
        notes: '',
        proofUrl: ''
    });

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

    return (
        <div className="space-y-8 fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Laporan Kerja</h2>
                    <p className="text-gray-500 text-sm font-medium">Laporkan progres tugas harian dan tambahan Anda.</p>
                </div>
                <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400 ml-2" />
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-black outline-none p-2"
                    />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tugas</p>
                    <h3 className="text-3xl font-black text-gray-900">{assignedTasks.length}</h3>
                </div>
                <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Selesai</p>
                    <h3 className="text-3xl font-black text-emerald-700">
                        {assignedTasks.filter(t => getTaskStatus(t.id) === TaskStatus.DONE).length}
                    </h3>
                </div>
                <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 shadow-sm">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Belum Selesai</p>
                    <h3 className="text-3xl font-black text-orange-700">
                        {assignedTasks.filter(t => getTaskStatus(t.id) === TaskStatus.TODO).length}
                    </h3>
                </div>
            </div>

            {/* Success Toast */}
            <AnimatePresence>
                {isSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-emerald-200 flex items-center gap-3"
                    >
                        <CheckCircle2 size={20} /> Laporan Berhasil Dikirim!
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Tasks Section */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={14} /> Tugas Harian
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {assignedTasks.filter(t => t.category === TaskCategory.DAILY).length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm font-bold">Tidak ada tugas harian yang ditugaskan.</p>
                            </div>
                        ) : (
                            assignedTasks.filter(t => t.category === TaskCategory.DAILY).map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    status={getTaskStatus(task.id)} 
                                    onReport={() => handleStartReport(task)}
                                    report={dailyReports.find(r => r.taskId === task.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Additional Tasks Section */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle size={14} /> Tugas Tambahan
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {assignedTasks.filter(t => t.category === TaskCategory.ADDITIONAL).length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm font-bold">Tidak ada tugas tambahan saat ini.</p>
                            </div>
                        ) : (
                            assignedTasks.filter(t => t.category === TaskCategory.ADDITIONAL).map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    status={getTaskStatus(task.id)} 
                                    onReport={() => handleStartReport(task)}
                                    report={dailyReports.find(r => r.taskId === task.id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {isReporting && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsReporting(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Laporan Tugas</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                                    {tasks.find(t => t.id === isReporting)?.title}
                                </p>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Catatan Kerja</label>
                                    <textarea 
                                        value={reportForm.notes}
                                        onChange={e => setReportForm({...reportForm, notes: e.target.value})}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[120px]"
                                        placeholder="Apa yang telah Anda kerjakan?"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Bukti Foto (Opsional)</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                                                {reportForm.proofUrl ? (
                                                    <img src={reportForm.proofUrl} className="w-full h-full object-cover rounded-2xl" alt="Proof" />
                                                ) : (
                                                    <>
                                                        <Camera className="text-gray-400" size={24} />
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ambil Foto / Upload</span>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                        {reportForm.proofUrl && (
                                            <button 
                                                onClick={() => setReportForm({...reportForm, proofUrl: ''})}
                                                className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
                                            >
                                                Hapus
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsReporting(null)}
                                        className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={() => handleSubmitReport(isReporting)}
                                        className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} /> Kirim Laporan
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TaskItem: React.FC<{ task: Task, status: TaskStatus, onReport: () => void, report?: WorkReport }> = ({ task, status, onReport, report }) => {
    const isDone = status === TaskStatus.DONE;

    return (
        <motion.div 
            whileHover={{ x: 4 }}
            onClick={onReport}
            className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-center gap-4 group ${isDone ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-gray-100'}`}
        >
            <div className={`p-3 rounded-2xl transition-all ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
            </div>
            <div className="flex-1">
                <h4 className={`font-black text-sm tracking-tight transition-all ${isDone ? 'text-emerald-800 line-through opacity-60' : 'text-gray-900'}`}>
                    {task.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {task.description ? (task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description) : 'Klik untuk lapor progres'}
                    </p>
                    {isDone && report && (
                        <>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10}/> {new Date(report.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </>
                    )}
                </div>
            </div>
            <div className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isDone ? 'text-emerald-400' : 'text-blue-400'}`}>
                <ChevronRight size={20} />
            </div>
        </motion.div>
    );
};

export default WorkReports;
