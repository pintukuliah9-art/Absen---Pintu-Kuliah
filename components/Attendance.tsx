import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, RefreshCw, AlertTriangle, CheckCircle, LogOut, Eye, Timer, Navigation, XCircle, Clock, Calendar, Briefcase, ChevronRight, Loader2, Search, Crosshair, Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, User, AppSettings, OfficeLocation } from '../types';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceProps {
  user: User;
  settings: AppSettings;
  onCheckIn: (record: AttendanceRecord) => void;
  onCheckOut: (checkOutTime: string, location?: { lat: number, lng: number }, officeId?: string, officeName?: string) => void;
  todayRecord?: AttendanceRecord;
}

const Attendance: React.FC<AttendanceProps> = ({ user, settings, onCheckIn, onCheckOut, todayRecord }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'idle' | 'locating' | 'camera' | 'success' | 'error'>('idle');
  const [mode, setMode] = useState<'IN' | 'OUT'>('IN');
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const officeCircleRef = useRef<any>(null);

  // Find assigned shift with fallback to first shift if none assigned
  const userShift = settings.shifts?.find(s => s.assignedUserIds.includes(user.id)) || settings.shifts?.[0];

  const formatTimeDisplay = (timeStr: string) => {
      if (!timeStr) return '';
      if (timeStr.includes('T')) {
          try {
              const date = new Date(timeStr);
              return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
              return timeStr;
          }
      }
      return timeStr;
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (todayRecord) {
        if (!todayRecord.checkOutTime) {
            setMode('OUT');
        }
    } else {
        setMode('IN');
    }
  }, [todayRecord]);

  // Initialize Map when location is found
  useEffect(() => {
    if (location && step === 'locating' && mapContainerRef.current && !mapInstanceRef.current) {
        const L = (window as any).L;
        if (!L) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([location.lat, location.lng], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // User Marker
        const userIcon = L.divIcon({
            className: 'bg-blue-600 w-5 h-5 rounded-full border-4 border-white shadow-2xl pulse-ring',
            iconSize: [20, 20]
        });
        userMarkerRef.current = L.marker([location.lat, location.lng], { icon: userIcon }).addTo(map)
            .bindPopup("Lokasi Anda").openPopup();

        // Office Zones
        const offices = settings.offices && settings.offices.length > 0 
            ? settings.offices 
            : [{ id: 'default', name: settings.officeName, lat: settings.officeLat, lng: settings.officeLng, radius: settings.officeRadius }];

        offices.forEach(office => {
            const isSelected = selectedOffice?.id === office.id;
            const circle = L.circle([office.lat, office.lng], {
                color: isSelected ? '#10B981' : '#3B82F6',
                fillColor: isSelected ? '#10B981' : '#3B82F6',
                fillOpacity: 0.15,
                weight: 2,
                radius: office.radius * 1000 // km to meters
            }).addTo(map);
            
            circle.on('click', () => {
                setSelectedOffice(office);
                showToast(`Kantor terpilih: ${office.name}`, "success");
            });
            
            circle.bindTooltip(office.name, { 
                permanent: false, 
                direction: 'top',
                className: 'font-black text-[10px] uppercase tracking-widest bg-white rounded-lg border-none shadow-xl px-3 py-1.5'
            });
        });

        mapInstanceRef.current = map;
    }
  }, [location, step, settings, selectedOffice]);

  useEffect(() => {
    if (mapInstanceRef.current && selectedOffice) {
        mapInstanceRef.current.panTo([selectedOffice.lat, selectedOffice.lng]);
    }
  }, [selectedOffice]);

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
    if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lon], 17);
    }
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const calculateDuration = (start: string, end: string) => {
    const [h1, m1] = (start || '00:00').split(':').map(Number);
    const [h2, m2] = (end || '00:00').split(':').map(Number);
    let diff = (new Date(0, 0, 0, h2, m2)).getTime() - (new Date(0, 0, 0, h1, m1)).getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${hours}j ${minutes}m`;
  };

  const [livenessChallenge, setLivenessChallenge] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [challengeCountdown, setChallengeCountdown] = useState(3);

  const CHALLENGES = [
      "Angkat Jempol (Thumbs Up) 👍",
      "Pose Dua Jari (Peace) ✌️",
      "Pegang Telinga Kanan 👂",
      "Letakkan Tangan di Dagu 🤔",
      "Buka Telapak Tangan ✋",
      "Hormat (Salute) 🫡"
  ];

  const startProcess = () => {
    const now = new Date();
    const dayIndex = now.getDay();

    if (!userShift) {
        setStep('error');
        setErrorMsg("Anda belum memiliki jadwal kerja yang ditetapkan. Hubungi Admin.");
        return;
    }

    if (!userShift.workDays.includes(dayIndex)) {
        setStep('error');
        setErrorMsg("Hari ini bukan jadwal kerja Anda.");
        return;
    }

    setStep('locating');
    setLivenessChallenge(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 16);
        }
        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
        }

    if (!userShift.isFlexible) {
        const ACCURACY_THRESHOLD = 800; // More lenient threshold
        const IDEAL_ACCURACY = 100;
        
        if (accuracy > ACCURACY_THRESHOLD) {
            setStep('error');
            setErrorMsg(`Akurasi GPS rendah (${Math.round(accuracy)}m). Batas maksimal adalah ${ACCURACY_THRESHOLD}m. Pastikan Anda di area terbuka atau nyalakan Wi-Fi.`);
            return;
        }

        if (accuracy > IDEAL_ACCURACY) {
            showToast(`Akurasi GPS sedang (${Math.round(accuracy)}m). Hasil presensi mungkin kurang presisi.`, "info");
        }

            const offices = settings.offices && settings.offices.length > 0 
                ? settings.offices 
                : [{ id: 'default', name: settings.officeName, lat: settings.officeLat, lng: settings.officeLng, radius: settings.officeRadius }];

            let closest: OfficeLocation | null = null;
            let minDistance = Infinity;
            
            offices.forEach(o => {
                const d = calculateDistance(latitude, longitude, o.lat, o.lng);
                if (d < minDistance) {
                    minDistance = d;
                    closest = o;
                }
            });

            const nearbyOffice = offices.find(office => {
                const dist = calculateDistance(latitude, longitude, office.lat, office.lng);
                return dist <= office.radius;
            });

            if (nearbyOffice) {
                setSelectedOffice(nearbyOffice);
            } else if (offices.length === 1 && closest) {
                const dist = calculateDistance(latitude, longitude, closest.lat, closest.lng);
                if (dist > closest.radius) {
                    // Don't error immediately, let them see the map and choose if multiple offices exist
                    setSelectedOffice(closest);
                } else {
                    setSelectedOffice(closest);
                }
            } else if (closest) {
                setSelectedOffice(closest);
            }
        } else {
            // Flexible/Remote mode: Auto-select nearest if available, but don't enforce
            const offices = settings.offices || [];
            if (offices.length > 0) {
                let closest: OfficeLocation | null = null;
                let minDistance = Infinity;
                offices.forEach(o => {
                    const d = calculateDistance(latitude, longitude, o.lat, o.lng);
                    if (d < minDistance) {
                        minDistance = d;
                        closest = o;
                    }
                });
                setSelectedOffice(closest);
            }
        }
      },
      (err) => {
        setStep('error');
        setErrorMsg("Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi diberikan.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setStep('camera');
      
      setChallengeCountdown(3);
      const timer = setInterval(() => {
          setChallengeCountdown(prev => {
              if (prev <= 1) {
                  clearInterval(timer);
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setStep('error');
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg("Kamera tidak ditemukan pada perangkat Anda.");
      } else {
        setErrorMsg("Gagal akses kamera. Pastikan izin kamera diberikan dan tidak sedang digunakan aplikasi lain.");
      }
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    let mounted = true;
    if (step === 'camera' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        if (mounted && videoRef.current) {
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
      };
    }
    return () => { mounted = false; };
  }, [step, stream]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current && userShift) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const photoUrl = canvasRef.current.toDataURL('image/jpeg');
        if (stream) stream.getTracks().forEach(track => track.stop());

        const now = new Date();
        const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        if (mode === 'IN') {
            const [startH, startM] = (userShift.startTime || '08:00').split(':').map(Number);
            const shiftStart = new Date();
            shiftStart.setHours(startH, startM, 0);
            
            const graceMinutes = settings.gracePeriodMinutes ?? 15;
            const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000);
            const isLate = now > lateThreshold;

            const record: AttendanceRecord = {
              id: `att-${Date.now()}`,
              userId: user.id,
              date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
              checkInTime: timeString,
              status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
              location: location!,
              photoUrl,
              isOnlineWork: userShift.isFlexible,
              officeId: selectedOffice?.id,
              officeName: selectedOffice?.name,
              notes: `[Liveness: ${livenessChallenge}]`
            };
            onCheckIn(record);
        } else {
            onCheckOut(timeString, location!, selectedOffice?.id, selectedOffice?.name);
        }
        
        setStep('success');
      }
    }
  };

  const reset = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStep('idle');
    setErrorMsg('');
    setStream(null);
    setLocation(null);
    setSelectedOffice(null);
    setSearchQuery('');
    setSearchResults([]);
    mapInstanceRef.current = null;
  };

  // Render Success State (Already Checked Out)
  if (todayRecord && todayRecord.checkOutTime && step !== 'camera' && step !== 'success') {
      const duration = todayRecord.checkInTime ? calculateDuration(todayRecord.checkInTime, todayRecord.checkOutTime) : null;
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-2 md:p-8">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white p-5 md:p-12 rounded-[24px] md:rounded-[50px] max-w-md w-full text-center border border-slate-100 shadow-2xl shadow-slate-200 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
                <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 md:mb-8 shadow-xl shadow-emerald-100">
                    <CheckCircle className="text-emerald-600 w-8 h-8 md:w-12 md:h-12" />
                </div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-1 md:mb-3 tracking-tight">Absensi Selesai</h2>
                <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-6 md:mb-10">Terima kasih atas dedikasi Anda!</p>
                
                <div className="bg-slate-50 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] mb-4 md:mb-8 text-left border border-slate-100 shadow-inner">
                    <div className="flex justify-between mb-3 pb-3 border-b border-slate-200">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 md:gap-3"><MapPin size={12} className="text-blue-500"/> Masuk</span>
                        <span className="font-black text-slate-900 text-sm md:text-lg">{todayRecord.checkInTime}</span>
                    </div>
                    <div className="flex justify-between mb-3 pb-3 border-b border-slate-200">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 md:gap-3"><LogOut size={12} className="text-orange-500"/> Pulang</span>
                        <span className="font-black text-slate-900 text-sm md:text-lg">{todayRecord.checkOutTime}</span>
                    </div>
                    {duration && (
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 md:gap-3"><Timer size={12} className="text-purple-500"/> Durasi</span>
                            <span className="font-black text-blue-600 text-sm md:text-lg">{duration}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-center">
                    {todayRecord.syncStatus === 'pending' ? (
                        <span className="bg-amber-50 text-amber-700 text-[8px] px-4 py-2 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest border border-amber-100 shadow-sm">
                            <RefreshCw size={10} className="animate-spin"/> Sinkronisasi...
                        </span>
                    ) : (
                        <span className="bg-emerald-50 text-emerald-700 text-[8px] px-4 py-2 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                            <ShieldCheck size={10}/> Terverifikasi
                        </span>
                    )}
                </div>
            </motion.div>
        </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4 md:p-8">
      <AnimatePresence mode="wait">
      {step === 'idle' && (
        <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-5 md:p-12 rounded-[24px] md:rounded-[60px] shadow-2xl shadow-slate-200 border border-slate-100 max-w-md w-full relative overflow-hidden"
        >
           {/* Real-time Clock Header */}
           <div className="absolute top-0 left-0 w-full bg-slate-900 py-2 border-b border-slate-800 flex justify-center items-center gap-2 text-white/60 text-[8px] font-black uppercase tracking-[0.3em]">
                <Clock size={10} className="text-blue-400" />
                {currentTime.toLocaleTimeString('id-ID')}
           </div>
 
           <div className={`w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[3rem] flex items-center justify-center mx-auto mb-4 md:mb-8 shadow-2xl mt-8 md:mt-12 transition-all duration-500 ${mode === 'IN' ? 'bg-blue-50 text-blue-600 shadow-blue-100' : 'bg-orange-50 text-orange-600 shadow-orange-100'}`}>
              {mode === 'IN' ? <MapPin size={36} className="md:w-14 md:h-14" /> : <LogOut size={36} className="md:w-14 md:h-14" />}
           </div>
           
           <h2 className="text-xl md:text-4xl font-black text-slate-900 mb-1 md:mb-3 tracking-tighter">
               {mode === 'IN' ? 'Check-In' : 'Check-Out'}
           </h2>
           <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-6 md:mb-10">Konfirmasi kehadiran harian</p>
           
           {userShift ? (
               <div className="text-[10px] text-slate-500 mb-6 md:mb-10 bg-slate-50 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 text-left shadow-inner">
                   <div className="flex items-center justify-between mb-2 md:mb-4 pb-2 md:pb-4 border-b border-slate-200/50">
                       <span className="text-slate-400 text-[8px] md:text-[10px] uppercase font-black tracking-widest flex items-center gap-2 md:gap-3"><Calendar size={10} className="text-blue-500 md:w-3.5 md:h-3.5"/> Jadwal</span>
                       <span className="font-black text-slate-900 text-[9px] md:text-xs">{userShift.name}</span>
                   </div>
                   <div className="flex items-center justify-between mb-2 md:mb-4 pb-2 md:pb-4 border-b border-slate-200/50">
                       <span className="text-slate-400 text-[8px] md:text-[10px] uppercase font-black tracking-widest flex items-center gap-2 md:gap-3"><Clock size={10} className="text-orange-500 md:w-3.5 md:h-3.5"/> Waktu</span>
                       <span className="font-black text-slate-900 text-[9px] md:text-xs">{formatTimeDisplay(userShift.startTime)} - {formatTimeDisplay(userShift.endTime)}</span>
                   </div>
                   <div className="flex items-center justify-between">
                       <span className="text-slate-400 text-[8px] md:text-[10px] uppercase font-black tracking-widest flex items-center gap-2 md:gap-3"><Sparkles size={10} className="text-purple-500 md:w-3.5 md:h-3.5"/> Metode</span>
                       <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm ${userShift.isFlexible ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                           {userShift.isFlexible ? 'Remote' : 'WFO'}
                       </span>
                   </div>
               </div>
           ) : (
               <div className="mb-6 p-4 bg-rose-50 rounded-[1rem] border border-rose-100 flex items-center justify-center gap-2 text-rose-600">
                   <AlertTriangle size={16} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Jadwal Tidak Ditemukan</span>
               </div>
           )}
           
           <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startProcess}
            disabled={!userShift}
            className={`w-full text-white font-black py-3.5 md:py-6 px-6 rounded-[1rem] md:rounded-[2rem] shadow-2xl transition-all flex items-center justify-center gap-2 md:gap-4 uppercase text-[9px] md:text-xs tracking-[0.3em] ${mode === 'IN' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'} disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed`}
           >
              <Camera size={16} className="md:w-5 md:h-5" />
              {mode === 'IN' ? 'Mulai Presensi' : 'Selesaikan Kerja'}
           </motion.button>
        </motion.div>
      )}

      {step === 'locating' && (
        <motion.div 
            key="locating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[24px] md:rounded-[50px] shadow-2xl border border-slate-100 max-w-xl w-full flex flex-col overflow-hidden h-[75vh] md:h-auto md:max-h-[90vh] md:min-h-[600px]"
        >
            {/* Map Section */}
            <div className="relative h-[30vh] sm:h-[45vh] min-h-[180px] w-full border-b border-slate-100">
                <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
                
                {/* Search Bar Overlay */}
                <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
                    <form onSubmit={handleSearchLocation} className="relative pointer-events-auto">
                        <div className="bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-white/50 flex items-center p-1">
                            <div className="p-2 text-slate-400"><Search size={14} /></div>
                            <input 
                                type="text" 
                                placeholder="Cari lokasi..." 
                                className="flex-1 bg-transparent border-none outline-none text-[9px] font-black uppercase tracking-widest px-1"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </form>
                </div>
 
                {/* Accuracy Badge */}
                {location && (
                    <div className="absolute bottom-3 right-3 z-[1000] flex flex-col items-end gap-2">
                        <button 
                            onClick={startProcess}
                            className="bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-white/50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <div className="bg-slate-900/90 backdrop-blur-xl px-2.5 py-1 rounded-full shadow-2xl border border-white/10 flex items-center gap-1.5">
                            <div className={`w-1 h-1 rounded-full ${location.accuracy < 100 ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></div>
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">±{location.accuracy.toFixed(0)}m</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Info Section */}
            <div className="p-3 md:p-10 bg-slate-50 flex-1 flex flex-col overflow-hidden">
                {!location ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                            <div className="relative w-16 h-16 bg-white rounded-[1.5rem] shadow-2xl flex items-center justify-center border border-blue-50">
                                <RefreshCw className="animate-spin text-blue-600" size={24} />
                            </div>
                        </div>
                        <div className="text-center">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Sinkronisasi GPS</h4>
                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Mencari koordinat...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 md:space-y-6 flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2 md:gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-lg shadow-blue-50"><MapPin size={14} /></div>
                                <div>
                                    <h4 className="text-[9px] md:text-xs font-black text-slate-900 uppercase tracking-widest">Lokasi</h4>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Terdeteksi</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${selectedOffice ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {selectedOffice ? 'Siap' : 'Pilih Kantor'}
                            </div>
                        </div>
 
                        {/* Office Picker */}
                        <div className="space-y-2 flex-shrink-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Kantor Terdekat:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {(settings.offices && settings.offices.length > 0 ? settings.offices : [{ id: 'default', name: settings.officeName, lat: settings.officeLat, lng: settings.officeLng, radius: settings.officeRadius }]).map(office => {
                                    const dist = location ? calculateDistance(location.lat, location.lng, office.lat, office.lng) : 0;
                                    const inRange = dist <= office.radius;
                                    
                                    return (
                                        <button
                                            key={office.id}
                                            onClick={() => setSelectedOffice(office)}
                                            className={`shrink-0 px-4 py-3 rounded-[1rem] md:rounded-[2rem] text-[8px] font-black uppercase tracking-widest border transition-all flex flex-col items-start gap-1 min-w-[140px] active:scale-95 ${
                                                selectedOffice?.id === office.id 
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-300' 
                                                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <Briefcase size={10} className={selectedOffice?.id === office.id ? 'text-blue-400' : 'text-slate-300'} />
                                                <span className="truncate flex-1 text-left">{office.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-80 text-[7px]">
                                                <Navigation size={8} />
                                                <span>{dist.toFixed(2)} km</span>
                                                {inRange && <CheckCircle size={8} className="text-emerald-400" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
 
                        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
                            {selectedOffice || userShift?.isFlexible ? (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 md:p-8 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-slate-200 border border-slate-100"
                                >
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0 shadow-inner">
                                            {userShift?.isFlexible ? <Navigation size={16} /> : <Briefcase size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                                {userShift?.isFlexible ? 'Mode Kerja' : 'Kantor'}
                                            </p>
                                            <p className="text-xs font-black text-slate-900 truncate">
                                                {userShift?.isFlexible ? 'Remote / Fleksibel' : (selectedOffice?.name || 'Pilih Lokasi')}
                                            </p>
                                            {location && selectedOffice && (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className={`w-1 h-1 rounded-full ${calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng) <= selectedOffice.radius ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng) <= selectedOffice.radius ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng).toFixed(2)} km • {calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng) <= selectedOffice.radius ? 'Ok' : 'Luar'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (location && selectedOffice && !userShift?.isFlexible) {
                                                const dist = calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng);
                                                if (dist > selectedOffice.radius) {
                                                    showToast(`Anda berada di luar jangkauan ${selectedOffice.name}`, "error");
                                                    return;
                                                }
                                            }
                                            openCamera();
                                        }}
                                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-[1rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-blue-200 flex items-center justify-center gap-2"
                                    >
                                        Lanjut <ArrowRight size={14} />
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex items-start gap-3 shadow-inner">
                                    <div className="p-2 bg-white rounded-lg shadow-sm"><AlertTriangle size={16} className="text-amber-600" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1">Pilih Kantor</p>
                                        <p className="text-[8px] font-bold text-amber-700 leading-relaxed uppercase tracking-widest opacity-80">
                                            Pilih salah satu kantor di atas untuk verifikasi posisi Anda.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
 
                        <div className="flex-shrink-0 pt-1">
                            <button onClick={reset} className="w-full py-1.5 text-slate-400 text-[8px] font-black uppercase tracking-[0.3em] hover:text-slate-900 transition-colors active:scale-95">
                                Batal
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
      )}

      {step === 'camera' && (
        <motion.div 
            key="camera"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-xl bg-slate-900 rounded-[30px] md:rounded-[60px] overflow-hidden shadow-2xl border-[4px] md:border-[8px] border-white h-[75vh] md:h-auto"
        >
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
            
            {/* Flash Overlay */}
            <AnimatePresence>
                {isFlashing && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white z-50"
                    ></motion.div>
                )}
            </AnimatePresence>
 
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 md:p-10 bg-gradient-to-b from-black/80 to-transparent text-white flex justify-between items-start z-20">
                <button onClick={reset} className="p-2 md:p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/10">
                    <XCircle size={20} className="md:w-6 md:h-6" />
                </button>
                <div className="bg-rose-600/90 backdrop-blur-xl px-3 py-1 md:px-5 md:py-2 rounded-full flex items-center gap-2 md:gap-3 border border-rose-500/50 shadow-2xl">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Live Verification</span>
                </div>
            </div>
 
            {/* Liveness Challenge Overlay */}
            <div className="absolute top-16 md:top-32 left-4 right-4 md:left-10 md:right-10 bg-white/10 backdrop-blur-xl text-white p-4 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/20 text-center animate-in slide-in-from-top-10 z-10 shadow-2xl">
                <div className="flex flex-col items-center gap-2 md:gap-4">
                    <div className="bg-amber-400 text-slate-900 text-[8px] md:text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] animate-pulse shadow-xl">
                        Verifikasi Keaslian
                    </div>
                    {challengeCountdown > 0 ? (
                        <div className="flex flex-col items-center">
                            <p className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Bersiap dalam...</p>
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">{challengeCountdown}</span>
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center w-full"
                        >
                            <p className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Lakukan gerakan berikut:</p>
                            <p className="text-lg md:text-3xl font-black text-white drop-shadow-2xl bg-slate-900/40 px-4 py-3 rounded-[1rem] border border-white/10 w-full">
                                {livenessChallenge}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-4 md:gap-8 z-20">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={takePhoto}
                    disabled={challengeCountdown > 0}
                    className={`w-16 h-16 md:w-24 md:h-24 bg-white rounded-full border-4 md:border-8 border-slate-200 shadow-2xl flex items-center justify-center transition-all group ${challengeCountdown > 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-white border-2 md:border-4 border-blue-600 rounded-full group-hover:bg-blue-50 transition-colors shadow-inner"></div>
                </motion.button>
                <button 
                    onClick={reset}
                    className="text-white/50 hover:text-white text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] transition-colors active:scale-95"
                >
                    Batalkan & Kembali
                </button>
            </div>
        </motion.div>
      )}

      {step === 'error' && (
        <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 md:p-12 rounded-[24px] md:rounded-[50px] max-w-md w-full shadow-2xl border border-rose-100 text-center"
        >
            <div className="w-16 h-16 md:w-24 md:h-24 bg-rose-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-100">
                <AlertTriangle className="text-rose-500" size={32} />
            </div>
            <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight">Gagal Presensi</h3>
            <p className="text-slate-400 mb-6 text-xs font-bold uppercase tracking-widest leading-relaxed">{errorMsg}</p>
            
            {errorMsg.includes('Akurasi') && (
                <div className="mb-6 p-5 md:p-8 bg-blue-50 rounded-[1.5rem] md:rounded-[2.5rem] text-left border border-blue-100 shadow-inner">
                    <p className="text-[8px] md:text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] mb-3">Tips Akurasi Tinggi:</p>
                    <ul className="text-[8px] md:text-[10px] font-bold text-blue-600 space-y-2 uppercase tracking-widest opacity-80">
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            Nyalakan Wi-Fi Perangkat
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            Cari Area Terbuka / Jendela
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            Kalibrasi via Google Maps
                        </li>
                    </ul>
                </div>
            )}
 
            <div className="space-y-3">
                <button onClick={startProcess} className="w-full bg-blue-600 text-white font-black py-4 rounded-[1.5rem] hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.3em] active:scale-95">
                    <RefreshCw size={16} /> Coba Lagi
                </button>
                <button onClick={reset} className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-[1.5rem] hover:bg-slate-200 transition-all uppercase text-[10px] tracking-[0.3em] active:scale-95">
                    Kembali
                </button>
            </div>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white p-6 md:p-12 rounded-[24px] md:rounded-[60px] max-w-md w-full shadow-2xl border border-emerald-100 text-center relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
            <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 relative shadow-xl shadow-emerald-100">
                <div className="absolute inset-0 bg-emerald-400 rounded-[1.5rem] md:rounded-[2.5rem] opacity-20 animate-ping"></div>
                <CheckCircle className="text-emerald-600 relative z-10 md:w-14 md:h-14" size={36} />
            </div>
            <h3 className="text-xl md:text-4xl font-black text-slate-900 mb-2 tracking-tighter">Berhasil!</h3>
            <p className="text-slate-400 mb-8 text-[10px] font-bold uppercase tracking-widest">Data kehadiran Anda telah tercatat.</p>
            <button onClick={reset} className="w-full bg-slate-900 text-white font-black py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] hover:bg-black shadow-2xl shadow-slate-200 transition-all uppercase text-[10px] md:text-xs tracking-[0.3em] active:scale-95">
                Ke Dashboard
            </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Attendance;
