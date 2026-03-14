
import React, { useState, useEffect, useRef } from 'react';
import { User, AppSettings, Shift, JobRole, OfficeLocation } from '../types';
import { User as UserIcon, Bell, Shield, Save, MapPin, Clock, Trash2, Moon, LogOut, Plus, Edit2, Users, Check, X, Briefcase, List, Calendar, Mail, Phone, Home, FileText, Download, Eye, Award, Crosshair, Camera, CheckCircle2, Loader2, ChevronRight, Sun, ShieldAlert, AlertCircle, Fingerprint, Globe, Search, Link as LinkIcon, Zap, Info, RefreshCw, DownloadCloud, Navigation } from 'lucide-react';
import { WEEK_DAYS } from '../constants';
import { useStore } from '../services/store';
import { api } from '../services/api';
import { getLocalDateString } from '../services/dateUtils';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface SettingsProps {
  user: User;
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => Promise<void>;
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
  const [isTestingApi, setIsTestingApi] = useState(false);
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
    <div className="flex flex-col lg:flex-row h-full bg-slate-50/50 rounded-[40px] overflow-hidden border border-slate-200/60 shadow-sm">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col shrink-0 sticky top-0 z-30">
        <div className="p-8 border-b border-slate-50 hidden lg:block">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Pengaturan Sistem</h2>
        </div>
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto p-4 lg:p-6 gap-3 custom-scrollbar-hide lg:custom-scrollbar">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 group shrink-0 lg:shrink ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200 translate-x-1'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className={`p-2.5 rounded-xl transition-all duration-500 ${activeTab === item.id ? 'bg-white/10 rotate-6' : 'bg-slate-50 group-hover:bg-white group-hover:rotate-6'}`}>
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black leading-none uppercase tracking-[0.15em]">{item.label}</p>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-8 border-t border-slate-50 hidden lg:block mt-auto">
          <div className="bg-slate-50/80 rounded-[32px] p-8 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 transition-transform duration-700 group-hover:scale-150"></div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                <AlertCircle size={18} className="text-blue-500" />
              </div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">Pusat Bantuan</p>
            </div>
            <p className="text-[11px] text-slate-400 font-bold leading-relaxed relative z-10">Butuh bantuan konfigurasi? Hubungi tim IT Support kami.</p>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
        <div className="max-w-5xl mx-auto p-6 md:p-10 lg:p-12">
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
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-8 md:p-10 rounded-[40px] md:rounded-[48px] shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-blue-500/5 to-indigo-600/5"></div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-150"></div>
                        
                        <div className="relative mb-8 group cursor-pointer z-10 mt-6" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-8 border-white shadow-2xl overflow-hidden relative bg-slate-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                                    {profileForm.avatar || user.avatar ? (
                                        <img 
                                            src={profileForm.avatar || user.avatar} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-4xl font-black">
                                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
                                        <Camera size={32} className="text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500" />
                                    </div>
                                </div>
                            <div className={`absolute bottom-3 right-3 w-12 h-12 rounded-full border-4 border-white flex items-center justify-center shadow-xl transition-transform duration-500 group-hover:scale-110 ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                {user.isActive && <Check size={20} className="text-white font-black"/>}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 z-10 tracking-tighter leading-tight">{user.name}</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 z-10">
                            {userJobRole?.title || user.position || 'Administrator'}
                        </p>
                        
                        {/* Avatar Save Button */}
                        {!isEditingProfile && profileForm.avatar !== user.avatar && (
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="mt-8 px-10 py-4 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-full hover:bg-emerald-700 shadow-2xl shadow-emerald-100 flex items-center gap-3 animate-bounce z-10"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Simpan Foto Baru
                            </button>
                        )}

                        <div className="flex flex-wrap justify-center gap-3 mt-8 mb-10 z-10">
                            <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                user.role === 'superadmin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                'bg-sky-50 text-sky-600 border-sky-100'
                            }`}>
                                {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Administrator' : 'Karyawan'}
                            </span>
                            {userJobRole && (
                                <span className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                                    {userJobRole.level}
                                </span>
                            )}
                        </div>

                        <div className="w-full space-y-4 z-10">
                            <div className="bg-slate-50/80 p-6 rounded-3xl flex flex-col items-center gap-1 border border-slate-100 group/item hover:bg-white hover:shadow-md transition-all duration-500">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Bergabung Sejak</span>
                                <span className="font-black text-slate-800 text-lg tracking-tight">
                                    {user.joinDate ? new Date(user.joinDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
                                </span>
                            </div>
                            <div className="bg-slate-50/80 p-6 rounded-3xl flex flex-col items-center gap-1 border border-slate-100 group/item hover:bg-white hover:shadow-md transition-all duration-500">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Sisa Kuota Cuti</span>
                                <span className="font-black text-blue-600 text-2xl tracking-tighter">{user.leaveQuota} Hari</span>
                            </div>
                            <button 
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all duration-500 active:scale-95 shadow-xl ${isEditingProfile ? 'bg-slate-100 text-slate-600 shadow-slate-50' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
                            >
                                {isEditingProfile ? <X size={20}/> : <Edit2 size={20}/>}
                                {isEditingProfile ? 'Batal Perubahan' : 'Lengkapi Biodata'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-white p-8 md:p-10 rounded-[40px] md:rounded-[48px] shadow-sm border border-slate-100 space-y-6">
                        <h4 className="font-black text-slate-800 uppercase text-[11px] tracking-[0.3em] mb-2">Keamanan & Akun</h4>
                        <button onClick={onLogout} className="w-full bg-rose-50 text-rose-600 border border-rose-100 font-black py-5 rounded-[24px] hover:bg-rose-100 flex items-center justify-center gap-4 text-xs uppercase tracking-widest transition-all duration-500 active:scale-95 group">
                            <LogOut size={20} className="transition-transform group-hover:-translate-x-1" /> Keluar Sesi
                        </button>
                    </div>
                </div>

                {/* Right Column: Detailed Info or Edit Form */}
                <div className="lg:col-span-2 space-y-8">
                    {isEditingProfile ? (
                        <motion.form 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleSaveProfile} 
                            className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-100"
                        >
                            <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-50">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><Edit2 size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Manajemen Profil</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Lengkapi biodata diri Anda dengan benar.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Biodata Diri</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nama Lengkap</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">No. Handphone</label>
                                    <input 
                                        type="tel"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Jenis Kelamin</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                                            value={profileForm.gender}
                                            onChange={e => setProfileForm({...profileForm, gender: e.target.value as 'L' | 'P'})}
                                        >
                                            <option value="">Pilih Jenis Kelamin</option>
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronRight size={18} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tempat Lahir</label>
                                    <input 
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        value={profileForm.birthPlace}
                                        onChange={e => setProfileForm({...profileForm, birthPlace: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tanggal Lahir</label>
                                    <input 
                                        type="date"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        value={profileForm.birthDate ? getLocalDateString(new Date(profileForm.birthDate)) : ''}
                                        onChange={e => setProfileForm({...profileForm, birthDate: e.target.value})}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Alamat Domisili</label>
                                    <textarea 
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none h-32 resize-none transition-all"
                                        value={profileForm.address}
                                        onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                                    />
                                </div>

                                <div className="md:col-span-2 mt-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dokumen Karyawan</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* KTP */}
                                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KTP</span>
                                            {profileForm.documents?.ktp && <CheckCircle2 size={16} className="text-emerald-500" />}
                                        </div>
                                        <div className="relative group">
                                            <div className="w-full h-28 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden">
                                                {profileForm.documents?.ktp ? (
                                                    <img 
                                                        src={profileForm.documents.ktp} 
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                                                        alt="KTP" 
                                                        referrerPolicy="no-referrer" 
                                                    />
                                                ) : (
                                                    <FileText size={24} className="text-slate-300" />
                                                )}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10">
                                                    <Camera size={20} className="text-blue-600 mb-1" />
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                        {profileForm.documents?.ktp ? 'Ganti' : 'Unggah'}
                                                    </span>
                                                </div>
                                                {!profileForm.documents?.ktp && (
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:hidden">Unggah</span>
                                                )}
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
                                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KK</span>
                                            {profileForm.documents?.kk && <CheckCircle2 size={16} className="text-emerald-500" />}
                                        </div>
                                        <div className="relative group">
                                            <div className="w-full h-28 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden">
                                                {profileForm.documents?.kk ? (
                                                    <img 
                                                        src={profileForm.documents.kk} 
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                                                        alt="KK" 
                                                        referrerPolicy="no-referrer" 
                                                    />
                                                ) : (
                                                    <FileText size={24} className="text-slate-300" />
                                                )}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10">
                                                    <Camera size={20} className="text-blue-600 mb-1" />
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                        {profileForm.documents?.kk ? 'Ganti' : 'Unggah'}
                                                    </span>
                                                </div>
                                                {!profileForm.documents?.kk && (
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:hidden">Unggah</span>
                                                )}
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
                                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ijazah</span>
                                            {profileForm.documents?.ijazah && <CheckCircle2 size={16} className="text-emerald-500" />}
                                        </div>
                                        <div className="relative group">
                                            <div className="w-full h-28 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden">
                                                {profileForm.documents?.ijazah ? (
                                                    <img 
                                                        src={profileForm.documents.ijazah} 
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                                                        alt="Ijazah" 
                                                        referrerPolicy="no-referrer" 
                                                    />
                                                ) : (
                                                    <FileText size={24} className="text-slate-300" />
                                                )}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10">
                                                    <Camera size={20} className="text-blue-600 mb-1" />
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                        {profileForm.documents?.ijazah ? 'Ganti' : 'Unggah'}
                                                    </span>
                                                </div>
                                                {!profileForm.documents?.ijazah && (
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:hidden">Unggah</span>
                                                )}
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

                                <div className="md:col-span-2 mt-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Keamanan</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Password Baru</label>
                                    <input 
                                        type="password"
                                        placeholder="Kosongkan jika tidak ingin mengubah password"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        value={profileForm.password}
                                        onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="mt-12 flex flex-col sm:flex-row justify-end gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditingProfile(false)}
                                    className="px-10 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-10 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </motion.form>
                    ) : (
                        <div className="space-y-10">
                            {/* Biodata Card */}
                            <motion.div 
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-100 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32"></div>
                                
                                <div className="flex items-center gap-6 mb-12 pb-8 border-b border-slate-50 relative z-10">
                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl shadow-sm flex items-center justify-center"><UserIcon size={28} /></div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Informasi Dasar</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                    <div className="group">
                                        <label className="text-[11px] text-slate-400 uppercase font-black tracking-[0.3em] block mb-4 ml-1">Email Perusahaan</label>
                                        <div className="flex items-center gap-5 text-slate-800 text-sm font-black bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 group-hover:border-blue-200 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-110"><Mail size={20} className="text-blue-500"/></div>
                                            <span className="truncate">{user.email || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[11px] text-slate-400 uppercase font-black tracking-[0.3em] block mb-4 ml-1">No. Handphone</label>
                                        <div className="flex items-center gap-5 text-slate-800 text-sm font-black bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 group-hover:border-blue-200 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-110"><Phone size={20} className="text-blue-500"/></div>
                                            <span className="truncate">{user.phone || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[11px] text-slate-400 uppercase font-black tracking-[0.3em] block mb-4 ml-1">Tempat, Tanggal Lahir</label>
                                        <div className="flex items-center gap-5 text-slate-800 text-sm font-black bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 group-hover:border-blue-200 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-110"><Calendar size={20} className="text-blue-500"/></div>
                                            <span className="truncate">
                                                {user.birthPlace || '-'}, {user.birthDate ? new Date(user.birthDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[11px] text-slate-400 uppercase font-black tracking-[0.3em] block mb-4 ml-1">Jenis Kelamin</label>
                                        <div className="flex items-center gap-5 text-slate-800 text-sm font-black bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 group-hover:border-blue-200 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-110"><UserIcon size={20} className="text-blue-500"/></div>
                                            <span className="truncate">{user.gender === 'L' ? 'Laki-laki' : user.gender === 'P' ? 'Perempuan' : '-'}</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 group">
                                        <label className="text-[11px] text-slate-400 uppercase font-black tracking-[0.3em] block mb-4 ml-1">Alamat Domisili</label>
                                        <div className="flex items-start gap-6 text-slate-800 text-sm font-black bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 group-hover:border-blue-200 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center flex-shrink-0 mt-1 transition-transform duration-500 group-hover:scale-110"><Home size={24} className="text-blue-500"/></div>
                                            <span className="leading-relaxed text-base">{user.address || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Job Description Card */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-100 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32"></div>
                                
                                <div className="flex items-center gap-6 mb-12 pb-8 border-b border-slate-50 relative z-10">
                                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl shadow-sm flex items-center justify-center"><Briefcase size={28} /></div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Tanggung Jawab Pekerjaan</h3>
                                        <p className="text-[11px] text-amber-500 uppercase tracking-[0.3em] font-black mt-2">
                                            {userJobRole?.title || user.position || 'Administrator'}
                                        </p>
                                    </div>
                                </div>

                                {userJobRole ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                        {userJobRole.coreResponsibilities.map((resp, idx) => (
                                            <div key={idx} className="flex gap-6 items-start p-8 rounded-[32px] bg-slate-50/50 border border-slate-100 group hover:bg-white hover:border-amber-200 hover:shadow-xl transition-all duration-500">
                                                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm group-hover:bg-amber-50 group-hover:border-amber-100 transition-all duration-500">
                                                    <CheckCircle2 className="text-amber-600" size={20} />
                                                </div>
                                                <span className="text-sm font-black text-slate-700 leading-relaxed">{resp}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 relative z-10">
                                        <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-slate-100">
                                            <List className="text-slate-300" size={40} />
                                        </div>
                                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">Daftar tugas belum diatur oleh admin.</p>
                                    </div>
                                )}
                            </motion.div>

                            {/* Documents Card */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white p-8 md:p-12 rounded-[48px] shadow-sm border border-slate-100 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full -mr-32 -mt-32"></div>
                                
                                <div className="flex items-center gap-6 mb-12 pb-8 border-b border-slate-50 relative z-10">
                                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl shadow-sm flex items-center justify-center"><Award size={28} /></div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Arsip Dokumen</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    {user.documents && (user.documents.ktp || user.documents.kk || user.documents.ijazah) ? (
                                        <>
                                            {renderDocPreview('KTP', user.documents.ktp)}
                                            {renderDocPreview('Kartu Keluarga', user.documents.kk)}
                                            {renderDocPreview('Ijazah', user.documents.ijazah)}
                                        </>
                                    ) : (
                                        <div className="col-span-2 text-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                                            <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-slate-100">
                                                <FileText className="text-slate-300" size={40} />
                                            </div>
                                            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">Belum ada dokumen yang diunggah.</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-3 font-black">Silakan lengkapi berkas melalui menu edit profil.</p>
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-100">
                                <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-50">
                                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><Globe size={24} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">Informasi Perusahaan</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Detail identitas organisasi dan kantor pusat.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 block">Nama Perusahaan / Kantor</label>
                                        <input 
                                            type="text" 
                                            value={config.officeName || ''} 
                                            onChange={e => setConfig({...config, officeName: e.target.value})} 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                            placeholder="Contoh: PT. Maju Bersama"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end">
                                        <button 
                                            onClick={() => { 
                                                onUpdateSettings(config).catch((e: any) => showToast(`Gagal sinkronisasi: ${e.message}`, "error")); 
                                                showToast('Informasi perusahaan disimpan', 'success'); 
                                            }}
                                            className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <Save size={18} /> Simpan Perubahan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="security"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-100">
                                <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-50">
                                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl shadow-sm"><Shield size={24} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">Integrasi & Keamanan</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Konfigurasi endpoint API dan sinkronisasi data.</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-10">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 block">Google Apps Script Web App URL</label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="url" 
                                                    value={config.apiUrl || ''} 
                                                    onChange={e => setConfig({...config, apiUrl: e.target.value})} 
                                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                                    placeholder="https://script.google.com/macros/s/.../exec"
                                                />
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <LinkIcon size={18} />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    if (!config.apiUrl) return showToast('Masukkan URL API terlebih dahulu', 'error');
                                                    setIsTestingApi(true);
                                                    try {
                                                        // Update URL in API service temporarily for testing
                                                        api.setApiUrl(config.apiUrl);
                                                        const data = await api.ping();
                                                        
                                                        if (data.status === 'success' || data.status === 'ok' || data.message === 'pong') {
                                                            const versionInfo = data.version ? ` (v${data.version})` : '';
                                                            showToast(`Koneksi Berhasil!${versionInfo}`, 'success');
                                                        } else {
                                                            showToast('Koneksi Gagal: ' + (data.message || 'Unknown error'), 'error');
                                                        }
                                                    } catch (e: any) {
                                                        showToast('Gagal terhubung ke backend: ' + (e.message || 'Network error'), 'error');
                                                    } finally {
                                                        setIsTestingApi(false);
                                                    }
                                                }}
                                                disabled={isTestingApi}
                                                className="px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                {isTestingApi ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                                Test Koneksi
                                            </button>
                                        </div>
                                        <div className="mt-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4">
                                            <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-100 h-fit"><Info size={16} className="text-blue-500" /></div>
                                            <p className="text-[11px] text-blue-700 leading-relaxed font-bold">
                                                Pastikan Anda telah mempublikasikan Google Apps Script sebagai "Web App" dengan akses "Anyone" agar sistem dapat melakukan sinkronisasi data secara real-time.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                                        <button 
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: "Reset Data Lokal?",
                                                    message: "Hapus semua data lokal dan reset ke pengaturan awal? Anda akan keluar dari sistem.",
                                                    onConfirm: onReset
                                                });
                                            }}
                                            className="p-6 bg-rose-50 border border-rose-100 rounded-[32px] text-left group hover:bg-rose-100 transition-all active:scale-95"
                                        >
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all">
                                                <RefreshCw size={24} className="text-rose-500" />
                                            </div>
                                            <h4 className="text-sm font-black text-rose-700 uppercase tracking-widest mb-1">Reset Data Lokal</h4>
                                            <p className="text-[10px] text-rose-500/80 font-bold leading-relaxed uppercase tracking-wider">Hapus cache dan pengaturan yang tersimpan di browser ini.</p>
                                        </button>

                                        <button 
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: "Impor Data Karyawan?",
                                                    message: "Impor data karyawan awal ke backend?",
                                                    onConfirm: async () => {
                                                        try {
                                                            showToast("Memulai impor data...", "info");
                                                            const { seedEmployees } = await import('../services/seed_data');
                                                            await seedEmployees();
                                                            showToast("Data karyawan berhasil diimpor!", "success");
                                                        } catch (e: any) {
                                                            showToast("Gagal impor: " + e.message, "error");
                                                        }
                                                    }
                                                });
                                            }}
                                            className="p-6 bg-indigo-50 border border-indigo-100 rounded-[32px] text-left group hover:bg-indigo-100 transition-all active:scale-95"
                                        >
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all">
                                                <DownloadCloud size={24} className="text-indigo-500" />
                                            </div>
                                            <h4 className="text-sm font-black text-indigo-700 uppercase tracking-widest mb-1">Impor Database</h4>
                                            <p className="text-[10px] text-indigo-500/80 font-bold leading-relaxed uppercase tracking-wider">Tarik data karyawan terbaru dari Google Sheets ke sistem lokal.</p>
                                        </button>
                                    </div>

                                    <div className="flex justify-end pt-6">
                                        <button 
                                            onClick={() => { 
                                                onUpdateSettings(config).catch((e: any) => showToast(`Gagal sinkronisasi: ${e.message}`, "error")); 
                                                showToast('Pengaturan keamanan disimpan', 'success'); 
                                            }}
                                            className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <Save size={18} /> Simpan Perubahan
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Lokasi Kantor</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Kelola titik koordinat presensi karyawan.</p>
                                </div>
                                <button 
                                    onClick={openAddOffice}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Plus size={18} /> Tambah Lokasi
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {config.offices?.map((office) => (
                                    <motion.div 
                                        key={office.id} 
                                        className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 group hover:shadow-xl hover:border-blue-100 transition-all relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full"></div>
                                        
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <MapPin size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openEditOffice(office)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => deleteOffice(office.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative z-10">
                                            <h4 className="text-xl font-black text-slate-800 mb-2">{office.name}</h4>
                                            <div className="flex items-center gap-2 text-blue-600 mb-6">
                                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Radius: {office.radius} Meter</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm"><Navigation size={14} className="text-slate-400" /></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Koordinat</span>
                                                        <span className="text-xs font-black text-slate-700">{office.lat.toFixed(6)}, {office.lng.toFixed(6)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {(!config.offices || config.offices.length === 0) && (
                                    <div className="md:col-span-2 text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
                                        <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                            <MapPin size={40} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-widest">Belum Ada Lokasi</h4>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Tambahkan lokasi kantor untuk memulai sistem presensi.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Shifts Tab */}
                    {activeTab === 'shifts' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="shifts"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Jadwal Kerja</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Atur jam masuk, pulang, dan hari kerja karyawan.</p>
                                </div>
                                <button 
                                    onClick={openAddShift}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Plus size={18} /> Tambah Jadwal
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {config.shifts?.map((shift) => (
                                    <motion.div 
                                        key={shift.id} 
                                        className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 group hover:shadow-xl hover:border-blue-100 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Clock size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-slate-800">{shift.name}</h4>
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${shift.isFlexible ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                                        {shift.isFlexible ? 'Flexible / Online' : 'Fixed / Kantor'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openEditShift(shift)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Masuk</span>
                                                <span className="text-sm font-black text-slate-800">{shift.startTime}</span>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pulang</span>
                                                <span className="text-sm font-black text-slate-800">{shift.endTime}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
                                                const isActive = shift.workDays.includes(idx + 1);
                                                return (
                                                    <span key={day} className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-50 text-slate-300'}`}>
                                                        {day}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {shift.assignedUserIds.slice(0, 5).map((uid) => {
                                                    const u = state.users.find(u => u.id === uid);
                                                    return (
                                                        <div key={uid} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                                            <img src={u?.avatar || `https://ui-avatars.com/api/?name=${u?.name}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                        </div>
                                                    );
                                                })}
                                                {shift.assignedUserIds.length > 5 && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                                        +{shift.assignedUserIds.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shift.assignedUserIds.length} Karyawan</span>
                                        </div>
                                    </motion.div>
                                ))}

                                {(!config.shifts || config.shifts.length === 0) && (
                                    <div className="md:col-span-2 text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
                                        <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                            <Clock size={40} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-widest">Belum Ada Jadwal</h4>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Tambahkan jadwal kerja untuk mengatur jam operasional.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Jobs & Responsibilities Tab */}
                    {activeTab === 'jobs' && (user.role === 'admin' || user.role === 'superadmin') && (
                        <motion.div 
                            key="jobs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Manajemen Jabatan</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Struktur organisasi dan tanggung jawab karyawan.</p>
                                </div>
                                <button 
                                    onClick={openAddJob}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Plus size={18} /> Tambah Jabatan
                                </button>
                            </div>

                            <div className="space-y-12">
                                {(config.jobRoles || []).map((job) => {
                                    const employeeCount = state.users.filter(u => u.jobRoleId === job.id).length;
                                    
                                    return (
                                        <motion.div 
                                            key={job.id} 
                                            className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all"
                                        >
                                            <div 
                                                onClick={() => openEditJob(job)}
                                                className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-4 bg-slate-900 text-white rounded-2xl">
                                                        <Briefcase size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{job.title}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Users size={12} /> {employeeCount} Karyawan
                                                            </span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{job.level}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEditJob(job)} className="px-5 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2">
                                                        <Edit2 size={14} /> Edit Jabatan
                                                    </button>
                                                    <button onClick={() => deleteJob(job.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-0">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="bg-[#F27D26]">
                                                            <th className="w-16 py-4 px-6 text-left text-[11px] font-black text-white uppercase tracking-widest border-r border-white/10">No</th>
                                                            <th className="py-4 px-6 text-left text-[11px] font-black text-white uppercase tracking-widest">Tugas / Aktivitas</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {job.coreResponsibilities.map((resp, idx) => (
                                                            <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-4 px-6 text-sm font-black text-slate-400 border-r border-slate-50">{idx + 1}</td>
                                                                <td className="py-4 px-6 text-sm font-bold text-slate-700">{resp}</td>
                                                            </tr>
                                                        ))}
                                                        {job.coreResponsibilities.length === 0 && (
                                                            <tr>
                                                                <td colSpan={2} className="py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada tugas ditambahkan</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {(config.jobRoles || []).length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
                                        <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                            <Briefcase size={40} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-widest">Belum Ada Jabatan</h4>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Tambahkan struktur jabatan untuk mengatur tanggung jawab karyawan.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && user.role === 'superadmin' && (
                        <motion.div 
                            key="permissions"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Hak Akses (RBAC)</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Atur modul yang dapat diakses oleh setiap level jabatan.</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        onUpdateSettings(config).catch((e: any) => showToast(`Gagal sinkronisasi: ${e.message}`, "error"));
                                        showToast("Hak akses berhasil disinkronkan!", "success");
                                    }}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Save size={18} /> Simpan Perubahan
                                </button>
                            </div>

                            <div className="space-y-10">
                                {['employee', 'manager', 'hr', 'admin'].map((role) => {
                                    const rolePerm = config.rolePermissions?.find(p => p.role === role) || { role: role as any, allowedModules: [] };
                                    const roleLabel = role === 'employee' ? 'Karyawan' : role === 'manager' ? 'Manager' : role === 'hr' ? 'HRD' : 'Administrator';
                                    
                                    return (
                                        <div key={role} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                                    <Fingerprint size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-widest">{roleLabel}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Konfigurasi Modul Akses</p>
                                                </div>
                                                <div className="h-px flex-1 bg-slate-50"></div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                                                            className={`p-4 rounded-2xl border text-left transition-all relative group flex flex-col gap-3 ${
                                                                isAllowed 
                                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100' 
                                                                    : 'border-slate-100 bg-slate-50 hover:border-slate-200 text-slate-600'
                                                            }`}
                                                        >
                                                            <div className={`p-2 rounded-lg w-fit ${isAllowed ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                                                <module.icon size={16} className={isAllowed ? 'text-white' : 'text-slate-400'} />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <span className="font-black text-[10px] uppercase tracking-widest block truncate">{module.name}</span>
                                                                <span className={`text-[8px] font-bold uppercase tracking-tighter block truncate ${isAllowed ? 'text-blue-100' : 'text-slate-400'}`}>
                                                                    {isAllowed ? 'Akses Aktif' : 'Terbatas'}
                                                                </span>
                                                            </div>
                                                            {isAllowed && (
                                                                <div className="absolute top-3 right-3">
                                                                    <Check size={14} className="text-white" />
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
      </main>

      {/* Office Modal */}
      {isOfficeModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white w-full max-w-3xl rounded-[40px] flex flex-col max-h-[95vh] shadow-2xl overflow-hidden border border-white/20"
              >
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                              <MapPin size={24}/>
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900">{editingOffice ? 'Edit Lokasi' : 'Tambah Lokasi'}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Konfigurasi titik koordinat presensi.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsOfficeModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
                          <X size={24} className="text-slate-400"/>
                      </button>
                  </div>

                  <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nama Lokasi / Cabang</label>
                              <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                      <Home size={18} />
                                  </div>
                                  <input 
                                      type="text" 
                                      value={officeForm.name} 
                                      onChange={e => setOfficeForm({...officeForm, name: e.target.value})} 
                                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                      placeholder="Contoh: Kantor Pusat Jakarta"
                                  />
                              </div>
                          </div>
                          
                          <div className="md:col-span-2">
                              <div className="flex items-center justify-between mb-4">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Titik di Peta</label>
                                  <button 
                                      type="button" 
                                      onClick={handleGetCurrentLocation}
                                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                  >
                                      <Crosshair size={14}/> Gunakan Lokasi Saya
                                  </button>
                              </div>
                              
                              <div className="relative mb-6">
                                  <form onSubmit={handleSearchLocation} className="flex gap-3">
                                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center px-5 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all group">
                                          <Search size={18} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                          <input 
                                              type="text" 
                                              placeholder="Cari alamat atau koordinat..."
                                              className="w-full bg-transparent border-none outline-none py-4 text-sm font-black px-4 text-slate-700 placeholder:text-slate-300"
                                              value={searchQuery}
                                              onChange={(e) => setSearchQuery(e.target.value)}
                                          />
                                      </div>
                                      <button 
                                          type="submit"
                                          disabled={isSearching}
                                          className="bg-slate-900 text-white px-8 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-slate-200"
                                      >
                                          {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Cari'}
                                      </button>
                                  </form>

                                  <AnimatePresence>
                                      {searchResults.length > 0 && (
                                          <motion.div 
                                              initial={{ opacity: 0, y: 10 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              exit={{ opacity: 0, y: 10 }}
                                              className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden z-[10001] max-h-60 overflow-y-auto custom-scrollbar"
                                          >
                                              {searchResults.map((res, i) => (
                                                  <button 
                                                      key={i}
                                                      type="button"
                                                      onClick={() => selectSearchResult(res)}
                                                      className="w-full text-left p-5 hover:bg-blue-50 border-b border-slate-50 last:border-none flex items-start gap-4 transition-all group"
                                                  >
                                                      <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-white transition-colors"><MapPin size={16} className="text-slate-400 group-hover:text-blue-600" /></div>
                                                      <span className="text-xs font-black text-slate-600 leading-relaxed group-hover:text-blue-700">{res.display_name}</span>
                                                  </button>
                                              ))}
                                          </motion.div>
                                      )}
                                  </AnimatePresence>
                              </div>

                              <div className="h-72 w-full rounded-[24px] overflow-hidden border border-slate-100 relative z-0 shadow-inner group">
                                  <div id="office-map" ref={mapContainerRef} className="h-full w-full"></div>
                                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Geser pin untuk menyesuaikan titik koordinat</p>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Latitude</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300">
                                      <Navigation size={16} />
                                  </div>
                                  <input 
                                      type="number" step="any"
                                      value={officeForm.lat} 
                                      onChange={e => setOfficeForm({...officeForm, lat: parseFloat(e.target.value)})} 
                                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                  />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Longitude</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300">
                                      <Navigation size={16} className="rotate-90" />
                                  </div>
                                  <input 
                                      type="number" step="any"
                                      value={officeForm.lng} 
                                      onChange={e => setOfficeForm({...officeForm, lng: parseFloat(e.target.value)})} 
                                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                  />
                              </div>
                          </div>

                          <div className="md:col-span-2 bg-blue-50/50 p-8 rounded-[32px] border border-blue-100">
                              <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-100">
                                          <Crosshair size={14}/>
                                      </div>
                                      <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Radius Toleransi Presensi</label>
                                  </div>
                                  <span className="text-xs font-black text-blue-700 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                                      {Math.round((officeForm.radius || 0.1) * 1000)} Meter
                                  </span>
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
                              <div className="flex justify-between mt-3">
                                  <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">10 Meter</span>
                                  <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">2 Kilometer</span>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-8 border-t border-slate-50 flex flex-col sm:flex-row justify-end gap-4 bg-slate-50/50">
                      <button 
                          onClick={() => setIsOfficeModalOpen(false)} 
                          className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-all active:scale-95"
                      >
                          Batal
                      </button>
                      <button 
                          onClick={saveOffice} 
                          disabled={isSaving}
                          className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                          {isSaving ? (
                              <>
                                  <Loader2 size={18} className="animate-spin" />
                                  Menyimpan...
                              </>
                          ) : (
                              <>
                                  <Save size={18} />
                                  Simpan Lokasi
                              </>
                          )}
                      </button>
                  </div>
              </motion.div>
          </div>
      )}
      {isShiftModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white w-full max-w-2xl rounded-[40px] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-white/20"
              >
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                              <Calendar size={24}/>
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900">{editingShift ? 'Edit Jadwal' : 'Buat Jadwal'}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Konfigurasi jam kerja dan hari aktif.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsShiftModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
                          <X size={24} className="text-slate-400"/>
                      </button>
                  </div>

                  <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nama Jadwal</label>
                              <input 
                                  type="text" 
                                  value={shiftForm.name} 
                                  onChange={e => setShiftForm({...shiftForm, name: e.target.value})} 
                                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" 
                                  placeholder="Contoh: Shift Pagi"
                              />
                          </div>
                          <div className="space-y-2">
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tipe Lokasi</label>
                               <select 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                    value={shiftForm.isFlexible ? 'online' : 'offline'}
                                    onChange={e => setShiftForm({...shiftForm, isFlexible: e.target.value === 'online'})}
                               >
                                   <option value="offline">Offline (Wajib di Kantor)</option>
                                   <option value="online">Online (Bebas / Remote)</option>
                               </select>
                          </div>
                      </div>

                      <div className="bg-indigo-50/50 p-8 rounded-[32px] border border-indigo-100 space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-100">
                                  <Clock size={16}/>
                              </div>
                              <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Pengaturan Waktu Kerja</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block ml-1">Jam Masuk</label>
                                  <input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-black text-indigo-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"/>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block ml-1">Jam Pulang</label>
                                  <input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-black text-indigo-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"/>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block ml-1">Mulai Lembur</label>
                                  <input type="time" value={shiftForm.overtimeStart} onChange={e => setShiftForm({...shiftForm, overtimeStart: e.target.value})} className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-black text-indigo-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"/>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hari Aktif Kerja</label>
                          <div className="flex flex-wrap gap-3">
                              {WEEK_DAYS.map((day, idx) => {
                                  const isActive = shiftForm.workDays?.includes(idx);
                                  return (
                                      <button 
                                          key={idx} 
                                          type="button" 
                                          onClick={() => toggleWorkDay(idx)} 
                                          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                                              isActive 
                                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                                                  : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'
                                          }`}
                                      >
                                          {day}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-center justify-between ml-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan Terikat</label>
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-widest">
                                  {shiftForm.assignedUserIds?.length || 0} Terpilih
                              </span>
                          </div>
                          <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-[32px] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 custom-scrollbar">
                              {state.users.filter(u => u.role !== 'admin').map((user, index) => {
                                  const isAssigned = shiftForm.assignedUserIds?.includes(user.id);
                                  return (
                                      <button 
                                          key={`${user.id}-${index}`} 
                                          onClick={() => toggleAssignedUser(user.id)} 
                                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                                              isAssigned 
                                                  ? 'bg-white border-indigo-200 shadow-md' 
                                                  : 'bg-white/50 border-transparent hover:bg-white hover:border-slate-200'
                                          }`}
                                      >
                                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                              isAssigned ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 group-hover:border-indigo-300'
                                          }`}>
                                              {isAssigned && <Check size={14} />}
                                          </div>
                                          <img 
                                              src={user.avatar} 
                                              className="w-10 h-10 rounded-xl object-cover shadow-sm" 
                                              alt=""
                                              referrerPolicy="no-referrer"
                                              onError={(e) => {
                                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                              }}
                                          />
                                          <div className="flex-1 min-w-0">
                                              <p className={`text-xs font-black truncate ${isAssigned ? 'text-slate-900' : 'text-slate-600'}`}>{user.name}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{user.position || 'Karyawan'}</p>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  </div>

                  <div className="p-8 border-t border-slate-50 flex flex-col sm:flex-row justify-end gap-4 bg-slate-50/50">
                      <button 
                          onClick={() => setIsShiftModalOpen(false)} 
                          className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-all active:scale-95"
                      >
                          Batal
                      </button>
                      <button 
                        onClick={saveShift} 
                        disabled={isSaving}
                        className="px-10 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                          {isSaving ? (
                              <>
                                  <Loader2 size={18} className="animate-spin" />
                                  Menyimpan...
                              </>
                          ) : (
                              <>
                                  <Save size={18} />
                                  Simpan Jadwal
                              </>
                          )}
                      </button>
                  </div>
              </motion.div>
          </div>
      )}

      {/* Job Role Modal */}
      {isJobModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white w-full max-w-lg rounded-[40px] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-white/20"
              >
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                              <Briefcase size={24}/>
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900">{editingJob ? 'Edit Jabatan' : 'Tambah Jabatan'}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Konfigurasi peran dan tanggung jawab.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsJobModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
                          <X size={24} className="text-slate-400"/>
                      </button>
                  </div>

                  <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                      <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nama Jabatan</label>
                          <input 
                              type="text" 
                              value={jobForm.title} 
                              onChange={e => setJobForm({...jobForm, title: e.target.value})} 
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300" 
                              placeholder="Contoh: Senior Developer"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Level Jabatan</label>
                          <select 
                              value={jobForm.level} 
                              onChange={e => setJobForm({...jobForm, level: e.target.value})} 
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                          >
                              <option value="Staff">Staff / Junior</option>
                              <option value="Senior">Senior / SPV</option>
                              <option value="Manager">Manager / Head</option>
                              <option value="Executive">Executive / Director</option>
                          </select>
                      </div>

                      <div className="bg-emerald-50/50 p-8 rounded-[32px] border border-emerald-100 space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-md shadow-emerald-100">
                                  <Fingerprint size={16}/>
                              </div>
                              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Metode Login Khusus Jabatan</label>
                          </div>
                          <select 
                            value={jobForm.loginMode || 'username'} 
                            onChange={e => setJobForm({...jobForm, loginMode: e.target.value as any})} 
                            className="w-full px-6 py-4 bg-white border border-emerald-100 rounded-xl text-sm font-black text-emerald-900 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none cursor-pointer"
                          >
                              <option value="username">Username + Password</option>
                              <option value="employee_id">ID Karyawan + Password</option>
                              <option value="password_only">Hanya Password</option>
                          </select>
                          <p className="text-[9px] text-emerald-600 mt-2 font-bold uppercase tracking-widest italic opacity-70">Berlaku jika Mode Login Global disetel ke "Per Tim / Jabatan".</p>
                      </div>
                      
                      <div className="space-y-4">
                          <div className="flex items-center justify-between ml-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tugas & Tanggung Jawab Inti</label>
                              <button 
                                onClick={() => {
                                    const bulk = window.prompt("Masukkan daftar tugas (pisahkan dengan baris baru):");
                                    if (bulk) {
                                        const tasks = bulk.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                                        setJobForm({ ...jobForm, coreResponsibilities: [...(jobForm.coreResponsibilities || []), ...tasks] });
                                    }
                                }}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                              >
                                  <Plus size={12} /> Tambah Sekaligus (Bulk)
                              </button>
                          </div>
                          <div className="flex gap-3">
                              <div className="flex-1 relative group">
                                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300">
                                      <Plus size={16} />
                                  </div>
                                  <input 
                                      type="text" 
                                      value={newResponsibility} 
                                      onChange={e => setNewResponsibility(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && addResponsibility()}
                                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                                      placeholder="Ketik tugas baru..."
                                  />
                              </div>
                              <button 
                                  onClick={addResponsibility}
                                  className="p-4 bg-slate-900 text-white rounded-[20px] hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                              >
                                  <Plus size={20} />
                              </button>
                          </div>

                          <div className="space-y-3">
                              {(jobForm.coreResponsibilities || []).map((resp, idx) => (
                                  <motion.div 
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      key={idx} 
                                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-emerald-200 transition-all"
                                  >
                                      <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-150 transition-transform"></div>
                                          <span className="text-xs font-black text-slate-600 truncate">{resp}</span>
                                      </div>
                                      <button 
                                          onClick={() => removeResponsibility(idx)}
                                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </motion.div>
                              ))}
                              {(!jobForm.coreResponsibilities || jobForm.coreResponsibilities.length === 0) && (
                                  <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada tugas ditambahkan</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="p-8 border-t border-slate-50 flex flex-col sm:flex-row justify-end gap-4 bg-slate-50/50">
                      <button 
                          onClick={() => setIsJobModalOpen(false)} 
                          className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-all active:scale-95"
                      >
                          Batal
                      </button>
                      <button 
                          onClick={saveJob} 
                          disabled={isSaving}
                          className="px-10 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                          {isSaving ? (
                              <>
                                  <Loader2 size={18} className="animate-spin" />
                                  Menyimpan...
                              </>
                          ) : (
                              <>
                                  <Save size={18} />
                                  Simpan Jabatan
                              </>
                          )}
                      </button>
                  </div>
              </motion.div>
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
