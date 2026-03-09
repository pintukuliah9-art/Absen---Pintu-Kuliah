
import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Task, TaskCategory, TaskStatus, WorkReport, User } from '../types';
import { Search, Calendar, CheckCircle, XCircle, Clock, FileText, Camera, ChevronRight, User as UserIcon, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminWorkMonitor: React.FC = () => {
    const { state } = useStore();
    const { tasks, workReports, users, appSettings } = state;
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
        <div className="space-y-8 fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Pemantauan Kerja</h2>
                    <p className="text-gray-500 text-sm font-medium">Pantau progres tugas harian dan tambahan seluruh karyawan.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 flex-1 md:flex-none">
                        <Calendar size={18} className="text-gray-400 ml-2" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-black outline-none p-2 w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Laporan</p>
                        <h3 className="text-3xl font-black text-gray-900">{statsSummary.totalCompleted}</h3>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rata-rata Selesai</p>
                        <h3 className="text-3xl font-black text-gray-900">{statsSummary.percentage}%</h3>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tugas Aktif</p>
                        <h3 className="text-3xl font-black text-gray-900">{statsSummary.totalTasks}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <Search size={18} className="text-gray-400 ml-2" />
                    <input 
                        type="text" 
                        placeholder="Cari nama karyawan..." 
                        className="flex-1 bg-transparent outline-none text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <Filter size={18} className="text-gray-400 ml-2" />
                    <select 
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm font-bold"
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                            className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img 
                                        src={selectedUser.avatar} 
                                        alt={selectedUser.name} 
                                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm"
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random`; }}
                                    />
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{selectedUser.name}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Laporan Kerja: {selectedDate}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="p-3 hover:bg-white rounded-2xl transition-all text-gray-400 hover:text-gray-900 shadow-sm border border-transparent hover:border-gray-100">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-6">
                                {getUserTasks(selectedUser).length === 0 ? (
                                    <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 text-sm font-bold">Karyawan ini tidak memiliki tugas pada tanggal ini.</p>
                                    </div>
                                ) : (
                                    getUserTasks(selectedUser).map(task => {
                                        const report = getUserReports(selectedUser.id).find(r => r.taskId === task.id);
                                        const isDone = report?.status === TaskStatus.DONE;

                                        return (
                                            <div key={task.id} className={`p-6 rounded-3xl border transition-all ${isDone ? 'bg-emerald-50/30 border-emerald-100' : 'bg-gray-50/30 border-gray-100'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            {isDone ? <CheckCircle size={20} /> : <Clock size={20} />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-gray-900 text-lg leading-tight">{task.title}</h4>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{task.category}</span>
                                                        </div>
                                                    </div>
                                                    {isDone && (
                                                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100">Selesai</span>
                                                    )}
                                                </div>

                                                {isDone && (
                                                    <div className="space-y-4 pt-4 border-t border-emerald-100/50">
                                                        {report.notes && (
                                                            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                                                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 block flex items-center gap-1"><FileText size={10}/> Catatan Kerja</label>
                                                                <p className="text-sm text-gray-700 font-medium leading-relaxed italic">"{report.notes}"</p>
                                                            </div>
                                                        )}
                                                        {report.proofUrl && (
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block flex items-center gap-1"><Camera size={10}/> Bukti Foto</label>
                                                                <img 
                                                                    src={report.proofUrl} 
                                                                    className="w-full max-h-64 object-cover rounded-2xl border border-emerald-100 shadow-sm" 
                                                                    alt="Proof" 
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right">
                                                            Dilaporkan pada: {new Date(report.submittedAt).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                )}

                                                {!isDone && (
                                                    <div className="text-center p-4 text-gray-400 text-xs font-bold italic">
                                                        Belum ada laporan untuk tugas ini.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminWorkMonitor;
