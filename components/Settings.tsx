
import React, { useState, useEffect, useRef } from 'react';
import { User, AppSettings, Shift, JobRole, OfficeLocation } from '../types';
import { User as UserIcon, Bell, Shield, Save, MapPin, Clock, Trash2, Moon, LogOut, Plus, Edit2, Users, Check, X, Briefcase, List, Calendar, Mail, Phone, Home, FileText, Download, Eye, Award, Crosshair, Camera, CheckCircle2, Loader2, ChevronRight, Sun, ShieldAlert, AlertCircle, Fingerprint, Globe, Search } from 'lucide-react';
import { WEEK_DAYS } from '../constants';
import { useStore } from '../services/store';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface SettingsProps {
  user: User;
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onReset: () => void;
  onLogout: () => void;
}

const MODULES = [
    { id: 'dashboard', name: 'Dashboard Karyawan', icon: Home, desc: 'Halaman utama ringkasan absensi karyawan.' },
    { id: 'attendance', name: 'Menu Absensi', icon: Camera, desc: 'Fitur untuk melakukan Check-in dan Check-out.' },
    { id: 'requests', name: 'Pengajuan Cuti/Izin', icon: FileText, desc: 'Formulir pengajuan izin, sakit, dan cuti.' },
    { id: 'history', name: 'Riwayat Pribadi', icon: Clock, desc: 'Melihat riwayat absensi pribadi karyawan.' },
    { id: 'admin_dashboard', name: 'Dashboard Admin', icon: Award, desc: 'Statistik dan ringkasan data untuk Admin.' },
    { id: 'admin_monitor', name: 'Monitor Real-time', icon: Eye, desc: 'Pantau kehadiran karyawan secara langsung.' },
    { id: 'admin_employees', name: 'Kelola Karyawan', icon: Users, desc: 'Manajemen data, role, dan dokumen karyawan.' },
    { id: 'admin_reports', name: 'Laporan & Rekap', icon: Download, desc: 'Ekspor data absensi ke format Excel/PDF.' },
    { id: 'admin_approvals', name: 'Persetujuan Izin', icon: CheckCircle2, desc: 'Verifikasi dan setujui pengajuan dari karyawan.' },
    { id: 'settings', name: 'Pengaturan Sistem', icon: Shield, desc: 'Konfigurasi aplikasi, lokasi, dan hak akses.' },
];

const Settings: React.FC<SettingsProps> = ({ user, appSettings, onUpdateSettings, onReset, onLogout }) => {
  const { state, updateUser } = useStore(); 
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'security' | 'locations' | 'shifts' | 'jobs' | 'permissions'>('profile');
  
  const SETTINGS_MENU = [
    { id: 'profile', label: 'Profil Saya', icon: UserIcon, desc: 'Informasi pribadi dan keamanan akun.', roles: ['employee', 'manager', 'hr', 'admin', 'superadmin'] },
    { id: 'company', label: 'Informasi Perusahaan', icon: Globe, desc: 'Detail organisasi dan identitas sistem.', roles: ['admin', 'superadmin'] },
    { id: 'security', label: 'Metode Login', icon: Fingerprint, desc: 'Atur cara karyawan masuk ke sistem.', roles: ['admin', 'superadmin'] },
    { id: 'locations', label: 'Lokasi & Cabang', icon: MapPin, desc: 'Kelola titik koordinat kantor pusat & cabang.', roles: ['admin', 'superadmin'] },
    { id: 'shifts', label: 'Jadwal & Shift', icon: Clock, desc: 'Atur jam kerja, lembur, dan hari aktif.', roles: ['admin', 'superadmin'] },
    { id: 'jobs', label: 'Jabatan & Jobdesk', icon: Briefcase, desc: 'Struktur organisasi dan tanggung jawab.', roles: ['admin', 'superadmin'] },
    { id: 'permissions', label: 'Hak Akses (RBAC)', icon: ShieldAlert, desc: 'Kontrol akses modul per level jabatan.', roles: ['superadmin'] },
  ];

  const filteredMenu = SETTINGS_MENU.filter(item => item.roles.includes(user.role));

  // Local state
  const [config, setConfig] = useState<AppSettings>(appSettings);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<User>>({
      name: user.name,
      phone: user.phone,
      address: user.address,
      password: user.password || '',
      birthPlace: user.birthPlace,
      birthDate: user.birthDate,
      gender: user.gender,
      avatar: user.avatar,
      documents: user.documents || {}
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setProfileForm({
          name: user.name,
          phone: user.phone,
          address: user.address,
          password: user.password || '',
          birthPlace: user.birthPlace,
          birthDate: user.birthDate,
          gender: user.gender,
          avatar: user.avatar,
          documents: user.documents || {}
      });
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) {
              showToast("Ukuran foto maksimal 1MB", "error");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfileForm(prev => ({ ...prev, avatar: reader.result as string }));
              showToast("Foto profil terpilih", "info");
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'kk' | 'ijazah') => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) {
              showToast("Ukuran dokumen maksimal 2MB", "error");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfileForm(prev => ({
                  ...prev,
                  documents: {
                      ...(prev.documents || {}),
                      [type]: reader.result as string
                  }
              }));
              showToast(`Dokumen ${type.toUpperCase()} terpilih`, "info");
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!profileForm.name) {
          showToast("Nama wajib diisi", "error");
          return;
      }

      const updatedUser: User = {
          ...user,
          ...profileForm,
          email: user.email,
          role: user.role,
          id: user.id
      };

      // Optimistic Update
      updateUser(updatedUser).catch((error: any) => {
          showToast(`Gagal sinkronisasi profil: ${error.message}`, "error");
      });
      setIsEditingProfile(false);
      showToast('Profil berhasil diperbarui!', 'success');
  };

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // Shift Editing State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState<Partial<Shift>>({});

  // Job Role Editing State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRole | null>(null);
  const [jobForm, setJobForm] = useState<Partial<JobRole>>({ coreResponsibilities: [] });
  const [newResponsibility, setNewResponsibility] = useState('');

  // Office Editing State
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {}
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [editingOffice, setEditingOffice] = useState<OfficeLocation | null>(null);
  const [officeForm, setOfficeForm] = useState<Partial<OfficeLocation>>({});

  // Get User Job Details
  const userJobRole = state.appSettings.jobRoles?.find(j => j.id === user.jobRoleId);

  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
      if (darkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [darkMode]);

  const toggleDarkMode = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      showToast(`Tema ${newMode ? 'Gelap' : 'Terang'} diaktifkan`, "info");
  };

  useEffect(() => {
    setConfig(appSettings);
  }, [appSettings]);

  // --- Map Logic ---
  useEffect(() => {
    if (isOfficeModalOpen && mapContainerRef.current && !mapInstanceRef.current) {
        const L = (window as any).L;
        if (!L) return;

        const initialLat = officeForm.lat || config.officeLat;
        const initialLng = officeForm.lng || config.officeLng;
        const initialRadius = officeForm.radius || config.officeRadius;

        const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 17);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
        
        const circle = L.circle([initialLat, initialLng], {
            color: '#2563EB',
            fillColor: '#3B82F6',
            fillOpacity: 0.2,
            radius: initialRadius * 1000 
        }).addTo(map);

        map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            circle.setLatLng([lat, lng]);
            setOfficeForm(prev => ({ ...prev, lat, lng }));
        });

        marker.on('dragend', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            circle.setLatLng([lat, lng]);
            setOfficeForm(prev => ({ ...prev, lat, lng }));
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
    }

    if (!isOfficeModalOpen && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
    }

  }, [isOfficeModalOpen]);

  useEffect(() => {
      if (circleRef.current && officeForm.radius !== undefined) {
          circleRef.current.setRadius(officeForm.radius * 1000);
      }
  }, [officeForm.radius]);

  useEffect(() => {
      if (markerRef.current && circleRef.current && mapInstanceRef.current && officeForm.lat !== undefined && officeForm.lng !== undefined) {
           const curPos = markerRef.current.getLatLng();
           if (Math.abs(curPos.lat - officeForm.lat) > 0.000001 || Math.abs(curPos.lng - officeForm.lng) > 0.000001) {
               const newPos = [officeForm.lat, officeForm.lng];
               markerRef.current.setLatLng(newPos);
               circleRef.current.setLatLng(newPos);
               mapInstanceRef.current.panTo(newPos);
           }
      }
  }, [officeForm.lat, officeForm.lng]);

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await response.json();
        setSearchResults(data);
    } catch (error) {
        console.error("Search error:", error);
        showToast("Gagal mencari lokasi", "error");
    } finally {
        setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setOfficeForm(prev => ({ ...prev, lat, lng: lon }));
    if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lon], 18);
    }
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };
  const handleGetCurrentLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
              const { latitude, longitude } = pos.coords;
              setOfficeForm(prev => ({ ...prev, lat: latitude, lng: longitude }));
              if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([latitude, longitude], 18);
              }
              showToast("Lokasi berhasil diperbarui", "success");
          });
      } else {
          showToast("Geolocation tidak didukung", "error");
      }
  };

  // --- Office Management ---
  const openAddOffice = () => {
      setEditingOffice(null);
      setOfficeForm({
          name: '', lat: config.officeLat, lng: config.officeLng, radius: config.officeRadius
      });
      setSearchQuery('');
      setSearchResults([]);
      setIsOfficeModalOpen(true);
  };

  const openEditOffice = (office: OfficeLocation) => {
      setEditingOffice(office);
      setOfficeForm({ ...office });
      setSearchQuery('');
      setSearchResults([]);
      setIsOfficeModalOpen(true);
  };

  const deleteOffice = (officeId: string) => {
      const office = config.offices?.find(o => o.id === officeId);
      setConfirmModal({
          isOpen: true,
          title: "Hapus Lokasi?",
          message: `Apakah Anda yakin ingin menghapus lokasi "${office?.name || 'kantor'}"? Data ini tidak dapat dikembalikan.`,
          onConfirm: () => {
              console.log("Attempting to delete office:", officeId);
              const currentOffices = config.offices || [];
              const newOffices = currentOffices.filter(o => o.id !== officeId);
              
              if (newOffices.length === currentOffices.length) {
                  showToast("Lokasi tidak ditemukan atau sudah dihapus.", "error");
                  return;
              }

              const newConfig = { ...config, offices: newOffices };
              
              // Update legacy fields for backward compatibility
              if (newOffices.length > 0) {
                  newConfig.officeLat = newOffices[0].lat;
                  newConfig.officeLng = newOffices[0].lng;
                  newConfig.officeRadius = newOffices[0].radius;
                  newConfig.officeName = newOffices[0].name;
              } else {
                  // Clear legacy fields if no offices left
                  newConfig.officeLat = 0;
                  newConfig.officeLng = 0;
                  newConfig.officeRadius = 0;
                  newConfig.officeName = "";
              }

              setConfig(newConfig);
              showToast('Lokasi berhasil dihapus.', 'success');
              onUpdateSettings(newConfig).catch((error: any) => {
                  showToast(`Gagal sinkronisasi penghapusan: ${error.message}`, "error");
              });
          }
      });
  };

  const saveOffice = () => {
      if (!officeForm.name?.trim()) {
          showToast("Nama lokasi wajib diisi", "error");
          return;
      }
      
      if (officeForm.lat === undefined || officeForm.lng === undefined || isNaN(officeForm.lat) || isNaN(officeForm.lng)) {
          showToast("Koordinat lokasi tidak valid. Silakan pilih titik di peta.", "error");
          return;
      }

      let newOffices = [...(config.offices || [])];
      if (editingOffice) {
          newOffices = newOffices.map(o => o.id === editingOffice.id ? { ...o, ...officeForm } as OfficeLocation : o);
      } else {
          const newOffice: OfficeLocation = { 
              id: `office-${Date.now()}`, 
              name: officeForm.name,
              lat: officeForm.lat,
              lng: officeForm.lng,
              radius: officeForm.radius || 0.1
          };
          newOffices.push(newOffice);
      }
      
      const newConfig = { ...config, offices: newOffices };
      // Update legacy fields for backward compatibility
      if (newOffices.length > 0) {
          newConfig.officeLat = newOffices[0].lat;
          newConfig.officeLng = newOffices[0].lng;
          newConfig.officeRadius = newOffices[0].radius;
          newConfig.officeName = newOffices[0].name;
      }

      setConfig(newConfig);
      setIsOfficeModalOpen(false);
      showToast('Lokasi berhasil disimpan!', 'success');
      onUpdateSettings(newConfig).catch((error: any) => {
          showToast(`Gagal sinkronisasi lokasi: ${error.message}`, "error");
      });
  };

  // --- Shift Management ---
  const openAddShift = () => {
      setEditingShift(null);
      setShiftForm({
          name: '', startTime: '08:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', overtimeStart: '17:30', isFlexible: false, workDays: [1, 2, 3, 4, 5], assignedUserIds: []
      });
      setIsShiftModalOpen(true);
  };

  const openEditShift = (shift: Shift) => {
      setEditingShift(shift);
      setShiftForm({ ...shift });
      setIsShiftModalOpen(true);
  };

  const deleteShift = (shiftId: string) => {
      const shift = config.shifts.find(s => s.id === shiftId);
      setConfirmModal({
          isOpen: true,
          title: "Hapus Jadwal Kerja?",
          message: `Hapus jadwal "${shift?.name || 'kerja'}"? Karyawan yang terdaftar di jadwal ini perlu dipindahkan ke jadwal lain.`,
          onConfirm: () => {
              const newShifts = config.shifts.filter(s => s.id !== shiftId);
              const newConfig = { ...config, shifts: newShifts };
              
              // Optimistic Update
              setConfig(newConfig);
              showToast('Jadwal berhasil dihapus.', 'success');
              
              // Background Sync
              onUpdateSettings(newConfig).catch((error: any) => {
                  showToast(`Gagal sinkronisasi penghapusan: ${error.message}`, "error");
              });
          }
      });
  };

  const saveShift = () => {
      if (!shiftForm.name) return showToast("Nama jadwal wajib diisi", "error");
      
      let newShifts = [...config.shifts];
      if (editingShift) {
          newShifts = newShifts.map(s => s.id === editingShift.id ? { ...s, ...shiftForm } as Shift : s);
      } else {
          const newShift: Shift = { id: `shift-${Date.now()}`, ...shiftForm as Shift };
          newShifts.push(newShift);
      }
      
      const newConfig = { ...config, shifts: newShifts };
      
      // Optimistic Update
      setConfig(newConfig);
      setIsShiftModalOpen(false);
      showToast('Jadwal berhasil disimpan!', 'success');

      // Background Sync
      onUpdateSettings(newConfig).catch((error: any) => {
          showToast(`Gagal sinkronisasi jadwal: ${error.message}`, "error");
      });
  };

  const toggleWorkDay = (dayIndex: number) => {
      const currentDays = shiftForm.workDays || [];
      if (currentDays.includes(dayIndex)) {
          setShiftForm({ ...shiftForm, workDays: currentDays.filter(d => d !== dayIndex) });
      } else {
          setShiftForm({ ...shiftForm, workDays: [...currentDays, dayIndex].sort() });
      }
  };

  const toggleAssignedUser = (userId: string) => {
      const currentUsers = shiftForm.assignedUserIds || [];
      if (currentUsers.includes(userId)) {
          setShiftForm({ ...shiftForm, assignedUserIds: currentUsers.filter(id => id !== userId) });
      } else {
          setShiftForm({ ...shiftForm, assignedUserIds: [...currentUsers, userId] });
      }
  };

  // --- Job Role Management ---
  const openAddJob = () => {
      setEditingJob(null);
      setJobForm({ title: '', level: 'Staff', coreResponsibilities: [] });
      setIsJobModalOpen(true);
  };

  const openEditJob = (job: JobRole) => {
      setEditingJob(job);
      setJobForm({ ...job });
      setIsJobModalOpen(true);
  };

  const deleteJob = (jobId: string) => {
      const assignedUsers = state.users.filter(u => u.jobRoleId === jobId);
      if (assignedUsers.length > 0) {
          showToast(`Gagal! Masih ada ${assignedUsers.length} karyawan dengan jabatan ini.`, "error");
          return;
      }

      const job = config.jobRoles.find(j => j.id === jobId);
      setConfirmModal({
          isOpen: true,
          title: "Hapus Jabatan?",
          message: `Hapus jabatan "${job?.title || 'ini'}"? Pastikan tidak ada karyawan yang masih menggunakan jabatan ini.`,
          onConfirm: () => {
              const newJobs = config.jobRoles.filter(j => j.id !== jobId);
              const newConfig = { ...config, jobRoles: newJobs };
              
              // Optimistic Update
              setConfig(newConfig);
              showToast('Jabatan berhasil dihapus.', 'success');
              
              // Background Sync
              onUpdateSettings(newConfig).catch((error: any) => {
                  showToast(`Gagal sinkronisasi penghapusan: ${error.message}`, "error");
              });
          }
      });
  };

  const saveJob = () => {
      if (!jobForm.title) return showToast("Nama jabatan wajib diisi", "error");
      
      let newJobs = [...(config.jobRoles || [])];
      if (editingJob) {
          newJobs = newJobs.map(j => j.id === editingJob.id ? { ...j, ...jobForm } as JobRole : j);
      } else {
          const newJob: JobRole = { id: `job-${Date.now()}`, ...jobForm as JobRole };
          newJobs.push(newJob);
      }
      
      const newConfig = { ...config, jobRoles: newJobs };
      
      // Optimistic Update
      setConfig(newConfig);
      setIsJobModalOpen(false);
      showToast('Jabatan dan tugas berhasil disimpan!', 'success');

      // Background Sync
      onUpdateSettings(newConfig).catch((error: any) => {
          showToast(`Gagal sinkronisasi jabatan: ${error.message}`, "error");
      });
  };

  const addResponsibility = () => {
      if (!newResponsibility.trim()) return;
      setJobForm({ ...jobForm, coreResponsibilities: [...(jobForm.coreResponsibilities || []), newResponsibility] });
      setNewResponsibility('');
  };

  const removeResponsibility = (idx: number) => {
      const newResps = [...(jobForm.coreResponsibilities || [])];
      newResps.splice(idx, 1);
      setJobForm({ ...jobForm, coreResponsibilities: newResps });
  };

  // Helper to render document preview
  const renderDocPreview = (title: string, dataUrl?: string) => {
      if (!dataUrl) return null;
      const isPdf = dataUrl.startsWith('data:application/pdf');

      return (
          <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
              <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                      <p className="text-sm font-black text-gray-800 truncate">{title}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isPdf ? 'PDF Document' : 'Image File'}</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  {!isPdf && (
                      <a href={dataUrl} target="_blank" rel="noreferrer" className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Eye size={18} />
                      </a>
                  )}
                  <a href={dataUrl} download={`${title}_${user.name}`} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Download size={18} />
                  </a>
              </div>
          </div>
      );
  };

  return (
    <div className="flex h-full bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-50">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Pengaturan</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={16} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
              <div className="text-left">
                <p className="text-[11px] font-bold leading-none">{item.label}</p>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-lg shadow-sm"><AlertCircle size={14} className="text-slate-400" /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bantuan</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Butuh bantuan konfigurasi? Hubungi tim IT Support kami.</p>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-white custom-scrollbar">
        <div className="max-w-4xl mx-auto p-8">
          <AnimatePresence mode="wait">
            {/* Profile Tab */}
          {activeTab === 'profile' && (
              <motion.div 
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Left Column: Identity & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-10"></div>
                        
                        <div className="relative mb-6 group cursor-pointer z-10" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden relative bg-slate-100 flex items-center justify-center">
                                {profileForm.avatar || user.avatar ? (
                                    <img 
                                        src={profileForm.avatar || user.avatar} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                    />
                                ) : (
                                    <UserIcon size={48} className="text-slate-300" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={28} className="text-white" />
                                </div>
                            </div>
                            <div className={`absolute bottom-2 right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                {user.isActive && <Check size={14} className="text-white font-bold"/>}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-slate-900 z-10">{user.name}</h3>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-1 z-10">
                            {userJobRole?.title || user.position}
                        </p>
                        
                        {/* Avatar Save Button */}
                        {!isEditingProfile && profileForm.avatar !== user.avatar && (
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="mt-4 px-6 py-2 bg-green-600 text-white text-xs font-black rounded-full hover:bg-green-700 shadow-lg shadow-green-100 flex items-center gap-2 animate-bounce"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Simpan Foto Baru
                            </button>
                        )}

                        <div className="flex gap-2 mt-6 mb-8 z-10">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                user.role === 'superadmin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                'bg-sky-50 text-sky-600 border-sky-100'
                            }`}>
                                {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Administrator' : 'Karyawan'}
                            </span>
                            {userJobRole && (
                                <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                    {userJobRole.level}
                                </span>
                            )}
                        </div>

                            <div className="w-full space-y-3 z-10">
                                <div className="bg-slate-50/50 p-4 rounded-2xl flex justify-between items-center text-sm border border-slate-100">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Bergabung</span>
                                    <span className="font-bold text-slate-800">{user.joinDate ? new Date(user.joinDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
                                </div>
                                <div className="bg-slate-50/50 p-4 rounded-2xl flex justify-between items-center text-sm border border-slate-100">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sisa Cuti</span>
                                    <span className="font-bold text-blue-600">{user.leaveQuota} Hari</span>
                                </div>
                                <button 
                                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isEditingProfile ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
                                >
                                    {isEditingProfile ? <X size={18}/> : <Edit2 size={18}/>}
                                    {isEditingProfile ? 'Batal Perubahan' : 'Lengkapi Biodata'}
                                </button>
                            </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                        <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest mb-4">Keamanan & Akun</h4>
                        <button onClick={onLogout} className="w-full bg-rose-50 text-rose-600 border border-rose-100 font-bold py-3.5 rounded-xl hover:bg-rose-100 flex items-center justify-center gap-2 text-sm transition-all active:scale-95">
                            <LogOut size={18} /> Keluar Sesi
                        </button>
                    </div>
                </div>

                {/* Right Column: Detailed Info or Edit Form */}
                <div className="lg:col-span-2 space-y-8">
                    {isEditingProfile ? (
                        <motion.form 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onSubmit={handleSaveProfile} 
                            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Edit2 size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">Manajemen Profil</h3>
                                    <p className="text-xs text-gray-400">Anda hanya dapat mengubah data pribadi (Biodata).</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Biodata Diri</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">No. Handphone</label>
                                    <input 
                                        type="tel"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Jenis Kelamin</label>
                                    <select 
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                        value={profileForm.gender}
                                        onChange={e => setProfileForm({...profileForm, gender: e.target.value as 'L' | 'P'})}
                                    >
                                        <option value="">Pilih Jenis Kelamin</option>
                                        <option value="L">Laki-laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tempat Lahir</label>
                                    <input 
                                        type="text"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.birthPlace}
                                        onChange={e => setProfileForm({...profileForm, birthPlace: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tanggal Lahir</label>
                                    <input 
                                        type="date"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.birthDate ? new Date(profileForm.birthDate).toISOString().split('T')[0] : ''}
                                        onChange={e => setProfileForm({...profileForm, birthDate: e.target.value})}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Alamat Domisili</label>
                                    <textarea 
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none transition-all"
                                        value={profileForm.address}
                                        onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                                    />
                                </div>

                                <div className="md:col-span-2 mt-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dokumen Karyawan</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* KTP */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">KTP (Identitas)</span>
                                            {profileForm.documents?.ktp && <CheckCircle2 size={14} className="text-emerald-500" />}
                                        </div>
                                        <div className="relative group">
                                            <div className="w-full h-24 bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden">
                                                {profileForm.documents?.ktp ? (
                                                    <img src={profileForm.documents.ktp} className="w-full h-full object-cover opacity-50" alt="KTP" />
                                                ) : (
                                                    <FileText size={20} className="text-slate-300" />
                                                )}
                                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-500">
                                                    {profileForm.documents?.ktp ? 'Ganti File' : 'Unggah KTP'}
                                                </span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleDocumentChange(e, 'ktp')}
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* KK */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Kartu Keluarga</span>
                                            {profileForm.documents?.kk && <CheckCircle2 size={14} className="text-emerald-500" />}
                                        </div>
                                        <div className="relative group">
                                            <div className="w-full h-24 bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden">
                                                {profileForm.documents?.kk ? (
                                                    <img src={profileForm.documents.kk} className="w-full h-full object-cover opacity-50" alt="KK" />
                                                ) : (
                                                    <FileText size={20} className="text-slate-300" />
                                                )}
                                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-500">
                                                    {profileForm.documents?.kk ? 'Ganti File' : 'Unggah KK'}
                                                </span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleDocumentChange(e, 'kk')}
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ijazah */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Ijazah Terakhir</span>
                                            {profileForm.documents?.ijazah && <CheckCircle2 size={14} className="text-emerald-500" />}
                                        </div>
                                        <div className="relative group">
                                            <div className="w-full h-24 bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden">
                                                {profileForm.documents?.ijazah ? (
                                                    <img src={profileForm.documents.ijazah} className="w-full h-full object-cover opacity-50" alt="Ijazah" />
                                                ) : (
                                                    <FileText size={20} className="text-slate-300" />
                                                )}
                                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-500">
                                                    {profileForm.documents?.ijazah ? 'Ganti File' : 'Unggah Ijazah'}
                                                </span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleDocumentChange(e, 'ijazah')}
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 mt-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Keamanan</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password Baru</label>
                                    <input 
                                        type="password"
                                        placeholder="Kosongkan jika tidak ingin mengubah password"
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.password}
                                        onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="mt-10 flex justify-end gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditingProfile(false)}
                                    className="px-8 py-3.5 text-gray-500 font-black text-sm hover:bg-gray-50 rounded-2xl transition-all active:scale-95"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-3.5 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2 active:scale-95"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </motion.form>
                    ) : (
                        <div className="space-y-8">
                            {/* Biodata Card */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
                            >
                                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><UserIcon size={24} /></div>
                                    <h3 className="text-xl font-black text-gray-900">Informasi Dasar</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-2">Email Perusahaan</label>
                                        <div className="flex items-center gap-3 text-gray-800 text-sm font-black bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group-hover:border-blue-200 transition-colors">
                                            <Mail size={18} className="text-blue-500"/> {user.email || '-'}
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-2">No. Handphone</label>
                                        <div className="flex items-center gap-3 text-gray-800 text-sm font-black bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group-hover:border-blue-200 transition-colors">
                                            <Phone size={18} className="text-blue-500"/> {user.phone || '-'}
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-2">Tempat, Tanggal Lahir</label>
                                        <div className="flex items-center gap-3 text-gray-800 text-sm font-black bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group-hover:border-blue-200 transition-colors">
                                            <Calendar size={18} className="text-blue-500"/> 
                                            {user.birthPlace || '-'}, {user.birthDate ? new Date(user.birthDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-2">Jenis Kelamin</label>
                                        <div className="flex items-center gap-3 text-gray-800 text-sm font-black bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group-hover:border-blue-200 transition-colors">
                                            <UserIcon size={18} className="text-blue-500"/> {user.gender === 'L' ? 'Laki-laki' : user.gender === 'P' ? 'Perempuan' : '-'}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-2">Alamat Domisili</label>
                                        <div className="flex items-start gap-3 text-gray-800 text-sm font-black bg-gray-50/50 p-5 rounded-2xl border border-gray-100 group-hover:border-blue-200 transition-colors">
                                            <Home size={18} className="text-blue-500 mt-1 flex-shrink-0"/> {user.address || '-'}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Job Description Card */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
                            >
                                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Briefcase size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">Tanggung Jawab Pekerjaan</h3>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest font-black mt-1">
                                            {userJobRole?.title || user.position}
                                        </p>
                                    </div>
                                </div>

                                {userJobRole ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {userJobRole.coreResponsibilities.map((resp, idx) => (
                                            <div key={idx} className="flex gap-4 items-start p-5 rounded-2xl bg-orange-50/30 border border-orange-100 group hover:bg-orange-50 transition-colors">
                                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle2 className="text-orange-600" size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 leading-relaxed">{resp}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                            <List className="text-gray-300" size={24} />
                                        </div>
                                        <p className="text-gray-400 text-sm font-bold">Daftar tugas belum diatur oleh administrator.</p>
                                    </div>
                                )}
                            </motion.div>

                            {/* Documents Card */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
                            >
                                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Award size={24} /></div>
                                    <h3 className="text-xl font-black text-gray-900">Arsip Dokumen</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {user.documents && (user.documents.ktp || user.documents.kk || user.documents.ijazah) ? (
                                        <>
                                            {renderDocPreview('KTP', user.documents.ktp)}
                                            {renderDocPreview('Kartu Keluarga', user.documents.kk)}
                                            {renderDocPreview('Ijazah', user.documents.ijazah)}
                                        </>
                                    ) : (
                                        <div className="col-span-2 text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                                <FileText className="text-gray-300" size={24} />
                                            </div>
                                            <p className="text-gray-400 text-sm font-bold">Belum ada dokumen yang diunggah.</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Hubungi admin untuk melengkapi data berkas Anda.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </motion.div>
        )}

                    {/* Company Info Tab */}
                    {activeTab === 'company' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="company"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Globe size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">Informasi Perusahaan</h3>
                                        <p className="text-xs text-gray-400">Detail identitas organisasi dan kantor pusat.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nama Perusahaan / Kantor</label>
                                        <input 
                                            type="text" 
                                            value={config.officeName || ''} 
                                            onChange={e => setConfig({...config, officeName: e.target.value})} 
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Contoh: PT. Maju Bersama"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end">
                                        <button 
                                            onClick={() => { 
                                                onUpdateSettings(config).catch((e: any) => showToast(`Gagal sinkronisasi: ${e.message}`, "error")); 
                                                showToast('Informasi perusahaan disimpan', 'success'); 
                                            }}
                                            className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Save size={18} /> Simpan Perubahan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Security & Login Tab */}
                    {activeTab === 'security' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="security"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Fingerprint size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">Metode Login & Keamanan</h3>
                                        <p className="text-xs text-gray-400">Konfigurasi cara masuk dan akses sistem.</p>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">URL Google Apps Script Web App</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="url" 
                                                    value={config.apiUrl || ''} 
                                                    onChange={e => setConfig({...config, apiUrl: e.target.value})} 
                                                    className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="https://script.google.com/macros/s/.../exec"
                                                />
                                                <button 
                                                    onClick={async () => {
                                                        if (!config.apiUrl) {
                                                            showToast('Masukkan URL API terlebih dahulu', 'error');
                                                            return;
                                                        }
                                                        try {
                                                            showToast('Mengetes koneksi...', 'info');
                                                            const response = await fetch('/api/proxy', {
                                                                method: 'POST',
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ action: 'ping', apiUrl: config.apiUrl })
                                                            });
                                                            const data = await response.json();
                                                            if (data.status === 'success' || data.status === 'ok' || data.message === 'pong') {
                                                                showToast('Koneksi Berhasil!', 'success');
                                                            } else {
                                                                showToast('Koneksi Gagal: ' + (data.message || 'Unknown error'), 'error');
                                                            }
                                                        } catch (e) {
                                                            showToast('Gagal terhubung ke backend', 'error');
                                                        }
                                                    }}
                                                    className="px-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                                                >
                                                    Test
                                                </button>
                                            </div>
                                            <div className="mt-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                                <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                                                    <span className="block mb-1 uppercase tracking-wider">Cara Menghubungkan:</span>
                                                    1. Buka Google Apps Script editor.<br/>
                                                    2. Deploy sebagai Web App (Akses: Anyone).<br/>
                                                    3. Copy URL Web App dan tempel di atas.<br/>
                                                    4. Klik 'Simpan Pengaturan' di bawah.
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Toleransi Keterlambatan (Menit)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                value={config.gracePeriodMinutes || 0} 
                                                onChange={e => setConfig({...config, gracePeriodMinutes: parseInt(e.target.value)})} 
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("Hapus semua data lokal dan reset ke pengaturan awal? Anda akan keluar dari sistem.")) {
                                                        onReset();
                                                    }
                                                }}
                                                className="px-6 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Trash2 size={18} /> Reset Data Lokal
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm("Impor 22 data karyawan awal ke backend?")) {
                                                        try {
                                                            showToast("Memulai impor data...", "info");
                                                            const { seedEmployees } = await import('../services/seed_data');
                                                            await seedEmployees();
                                                            showToast("Data karyawan berhasil diimpor!", "success");
                                                        } catch (e: any) {
                                                            showToast("Gagal impor: " + e.message, "error");
                                                        }
                                                    }
                                                }}
                                                className="px-6 py-3.5 bg-amber-50 text-amber-600 rounded-2xl font-black text-xs hover:bg-amber-100 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Users size={18} /> Impor Data Awal
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => { 
                                                onUpdateSettings(config).catch((e: any) => showToast(`Gagal sinkronisasi: ${e.message}`, "error")); 
                                                showToast('Pengaturan keamanan disimpan', 'success'); 
                                            }}
                                            className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Save size={18} /> Simpan Pengaturan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Locations Tab */}
                    {activeTab === 'locations' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="locations"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={24} /></div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">Lokasi Kantor & Cabang</h3>
                                            <p className="text-xs text-gray-400">Daftar lokasi kantor yang diizinkan untuk absensi WFO.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={openAddOffice} 
                                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
                                    >
                                        <Plus size={18} /> Tambah Lokasi
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(config.offices || []).map(office => (
                                        <div key={office.id} className="border border-gray-100 rounded-3xl p-6 hover:shadow-lg transition-all bg-gray-50/30 group relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div>
                                                    <h4 className="font-black text-gray-900 text-lg">{office.name}</h4>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Radius: {office.radius * 1000} Meter</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEditOffice(office)} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                                                    <button onClick={() => deleteOffice(office.id)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-500 bg-white p-3 rounded-xl border border-gray-50 shadow-sm relative z-10">
                                                <div className="flex justify-between mb-1">
                                                    <span>LATITUDE:</span>
                                                    <span className="text-gray-800">{office.lat.toFixed(6)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>LONGITUDE:</span>
                                                    <span className="text-gray-800">{office.lng.toFixed(6)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(config.offices || []).length === 0 && (
                                        <div className="md:col-span-2 text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                            <p className="text-gray-400 text-sm font-bold">Belum ada lokasi kantor yang ditambahkan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Shifts Tab */}
                    {activeTab === 'shifts' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="shifts"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Clock size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Jadwal & Shift Kerja</h3>
                                            <p className="text-xs text-slate-400">Kelola jam kerja dan penugasan karyawan.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={openAddShift} 
                                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        <Plus size={16} /> Tambah Jadwal
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {config.shifts.map(shift => (
                                        <div key={shift.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${shift.isFlexible ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        <Clock size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-sm">{shift.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-500">{shift.startTime} - {shift.endTime}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditShift(shift)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                                                    <button onClick={() => deleteShift(shift.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <div className="flex gap-1">
                                                    {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, i) => (
                                                        <span key={i} className={`text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded ${shift.workDays.includes(i+1) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                            {day}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400">{shift.assignedUserIds.length} Staff</span>
                                            </div>
                                        </div>
                                    ))}
                                    {config.shifts.length === 0 && (
                                        <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 col-span-full">
                                            <p className="text-slate-400 text-xs font-medium">Belum ada jadwal yang ditambahkan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Jobs & Responsibilities Tab */}
                    {activeTab === 'jobs' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="jobs"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Briefcase size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Manajemen Jabatan</h3>
                                            <p className="text-xs text-slate-400">Atur struktur posisi dan tanggung jawab.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={openAddJob} 
                                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        <Plus size={16} /> Tambah Jabatan
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(config.jobRoles || []).map(job => {
                                        const employeeCount = state.users.filter(u => u.jobRoleId === job.id).length;
                                        const getLevelColor = (level: string) => {
                                            switch (level) {
                                                case 'Executive': return 'text-purple-600 bg-purple-50';
                                                case 'Manager': return 'text-orange-600 bg-orange-50';
                                                case 'Senior': return 'text-blue-600 bg-blue-50';
                                                default: return 'text-slate-600 bg-slate-50';
                                            }
                                        };

                                        return (
                                            <div key={job.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-600 shadow-sm">
                                                            <Briefcase size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">{job.title}</h4>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getLevelColor(job.level)}`}>
                                                                {job.level}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openEditJob(job)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                                                        <button onClick={() => deleteJob(job.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Users size={10} /> {employeeCount} Staff
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 italic truncate max-w-[100px]">
                                                        {job.coreResponsibilities.length} Tugas
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(config.jobRoles || []).length === 0 && (
                                        <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-slate-400 text-xs font-medium">Belum ada jabatan yang ditambahkan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && user.role === 'superadmin' && (
                        <motion.div 
                            key="permissions"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><ShieldAlert size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Hak Akses (RBAC)</h3>
                                            <p className="text-xs text-slate-400">Atur modul yang dapat diakses oleh setiap level jabatan.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            onUpdateSettings(config).catch((e: any) => showToast(`Gagal sinkronisasi: ${e.message}`, "error"));
                                            showToast("Hak akses berhasil disinkronkan!", "success");
                                        }}
                                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        <Save size={16} /> Simpan Perubahan
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {['employee', 'manager', 'hr', 'admin'].map((role) => {
                                        const rolePerm = config.rolePermissions?.find(p => p.role === role) || { role: role as any, allowedModules: [] };
                                        const roleLabel = role === 'employee' ? 'Karyawan' : role === 'manager' ? 'Manager' : role === 'hr' ? 'HRD' : 'Administrator';
                                        
                                        return (
                                            <div key={role} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{roleLabel}</h4>
                                                    <div className="h-px flex-1 bg-slate-100"></div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                                    {MODULES.map((module) => {
                                                        const isAllowed = rolePerm.allowedModules.includes(module.id);
                                                        return (
                                                            <button
                                                                key={module.id}
                                                                onClick={() => {
                                                                    const currentPerms = config.rolePermissions || [];
                                                                    const existingIdx = currentPerms.findIndex(p => p.role === role);
                                                                    let newPerms = [...currentPerms];
                                                                    
                                                                    if (existingIdx >= 0) {
                                                                        const modules = [...currentPerms[existingIdx].allowedModules];
                                                                        if (isAllowed) {
                                                                            newPerms[existingIdx] = { ...newPerms[existingIdx], allowedModules: modules.filter(m => m !== module.id) };
                                                                        } else {
                                                                            newPerms[existingIdx] = { ...newPerms[existingIdx], allowedModules: [...modules, module.id] };
                                                                        }
                                                                    } else {
                                                                        newPerms.push({ role: role as any, allowedModules: [module.id] });
                                                                    }
                                                                    
                                                                    setConfig({ ...config, rolePermissions: newPerms });
                                                                }}
                                                                className={`p-2.5 rounded-xl border text-center transition-all relative group ${
                                                                    isAllowed 
                                                                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                                                                        : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                                                                }`}
                                                            >
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <module.icon size={12} className={isAllowed ? 'text-slate-300' : 'text-slate-400'} />
                                                                    <span className="font-bold text-[9px] truncate w-full">{module.name}</span>
                                                                </div>
                                                                {isAllowed && (
                                                                    <div className="absolute top-1 right-1">
                                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
      </main>

      {/* Office Modal */}
      {isOfficeModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-3xl rounded-[2rem] flex flex-col max-h-[95vh] shadow-2xl animate-in zoom-in-95 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><MapPin size={20}/></div>
                          <h3 className="text-xl font-black text-gray-800">{editingOffice ? 'Edit Lokasi Kantor' : 'Tambah Lokasi Baru'}</h3>
                      </div>
                      <button onClick={() => setIsOfficeModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500"/></button>
                  </div>
                  <div className="p-8 overflow-y-auto space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nama Lokasi / Cabang</label>
                              <input 
                                  type="text" 
                                  value={officeForm.name} 
                                  onChange={e => setOfficeForm({...officeForm, name: e.target.value})} 
                                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="Contoh: Kantor Cabang Bandung"
                              />
                          </div>
                          
                          <div className="md:col-span-2">
                              <div className="flex items-center justify-between mb-3">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Titik di Peta</label>
                                  <button 
                                      type="button" 
                                      onClick={handleGetCurrentLocation}
                                      className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-black flex items-center gap-2 hover:bg-blue-100 transition-colors"
                                  >
                                      <Crosshair size={14}/> Gunakan Lokasi Saya
                                  </button>
                              </div>
                              
                              {/* Search Bar */}
                              <div className="relative mb-4">
                                  <form onSubmit={handleSearchLocation} className="flex gap-2">
                                      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl flex items-center px-4 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                          <Search size={16} className="text-gray-400" />
                                          <input 
                                              type="text" 
                                              placeholder="Cari alamat atau koordinat..."
                                              className="w-full bg-transparent border-none outline-none py-3 text-sm font-bold px-3"
                                              value={searchQuery}
                                              onChange={(e) => setSearchQuery(e.target.value)}
                                          />
                                      </div>
                                      <button 
                                          type="submit"
                                          disabled={isSearching}
                                          className="bg-slate-900 text-white px-6 rounded-2xl text-xs font-black hover:bg-slate-800 transition-all disabled:opacity-50"
                                      >
                                          {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
                                      </button>
                                  </form>

                                  {/* Search Results Dropdown */}
                                  {searchResults.length > 0 && (
                                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[10001] max-h-60 overflow-y-auto">
                                          {searchResults.map((res, i) => (
                                              <button 
                                                  key={i}
                                                  type="button"
                                                  onClick={() => selectSearchResult(res)}
                                                  className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-start gap-3 transition-colors"
                                              >
                                                  <div className="p-2 bg-gray-50 rounded-lg shrink-0 mt-0.5"><MapPin size={14} className="text-gray-400" /></div>
                                                  <span className="text-xs font-bold text-gray-600 leading-relaxed">{res.display_name}</span>
                                              </button>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              <div className="h-64 w-full rounded-2xl overflow-hidden border border-gray-100 relative z-0 shadow-inner">
                                  <div id="office-map" ref={mapContainerRef} className="h-full w-full"></div>
                              </div>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Latitude</label>
                              <input 
                                  type="number" step="any"
                                  value={officeForm.lat} 
                                  onChange={e => setOfficeForm({...officeForm, lat: parseFloat(e.target.value)})} 
                                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Longitude</label>
                              <input 
                                  type="number" step="any"
                                  value={officeForm.lng} 
                                  onChange={e => setOfficeForm({...officeForm, lng: parseFloat(e.target.value)})} 
                                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                          </div>

                          <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                              <div className="flex justify-between items-center mb-4">
                                  <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Radius Toleransi</label>
                                  <span className="text-sm font-black text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-sm">{(officeForm.radius || 0.1) * 1000} Meter</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="0.01" 
                                  max="2.0" 
                                  step="0.01" 
                                  value={officeForm.radius || 0.1} 
                                  onChange={e => setOfficeForm({...officeForm, radius: parseFloat(e.target.value)})} 
                                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button onClick={() => setIsOfficeModalOpen(false)} className="px-6 py-3 text-gray-500 font-black text-sm hover:bg-gray-200 rounded-2xl transition-all">Batal</button>
                       <button 
                          onClick={saveOffice} 
                          disabled={isSaving}
                          className="px-8 py-3 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                          {isSaving ? (
                              <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Menyimpan...
                              </>
                          ) : 'Simpan Lokasi'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {isShiftModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="text-lg font-bold text-gray-800">{editingShift ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</h3>
                      <button onClick={() => setIsShiftModalOpen(false)}><X className="text-gray-500 hover:text-gray-800"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Jadwal</label>
                              <input type="text" value={shiftForm.name} onChange={e => setShiftForm({...shiftForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: Shift Pagi"/>
                          </div>
                          <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Lokasi</label>
                               <select 
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={shiftForm.isFlexible ? 'online' : 'offline'}
                                    onChange={e => setShiftForm({...shiftForm, isFlexible: e.target.value === 'online'})}
                               >
                                   <option value="offline">Offline (Wajib di Kantor)</option>
                                   <option value="online">Online (Bebas / Remote)</option>
                               </select>
                          </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Clock size={16}/> Pengaturan Waktu</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div><label className="text-xs text-gray-600 block mb-1">Jam Masuk</label><input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} className="w-full border rounded px-2 py-1"/></div>
                              <div><label className="text-xs text-gray-600 block mb-1">Jam Pulang</label><input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} className="w-full border rounded px-2 py-1"/></div>
                              <div><label className="text-xs text-gray-600 block mb-1">Mulai Lembur</label><input type="time" value={shiftForm.overtimeStart} onChange={e => setShiftForm({...shiftForm, overtimeStart: e.target.value})} className="w-full border rounded px-2 py-1"/></div>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hari Aktif</label>
                          <div className="flex flex-wrap gap-2">
                              {WEEK_DAYS.map((day, idx) => (
                                  <button key={idx} type="button" onClick={() => toggleWorkDay(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${shiftForm.workDays?.includes(idx) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>{day}</button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Karyawan Terikat ({shiftForm.assignedUserIds?.length})</label>
                          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50">
                              {state.users.filter(u => u.role !== 'admin').map((user, index) => (
                                  <div key={`${user.id}-${index}`} onClick={() => toggleAssignedUser(user.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${shiftForm.assignedUserIds?.includes(user.id) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${shiftForm.assignedUserIds?.includes(user.id) ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>{shiftForm.assignedUserIds?.includes(user.id) && <Check size={10} className="text-white"/>}</div>
                                      <img src={user.avatar} className="w-6 h-6 rounded-full" alt=""/><span className="text-xs truncate">{user.name}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                      <button onClick={() => setIsShiftModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
                      <button 
                        onClick={saveShift} 
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                          {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Job Role Modal */}
      {isJobModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="text-lg font-bold text-gray-800">{editingJob ? 'Edit Jabatan' : 'Buat Jabatan Baru'}</h3>
                      <button onClick={() => setIsJobModalOpen(false)}><X className="text-gray-500 hover:text-gray-800"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Jabatan</label>
                          <input type="text" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: Staff IT"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Level Jabatan</label>
                          <select value={jobForm.level} onChange={e => setJobForm({...jobForm, level: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white">
                              <option value="Staff">Staff / Junior</option>
                              <option value="Senior">Senior / SPV</option>
                              <option value="Manager">Manager / Head</option>
                              <option value="Executive">Executive / Director</option>
                          </select>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Metode Login Khusus Jabatan</label>
                          <select 
                            value={jobForm.loginMode || 'username'} 
                            onChange={e => setJobForm({...jobForm, loginMode: e.target.value as any})} 
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm font-bold text-blue-900"
                          >
                              <option value="username">Username + Password</option>
                              <option value="employee_id">ID Karyawan + Password</option>
                              <option value="password_only">Hanya Password</option>
                          </select>
                          <p className="text-[10px] text-blue-600 mt-2 font-medium italic">Berlaku jika Mode Login Global disetel ke "Per Tim / Jabatan".</p>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-4 mt-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tugas & Tanggung Jawab Inti</label>
                          <div className="flex gap-2 mb-3">
                              <input 
                                  type="text" 
                                  value={newResponsibility} 
                                  onChange={e => setNewResponsibility(e.target.value)}
                                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                  placeholder="Tambah tugas..."
                                  onKeyDown={e => e.key === 'Enter' && addResponsibility()}
                              />
                              <button type="button" onClick={addResponsibility} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
                          </div>
                          <ul className="space-y-2 max-h-40 overflow-y-auto">
                              {(jobForm.coreResponsibilities || []).map((resp, i) => (
                                  <li key={i} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm">
                                      <span>{resp}</span>
                                      <button type="button" onClick={() => removeResponsibility(i)} className="text-red-500 hover:bg-red-100 p-1 rounded"><X size={14}/></button>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>
                  <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                      <button onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Batal</button>
                      <button 
                        onClick={saveJob} 
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                          {isSaving ? 'Menyimpan...' : 'Simpan Jabatan'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      <ConfirmModal 
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
      />
    </div>
  );
};

export default Settings;
