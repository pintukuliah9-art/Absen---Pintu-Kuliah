
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Task, TASK_CATEGORIES } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Users, Briefcase, Building, Info, Search, Filter, ClipboardList, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

const AdminTasks: React.FC = () => {
    const { state, addTask, updateTask, deleteTask } = useStore();
    const { tasks, users, appSettings } = state;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Task>>({
        title: '',
        description: '',
        category: TASK_CATEGORIES.DAILY,
        assignedUserIds: [],
        assignedRoleIds: [],
        assignedDepartmentIds: [],
        isActive: true
    });

    const openAddModal = () => {
        setEditingTask(null);
        setFormData({
            title: '',
            description: '',
            category: TASK_CATEGORIES.DAILY,
            assignedUserIds: [],
            assignedRoleIds: [],
            assignedDepartmentIds: [],
            isActive: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormData({ ...task });
        setIsModalOpen(true);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        const now = new Date().toISOString();
        
        try {
            if (editingTask) {
                await updateTask({
                    ...editingTask,
                    ...formData,
                } as Task);
            } else {
                await addTask({
                    ...formData,
                    id: `task-${Date.now()}`,
                    createdAt: now,
                    createdBy: state.currentUser?.id || 'admin',
                } as Task);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getAssignedCount = (task: Task) => {
        const uniqueUserIds = new Set<string>(task.assignedUserIds);
        
        // Add users from assigned roles
        task.assignedRoleIds.forEach(roleId => {
            users.filter(u => u.jobRoleId === roleId).forEach(u => uniqueUserIds.add(u.id));
        });
        
        // Add users from assigned departments
        task.assignedDepartmentIds.forEach(deptId => {
            users.filter(u => u.departmentId === deptId).forEach(u => uniqueUserIds.add(u.id));
        });
        
        return uniqueUserIds.size;
    };

    const toggleAssignment = (type: 'user' | 'role' | 'department', id: string) => {
        const fieldMap = {
            user: 'assignedUserIds',
            role: 'assignedRoleIds',
            department: 'assignedDepartmentIds'
        };
        const field = fieldMap[type] as keyof typeof formData;
        const currentIds = formData[field] as string[];
        
        if (currentIds.includes(id)) {
            setFormData({ ...formData, [field]: currentIds.filter(i => i !== id) });
        } else {
            setFormData({ ...formData, [field]: [...currentIds, id] });
        }
    };

    return (
        <div className="space-y-8 fade-in pb-20 pt-16 md:pt-0">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter">Kelola Tugas</h2>
                    <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">Buat dan tugaskan pekerjaan harian atau tambahan ke tim Anda.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Tambah Tugas Baru
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tugas', value: tasks.length, color: 'gray', icon: ClipboardList },
                    { label: 'Tugas Harian', value: tasks.filter(t => t.category === TASK_CATEGORIES.DAILY).length, color: 'emerald', icon: CheckCircle },
                    { label: 'Tugas Tambahan', value: tasks.filter(t => t.category === TASK_CATEGORIES.ADDITIONAL).length, color: 'blue', icon: Plus },
                    { label: 'Nonaktif', value: tasks.filter(t => !t.isActive).length, color: 'red', icon: XCircle },
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-${stat.color}-200 transition-all`}>
                        <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 sticky top-14 md:top-0 z-20">
                <div className="flex-1 flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                    <Search size={20} className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari judul atau deskripsi tugas..." 
                        className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                    <Filter size={18} className="text-gray-400" />
                    <select 
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest text-gray-700 min-w-[140px] appearance-none cursor-pointer"
                    >
                        <option value="all">Semua Kategori</option>
                        {Object.entries(TASK_CATEGORIES).map(([key, value]) => (
                            <option key={key} value={value}>{value}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

                {filteredTasks.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">Tidak Ada Tugas Ditemukan</h3>
                        <p className="text-gray-400 text-sm font-medium mt-1">Coba ubah kata kunci pencarian atau filter Anda.</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onEdit={openEditModal} 
                            onDelete={(id) => setConfirmDeleteId(id)} 
                            assignedCount={getAssignedCount(task)}
                        />
                    ))
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-20">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                                        {editingTask ? 'Edit Tugas' : 'Tambah Tugas'}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Konfigurasi Penugasan Kerja</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl transition-all text-gray-400 hover:text-gray-900 shadow-sm border border-gray-100">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form id="userForm" onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Judul Tugas</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.title}
                                            onChange={e => setFormData({...formData, title: e.target.value})}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="Contoh: Laporan Penjualan Harian"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Deskripsi (Opsional)</label>
                                        <textarea 
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[100px] resize-none"
                                            placeholder="Jelaskan detail tugas ini..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Kategori</label>
                                        <select 
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none bg-white"
                                        >
                                            {Object.entries(TASK_CATEGORIES).map(([key, value]) => (
                                                <option key={key} value={value}>{value}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                                            className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                                        </button>
                                        <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Status Aktif</span>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <Users size={16} className="text-blue-600" /> Penugasan Tim
                                    </h4>
                                    
                                    {/* By Department */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                                            <Building size={12}/> Berdasarkan Departemen
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {(appSettings.departments || []).map(dept => (
                                                <button 
                                                    key={dept.id}
                                                    type="button"
                                                    onClick={() => toggleAssignment('department', dept.id)}
                                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.assignedDepartmentIds?.includes(dept.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}
                                                >
                                                    {dept.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* By Role */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                                            <Briefcase size={12}/> Berdasarkan Jabatan
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {appSettings.jobRoles.map(role => (
                                                <button 
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => toggleAssignment('role', role.id)}
                                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.assignedRoleIds?.includes(role.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'}`}
                                                >
                                                    {role.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* By User */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                                            <Users size={12}/> Karyawan Spesifik
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {users.filter(u => u.isActive).map(u => (
                                                <button 
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => toggleAssignment('user', u.id)}
                                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.assignedUserIds?.includes(u.id) ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'}`}
                                                >
                                                    {u.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </form>

                            <div className="p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3 bg-white sticky bottom-0 z-20">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    form="userForm"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        editingTask ? 'Simpan Perubahan' : 'Buat Tugas'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal 
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (confirmDeleteId) {
                        deleteTask(confirmDeleteId);
                        setConfirmDeleteId(null);
                    }
                }}
                title="Hapus Tugas?"
                message="Apakah Anda yakin ingin menghapus tugas ini? Data yang sudah dihapus tidak dapat dikembalikan."
            />
        </div>
    );
};

const TaskCard: React.FC<{ task: Task, onEdit: (t: Task) => void, onDelete: (id: string) => void, assignedCount: number }> = ({ task, onEdit, onDelete, assignedCount }) => {
    const isDaily = task.category === TASK_CATEGORIES.DAILY;
    
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-[40px] border transition-all group relative overflow-hidden flex flex-col h-full ${task.isActive ? 'bg-white border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1' : 'bg-gray-50 border-gray-200 opacity-60 grayscale'}`}
        >
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDaily ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {isDaily ? <CheckCircle size={28} /> : <Plus size={28} />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                        onClick={() => onEdit(task)}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDaily ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {task.category}
                    </span>
                    {!task.isActive && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-200 px-2 py-1 rounded-lg">Nonaktif</span>}
                </div>
                <h4 className="font-black text-gray-900 text-xl leading-tight mb-2 group-hover:text-blue-600 transition-all tracking-tight">{task.title}</h4>
                <p className="text-xs text-gray-500 font-bold line-clamp-3 mb-8 leading-relaxed">{task.description || 'Tidak ada deskripsi detail untuk tugas ini.'}</p>
            </div>

            <div className="pt-6 border-t border-gray-50 flex items-center justify-between relative z-10 mt-auto">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2.5">
                        {[...Array(Math.min(3, assignedCount))].map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-xl border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
                                <Users size={14} className="text-gray-400" />
                            </div>
                        ))}
                        {assignedCount > 3 && (
                            <div className="w-8 h-8 rounded-xl border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                +{assignedCount - 3}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Penerima</span>
                        <span className="text-xs font-black text-gray-900 leading-none">{assignedCount} Orang</span>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    {task.assignedDepartmentIds.length > 0 && (
                        <div title="Dept" className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl border border-gray-100"><Building size={14}/></div>
                    )}
                    {task.assignedRoleIds.length > 0 && (
                        <div title="Jabatan" className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl border border-gray-100"><Briefcase size={14}/></div>
                    )}
                    {task.assignedUserIds.length > 0 && (
                        <div title="Karyawan" className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl border border-gray-100"><Users size={14}/></div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


export default AdminTasks;
