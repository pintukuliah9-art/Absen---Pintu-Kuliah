
import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { getLocalDateString } from '../services/dateUtils';
import { Task, TaskStatus, WorkReport, User } from '../types';
import { Search, Calendar, CheckCircle, XCircle, Clock, FileText, Camera, ChevronRight, User as UserIcon, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminWorkMonitor: React.FC = () => {
    const { state } = useStore();
    const { tasks, workReports, users, appSettings } = state;
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [filterDept, setFilterDept] = useState('all');

    const filteredUsers = users.filter(u => {
        if (!u.isActive) return false;
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'all' || u.departmentId === filterDept;
        return matchesSearch && matchesDept;
    });

    const getUserReports = (userId: string) => {
        return workReports.filter(r => r.userId === userId && r.date === selectedDate);
    };

    const getUserTasks = (user: User) => {
        return tasks.filter(task => {
            if (!task.isActive) return false;
            if (task.assignedUserIds.includes(user.id)) return true;
            if (task.assignedRoleIds.includes(user.jobRoleId || '')) return true;
            if (task.assignedDepartmentIds.includes(user.departmentId || '')) return true;
            return false;
        });
    };

    const getCompletionStats = (user: User) => {
        const userTasks = getUserTasks(user);
        const reports = getUserReports(user.id);
        const completed = reports.filter(r => r.status === TaskStatus.DONE).length;
        const total = userTasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    };

    const statsSummary = useMemo(() => {
        let totalTasks = 0;
        let totalCompleted = 0;
        
        users.filter(u => u.isActive).forEach(user => {
            const userTasks = tasks.filter(task => {
                if (!task.isActive) return false;
                if (task.assignedUserIds.includes(user.id)) return true;
                if (task.assignedRoleIds.includes(user.jobRoleId || '')) return true;
                if (task.assignedDepartmentIds.includes(user.departmentId || '')) return true;
                return false;
            });
            
            const reports = workReports.filter(r => r.userId === user.id && r.date === selectedDate);
            const completed = reports.filter(r => r.status === TaskStatus.DONE).length;
            
            totalTasks += userTasks.length;
            totalCompleted += completed;
        });
        
        const percentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
        return { totalTasks, totalCompleted, percentage };
    }, [users, tasks, workReports, selectedDate]);

    return (
        <div className="space-y-8 fade-in pb-20 pt-16 md:pt-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter leading-none mb-2">Pemantauan Kerja</h2>
                    <p className="text-gray-500 text-sm font-medium">Pantau progres tugas harian dan tambahan seluruh tim.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 flex-1 md:flex-none">
                        <Calendar size={18} className="text-blue-500 ml-2" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-black outline-none p-2 w-full text-gray-800"
                        />
                    </div>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-xl hover:shadow-blue-100/20 transition-all">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
                        <FileText size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Laporan</p>
                        <h3 className="text-3xl font-black text-gray-900 leading-none">{statsSummary.totalCompleted}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-xl hover:shadow-emerald-100/20 transition-all">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rata-rata Selesai</p>
                        <h3 className="text-3xl font-black text-gray-900 leading-none">{statsSummary.percentage}%</h3>
                    </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6 sm:col-span-2 lg:col-span-1 hover:shadow-xl hover:shadow-orange-100/20 transition-all">
                    <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-inner">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tugas Aktif</p>
                        <h3 className="text-3xl font-black text-gray-900 leading-none">{statsSummary.totalTasks}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <Search size={18} className="text-gray-400 ml-2" />
                    <input 
                        type="text" 
                        placeholder="Cari nama karyawan..." 
                        className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <Filter size={18} className="text-gray-400 ml-2" />
                    <select 
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm font-black text-gray-800 appearance-none cursor-pointer"
                    >
                        <option value="all">Semua Departemen</option>
                        {(appSettings.departments || []).map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </div>
            </div>


            {/* User List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(user => {
                    const stats = getCompletionStats(user);
                    return (
                        <motion.div 
                            key={user.id}
                            whileHover={{ y: -4 }}
                            onClick={() => setSelectedUser(user)}
                            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <img 
                                        src={user.avatar} 
                                        alt={user.name} 
                                        className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-50 group-hover:border-blue-100 transition-all"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`; }}
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${stats.percentage === 100 ? 'bg-emerald-500' : stats.percentage > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                        {stats.percentage === 100 ? <CheckCircle size={10} className="text-white" /> : <Clock size={10} className="text-white" />}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-all">{user.name}</h4>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{user.position}</p>
                                </div>
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-400 transition-all" />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progres Tugas</span>
                                    <span className="text-sm font-black text-gray-900">{stats.percentage}%</span>
                                </div>
                                <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${stats.percentage}%` }}
                                        className={`h-full transition-all ${stats.percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-emerald-600">{stats.completed} Selesai</span>
                                    <span className="text-gray-400">{stats.total} Total</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedUser && (
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
                            onClick={() => setSelectedUser(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]"
                        >
                            <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <img 
                                        src={selectedUser.avatar} 
                                        alt={selectedUser.name} 
                                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random`; }}
                                    />
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter leading-none mb-1"><span>{selectedUser.name}</span></h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-widest"><span>Laporan Kerja</span></span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>{selectedDate}</span></span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm border border-gray-100 transition-all active:scale-90">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
                                {getUserTasks(selectedUser).length === 0 ? (
                                    <div className="p-12 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <FileText size={32} className="text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 text-sm font-black uppercase tracking-widest">Tidak ada tugas</p>
                                        <p className="text-gray-400 text-xs font-medium mt-1">Karyawan ini tidak memiliki tugas pada tanggal ini.</p>
                                    </div>
                                ) : (
                                    getUserTasks(selectedUser).map(task => {
                                        const report = getUserReports(selectedUser.id).find(r => r.taskId === task.id);
                                        const isDone = report?.status === TaskStatus.DONE;

                                        return (
                                            <div key={task.id} className={`p-6 rounded-[32px] border transition-all ${isDone ? 'bg-emerald-50/30 border-emerald-100 shadow-sm shadow-emerald-100/20' : 'bg-gray-50/30 border-gray-100'}`}>
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isDone ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                                            {isDone ? <CheckCircle size={24} /> : <Clock size={24} />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{task.title}</h4>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-gray-100">{task.category}</span>
                                                        </div>
                                                    </div>
                                                    {isDone && (
                                                        <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200">Selesai</span>
                                                    )}
                                                </div>

                                                {isDone && (
                                                    <div className="space-y-6 pt-6 border-t border-emerald-100/50">
                                                        {report.notes && (
                                                            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                                                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                                                    <FileText size={12}/> Catatan Kerja
                                                                </label>
                                                                <p className="text-sm text-gray-700 font-medium leading-relaxed italic">"{report.notes}"</p>
                                                            </div>
                                                        )}
                                                        {report.proofUrl && (
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block flex items-center gap-2">
                                                                    <Camera size={12}/> Bukti Foto
                                                                </label>
                                                                <div className="relative group/img">
                                                                    <img 
                                                                        src={report.proofUrl} 
                                                                        className="w-full max-h-80 object-cover rounded-3xl border-2 border-white shadow-lg" 
                                                                        alt="Proof" 
                                                                        referrerPolicy="no-referrer"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/broken/400/300';
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                            <Clock size={12} />
                                                            Dilaporkan pada: {new Date(report.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                )}

                                                {!isDone && (
                                                    <div className="text-center p-8 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Belum ada laporan</p>
                                                        <p className="text-gray-400 text-[10px] font-medium mt-1">Tugas ini masih dalam proses pengerjaan.</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AdminWorkMonitor;
