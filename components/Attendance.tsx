
import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, RefreshCw, AlertTriangle, CheckCircle, LogOut, Eye, Timer, Navigation, XCircle, Clock, Calendar, Briefcase, ChevronRight, Loader2, Search, Crosshair, Check } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, User, AppSettings, OfficeLocation } from '../types';
import { useToast } from './Toast';

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
              // If it's the 1899 date from Google Sheets, we just want the time
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
        } else {
            // Already checked out, but we handle this in the render logic mostly
            // If we want to show success state immediately:
            // setStep('success'); 
            // BUT, better to let the 'Render Success State' block handle it naturally
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
            className: 'bg-blue-600 w-4 h-4 rounded-full border-2 border-white shadow-lg pulse-ring',
            iconSize: [16, 16]
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
                fillOpacity: 0.2,
                radius: office.radius * 1000 // km to meters
            }).addTo(map);
            
            circle.on('click', () => {
                setSelectedOffice(office);
                showToast(`Kantor terpilih: ${office.name}`, "success");
            });
            
            circle.bindTooltip(office.name, { 
                permanent: false, 
                direction: 'top',
                className: 'font-bold text-[10px]'
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

  // Liveness Challenges
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
    const dayIndex = now.getDay(); // 0-6

    // 1. Validate Shift Existence
    if (!userShift) {
        setStep('error');
        setErrorMsg("Anda belum memiliki jadwal kerja yang ditetapkan. Hubungi Admin.");
        return;
    }

    // 2. Validate Work Day
    if (!userShift.workDays.includes(dayIndex)) {
        setStep('error');
        setErrorMsg("Hari ini bukan jadwal kerja Anda.");
        return;
    }

    setStep('locating');
    
    // Select Random Challenge
    setLivenessChallenge(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });

        // Update map view and marker if they already exist
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 16);
        }
        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
        }

    // 3. Validate Location (If not flexible/online)
    if (!userShift.isFlexible) {
        // Relaxed Accuracy Threshold: 300m (Stable for indoor/cloudy conditions)
        const ACCURACY_THRESHOLD = 300; 
        
        if (accuracy > ACCURACY_THRESHOLD) {
            setStep('error');
            setErrorMsg(`Akurasi GPS rendah (${Math.round(accuracy)}m). Batas maksimal adalah ${ACCURACY_THRESHOLD}m. Pastikan Anda di dekat jendela atau nyalakan Wi-Fi.`);
            return;
        }

            const offices = settings.offices && settings.offices.length > 0 
                ? settings.offices 
                : [{ id: 'default', name: settings.officeName, lat: settings.officeLat, lng: settings.officeLng, radius: settings.officeRadius }];

            // Find the closest office
            let closest: OfficeLocation | null = null;
            let minDistance = Infinity;
            
            offices.forEach(o => {
                const d = calculateDistance(latitude, longitude, o.lat, o.lng);
                if (d < minDistance) {
                    minDistance = d;
                    closest = o;
                }
            });

            // Auto-detect if very close to one (within its radius)
            const nearbyOffice = offices.find(office => {
                const dist = calculateDistance(latitude, longitude, office.lat, office.lng);
                return dist <= office.radius;
            });

            if (nearbyOffice) {
                setSelectedOffice(nearbyOffice);
            } else if (offices.length === 1 && closest) {
                // If only one office and out of range, show error
                const dist = calculateDistance(latitude, longitude, closest.lat, closest.lng);
                if (dist > closest.radius) {
                    setTimeout(() => {
                        setStep('error');
                        setErrorMsg(`Anda berada di luar jangkauan kantor ${closest!.name}. Jarak Anda: ${dist.toFixed(2)}km (Maks: ${closest!.radius}km).`);
                    }, 1500);
                    return;
                }
                setSelectedOffice(closest);
            } else {
                // Multiple offices and not in range of any, user must select
                // We don't set error yet, let them see the list and distances
                if (closest) {
                    setSelectedOffice(null); // Force selection
                }
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
      // Use more specific constraints for better compatibility
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
      
      // Start countdown for liveness
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

  // Cleanup stream when step changes or component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Ensure video element gets the stream when it mounts
  useEffect(() => {
    let mounted = true;
    if (step === 'camera' && videoRef.current && stream) {
      // Some browsers need a small delay or explicit play() call
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
      // Flash effect
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
            
            // Allow configured grace period (default 15 mins if not set)
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
    mapInstanceRef.current = null; // Reset map instance
  };

  // Render Success State (Already Checked Out)
  if (todayRecord && todayRecord.checkOutTime && step !== 'camera' && step !== 'success') {
      const duration = todayRecord.checkInTime ? calculateDuration(todayRecord.checkInTime, todayRecord.checkOutTime) : null;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 fade-in">
            <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center border border-gray-100 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-600" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Absensi Selesai</h2>
                <p className="text-gray-500 text-sm mb-6">Terima kasih atas kerja keras Anda hari ini!</p>
                
                <div className="bg-gray-50 p-5 rounded-2xl mb-4 text-left border border-gray-100">
                    <div className="flex justify-between mb-3 pb-3 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> Masuk</span>
                        <span className="font-bold text-gray-800 font-mono">{todayRecord.checkInTime}</span>
                    </div>
                    <div className="flex justify-between mb-3 pb-3 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><LogOut size={14}/> Pulang</span>
                        <span className="font-bold text-gray-800 font-mono">{todayRecord.checkOutTime}</span>
                    </div>
                    {duration && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2"><Timer size={14}/> Durasi</span>
                            <span className="font-bold text-blue-600">{duration}</span>
                        </div>
                    )}
                </div>
                
                {/* Sync Status Badge */}
                <div className="flex justify-center">
                    {todayRecord.syncStatus === 'pending' ? (
                        <span className="bg-yellow-50 text-yellow-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold border border-yellow-100">
                            <RefreshCw size={12} className="animate-spin"/> Menunggu Sinkronisasi
                        </span>
                    ) : (
                        <span className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold border border-green-100">
                            <CheckCircle size={12}/> Terkirim ke Server
                        </span>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4 fade-in">
      {step === 'idle' && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full relative overflow-hidden">
           {/* Real-time Clock Header */}
           <div className="absolute top-0 left-0 w-full bg-gray-50 py-2 border-b border-gray-100 flex justify-center items-center gap-2 text-gray-500 text-xs font-mono">
                <Clock size={12} />
                {currentTime.toLocaleTimeString('id-ID')}
           </div>

           <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg mt-8 ${mode === 'IN' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              {mode === 'IN' ? <MapPin size={48} /> : <LogOut size={48} />}
           </div>
           
           <h2 className="text-2xl font-bold text-gray-800 mb-2">
               {mode === 'IN' ? 'Absensi Masuk' : 'Absensi Pulang'}
           </h2>
           <p className="text-gray-500 text-sm mb-6">Pastikan Anda berada di lokasi yang sesuai.</p>
           
           {userShift ? (
               <div className="text-sm text-gray-500 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left">
                   <div className="flex items-center justify-between mb-2">
                       <span className="text-gray-400 text-xs uppercase font-bold flex items-center gap-1"><Calendar size={10}/> Shift</span>
                       <span className="font-bold text-gray-800">{userShift.name}</span>
                   </div>
                   <div className="flex items-center justify-between mb-2">
                       <span className="text-gray-400 text-xs uppercase font-bold flex items-center gap-1"><Clock size={10}/> Jam</span>
                       <span className="font-bold text-gray-800">{formatTimeDisplay(userShift.startTime)} - {formatTimeDisplay(userShift.endTime)}</span>
                   </div>
                   <div className="flex items-center justify-between">
                       <span className="text-gray-400 text-xs uppercase font-bold flex items-center gap-1"><MapPin size={10}/> Tipe</span>
                       <span className={`text-xs font-bold px-2 py-0.5 rounded ${userShift.isFlexible ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                           {userShift.isFlexible ? 'Remote' : 'WFO'}
                       </span>
                   </div>
               </div>
           ) : (
               <p className="text-red-500 mb-4 text-sm bg-red-50 p-3 rounded-lg flex items-center justify-center gap-2">
                   <AlertTriangle size={16} /> Tidak ada jadwal aktif.
               </p>
           )}
           
           <button 
            onClick={startProcess}
            disabled={!userShift}
            className={`w-full text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${mode === 'IN' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'} disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none`}
           >
             <Camera size={20} />
             {mode === 'IN' ? 'Ambil Foto Masuk' : 'Ambil Foto Pulang'}
           </button>
        </div>
      )}

      {step === 'locating' && (
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full flex flex-col overflow-hidden max-h-[90vh] min-h-[500px] animate-in zoom-in-95 duration-300">
            {/* Map Section */}
            <div className="relative h-[40vh] min-h-[250px] w-full border-b border-gray-100">
                <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
                
                {/* Search Bar Overlay - Still on map but with high z-index */}
                <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
                    <form onSubmit={handleSearchLocation} className="relative pointer-events-auto">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 flex items-center p-1.5">
                            <div className="p-2 text-slate-400"><Search size={18} /></div>
                            <input 
                                type="text" 
                                placeholder="Cari lokasi..." 
                                className="flex-1 bg-transparent border-none outline-none text-xs font-bold px-2"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                {/* Accuracy Badge */}
                {location && (
                    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
                        <button 
                            onClick={startProcess}
                            className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-white/50 text-blue-600 hover:text-blue-700 transition-colors active:scale-90"
                            title="Refresh Lokasi"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/50 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${location.accuracy < 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">±{location.accuracy.toFixed(0)}m</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Info Section - Below Map, No Z-Index issues */}
            <div className="p-6 bg-gray-50 flex-1 flex flex-col">
                {!location ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-8">
                        <div className="relative">
                            <RefreshCw className="animate-spin text-blue-600" size={48} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <MapPin size={16} className="text-blue-400" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Mencari Lokasi</h4>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">Pastikan GPS Anda aktif...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><MapPin size={16} /></div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Status Lokasi</h4>
                                    <p className="text-[10px] font-bold text-slate-500">Berhasil Terdeteksi</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedOffice ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {selectedOffice ? 'Siap Lanjut' : 'Pilih Kantor'}
                            </div>
                        </div>

                        {/* Office Picker - Horizontal Scroll */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kantor Terdekat:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {(settings.offices && settings.offices.length > 0 ? settings.offices : [{ id: 'default', name: settings.officeName, lat: settings.officeLat, lng: settings.officeLng, radius: settings.officeRadius }]).map(office => {
                                    const dist = location ? calculateDistance(location.lat, location.lng, office.lat, office.lng) : 0;
                                    const inRange = dist <= office.radius;
                                    
                                    return (
                                        <button
                                            key={office.id}
                                            onClick={() => setSelectedOffice(office)}
                                            className={`shrink-0 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-start gap-1 min-w-[140px] ${
                                                selectedOffice?.id === office.id 
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' 
                                                    : 'bg-white border-gray-200 text-slate-500 hover:border-slate-300 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={12} />
                                                <span className="truncate max-w-[100px]">{office.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-80">
                                                <MapPin size={10} />
                                                <span>{dist.toFixed(2)} km</span>
                                                {inRange && <Check size={10} className="text-emerald-400" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedOffice ? (
                            <div className="bg-slate-900 text-white p-5 rounded-[2rem] flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-2xl"><Briefcase size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Kantor Terpilih</p>
                                        <p className="text-sm font-bold">{selectedOffice.name}</p>
                                        {location && (
                                            <p className={`text-[9px] font-bold ${calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng) <= selectedOffice.radius ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                Jarak: {calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng).toFixed(2)} km 
                                                ({calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng) <= selectedOffice.radius ? 'Dalam Jangkauan' : 'Luar Jangkauan'})
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        if (location) {
                                            const dist = calculateDistance(location.lat, location.lng, selectedOffice.lat, selectedOffice.lng);
                                            if (dist > selectedOffice.radius) {
                                                showToast(`Anda berada di luar jangkauan kantor ${selectedOffice.name}. Jarak: ${dist.toFixed(2)}km`, "error");
                                                return;
                                            }
                                        }
                                        openCamera();
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                                >
                                    Lanjut
                                </button>
                            </div>
                        ) : (
                            <div className="p-5 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-start gap-4">
                                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-1" />
                                <div>
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Pilih Lokasi Kantor</p>
                                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                                        Silakan pilih salah satu kantor di atas atau klik lingkaran hijau di peta untuk melanjutkan absensi.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-4">
                            <button onClick={reset} className="w-full py-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-slate-600 transition-colors">
                                Batalkan Proses
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {step === 'camera' && (
        <div className="relative w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <video ref={videoRef} autoPlay playsInline className="w-full h-[60vh] object-cover transform scale-x-[-1]" />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
            
            {/* Flash Overlay */}
            {isFlashing && (
                <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150"></div>
            )}

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent text-white flex justify-between items-start z-20">
                <button onClick={reset} className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors">
                    <XCircle size={24} />
                </button>
                <div className="bg-red-500/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold uppercase">Live Camera</span>
                </div>
            </div>

            {/* Liveness Challenge Overlay */}
            <div className="absolute top-20 left-4 right-4 bg-white/10 backdrop-blur-md text-white p-5 rounded-2xl border border-white/20 text-center animate-in slide-in-from-top-4 z-10 shadow-2xl">
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">
                        Verifikasi Keaslian
                    </div>
                    {challengeCountdown > 0 ? (
                        <div className="flex flex-col items-center">
                            <p className="text-xs text-gray-200 mb-1">Siap-siap dalam...</p>
                            <span className="text-4xl font-black text-white">{challengeCountdown}</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-gray-200 font-medium">Lakukan gerakan berikut sebelum mengambil foto:</p>
                            <p className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] bg-black/20 px-4 py-2 rounded-xl border border-white/10">
                                {livenessChallenge}
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6 z-20">
                <button 
                    onClick={takePhoto}
                    disabled={challengeCountdown > 0}
                    className={`w-20 h-20 bg-white rounded-full border-4 border-gray-200 shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all group ${challengeCountdown > 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                    <div className="w-16 h-16 bg-white border-4 border-blue-500 rounded-full group-hover:bg-blue-50 transition-colors"></div>
                </button>
                <button 
                    onClick={reset}
                    className="text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                    Batalkan & Kembali
                </button>
            </div>
        </div>
      )}

      {step === 'error' && (
        <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-xl border border-red-100 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-red-500" size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Gagal Absensi</h3>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">{errorMsg}</p>
            
            {errorMsg.includes('Akurasi') && (
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl text-left border border-blue-100">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Tips Akurasi Tinggi:</p>
                    <ul className="text-[10px] font-bold text-blue-600 space-y-1.5">
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            Nyalakan Wi-Fi (Meskipun tidak terhubung)
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            Mendekat ke jendela atau area terbuka
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            Buka Google Maps sebentar untuk kalibrasi
                        </li>
                    </ul>
                </div>
            )}

            <div className="space-y-3">
                <button onClick={startProcess} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2">
                    <RefreshCw size={16} /> Coba Lagi
                </button>
                <button onClick={reset} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                    Kembali
                </button>
            </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-xl border border-green-100 text-center animate-in zoom-in-95">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-ping"></div>
                <CheckCircle className="text-green-600 relative z-10" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Berhasil!</h3>
            <p className="text-gray-500 mb-8 text-sm">Data absensi Anda telah tersimpan.</p>
            <button onClick={reset} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors">
                Kembali ke Dashboard
            </button>
        </div>
      )}
    </div>
  );
};

export default Attendance;
