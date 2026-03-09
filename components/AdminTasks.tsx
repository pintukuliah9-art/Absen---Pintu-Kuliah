
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Task, TaskCategory } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Users, Briefcase, Building, Info, Search, Filter, ClipboardList, Clock } from 'lucide-react';
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
        category: TaskCategory.DAILY,
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
            category: TaskCategory.DAILY,
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const now = new Date().toISOString();
        
        if (editingTask) {
            updateTask({
                ...editingTask,
                ...formData,
            } as Task);
        } else {
            addTask({
                ...formData,
                id: `task-${Date.now()}`,
                createdAt: now,
                createdBy: state.currentUser?.id || 'admin',
            } as Task);
        }
        setIsModalOpen(false);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | TaskCategory>('all');

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             task.description.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="space-y-8 fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Kelola Tugas</h2>
                    <p className="text-gray-500 text-sm font-medium">Buat dan tugaskan pekerjaan harian atau tambahan ke karyawan.</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Tambah Tugas Baru
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tugas</p>
                    <h3 className="text-3xl font-black text-gray-900">{tasks.length}</h3>
                </div>
                <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Tugas Harian</p>
                    <h3 className="text-3xl font-black text-emerald-700">{tasks.filter(t => t.category === TaskCategory.DAILY).length}</h3>
                </div>
                <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 shadow-sm">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tugas Tambahan</p>
                    <h3 className="text-3xl font-black text-blue-700">{tasks.filter(t => t.category === TaskCategory.ADDITIONAL).length}</h3>
                </div>
                <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nonaktif</p>
                    <h3 className="text-3xl font-black text-gray-400">{tasks.filter(t => !t.isActive).length}</h3>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Search size={18} className="text-gray-400 ml-2" />
                    <input 
                        type="text" 
                        placeholder="Cari judul atau deskripsi tugas..." 
                        className="flex-1 bg-transparent outline-none text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <Filter size={18} className="text-gray-400 ml-2" />
                    <select 
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value as any)}
                        className="flex-1 bg-transparent outline-none text-sm font-bold"
                    >
                        <option value="all">Semua Kategori</option>
                        <option value={TaskCategory.DAILY}>Tugas Harian</option>
                        <option value={TaskCategory.ADDITIONAL}>Tugas Tambahan</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                            className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                                        {editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Konfigurasi Penugasan Kerja</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all text-gray-400 hover:text-gray-900 shadow-sm border border-transparent hover:border-gray-100">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
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
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[100px]"
                                            placeholder="Jelaskan detail tugas ini..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Kategori</label>
                                        <select 
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        >
                                            <option value={TaskCategory.DAILY}>Tugas Harian</option>
                                            <option value={TaskCategory.ADDITIONAL}>Tugas Tambahan</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                                            className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                                        </button>
                                        <span className="text-sm font-black text-gray-700">Status Aktif</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Penugasan (Pilih Salah Satu atau Kombinasi)</h4>
                                    
                                    {/* By Department */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest"><Building size={12}/> Berdasarkan Departemen</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(appSettings.departments || []).map(dept => (
                                                <button 
                                                    key={dept.id}
                                                    type="button"
                                                    onClick={() => toggleAssignment('department', dept.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.assignedDepartmentIds?.includes(dept.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200'}`}
                                                >
                                                    {dept.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* By Role */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest"><Briefcase size={12}/> Berdasarkan Jabatan</label>
                                        <div className="flex flex-wrap gap-2">
                                            {appSettings.jobRoles.map(role => (
                                                <button 
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => toggleAssignment('role', role.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.assignedRoleIds?.includes(role.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200'}`}
                                                >
                                                    {role.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* By User */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest"><Users size={12}/> Karyawan Spesifik</label>
                                        <div className="flex flex-wrap gap-2">
                                            {users.filter(u => u.isActive).map(u => (
                                                <button 
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => toggleAssignment('user', u.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.assignedUserIds?.includes(u.id) ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-gray-500 border-gray-100 hover:border-emerald-200'}`}
                                                >
                                                    {u.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100"
                                    >
                                        {editingTask ? 'Simpan Perubahan' : 'Buat Tugas'}
                                    </button>
                                </div>
                            </form>
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
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-[32px] border transition-all group relative overflow-hidden flex flex-col h-full ${task.isActive ? 'bg-white border-gray-100 hover:shadow-xl hover:shadow-gray-100' : 'bg-gray-50 border-gray-200 opacity-60 grayscale'}`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${task.category === TaskCategory.DAILY ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {task.category === TaskCategory.DAILY ? <CheckCircle size={24} /> : <Plus size={24} />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                        onClick={() => onEdit(task)}
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${task.category === TaskCategory.DAILY ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {task.category === TaskCategory.DAILY ? 'Harian' : 'Tambahan'}
                    </span>
                    {!task.isActive && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-200 px-2 py-0.5 rounded-full">Nonaktif</span>}
                </div>
                <h4 className="font-black text-gray-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-all">{task.title}</h4>
                <p className="text-xs text-gray-500 font-medium line-clamp-3 mb-6 leading-relaxed">{task.description || 'Tidak ada deskripsi.'}</p>
            </div>

            <div className="pt-6 border-t border-gray-50 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {[...Array(Math.min(3, assignedCount))].map((_, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                                <Users size={12} className="text-gray-400" />
                            </div>
                        ))}
                        {assignedCount > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[8px] font-black text-gray-400">
                                +{assignedCount - 3}
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {assignedCount} Penerima
                    </span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                    {task.assignedDepartmentIds.length > 0 && (
                        <div title="Dept" className="p-1 bg-gray-50 text-gray-400 rounded-lg"><Building size={12}/></div>
                    )}
                    {task.assignedRoleIds.length > 0 && (
                        <div title="Jabatan" className="p-1 bg-gray-50 text-gray-400 rounded-lg"><Briefcase size={12}/></div>
                    )}
                    {task.assignedUserIds.length > 0 && (
                        <div title="Karyawan" className="p-1 bg-gray-50 text-gray-400 rounded-lg"><Users size={12}/></div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminTasks;
