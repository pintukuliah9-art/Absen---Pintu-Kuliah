
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react';
import { AppState, AttendanceRecord, RequestRecord, User, AttendanceStatus, RequestStatus, RequestType, AppSettings, Shift, LocationLog, JobRole, Department, LeaveType, RolePermission } from '../types';
import { MOCK_USER, MOCK_ADMIN, OTHER_USERS, OFFICE_LOCATION } from '../constants';
import { api } from './api';
import { useToast } from '../components/Toast';

const STORAGE_KEY = 'pintukuliah_data_v1'; // Updated storage key for Pintu Kuliah

// Default Data (Fallback)
const DEFAULT_JOB_ROLES: JobRole[] = [
    {
        id: 'job-dev-senior',
        title: 'Senior Developer',
        level: 'Senior',
        coreResponsibilities: ['Coding', 'Review', 'Meeting']
    }
];

const DEFAULT_DEPARTMENTS: Department[] = [
    { id: 'dept-it', name: 'Information Technology' },
    { id: 'dept-hr', name: 'Human Resources' },
    { id: 'dept-sales', name: 'Sales & Marketing' }
];

const DEFAULT_LEAVE_TYPES: LeaveType[] = [
    { id: 'leave-annual', name: 'Cuti Tahunan', quota: 12, isPaid: true, requiresFile: false },
    { id: 'leave-sick', name: 'Sakit', quota: 14, isPaid: true, requiresFile: true },
    { id: 'leave-maternity', name: 'Melahirkan', quota: 90, isPaid: true, requiresFile: true },
    { id: 'leave-unpaid', name: 'Unpaid Leave', quota: 0, isPaid: false, requiresFile: false }
];

const DEFAULT_SHIFTS: Shift[] = [
    {
        id: 'shift-regular',
        name: 'Regular Office',
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        overtimeStart: '17:30',
        isFlexible: false,
        workDays: [1, 2, 3, 4, 5],
        assignedUserIds: [] 
    }
];

const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
    { role: 'employee', allowedModules: ['dashboard', 'attendance', 'requests', 'history', 'settings', 'work_reports'] },
    { role: 'manager', allowedModules: ['dashboard', 'attendance', 'requests', 'history', 'admin_dashboard', 'admin_approvals', 'settings', 'admin_work_monitor'] },
    { role: 'hr', allowedModules: ['dashboard', 'attendance', 'requests', 'history', 'admin_dashboard', 'admin_employees', 'admin_reports', 'settings', 'admin_work_monitor'] },
    { role: 'admin', allowedModules: ['admin_dashboard', 'admin_monitor', 'admin_employees', 'admin_reports', 'admin_approvals', 'settings', 'dashboard', 'attendance', 'requests', 'history', 'admin_tasks', 'admin_work_monitor'] },
    { role: 'superadmin', allowedModules: ['admin_dashboard', 'admin_monitor', 'admin_employees', 'admin_reports', 'admin_approvals', 'settings', 'dashboard', 'attendance', 'requests', 'history', 'admin_tasks', 'admin_work_monitor'] }
];

const DEFAULT_SETTINGS: AppSettings = {
    offices: [
        {
            id: 'office-1772869076144',
            name: "dcc bandarjaya",
            lat: -4.945485,
            lng: 105.205185,
            radius: 2
        },
        {
            id: 'office-1772869304004',
            name: "qwertyui",
            lat: -4.945485,
            lng: 105.205185,
            radius: 0.5
        }
    ],
    officeLat: -4.945485,
    officeLng: 105.205185,
    officeRadius: 2,
    officeName: "dcc bandarjaya",
    apiUrl: "",
    gracePeriodMinutes: 15,
    roleMode: 'username',
    rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    shifts: DEFAULT_SHIFTS,
    jobRoles: DEFAULT_JOB_ROLES,
    departments: DEFAULT_DEPARTMENTS,
    leaveTypes: DEFAULT_LEAVE_TYPES
};

const INITIAL_STATE: AppState = {
  currentUser: null,
  users: [],
  attendanceHistory: [],
  requests: [],
  tasks: [],
  workReports: [],
  appSettings: DEFAULT_SETTINGS,
  isLoading: false,
  syncError: null
};

// Seed Users for Fallback
const SEED_USERS: User[] = [
    {
        id: 'u-super',
        name: 'Super Administrator',
        role: 'superadmin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
        position: 'System Owner',
        leaveQuota: 99,
        isActive: true,
        email: 'super@pintukuliah.com',
        username: 'superadmin',
        employeeId: 'SUPER-001'
    },
    MOCK_ADMIN, 
    MOCK_USER, 
    ...OTHER_USERS
];

export const useUser = (id: string | undefined) => {
    const { state } = useStore();
    if (!id) return undefined;
    return state.users.find(u => u.id === id);
};

// Legacy helper for components that can't use hooks easily or for quick lookups
// Note: This still uses SEED_USERS as fallback but should be avoided in favor of useUser
export const getUserById = (id: string, users: User[]): User | undefined => {
    return users.find(u => u.id === id) || SEED_USERS.find(u => u.id === id); 
};

// Helper to deduplicate array by ID
const deduplicate = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

export const useStoreInternal = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const { showToast } = useToast();
  const lastFetchRef = useRef<number>(0);
  const stateRef = useRef<AppState>(state);

  useEffect(() => {
      stateRef.current = state;
  }, [state]);

  const saveState = useCallback((newState: AppState | ((prev: AppState) => AppState)) => {
    if (typeof newState === 'function') {
        setState(prev => {
            const next = newState(prev);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        setState(newState);
    }
  }, []);

  // Refactored Fetch Logic
  const fetchData = useCallback(async (isBackground = false) => {
      const now = Date.now();
      // Throttle: Don't fetch more than once every 5 seconds, even in background
      if (isBackground && now - lastFetchRef.current < 5000) {
          return;
      }
      lastFetchRef.current = now;

      if (!isBackground) {
          setState(prev => ({ ...prev, isLoading: true, syncError: null }));
      }

      try {
          // 1. Try Local Storage first (only on initial load)
          let parsedLocal: Partial<AppState> = {};
          if (!isBackground) {
              const localData = localStorage.getItem(STORAGE_KEY);
              if (localData) {
                  try {
                      parsedLocal = JSON.parse(localData);
                      if (typeof parsedLocal !== 'object' || parsedLocal === null) parsedLocal = {};
                      
                      // Deduplicate local data
                      if (parsedLocal.users) parsedLocal.users = deduplicate(parsedLocal.users);
                      if (parsedLocal.attendanceHistory) parsedLocal.attendanceHistory = deduplicate(parsedLocal.attendanceHistory);
                      if (parsedLocal.requests) parsedLocal.requests = deduplicate(parsedLocal.requests);
                      if (parsedLocal.tasks) parsedLocal.tasks = deduplicate(parsedLocal.tasks);
                      if (parsedLocal.workReports) parsedLocal.workReports = deduplicate(parsedLocal.workReports);

                      if (parsedLocal.appSettings?.apiUrl) {
                          console.log(`[Store] Setting API URL from local storage: ${parsedLocal.appSettings.apiUrl}`);
                          api.setApiUrl(parsedLocal.appSettings.apiUrl);
                      }
                      
                      setState(prev => ({ 
                          ...prev, 
                          ...parsedLocal, 
                          users: deduplicate([...SEED_USERS, ...(parsedLocal.users || [])]),
                          isLoading: true 
                      }));
                  } catch (e) {
                      console.warn("Failed to parse local data", e);
                  }
              } else {
                  setState(prev => ({ ...prev, users: SEED_USERS }));
              }
          }

          // 2. Fetch from API
          try {
              const apiData = await api.getAllData();
              
              // Merge API Data
              setState(prev => {
                  if (apiData.appSettings?.apiUrl) {
                      console.log(`[Store] Setting API URL from API data: ${apiData.appSettings.apiUrl}`);
                      api.setApiUrl(apiData.appSettings.apiUrl);
                  }
                  
                  // Preserve local pending data so they don't disappear on background sync
                  const localPendingAttendance = prev.attendanceHistory.filter(r => r.syncStatus === 'pending');
                  const localPendingRequests = prev.requests.filter(r => r.syncStatus === 'pending');

                  const mergedState = {
                      ...prev,
                      ...parsedLocal, // Only relevant on initial load
                      ...apiData,
                      currentUser: prev.currentUser || parsedLocal.currentUser || null,
                      isLoading: false,
                      syncError: null
                  };

                  // Deduplicate and re-add pending items
                  if (mergedState.users) {
                      // Only add SEED_USERS if the list is empty or we are in a fresh state
                      // This prevents deleted seed users from coming back
                      if (mergedState.users.length === 0) {
                          mergedState.users = SEED_USERS;
                      } else {
                          // Ensure default superadmin is ALWAYS there for safety
                          const hasSuper = mergedState.users.some(u => u.role === 'superadmin');
                          if (!hasSuper) {
                              mergedState.users = deduplicate([...mergedState.users, ...SEED_USERS.filter(u => u.role === 'superadmin')]);
                          }
                      }
                  }
                  
                  if (mergedState.attendanceHistory) {
                      const serverIds = new Set(mergedState.attendanceHistory.map(r => r.id));
                      const uniquePending = localPendingAttendance.filter(r => !serverIds.has(r.id));
                      mergedState.attendanceHistory = deduplicate([...uniquePending, ...mergedState.attendanceHistory]);
                  }

                  if (mergedState.requests) {
                      const serverRequests = mergedState.requests;
                      const localPending = localPendingRequests;
                      
                      // Logic: If server has the record, check its status.
                      // If server status is still 'Pending' but local is 'pending' (sync-wise), 
                      // we might want to keep local if it has more info (though usually server is source of truth).
                      // CRITICAL: If server status is NOT 'Pending' (e.g., Approved/Rejected), 
                      // it MUST override local even if local is 'pending' (sync-wise).
                      
                      const serverIds = new Set(serverRequests.map(r => r.id));
                      
                      // Keep local pending only if they are NOT on the server yet
                      const uniquePending = localPending.filter(r => !serverIds.has(r.id));
                      
                      // For records on both, server version is already in mergedState.requests
                      mergedState.requests = deduplicate([...uniquePending, ...serverRequests]);
                  }
                  if (mergedState.tasks) mergedState.tasks = deduplicate(mergedState.tasks);
                  if (mergedState.workReports) mergedState.workReports = deduplicate(mergedState.workReports);

                  // Re-assign shifts logic
                  if (mergedState.appSettings.shifts) {
                      mergedState.appSettings.shifts.forEach(s => {
                          if (s.assignedUserIds.length === 0 && mergedState.users.length > 0) {
                              s.assignedUserIds = mergedState.users.map(u => u.id);
                          }
                      });
                  }

                  // Fallback for Leave Types if empty (Initial Setup)
                  if (!mergedState.appSettings.leaveTypes || mergedState.appSettings.leaveTypes.length === 0) {
                      mergedState.appSettings.leaveTypes = DEFAULT_LEAVE_TYPES;
                  }
                  
                  // Persist to local storage
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
                  return mergedState;
              });

          } catch (apiErr: any) {
              console.error("API Sync Failed:", apiErr);
              if (!isBackground) {
                  const errorMessage = apiErr.message || "Gagal terhubung ke server backend.";
                  setState(prev => ({
                      ...prev,
                      ...parsedLocal,
                      users: prev.users.length > 0 ? prev.users : SEED_USERS,
                      isLoading: false,
                      syncError: errorMessage
                  }));
              }
          }

      } catch (err) {
          console.error("Critical Load Error:", err);
          if (!isBackground) {
             // Fallback logic...
             setState(prev => ({
                ...prev, 
                users: prev.users.length > 0 ? prev.users : SEED_USERS,
                isLoading: false, 
                syncError: "Mode Offline: Error kritis saat memuat data." 
            }));
          }
      }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Background Sync (Every 30s)
  useEffect(() => {
      const interval = setInterval(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
              fetchData(true);
          }
      }, 30000);
      return () => clearInterval(interval);
  }, [fetchData]);

  // Sync on Focus (Throttle to 30s)
  useEffect(() => {
      const onFocus = () => {
          const now = Date.now();
          if (navigator.onLine && now - lastFetchRef.current > 30000) {
              fetchData(true);
          }
      };
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  // Sync Pending Data
  const syncPendingItems = useCallback(async () => {
      if (!navigator.onLine) return;

      // Use stateRef to get the absolute latest state without closure issues
      const currentState = stateRef.current;
      const pendingRecords = currentState.attendanceHistory.filter(r => r.syncStatus === 'pending');
      const pendingRequests = currentState.requests.filter(r => r.syncStatus === 'pending');
      
      if (pendingRecords.length === 0 && pendingRequests.length === 0) return;

      if (pendingRecords.length > 0) {
          console.log(`Syncing ${pendingRecords.length} pending attendance records...`);
          for (const record of pendingRecords) {
              try {
                  await api.syncAttendance(record);
                  saveState(prev => ({
                      ...prev,
                      attendanceHistory: prev.attendanceHistory.map(r => r.id === record.id ? { ...r, syncStatus: 'synced' } : r)
                  }));
              } catch (e) {
                  console.error(`Failed to sync record ${record.id}`, e);
              }
          }
      }

      if (pendingRequests.length > 0) {
          console.log(`Syncing ${pendingRequests.length} pending requests...`);
          for (const req of pendingRequests) {
              try {
                  await api.syncRequest(req);
                  saveState(prev => ({
                      ...prev,
                      requests: prev.requests.map(r => r.id === req.id ? { ...r, syncStatus: 'synced' } : r)
                  }));
              } catch (e) {
                  console.error(`Failed to sync request ${req.id}`, e);
              }
          }
      }
  }, [saveState]);

  // Listen to online event
  useEffect(() => {
      const onOnline = () => {
          console.log("Online detected. Syncing...");
          syncPendingItems();
      };
      window.addEventListener('online', onOnline);
      return () => window.removeEventListener('online', onOnline);
  }, [syncPendingItems]);

  // --- Actions ---

  const login = (user: User) => {
    const freshUser = state.users.find(u => u.email === user.email) || user;
    if (!freshUser.isActive) {
        alert("Akun ini telah dinonaktifkan.");
        return;
    }
    saveState({ ...state, currentUser: freshUser });
  };

  const logout = () => {
    saveState({ ...state, currentUser: null });
  };

  const addAttendance = async (record: AttendanceRecord) => {
    const recordWithStatus: AttendanceRecord = { ...record, syncStatus: 'pending' };

    saveState(prev => ({
      ...prev,
      attendanceHistory: [recordWithStatus, ...prev.attendanceHistory],
    }));

    if (navigator.onLine) {
        try {
            await api.syncAttendance(recordWithStatus);
            saveState(prev => ({
                ...prev,
                attendanceHistory: prev.attendanceHistory.map(r => 
                    r.id === record.id ? { ...r, syncStatus: 'synced' } : r
                )
            }));
        } catch (e) {
            console.error("Failed to sync attendance, saved locally", e);
        }
    }
  };

  const checkOutAttendance = async (recordId: string, checkOutTime: string, location?: { lat: number, lng: number }, officeId?: string, officeName?: string) => {
    saveState(prev => {
        const targetRecord = prev.attendanceHistory.find(r => r.id === recordId);
        const updatedHistory = prev.attendanceHistory.map(rec => 
            rec.id === recordId ? { ...rec, checkOutTime, checkOutLocation: location, officeId: officeId || rec.officeId, officeName: officeName || rec.officeName, syncStatus: 'pending' } : rec
        );
        
        if (targetRecord && navigator.onLine) {
            api.syncAttendance({ ...targetRecord, checkOutTime, checkOutLocation: location, officeId: officeId || targetRecord.officeId, officeName: officeName || targetRecord.officeName })
               .then(() => {
                   saveState(p => ({
                       ...p,
                       attendanceHistory: p.attendanceHistory.map(r => r.id === recordId ? { ...r, syncStatus: 'synced' } : r)
                   }));
               })
               .catch(console.error);
        }
        
        return { ...prev, attendanceHistory: updatedHistory };
    });
  };

  const addLocationLog = (recordId: string, log: LocationLog) => {
    const updatedHistory = state.attendanceHistory.map(rec => {
        if (rec.id === recordId) {
            const currentLogs = rec.locationLogs || [];
            return { ...rec, locationLogs: [...currentLogs, log] };
        }
        return rec;
    });
    saveState({ ...state, attendanceHistory: updatedHistory });
  };

  const updateAttendance = async (updatedRecord: AttendanceRecord) => {
    const updatedHistory = state.attendanceHistory.map(rec => 
        rec.id === updatedRecord.id ? updatedRecord : rec
    );
    saveState({ ...state, attendanceHistory: updatedHistory });
     try {
        await api.syncAttendance(updatedRecord);
    } catch(e) { console.error(e); }
  };

  const addRequest = async (request: RequestRecord) => {
    const requestWithStatus: RequestRecord = { ...request, syncStatus: 'pending' };
    saveState(prev => ({ ...prev, requests: [requestWithStatus, ...prev.requests] }));
    
    if (navigator.onLine) {
        try {
            await api.syncRequest(requestWithStatus);
            saveState(prev => ({
                ...prev,
                requests: prev.requests.map(r => 
                    r.id === request.id ? { ...r, syncStatus: 'synced' } : r
                )
            }));
        } catch(e) { 
            console.error("Failed to sync request, saved locally", e);
        }
    }
  };

  const updateRequestStatus = async (requestId: string, status: RequestStatus) => {
      saveState(prev => {
          const targetReq = prev.requests.find(r => r.id === requestId);
          if (!targetReq) return prev;

          const oldStatus = targetReq.status;
          const newStatus = status;
          
          let nextUsers = [...prev.users];
          let nextCurrentUser = prev.currentUser;

          // Handle Leave Quota Reduction/Restoration
          if (targetReq.type === RequestType.LEAVE) {
              const start = new Date(targetReq.startDate);
              const end = new Date(targetReq.endDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

              const userId = targetReq.userId;
              const user = nextUsers.find(u => u.id === userId);

              if (user) {
                  let newQuota = user.leaveQuota;
                  
                  // From Not Approved -> Approved: Reduce Quota
                  if (oldStatus !== RequestStatus.APPROVED && newStatus === RequestStatus.APPROVED) {
                      newQuota = Math.max(0, user.leaveQuota - diffDays);
                  } 
                  // From Approved -> Not Approved: Restore Quota
                  else if (oldStatus === RequestStatus.APPROVED && newStatus !== RequestStatus.APPROVED) {
                      newQuota = user.leaveQuota + diffDays;
                  }

                  if (newQuota !== user.leaveQuota) {
                      const updatedUser = { ...user, leaveQuota: newQuota };
                      nextUsers = nextUsers.map(u => u.id === userId ? updatedUser : u);
                      if (nextCurrentUser && nextCurrentUser.id === userId) {
                          nextCurrentUser = updatedUser;
                      }
                      
                      // Sync user update to API
                      if (navigator.onLine) {
                          api.syncUser(updatedUser).catch(e => console.error("Failed to sync user quota update", e));
                      }
                  }
              }
          }

          const updatedRequest: RequestRecord = { ...targetReq, status, syncStatus: 'pending' };
          
          if (navigator.onLine) {
              api.syncRequest(updatedRequest)
                 .then(() => {
                    saveState(p => ({
                        ...p,
                        requests: p.requests.map(req => 
                            req.id === requestId ? { ...req, syncStatus: 'synced' } : req
                        )
                    }));
                 })
                 .catch(e => console.error("Failed to sync request status update", e));
          }

          return {
              ...prev,
              users: nextUsers,
              currentUser: nextCurrentUser,
              requests: prev.requests.map(req => req.id === requestId ? updatedRequest : req)
          };
      });
  };

  const updateAppSettings = async (settings: AppSettings) => {
      if (settings.apiUrl) {
          api.setApiUrl(settings.apiUrl);
      }
      saveState(prev => ({ ...prev, appSettings: settings }));
      try {
        await api.syncSettings(settings);
      } catch(e: any) { 
        console.error(e);
        showToast(`Gagal sinkronisasi ke server: ${e.message}`, 'error');
      }
  };

  const addUser = async (newUser: User) => {
      saveState(prev => ({ ...prev, users: [newUser, ...prev.users] }));
      try {
        await api.syncUser(newUser);
      } catch(e) { console.error(e); }
  };

  const updateUser = async (updatedUser: User) => {
      saveState(prev => {
          const updatedUsers = prev.users.map(u => u.id === updatedUser.id ? updatedUser : u);
          let current = prev.currentUser;
          if (current && current.id === updatedUser.id) current = updatedUser;
          return { ...prev, users: updatedUsers, currentUser: current };
      });
      
      try {
        await api.syncUser(updatedUser);
      } catch(e) { console.error(e); }
  };

  const deleteUser = async (userId: string) => {
      console.log("Store: deleteUser called for ID:", userId);
      const userToDelete = stateRef.current.users.find(u => u.id === userId);
      
      saveState(prev => {
          console.log("Store: Filtering users, current count:", prev.users.length);
          const nextUsers = prev.users.filter(u => u.id !== userId);
          console.log("Store: New user count:", nextUsers.length);
          return { ...prev, users: nextUsers };
      });
      
      try {
        console.log("Store: Calling api.deleteUser...");
        await api.deleteUser(userId);
        showToast(`Data karyawan "${userToDelete?.name || userId}" telah dihapus dari server.`, 'success');
      } catch(e: any) { 
        console.error("Store: Failed to delete user from server", e);
        showToast(`Gagal menghapus data dari server: ${e.message}`, 'error');
      }
  };

  const deleteRequest = async (requestId: string) => {
      saveState(prev => ({ ...prev, requests: prev.requests.filter(r => r.id !== requestId) }));
      try {
          await api.deleteRequest(requestId);
          showToast("Pengajuan telah dihapus.", "success");
      } catch(e: any) { 
          console.error(e);
          showToast(`Gagal menghapus pengajuan: ${e.message}`, "error");
      }
  };

  const addTask = async (task: any) => {
      saveState(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));
      try {
          await api.syncTask(task);
      } catch (e) { console.error(e); }
  };

  const updateTask = async (task: any) => {
      saveState(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === task.id ? task : t) }));
      try {
          await api.syncTask(task);
      } catch (e) { console.error(e); }
  };

  const deleteTask = async (taskId: string) => {
      saveState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
      try {
          await api.deleteTask(taskId);
          showToast("Tugas telah dihapus.", "success");
      } catch (e: any) { 
          console.error(e);
          showToast(`Gagal menghapus tugas: ${e.message}`, "error");
      }
  };

  const submitWorkReport = async (report: any) => {
      saveState(prev => ({ ...prev, workReports: [report, ...prev.workReports] }));
      try {
          await api.syncWorkReport(report);
      } catch (e) { console.error(e); }
  };

  const updateWorkReport = async (report: any) => {
      saveState(prev => ({ ...prev, workReports: prev.workReports.map(r => r.id === report.id ? report : r) }));
      try {
          await api.syncWorkReport(report);
      } catch (e) { console.error(e); }
  };

  const resetData = () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
  };

  return {
    state, login, logout, addAttendance, checkOutAttendance, addLocationLog, updateAttendance,
    addRequest, updateRequestStatus, deleteRequest, updateAppSettings, addUser, updateUser, deleteUser,
    addTask, updateTask, deleteTask, submitWorkReport, updateWorkReport,
    resetData, fetchData, syncPendingItems
  };
};

type StoreContextType = ReturnType<typeof useStoreInternal>;

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const store = useStoreInternal();
    return (
        <StoreContext.Provider value={store}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
