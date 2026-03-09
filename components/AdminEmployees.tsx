
import React, { useState, useRef } from 'react';
import { User, AttendanceRecord, AttendanceStatus, JobRole } from '../types';
import { Search, Plus, MoreVertical, Edit2, Power, Trash2, Mail, Phone, Calendar, Clock, X, Check, FileText, Upload, MapPin, User as UserIcon, Briefcase, File, Eye, Trash, FolderOpen, AlertCircle, Camera, ShieldAlert, Fingerprint, RefreshCw } from 'lucide-react';
import { useStore } from '../services/store';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
          joinDate: new Date().toISOString().split('T')[0],
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

  // Helper for Document Uploads (KTP, KK, Ijazah)
  const handleDocUpload = (key: 'ktp' | 'kk' | 'ijazah', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Simple size validation (e.g., max 2MB)
          if(file.size > 2 * 1024 * 1024) {
              alert("Ukuran file terlalu besar. Maksimal 2MB.");
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
      if(window.confirm('Hapus dokumen ini?')) {
          setFormData(prev => {
              const newDocs = { ...prev.documents };
              delete newDocs[key];
              return { ...prev, documents: newDocs };
          });
      }
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

      setConfirmDeleteId(id);
  };

  const executeDelete = () => {
      if (!confirmDeleteId) return;
      const id = confirmDeleteId;
      const userToDelete = users.find(u => u.id === id);
      setConfirmDeleteId(null);

      console.log("AdminEmployees: Executing deletion for:", userToDelete?.name);
      onDeleteUser(id).catch((err: any) => {
          console.error("Delete Error:", err);
          showToast(`Gagal menghapus data: ${err.message || 'Terjadi kesalahan server'}`, 'error');
      });
      showToast(`Data karyawan "${userToDelete?.name || 'Karyawan'}" berhasil dihapus secara permanen.`, 'success');
  };

  const toggleStatus = (user: User) => {
      if(window.confirm(user.isActive ? "Nonaktifkan karyawan ini?" : "Aktifkan kembali karyawan ini?")) {
          onUpdateUser({ ...user, isActive: !user.isActive });
          showToast(`Status ${user.name} diubah menjadi ${!user.isActive ? 'Aktif' : 'Nonaktif'}.`, 'info');
      }
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
                              <img src={fileData} alt={label} className="w-full h-full object-cover" />
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
    <div className="space-y-6 fade-in pb-10 pt-14 md:pt-0">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full">
                <h2 className="text-2xl font-black text-gray-800 tracking-tighter">Data Karyawan</h2>
                <p className="text-gray-500 text-xs font-medium">Kelola informasi, status, dan akses karyawan.</p>
            </div>
            <button onClick={openAddModal} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95">
                <Plus size={18} /> Tambah Karyawan
            </button>
        </header>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4 sticky top-14 md:top-0 z-20">
            <div className="flex items-center gap-3">
                <Search className="text-gray-400" size={18} />
                <input 
                    type="text" placeholder="Cari nama, jabatan, atau ID Karyawan..." className="flex-1 outline-none text-sm font-medium bg-transparent"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                <select 
                    value={filterRole} 
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 outline-none"
                >
                    <option value="all">Semua Role</option>
                    <option value="superadmin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                </select>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 outline-none"
                >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                </select>
                <div className="flex-1"></div>
                <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                    Total: <span className="text-blue-600">{filteredUsers.length}</span> Karyawan
                </div>
            </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user, index) => (
                <div key={`${user.id}-${index}`} className={`bg-white rounded-xl border transition-all relative overflow-hidden group ${!user.isActive ? 'border-red-200 bg-red-50/50' : 'border-gray-100 hover:shadow-md'}`}>
                    {!user.isActive && <div className="absolute top-3 right-3 bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Nonaktif</div>}
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <img 
                                    src={user.avatar} 
                                    alt="" 
                                    className={`w-14 h-14 rounded-full border-4 object-cover ${user.isActive ? 'border-green-50' : 'border-gray-200 grayscale'}`} 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                    }}
                                />
                                <div>
                                    <h3 className={`font-bold text-gray-800 ${!user.isActive && 'text-gray-500'}`}>{user.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getRoleBadgeColor(user.role)}`}>{user.role}</span>
                                        {jobRoles.find(j => j.id === user.jobRoleId) && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                                                {jobRoles.find(j => j.id === user.jobRoleId)?.level}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {(user.position || '').startsWith('http') ? '' : user.position}
                                    </p>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {onImpersonate && user.role !== 'superadmin' && (
                                    <button 
                                        onClick={() => onImpersonate(user)} 
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                        title="Lihat sebagai Karyawan"
                                    >
                                        <Eye size={16} />
                                    </button>
                                )}
                                <button onClick={() => openEditModal(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /><span className="truncate">{user.email || '-'}</span></div>
                            <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /><span>{user.phone || '-'}</span></div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                <span className="font-medium">Sisa Cuti: </span>
                                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">{user.leaveQuota || 0} Hari</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                             <button onClick={() => toggleStatus(user)} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${user.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                <Power size={14} /> {user.isActive ? 'Off-kan' : 'Aktifkan'}
                             </button>
                             
                             <button 
                                 onClick={(e) => handleDelete(user.id, e)} 
                                 disabled={deletingId === user.id}
                                 className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-center ${
                                     (state.currentUser?.id === user.id) 
                                     ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                                     : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-red-500'
                                 } ${deletingId === user.id ? 'opacity-50 cursor-wait' : ''}`} 
                                 title={state.currentUser?.id === user.id ? "Tidak dapat menghapus diri sendiri" : "Hapus Permanen"}
                             >
                                 {deletingId === user.id ? (
                                     <RefreshCw size={16} className="animate-spin" />
                                 ) : (
                                     <Trash2 size={16} />
                                 )}
                             </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Enhanced User Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95">
                    {/* Modal Header */}
                    <div className="p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">{editingUser ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500 hover:text-gray-800"/></button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide bg-white sticky top-0 z-10">
                        <button 
                            onClick={() => setModalTab('bio')}
                            className={`flex-1 min-w-[120px] px-4 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${modalTab === 'bio' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <UserIcon size={14} className="inline mr-2 mb-0.5"/> Bio
                        </button>
                        <button 
                            onClick={() => setModalTab('job')}
                            className={`flex-1 min-w-[120px] px-4 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${modalTab === 'job' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Briefcase size={14} className="inline mr-2 mb-0.5"/> Karir
                        </button>
                        <button 
                            onClick={() => setModalTab('access')}
                            className={`flex-1 min-w-[120px] px-4 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${modalTab === 'access' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Fingerprint size={14} className="inline mr-2 mb-0.5"/> Akses
                        </button>
                        <button 
                            onClick={() => setModalTab('docs')}
                            className={`flex-1 min-w-[120px] px-4 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${modalTab === 'docs' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <FolderOpen size={14} className="inline mr-2 mb-0.5"/> Dokumen
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="userForm" onSubmit={handleUserSubmit} className="space-y-6">
                            
                            {modalTab === 'bio' && (
                                <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                                    {/* Photo Upload */}
                                    <div className="flex items-center gap-6">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <img src={formData.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-gray-100 object-cover group-hover:opacity-75 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Upload className="text-white drop-shadow-md" size={24} />
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Foto Profil</p>
                                            <p className="text-xs text-gray-500 mb-2">Klik gambar untuk mengubah foto.</p>
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${formData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {formData.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                            <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                            <input type="email" required value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. HP</label>
                                            <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tempat Lahir</label>
                                            <input type="text" value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Lahir</label>
                                            <input type="date" value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Kelamin</label>
                                            <select value={formData.gender || 'L'} onChange={e => setFormData({...formData, gender: e.target.value as 'L'|'P'})} className="w-full px-3 py-2 border rounded-lg bg-white">
                                                <option value="L">Laki-laki</option>
                                                <option value="P">Perempuan</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Domisili</label>
                                            <textarea rows={2} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg"></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalTab === 'job' && (
                                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jabatan (Role)</label>
                                            <select 
                                                value={formData.jobRoleId || ''} 
                                                onChange={e => setFormData({...formData, jobRoleId: e.target.value})} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white"
                                            >
                                                <option value="">-- Pilih Jabatan --</option>
                                                {jobRoles.map(job => (
                                                    <option key={job.id} value={job.id}>{job.title} ({job.level})</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-gray-400 mt-1">Jabatan menentukan Jobdesk inti secara otomatis.</p>
                                        </div>
                                        {!formData.jobRoleId && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Jabatan Manual</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.position || ''} 
                                                    onChange={e => setFormData({...formData, position: e.target.value})} 
                                                    className="w-full px-3 py-2 border rounded-lg" 
                                                    placeholder="Contoh: Staff Operasional"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Level Akses</label>
                                            <select value={formData.role || 'employee'} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg bg-white">
                                                <option value="employee">Karyawan</option>
                                                <option value="manager">Manager</option>
                                                <option value="hr">HR Staff</option>
                                                <option value="admin">Administrator</option>
                                                <option value="superadmin">Super Admin (Owner)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Bergabung</label>
                                            <input type="date" required value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kuota Cuti Tahunan</label>
                                            <input type="number" value={formData.leaveQuota || 0} onChange={e => setFormData({...formData, leaveQuota: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                    </div>

                                    {/* Jobdesk Preview */}
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                                            <FileText size={16}/> Tanggung Jawab Inti (Jobdesk)
                                        </h4>
                                        {formData.jobRoleId ? (
                                            <ul className="list-disc pl-5 space-y-1">
                                                {jobRoles.find(j => j.id === formData.jobRoleId)?.coreResponsibilities.map((resp, i) => (
                                                    <li key={i} className="text-xs text-blue-900">{resp}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-blue-400 italic">Pilih jabatan untuk melihat jobdesk.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {modalTab === 'access' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                        <ShieldAlert className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-xs text-blue-800">
                                            Konfigurasikan kredensial login karyawan. Pastikan data ini unik untuk setiap pengguna.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={formData.username || ''} 
                                                onChange={e => setFormData({...formData, username: e.target.value})} 
                                                className="w-full px-3 py-2 border rounded-lg" 
                                                placeholder="Contoh: budi.santoso"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Karyawan</label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={formData.employeeId || ''} 
                                                onChange={e => setFormData({...formData, employeeId: e.target.value})} 
                                                className="w-full px-3 py-2 border rounded-lg" 
                                                placeholder="Contoh: EMP-001"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalTab === 'docs' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start gap-3">
                                        <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-xs text-orange-800">
                                            Unggah dokumen pendukung dalam format <strong>PDF</strong> atau <strong>Gambar (JPG/PNG)</strong>. Maksimal ukuran file 2MB.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {renderDocInput('ktp', 'KTP (Kartu Tanda Penduduk)')}
                                        {renderDocInput('kk', 'KK (Kartu Keluarga)')}
                                        {renderDocInput('ijazah', 'Ijazah Terakhir')}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
                        <button onClick={() => document.getElementById('userForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200">Simpan Data</button>
                    </div>
                </div>
            </div>
        )}
        {/* Custom Confirmation Modal for Deletion */}
        <ConfirmModal 
            isOpen={!!confirmDeleteId}
            onClose={() => setConfirmDeleteId(null)}
            onConfirm={executeDelete}
            title="Hapus Data Karyawan?"
            message={`Anda akan menghapus data "${users.find(u => u.id === confirmDeleteId)?.name}" secara permanen. Tindakan ini tidak dapat dibatalkan.`}
        />
    </div>
  );
};

export default AdminEmployees;
