
import React, { useState, useRef } from 'react';
import { User, AttendanceRecord, AttendanceStatus, JobRole } from '../types';
import { Search, Plus, MoreVertical, Edit2, Power, Trash2, Mail, Phone, Calendar, Clock, X, Check, FileText, Upload, MapPin, User as UserIcon, Briefcase, File, Eye, Trash, FolderOpen, AlertCircle, Camera, ShieldAlert, Fingerprint, RefreshCw } from 'lucide-react';
import { useStore } from '../services/store';
import { getLocalDateString } from '../services/dateUtils';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

interface AdminEmployeesProps {
  users: User[];
  history: AttendanceRecord[];
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => Promise<void>;
  onUpdateAttendance: (rec: AttendanceRecord) => void;
  onImpersonate?: (user: User) => void;
}

const AdminEmployees: React.FC<AdminEmployeesProps> = ({ users, history, onAddUser, onUpdateUser, onDeleteUser, onUpdateAttendance, onImpersonate }) => {
  const { state } = useStore();
  const { showToast } = useToast();
  const jobRoles = state.appSettings.jobRoles || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all'|'active'|'inactive'>('all');
  
  // User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalTab, setModalTab] = useState<'bio'|'job'|'docs'|'access'>('bio');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           u.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && u.isActive) || 
                           (filterStatus === 'inactive' && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
  });

  const openAddModal = () => {
      setEditingUser(null);
      setFormData({ 
          name: '', email: '', phone: '', position: '', 
          role: 'employee', leaveQuota: 12, isActive: true, 
          joinDate: getLocalDateString(),
          avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
          jobRoleId: '',
          username: '', employeeId: '',
          birthPlace: '', birthDate: '', gender: 'L', address: '',
          documents: {}
      });
      setModalTab('bio');
      setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
      setEditingUser(user);
      setFormData({ ...user, documents: user.documents || {} });
      setModalTab('bio');
      setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, avatar: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setConfirmConfig({
        isOpen: true,
        title: 'Hapus Foto Profil?',
        message: 'Apakah Anda yakin ingin menghapus foto profil ini?',
        variant: 'warning',
        onConfirm: () => {
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=random`;
            setFormData({ ...formData, avatar: defaultAvatar });
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  // Helper for Document Uploads (KTP, KK, Ijazah)
  const handleDocUpload = (key: 'ktp' | 'kk' | 'ijazah', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Simple size validation (e.g., max 2MB)
          if(file.size > 2 * 1024 * 1024) {
              showToast("Ukuran file terlalu besar. Maksimal 2MB.", "error");
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({
                  ...prev,
                  documents: {
                      ...prev.documents,
                      [key]: reader.result as string
                  }
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveDoc = (key: 'ktp' | 'kk' | 'ijazah') => {
      setConfirmConfig({
          isOpen: true,
          title: 'Hapus Dokumen?',
          message: `Apakah Anda yakin ingin menghapus dokumen ${key.toUpperCase()} ini?`,
          variant: 'danger',
          onConfirm: () => {
              setFormData(prev => {
                  const newDocs = { ...prev.documents };
                  delete newDocs[key];
                  return { ...prev, documents: newDocs };
              });
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleUserSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const selectedJob = jobRoles.find(j => j.id === formData.jobRoleId);
      const positionName = selectedJob ? selectedJob.title : formData.position;

      const finalData = { 
          ...formData, 
          position: positionName
      } as User;

      if (editingUser) {
          onUpdateUser({ ...editingUser, ...finalData });
          showToast(`Data karyawan "${finalData.name}" berhasil diperbarui.`, 'success');
      } else {
          const newUser: User = {
              id: `user-${Date.now()}`,
              ...finalData
          };
          onAddUser(newUser);
          showToast(`Karyawan baru "${newUser.name}" berhasil ditambahkan.`, 'success');
      }
      setIsModalOpen(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      
      console.log("AdminEmployees: handleDelete triggered for ID:", id);
      const userToDelete = users.find(u => u.id === id);
      if (!userToDelete) {
          console.warn("AdminEmployees: User not found for deletion:", id);
          return;
      }

      // Prevent deleting self
      if (id === state.currentUser?.id) {
          showToast("Anda tidak dapat menghapus akun Anda sendiri.", "error");
          return;
      }

      // Authorization check
      const canDelete = state.currentUser?.role === 'superadmin' || 
                       (userToDelete.role !== 'admin' && userToDelete.role !== 'superadmin');
      
      if (!canDelete) {
          showToast("Anda tidak memiliki izin untuk menghapus akun Administrator/Super Admin.", "error");
          return;
      }

      setConfirmConfig({
          isOpen: true,
          title: 'Hapus Data Karyawan?',
          message: `Anda akan menghapus data "${userToDelete.name}" secara permanen. Tindakan ini tidak dapat dibatalkan.`,
          variant: 'danger',
          onConfirm: () => executeDelete(id)
      });
  };

  const executeDelete = (id: string) => {
      const userToDelete = users.find(u => u.id === id);
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));

      console.log("AdminEmployees: Executing deletion for:", userToDelete?.name);
      onDeleteUser(id).catch((err: any) => {
          console.error("Delete Error:", err);
          showToast(`Gagal menghapus data: ${err.message || 'Terjadi kesalahan server'}`, 'error');
      });
      showToast(`Data karyawan "${userToDelete?.name || 'Karyawan'}" berhasil dihapus secara permanen.`, 'success');
  };

  const toggleStatus = (user: User) => {
      setConfirmConfig({
          isOpen: true,
          title: user.isActive ? 'Nonaktifkan Karyawan?' : 'Aktifkan Karyawan?',
          message: user.isActive 
              ? `Apakah Anda yakin ingin menonaktifkan "${user.name}"? Karyawan ini tidak akan bisa login.` 
              : `Apakah Anda yakin ingin mengaktifkan kembali "${user.name}"?`,
          variant: user.isActive ? 'warning' : 'info',
          onConfirm: () => {
              onUpdateUser({ ...user, isActive: !user.isActive });
              showToast(`Status ${user.name} diubah menjadi ${!user.isActive ? 'Aktif' : 'Nonaktif'}.`, 'info');
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const getRoleBadgeColor = (role: string) => {
      switch(role) {
          case 'superadmin': return 'bg-red-100 text-red-700';
          case 'admin': return 'bg-purple-100 text-purple-700';
          case 'manager': return 'bg-orange-100 text-orange-700';
          case 'hr': return 'bg-pink-100 text-pink-700';
          default: return 'bg-blue-100 text-blue-700';
      }
  };

  // Render a document input block
  const renderDocInput = (key: 'ktp' | 'kk' | 'ijazah', label: string) => {
      const fileData = formData.documents?.[key];
      const isPdf = fileData?.startsWith('data:application/pdf');

      return (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <div className="flex justify-between items-start mb-2">
                  <label className="text-xs font-bold text-gray-600 uppercase">{label}</label>
                  {fileData && (
                      <button onClick={() => handleRemoveDoc(key)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                          <Trash size={14} />
                      </button>
                  )}
              </div>
              
              {fileData ? (
                  <div className="relative group">
                      {isPdf ? (
                          <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                              <FileText size={24} className="text-red-500" />
                              <span className="text-xs text-gray-500 font-medium truncate flex-1">{label}.pdf</span>
                              <a href={fileData} download={`${label}_${formData.name}.pdf`} className="text-blue-600 hover:text-blue-800 text-xs font-bold">Unduh</a>
                          </div>
                      ) : (
                          <div className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-200">
                              <img 
                                  src={fileData} 
                                  alt={label} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/doc/200/200';
                                  }}
                              />
                              <a href={fileData} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="text-white" />
                              </a>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-white hover:border-blue-400 transition-all group">
                      <input 
                          type="file" 
                          accept="image/*,application/pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleDocUpload(key, e)}
                      />
                      <Upload size={20} className="mx-auto text-gray-400 group-hover:text-blue-500 mb-2" />
                      <p className="text-xs text-gray-500 font-medium">Klik untuk upload</p>
                      <p className="text-[10px] text-gray-400">PDF atau Foto (Max 2MB)</p>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-4 fade-in pb-20 pt-14 md:pt-0 px-2 md:px-0">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
            <div className="w-full">
                <h2 className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter">Data Karyawan</h2>
                <p className="text-gray-500 text-[10px] md:text-sm font-medium mt-0.5 md:mt-1">Kelola informasi, status, dan hak akses seluruh tim Anda.</p>
            </div>
            <button 
                onClick={openAddModal} 
                className="w-full sm:w-auto bg-blue-600 text-white px-4 md:px-6 py-3 md:py-3.5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 group"
            >
                <Plus size={16} className="group-hover:rotate-90 transition-transform md:w-4 md:h-4" /> Tambah Karyawan
            </button>
        </header>

        {/* Search & Filters */}
        <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm space-y-3 md:space-y-6 sticky top-14 md:top-0 z-20">
            <div className="flex items-center gap-3 bg-gray-50 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-gray-100 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                <Search className="text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cari nama, jabatan, atau ID..." 
                    className="flex-1 outline-none text-xs md:text-sm font-bold bg-transparent text-gray-800 placeholder:text-gray-400"
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 md:pt-2">
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 sm:flex-none">
                        <select 
                            value={filterRole} 
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full appearance-none text-[9px] md:text-[10px] font-black uppercase tracking-widest pl-3 pr-8 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-gray-200 bg-white text-gray-700 outline-none hover:border-blue-400 transition-colors cursor-pointer"
                        >
                            <option value="all">Semua Role</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="hr">HR</option>
                            <option value="employee">Employee</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <Briefcase size={10} />
                        </div>
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="w-full appearance-none text-[9px] md:text-[10px] font-black uppercase tracking-widest pl-3 pr-8 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-gray-200 bg-white text-gray-700 outline-none hover:border-blue-400 transition-colors cursor-pointer"
                        >
                            <option value="all">Semua Status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <Power size={10} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 px-1 md:px-0">
                    <div className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        Ditemukan: <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{filteredUsers.length}</span> Karyawan
                    </div>
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {filteredUsers.map((user, index) => (
                <div 
                    key={`${user.id}-${index}`} 
                    className={`group bg-white rounded-2xl md:rounded-3xl border transition-all relative overflow-hidden flex flex-col ${
                        !user.isActive 
                        ? 'border-red-100 bg-red-50/30' 
                        : 'border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1'
                    }`}
                >
                    {!user.isActive && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-red-200 z-10">
                            Nonaktif
                        </div>
                    )}
                    
                    <div className="p-4 md:p-6 flex-1">
                        <div className="flex flex-col items-center text-center mb-4 md:mb-6">
                            <div className="relative mb-3 md:mb-4">
                                <img 
                                    src={user.avatar} 
                                    alt="" 
                                    referrerPolicy="no-referrer"
                                    className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-4 object-cover shadow-xl transition-transform group-hover:scale-105 ${
                                        user.isActive ? 'border-white' : 'border-gray-200 grayscale'
                                    }`} 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                    }}
                                />
                                {user.isActive && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 md:w-6 md:h-6 bg-green-500 border-4 border-white rounded-full shadow-sm"></div>
                                )}
                            </div>
                            
                            <h3 className={`text-base md:text-lg font-black text-gray-900 tracking-tight leading-tight mb-1 ${!user.isActive && 'text-gray-500'}`}>
                                {user.name}
                            </h3>
                            <div className="flex flex-wrap justify-center gap-1.5 mb-1.5 md:mb-2">
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest ${getRoleBadgeColor(user.role)}`}>
                                    {user.role}
                                </span>
                                {jobRoles.find(j => j.id === user.jobRoleId) && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                                        {jobRoles.find(j => j.id === user.jobRoleId)?.level}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                                {(user.position || '').startsWith('http') ? 'Staff' : user.position}
                            </p>
                        </div>

                        <div className="space-y-2 pt-3 md:pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2.5 group/info">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/info:bg-blue-50 group-hover/info:text-blue-500 transition-colors">
                                    <Mail size={12} className="md:w-3.5 md:h-3.5" />
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-gray-600 truncate flex-1">{user.email || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 group/info">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/info:bg-green-50 group-hover/info:text-green-500 transition-colors">
                                    <Phone size={12} className="md:w-3.5 md:h-3.5" />
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-gray-600">{user.phone || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 group/info">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/info:bg-orange-50 group-hover/info:text-orange-500 transition-colors">
                                    <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Sisa Cuti</span>
                                    <span className="text-[10px] md:text-xs font-black text-gray-900">{user.leaveQuota || 0} Hari</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 md:p-4 bg-gray-50/50 border-t border-gray-50 flex gap-2">
                        <button 
                            onClick={() => openEditModal(user)} 
                            className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95"
                        >
                            <Edit2 size={12} className="md:w-3.5 md:h-3.5" /> Edit
                        </button>
                        
                        <div className="flex gap-1">
                            {onImpersonate && user.role !== 'superadmin' && (
                                <button 
                                    onClick={() => onImpersonate(user)} 
                                    className="w-8 h-8 md:w-10 md:h-10 bg-white border border-gray-200 text-gray-400 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all active:scale-95"
                                    title="Lihat sebagai Karyawan"
                                >
                                    <Eye size={14} className="md:w-4 md:h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => toggleStatus(user)} 
                                className={`w-8 h-8 md:w-10 md:h-10 border rounded-lg md:rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                                    user.isActive 
                                    ? 'bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600' 
                                    : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                                }`}
                                title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                                <Power size={14} className="md:w-4 md:h-4" />
                            </button>
                            <button 
                                onClick={(e) => handleDelete(user.id, e)} 
                                disabled={deletingId === user.id || state.currentUser?.id === user.id}
                                className={`w-8 h-8 md:w-10 md:h-10 border rounded-lg md:rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                                    state.currentUser?.id === user.id
                                    ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed'
                                    : 'bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                                }`}
                                title="Hapus Permanen"
                            >
                                {deletingId === user.id ? (
                                    <RefreshCw size={14} className="animate-spin md:w-4 md:h-4" />
                                ) : (
                                    <Trash2 size={14} className="md:w-4 md:h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>


        <AnimatePresence>
            {isModalOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-3xl flex flex-col max-h-full sm:max-h-[90vh] shadow-2xl overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {editingUser ? <span>Edit Karyawan</span> : <span>Tambah Karyawan</span>}
                            </h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {editingUser ? <span>ID: {editingUser.employeeId}</span> : <span>Lengkapi data di bawah</span>}
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
                        >
                            <X size={20}/>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide bg-white sticky top-0 z-10 px-2">
                        {[
                            { id: 'bio', icon: UserIcon, label: 'Bio' },
                            { id: 'job', icon: Briefcase, label: 'Karir' },
                            { id: 'access', icon: Fingerprint, label: 'Akses' },
                            { id: 'docs', icon: FolderOpen, label: 'Dokumen' }
                        ].map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setModalTab(tab.id as any)}
                                className={`flex-1 min-w-[100px] px-4 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all flex flex-col items-center gap-1 ${
                                    modalTab === tab.id 
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <tab.icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        <form id="userForm" onSubmit={handleUserSubmit} className="space-y-8">
                            
                            {modalTab === 'bio' && (
                                <motion.div 
                                    key="bio"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    {/* Photo Upload */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                        <div className="relative group">
                                            <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                                <img 
                                                    src={formData.avatar} 
                                                    alt="Avatar" 
                                                    className="w-28 h-28 rounded-3xl border-4 border-white shadow-xl object-cover group-hover:opacity-75 transition-all group-hover:scale-105" 
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=random`;
                                                    }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                    <Camera className="text-white drop-shadow-md" size={32} />
                                                </div>
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <p className="text-lg font-black text-gray-900 tracking-tight"><span>Foto Profil</span></p>
                                            <p className="text-xs font-bold text-gray-400 mb-4"><span>Maksimal 2MB, format JPG/PNG.</span></p>
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-all"
                                                >
                                                    <span>Ubah Foto</span>
                                                </button>
                                                {formData.avatar && !formData.avatar.includes('ui-avatars.com') && (
                                                    <button 
                                                        type="button"
                                                        onClick={handleRemovePhoto}
                                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                                                    >
                                                        <span>Hapus</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Nama Lengkap</span></label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={formData.name || ''} 
                                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                                placeholder="Nama sesuai KTP"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Email Perusahaan</span></label>
                                            <input 
                                                type="email" 
                                                required 
                                                value={formData.email || ''} 
                                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                                placeholder="email@perusahaan.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Nomor WhatsApp</span></label>
                                            <input 
                                                type="text" 
                                                value={formData.phone || ''} 
                                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                                placeholder="0812xxxx"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Tempat Lahir</span></label>
                                            <input 
                                                type="text" 
                                                value={formData.birthPlace || ''} 
                                                onChange={e => setFormData({...formData, birthPlace: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Tanggal Lahir</span></label>
                                            <input 
                                                type="date" 
                                                value={formData.birthDate || ''} 
                                                onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Alamat Domisili</span></label>
                                            <textarea 
                                                rows={3} 
                                                value={formData.address || ''} 
                                                onChange={e => setFormData({...formData, address: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all resize-none"
                                                placeholder="Alamat lengkap saat ini..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {modalTab === 'job' && (
                                <motion.div 
                                    key="job"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Struktur Jabatan</span></label>
                                            <select 
                                                value={formData.jobRoleId || ''} 
                                                onChange={e => setFormData({...formData, jobRoleId: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all bg-white appearance-none"
                                            >
                                                <option value="">-- Pilih Jabatan --</option>
                                                {jobRoles.map(job => (
                                                    <option key={job.id} value={job.id}>{job.title} ({job.level})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Level Akses Sistem</span></label>
                                            <select 
                                                value={formData.role || 'employee'} 
                                                onChange={e => setFormData({...formData, role: e.target.value as any})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all bg-white appearance-none"
                                            >
                                                <option value="employee">Karyawan</option>
                                                <option value="manager">Manager</option>
                                                <option value="hr">HR Staff</option>
                                                <option value="admin">Administrator</option>
                                                <option value="superadmin">Super Admin (Owner)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Tanggal Bergabung</span></label>
                                            <input 
                                                type="date" 
                                                required 
                                                value={formData.joinDate || ''} 
                                                onChange={e => setFormData({...formData, joinDate: e.target.value})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Kuota Cuti (Hari/Tahun)</span></label>
                                            <input 
                                                type="number" 
                                                value={formData.leaveQuota || 0} 
                                                onChange={e => setFormData({...formData, leaveQuota: parseInt(e.target.value)})} 
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                            />
                                        </div>
                                    </div>

                                    {/* Jobdesk Preview */}
                                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <FileText size={16}/> <span>Tanggung Jawab Inti</span>
                                        </h4>
                                        {formData.jobRoleId ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {jobRoles.find(j => j.id === formData.jobRoleId)?.coreResponsibilities.map((resp, i) => (
                                                    <div key={i} className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-blue-100/50">
                                                        <Check size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                        <span className="text-xs font-bold text-blue-900 leading-relaxed"><span>{resp}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <p className="text-xs font-bold text-blue-400 italic"><span>Pilih jabatan untuk melihat daftar tanggung jawab otomatis.</span></p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {modalTab === 'access' && (
                                <motion.div 
                                    key="access"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                            <ShieldAlert size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-amber-900 tracking-tight"><span>Kredensial Akses</span></p>
                                            <p className="text-xs font-bold text-amber-700/70 leading-relaxed">
                                                <span>Data ini digunakan untuk masuk ke sistem. Pastikan Username dan ID Karyawan unik dan mudah diingat oleh karyawan.</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>Username Login</span></label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={formData.username || ''} 
                                                    onChange={e => setFormData({...formData, username: e.target.value})} 
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                                    placeholder="e.g. budi.santoso"
                                                />
                                                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"><span>ID Karyawan (NIK)</span></label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={formData.employeeId || ''} 
                                                    onChange={e => setFormData({...formData, employeeId: e.target.value})} 
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-gray-800 transition-all" 
                                                    placeholder="e.g. EMP-2024-001"
                                                />
                                                <Fingerprint size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {modalTab === 'docs' && (
                                <motion.div 
                                    key="docs"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 tracking-tight"><span>Dokumen Legalitas</span></p>
                                            <p className="text-xs font-bold text-gray-400 leading-relaxed">
                                                <span>Unggah scan dokumen asli untuk keperluan administrasi. Format yang didukung: PDF, JPG, PNG (Maks. 2MB).</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {renderDocInput('ktp', 'KTP (Identitas)')}
                                        {renderDocInput('kk', 'Kartu Keluarga')}
                                        {renderDocInput('ijazah', 'Ijazah Terakhir')}
                                    </div>
                                </motion.div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 bg-white sticky bottom-0 z-20">
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            className="w-full sm:w-auto px-8 py-3.5 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 rounded-2xl transition-all"
                        >
                            <span>Batal</span>
                        </button>
                        <button 
                            type="submit"
                            form="userForm"
                            className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                        >
                            <span>Simpan Data</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <ConfirmModal 
            isOpen={confirmConfig.isOpen}
            onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            message={confirmConfig.message}
            variant={confirmConfig.variant}
        />
    </div>
  );
};

export default AdminEmployees;
