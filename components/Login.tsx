import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { Fingerprint, Loader2, Search, ShieldAlert, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { useStore } from '../services/store';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { state } = useStore();
  const [loginStep, setLoginStep] = useState<'select' | 'loading'>('select');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.users, searchTerm]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setError(null);
    
    if (!user.isActive) {
        setError("Akun Anda dinonaktifkan. Hubungi Admin.");
        return;
    }

    performLogin(user);
  };

  const performLogin = (user: User) => {
    setLoginStep('loading');
    setTimeout(() => {
      onLogin(user);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 font-sans selection:bg-blue-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white w-full rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-white/50 transition-all duration-500 ${loginStep === 'select' ? 'max-w-4xl' : 'max-w-md'}`}
      >
        <div className="flex flex-col md:flex-row h-full">
            {/* Branding Panel */}
            <div className={`bg-slate-900 p-8 md:p-10 text-center relative overflow-hidden flex flex-col justify-center items-center ${loginStep === 'select' ? 'md:w-1/3 shrink-0' : 'w-full min-h-[250px]'}`}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 opacity-100 z-0"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-16 h-16 md:w-20 md:h-20 bg-white/5 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mx-auto mb-4 md:mb-6 text-white shadow-2xl border border-white/10"
                    >
                        <Fingerprint size={32} strokeWidth={1.5} className="text-blue-400 md:hidden" />
                        <Fingerprint size={40} strokeWidth={1.5} className="text-blue-400 hidden md:block" />
                    </motion.div>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-1 md:mb-2 tracking-tighter">Pintu Kuliah</h1>
                    <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">Smart Access v3.1</p>
                </div>
            </div>

            {/* Content Panel */}
            <div className={`p-6 md:p-12 flex-1 flex flex-col min-h-0 ${loginStep === 'select' ? 'bg-slate-50/30' : 'bg-white'}`}>
                <AnimatePresence mode="wait">
                    {loginStep === 'select' && (
                        <motion.div 
                            key="select"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8 flex flex-col h-full"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Selamat Datang</h2>
                                    <p className="text-xs md:text-sm text-slate-400 font-medium mt-0.5 md:mt-1">Pilih profil Anda untuk mulai bekerja</p>
                                </div>
                                <div className="relative w-full md:w-72 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Cari nama..." 
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs md:text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-rose-50 border border-rose-100 p-3 md:p-4 rounded-2xl flex items-start gap-3 text-rose-600 text-xs md:text-sm font-bold"
                                >
                                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1 min-h-0 pb-4">
                                {filteredUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 hover:border-blue-500 hover:shadow-[0_10px_25px_rgba(59,130,246,0.08)] transition-all group text-center space-y-3 md:space-y-4 active:scale-95 relative overflow-hidden flex flex-col items-center"
                                    >
                                        <div className="relative w-16 h-16 md:w-20 md:h-20">
                                            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-[1.2rem] md:rounded-[1.5rem] transition-colors z-0"></div>
                                            <img 
                                                src={user.avatar} 
                                                alt={user.name} 
                                                className="w-full h-full rounded-[1.2rem] md:rounded-[1.5rem] object-cover border-2 border-slate-50 group-hover:border-blue-100 transition-all relative z-10"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128&bold=true`;
                                                }}
                                            />
                                            {user.role === 'superadmin' && (
                                                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-slate-900 text-white p-1 md:p-1.5 rounded-lg md:rounded-xl shadow-lg z-20">
                                                    <ShieldAlert size={10} className="md:hidden" />
                                                    <ShieldAlert size={12} className="hidden md:block" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full">
                                            <p className="text-xs md:text-sm font-black text-slate-800 truncate">{user.name}</p>
                                            <div className="flex flex-col items-center gap-0.5 mt-0.5 md:mt-1">
                                                <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate w-full">{user.position}</p>
                                                {user.employeeId && (
                                                    <p className="text-[7px] md:text-[9px] text-slate-300 font-medium truncate">ID: {user.employeeId}</p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="col-span-full py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                            <Search size={32} />
                                        </div>
                                        <p className="text-slate-400 font-bold text-sm">Karyawan tidak ditemukan</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {loginStep === 'loading' && (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-16 text-center space-y-8"
                        >
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-[6px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                                    <Loader2 size={36} className="animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Otentikasi...</h3>
                                <p className="text-slate-400 text-sm font-medium">Menghubungkan ke server aman</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      </motion.div>
      
      {/* Footer Info */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] opacity-50">Secure Access System</p>
      </div>
    </div>
  );
};

export default Login;
