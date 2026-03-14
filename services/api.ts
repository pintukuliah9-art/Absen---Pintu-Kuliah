
import { AppState, User, AttendanceRecord, RequestRecord, AppSettings, JobRole, Shift, Task, WorkReport } from '../types';

// URL Google Apps Script Web App (Default)
// Jika kosong, server akan menggunakan environment variable GAS_API_URL
const DEFAULT_API_URL = (process.env.GAS_API_URL || "https://script.google.com/macros/s/AKfycbwZrxNV9pd5XtL_f_Vbkx1PCArkEg1y5LtnZVmxU2H4ATKqcPsMWymsRHF1kF3dyPfT/exec"); 
let API_URL = DEFAULT_API_URL;

// Helper untuk POST request ke Google Apps Script via Express Proxy
const postData = async (action: string, payload: any = {}, retryCount = 0): Promise<any> => {
    try {
        // Jika API_URL kosong, kita tidak mengirimkan apiUrl ke proxy agar proxy menggunakan env var
        const apiUrlToSend = API_URL || undefined;
        
        console.log(`[API] Calling action: ${action}${apiUrlToSend ? ` with URL: ${apiUrlToSend}` : ' using server default URL'}`);
        
        // Gunakan relative URL agar lebih robust di lingkungan iframe/proxy
        const fullUrl = '/api/proxy';
        
        console.log(`[API] Fetching from: ${fullUrl} for action: ${action} (Attempt: ${retryCount + 1})`);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ action, payload, apiUrl: apiUrlToSend }),
        }).catch(err => {
            console.error(`[API] Fetch failed for ${action}:`, err);
            throw new Error(`Network Error: ${err.message}. Please check if the server is running and accessible.`);
        });
        
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            // Not JSON
        }
        
        if (!response.ok) {
            // Handle Rate Limit (429) specifically
            if (response.status === 429 && retryCount < 5) {
                const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                console.warn(`[API] Rate limit exceeded (429). Retrying ${action} in ${Math.round(delay)}ms... (Attempt ${retryCount + 1}/5)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return postData(action, payload, retryCount + 1);
            }

            let errorMessage = response.statusText;
            if (result && result.message) {
                errorMessage = result.message;
            } else if (text) {
                 // If it's HTML, try to extract title or just show start
                 const match = text.match(/<title>(.*?)<\/title>/i);
                 if (match) errorMessage = `Server Error: ${match[1]}`;
                 else errorMessage = `Server Error: ${text.substring(0, 100)}`;
            }
            console.error(`[API Error] ${action} (${response.status}):`, result || text.substring(0, 200));
            throw new Error(errorMessage);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            console.error(`[API Error] Received HTML instead of JSON for ${action}. Response starts with:`, text.substring(0, 100));
            throw new Error("Server returned HTML instead of JSON. This usually means the Google Apps Script is not deployed with 'Who has access: Anyone' or the Script URL is incorrect.");
        }

        if (!result) {
            console.error(`[API Error] Empty or invalid JSON response for ${action}:`, text.substring(0, 200));
            throw new Error("Empty or invalid JSON response from server.");
        }

        return result;
    } catch (error: any) {
        console.error(`[API] POST Error [${action}]:`, error.message);
        
        // Retry logic for "Failed to fetch" or network errors
        if (retryCount < 3 && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch') || error.message.includes('Rate exceeded'))) {
            const delay = Math.pow(2, retryCount) * 2000;
            console.warn(`[API] Retrying ${action} in ${delay/1000}s due to network/rate error...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return postData(action, payload, retryCount + 1);
        }
        
        throw error;
    }
};

// Mappers (Database Snake_Case -> Frontend CamelCase)
const toBoolean = (val: any) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    if (typeof val === 'number') return val === 1;
    return false;
};

const formatDate = (val: any) => {
    if (!val) return '';
    
    // If it's already a YYYY-MM-DD string, return it as is
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val;
    }

    const d = new Date(val);
    if (isNaN(d.getTime())) return typeof val === 'string' ? val : '';
    if (d.getFullYear() === 1899) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getValue = (obj: any, keys: string | string[]) => {
    if (!obj) return undefined;
    const keyList = Array.isArray(keys) ? keys : [keys];
    
    // Helper to check if value is "empty" (undefined, null, or empty string)
    const isEmpty = (v: any) => v === undefined || v === null || v === '';

    for (const key of keyList) {
        if (!isEmpty(obj[key])) return obj[key];
        
        const lowerKey = key.toLowerCase();
        for (const k in obj) {
            if (k.toLowerCase() === lowerKey && !isEmpty(obj[k])) {
                return obj[k];
            }
        }
    }
    return undefined;
};

const mapUserFromDB = (u: any): User => {
    const rawId = getValue(u, 'id');
    const employeeId = getValue(u, ['id_karyawan', 'employee_id']);
    const username = getValue(u, 'username');
    const name = getValue(u, ['nama', 'name']);
    
    // Robust ID: Use 'id' column, fallback to 'employee_id', then 'username', then a slug of the name + random
    // We add a small random suffix if we have to fallback to name to avoid deduplication collisions
    const id = String(rawId || employeeId || username || (name ? `user-${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 4)}` : `temp-${Math.random().toString(36).substr(2, 9)}`));

    return {
        id,
        name: String(name || 'Karyawan Baru'),
        email: String(getValue(u, 'email') || ''),
        username: String(username || ''),
        employeeId: String(employeeId || ''),
        role: getValue(u, ['peran', 'role']) || 'employee',
        position: String(getValue(u, ['jabatan', 'position']) || 'Staff'), 
        jobRoleId: String(getValue(u, ['id_jabatan', 'job_role_id']) || ''),
        departmentId: String(getValue(u, ['id_departemen', 'department_id']) || ''),
        phone: String(getValue(u, ['telepon', 'phone']) || ''),
        joinDate: formatDate(getValue(u, ['tgl_bergabung', 'tanggal_bergabung', 'join_date'])),
        leaveQuota: Number(getValue(u, ['kuota_cuti', 'leave_quota']) || 0),
        isActive: toBoolean(getValue(u, ['status_aktif', 'aktif', 'is_active'])),
        avatar: getValue(u, ['url_avatar', 'avatar_url']) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`,
        birthPlace: String(getValue(u, ['tempat_lahir', 'birth_place']) || ''),
        birthDate: formatDate(getValue(u, ['tgl_lahir', 'tanggal_lahir', 'birth_date'])),
        gender: getValue(u, ['gender', 'jenis_kelamin']) || 'L',
        address: String(getValue(u, ['alamat', 'address']) || ''),
        documents: {
            ktp: getValue(u, ['dok_ktp', 'doc_ktp']),
            kk: getValue(u, ['dok_kk', 'doc_kk']),
            ijazah: getValue(u, ['dok_ijazah', 'doc_ijazah'])
        },
        loginMode: getValue(u, ['mode_login', 'login_mode']) || 'username'
    };
};

const mapAttendanceFromDB = (a: any): AttendanceRecord => ({
    id: String(getValue(a, 'id') || ''),
    userId: String(getValue(a, ['id_user', 'user_id']) || ''),
    date: formatDate(getValue(a, ['tanggal', 'date'])),
    checkInTime: getValue(a, ['jam_masuk', 'check_in_time']),
    checkOutTime: getValue(a, ['jam_keluar', 'check_out_time']),
    status: getValue(a, 'status'),
    isOnlineWork: toBoolean(getValue(a, ['kerja_online', 'is_online_work'])),
    photoUrl: getValue(a, ['url_foto', 'photo_url']),
    notes: getValue(a, ['catatan', 'notes']),
    location: (getValue(a, ['lat_masuk', 'lat_in']) && getValue(a, ['lng_masuk', 'lng_in'])) ? {
        lat: Number(getValue(a, ['lat_masuk', 'lat_in'])),
        lng: Number(getValue(a, ['lng_masuk', 'lng_in'])),
        address: ''
    } : undefined,
    checkOutLocation: (getValue(a, ['lat_keluar', 'lat_out']) && getValue(a, ['lng_keluar', 'lng_out'])) ? {
        lat: Number(getValue(a, ['lat_keluar', 'lat_out'])),
        lng: Number(getValue(a, ['lng_keluar', 'lng_out'])),
        address: ''
    } : undefined,
    officeId: getValue(a, ['id_kantor', 'office_id']),
    officeName: getValue(a, ['nama_kantor', 'office_name']),
    locationLogs: safeJsonParse(getValue(a, 'location_logs'), []),
    syncStatus: 'synced'
});

const mapRequestFromDB = (r: any): RequestRecord => ({
    id: String(getValue(r, 'id') || ''),
    userId: String(getValue(r, ['id_user', 'user_id']) || ''),
    type: getValue(r, ['tipe', 'type']) as any,
    startDate: formatDate(getValue(r, ['tgl_mulai', 'tanggal_mulai', 'start_date'])),
    endDate: formatDate(getValue(r, ['tgl_selesai', 'tanggal_selesai', 'end_date'])),
    reason: getValue(r, ['alasan', 'reason']),
    aiEnhancedReason: getValue(r, ['alasan_ai', 'ai_enhanced_reason']),
    status: getValue(r, 'status') as any,
    leaveTypeId: getValue(r, ['id_tipe_cuti', 'leave_type_id']),
    attachmentUrl: getValue(r, ['url_lampiran', 'attachment_url']),
    syncStatus: 'synced'
});

const mapTaskFromDB = (t: any): Task => ({
    id: String(getValue(t, 'id') || ''),
    title: getValue(t, ['judul', 'title']),
    description: getValue(t, ['deskripsi', 'description']),
    category: getValue(t, ['kategori', 'category']) as any,
    assignedUserIds: safeJsonParse(getValue(t, ['id_user_ditugaskan', 'assigned_user_ids']), []),
    assignedRoleIds: safeJsonParse(getValue(t, ['id_peran_ditugaskan', 'assigned_role_ids']), []),
    assignedDepartmentIds: safeJsonParse(getValue(t, ['id_dept_ditugaskan', 'id_departemen_ditugaskan', 'assigned_department_ids']), []),
    isActive: toBoolean(getValue(t, ['aktif', 'is_active'])),
    createdAt: getValue(t, ['dibuat_pada', 'created_at']),
    createdBy: getValue(t, ['dibuat_oleh', 'created_by']),
    syncStatus: 'synced'
});

const mapWorkReportFromDB = (w: any): WorkReport => ({
    id: String(getValue(w, 'id') || ''),
    userId: String(getValue(w, ['id_user', 'user_id']) || ''),
    taskId: String(getValue(w, ['id_tugas', 'task_id']) || ''),
    date: formatDate(getValue(w, ['tanggal', 'date'])),
    status: getValue(w, 'status') as any,
    notes: getValue(w, ['catatan', 'notes']),
    proofUrl: getValue(w, ['url_bukti', 'proof_url']),
    submittedAt: getValue(w, ['dikirim_pada', 'submitted_at']),
    syncStatus: 'synced'
});

// Helper for safe JSON parsing
const safeJsonParse = (str: any, fallback: any = []) => {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn("Failed to parse JSON field:", str);
        return fallback;
    }
};

export const api = {
    setApiUrl: (url: string) => {
        if (url && url.trim() && url.startsWith('http')) {
            console.log(`[API] Setting API URL to: ${url.trim()}`);
            API_URL = url.trim();
        } else {
            console.warn(`[API] Attempted to set invalid API URL: "${url}". Keeping current: ${API_URL}`);
        }
    },
    getAllData: async (): Promise<Partial<AppState>> => {
        // Mengubah request menjadi POST agar lebih stabil
        const data = await postData('getAllData', { _t: Date.now() });
        
        if (!data || data.status === 'error') throw new Error(data?.message || 'Gagal memuat data dari server');

        // Handle both snake_case (from DB) and camelCase (from legacy/other)
        const users = data.users || [];
        const jobRoles = data.job_roles || data.jobRoles || [];
        const shifts = data.shifts || [];
        const attendance = data.attendance || [];
        const requests = data.requests || [];
        const settingsData = data.settings || {};
        const leaveTypes = data.leave_types || data.leaveTypes || [];
        const tasks = data.tasks || [];
        const workReports = data.work_reports || data.workReports || [];
        const offices = data.offices || data.branches || [];
        const departments = data.departments || [];
        const rolePermissions = data.role_permissions || [];

        // Convert settings
        const settings: any = {};
        if (settingsData && typeof settingsData === 'object') {
            if (Array.isArray(settingsData)) {
                settingsData.forEach((s: any) => {
                    const key = getValue(s, ['kunci', 'key', 'id']);
                    const val = getValue(s, ['nilai', 'value']);
                    if (key === 'app_config' && val) {
                        try {
                            const parsed = JSON.parse(val);
                            Object.assign(settings, parsed);
                        } catch (e) {
                            console.warn("Failed to parse app_config:", e);
                        }
                    } else if (key) {
                        settings[key] = val;
                    }
                });
            } else {
                Object.assign(settings, settingsData);
            }
        }

        // Parse Settings
        const parsedSettings: AppSettings = {
            officeName: settings?.nama_kantor || settings?.office_name || "Kantor Pusat",
            apiUrl: settings?.api_url || API_URL,
            officeLat: Number(settings?.lat_kantor || settings?.office_lat || -6.175392),
            officeLng: Number(settings?.lng_kantor || settings?.office_lng || 106.827153),
            officeRadius: Number(settings?.radius_kantor_km || settings?.office_radius_km || 0.5),
            gracePeriodMinutes: Number(settings?.toleransi_menit || settings?.grace_period_minutes || 15), // Default 15 mins
            roleMode: (settings?.role_mode as any) || 'standard',
            rolePermissions: Array.isArray(rolePermissions) ? rolePermissions.map((rp: any) => ({
                role: rp.peran,
                allowedModules: safeJsonParse(rp.modul_diizinkan, [])
            })) : (Array.isArray(settings?.role_permissions) ? settings.role_permissions : undefined),
            offices: Array.isArray(offices) ? offices.map((o: any) => ({
                id: String(getValue(o, 'id') || ''),
                name: String(getValue(o, ['nama', 'name']) || ''),
                lat: Number(getValue(o, 'lat') || 0),
                lng: Number(getValue(o, 'lng') || 0),
                radius: Number(getValue(o, 'radius') || 0.1)
            })) : [],
            shifts: Array.isArray(shifts) ? shifts.map((s: any) => ({
                id: String(getValue(s, 'id') || ''),
                name: String(getValue(s, ['nama', 'name']) || ''),
                startTime: getValue(s, ['jam_mulai', 'jam_masuk', 'start_time']) || '08:00',
                endTime: getValue(s, ['jam_selesai', 'end_time']) || '17:00',
                breakStart: getValue(s, ['mulai_istirahat', 'break_start']) || '12:00',
                breakEnd: getValue(s, ['selesai_istirahat', 'break_end']) || '13:00',
                overtimeStart: getValue(s, ['mulai_lembur', 'overtime_start']) || '17:30',
                isFlexible: toBoolean(getValue(s, ['fleksibel', 'is_flexible'])),
                workDays: safeJsonParse(getValue(s, ['hari_kerja', 'work_days']), [1,2,3,4,5]),
                assignedUserIds: safeJsonParse(getValue(s, ['id_user_ditugaskan', 'assigned_user_ids']), [])
            })) : [],
            jobRoles: Array.isArray(jobRoles) ? jobRoles.map((j: any) => ({
                id: String(getValue(j, 'id') || ''),
                title: String(getValue(j, ['judul', 'title']) || ''),
                level: String(getValue(j, 'level') || ''),
                coreResponsibilities: safeJsonParse(getValue(j, ['tanggung_jawab_utama', 'tanggung_jawab_inti', 'core_responsibilities']), []),
                loginMode: getValue(j, ['mode_login', 'login_mode']) || 'username'
            })) : [],
            leaveTypes: Array.isArray(leaveTypes) ? leaveTypes.map((l: any) => ({
                id: String(l.id),
                name: l.nama || l.name,
                quota: Number(getValue(l, ['kuota_per_tahun', 'quota_per_year']) || 12),
                isPaid: toBoolean(getValue(l, ['dibayar', 'berbayar', 'is_paid'])),
                requiresFile: toBoolean(getValue(l, ['butuh_lampiran', 'butuh_file', 'requires_file']))
            })) : [],
            departments: Array.isArray(departments) ? departments.map((d: any) => ({
                id: String(d.id),
                name: d.nama || d.name,
                managerId: d.id_manajer || d.manager_id,
                description: d.deskripsi || d.description
            })) : []
        };

        return {
            users: Array.isArray(users) ? users.map(mapUserFromDB) : [],
            attendanceHistory: Array.isArray(attendance) ? attendance.map(mapAttendanceFromDB) : [],
            requests: Array.isArray(requests) ? requests.map(mapRequestFromDB) : [],
            tasks: Array.isArray(tasks) ? tasks.map(mapTaskFromDB) : [],
            workReports: Array.isArray(workReports) ? workReports.map(mapWorkReportFromDB) : [],
            appSettings: parsedSettings
        };
    },

    syncAttendance: async (record: AttendanceRecord) => {
        return postData('syncAttendance', {
            id: record.id,
            id_user: record.userId,
            tanggal: record.date,
            jam_masuk: record.checkInTime,
            jam_keluar: record.checkOutTime,
            status: record.status,
            kerja_online: record.isOnlineWork,
            url_foto: record.photoUrl,
            lat_masuk: record.location?.lat,
            lng_masuk: record.location?.lng,
            lat_keluar: record.checkOutLocation?.lat,
            lng_keluar: record.checkOutLocation?.lng,
            id_kantor: record.officeId,
            nama_kantor: record.officeName,
            catatan: record.notes,
            location_logs: record.locationLogs
        });
    },

    syncRequest: async (req: RequestRecord) => {
        return postData('syncRequest', {
            id: req.id,
            id_user: req.userId,
            tipe: req.type,
            tgl_mulai: req.startDate,
            tgl_selesai: req.endDate,
            alasan: req.reason,
            alasan_ai: req.aiEnhancedReason,
            status: req.status,
            id_tipe_cuti: req.leaveTypeId,
            url_lampiran: req.attachmentUrl
        });
    },

    syncUser: async (user: User) => {
        return postData('syncUser', {
            id: user.id,
            nama: user.name,
            email: user.email,
            username: user.username,
            id_karyawan: user.employeeId,
            peran: user.role,
            jabatan: user.position,
            id_jabatan: user.jobRoleId,
            id_departemen: user.departmentId,
            telepon: user.phone,
            tgl_bergabung: user.joinDate,
            kuota_cuti: user.leaveQuota,
            status_aktif: user.isActive,
            url_avatar: user.avatar,
            tempat_lahir: user.birthPlace,
            tgl_lahir: user.birthDate,
            gender: user.gender,
            alamat: user.address,
            dok_ktp: user.documents?.ktp,
            dok_kk: user.documents?.kk,
            dok_ijazah: user.documents?.ijazah,
            mode_login: user.loginMode || 'username'
        });
    },
    
    deleteUser: async (userId: string) => {
        return postData('deleteUser', { id: userId });
    },

    syncSettings: async (settings: AppSettings) => {
        return postData('syncSettings', {
            api_url: settings.apiUrl,
            nama_kantor: settings.officeName,
            lat_kantor: settings.officeLat,
            lng_kantor: settings.officeLng,
            radius_kantor_km: settings.officeRadius,
            toleransi_menit: settings.gracePeriodMinutes,
            role_mode: settings.roleMode,
            role_permissions: settings.rolePermissions,
            offices: settings.offices?.map(o => ({
                id: o.id,
                nama: o.name,
                lat: o.lat,
                lng: o.lng,
                radius: o.radius
            })),
            shifts: settings.shifts.map(s => ({
                id: s.id,
                nama: s.name,
                jam_mulai: s.startTime,
                jam_selesai: s.endTime,
                mulai_istirahat: s.breakStart,
                selesai_istirahat: s.breakEnd,
                mulai_lembur: s.overtimeStart,
                fleksibel: s.isFlexible,
                hari_kerja: JSON.stringify(s.workDays || [1,2,3,4,5]),
                id_user_ditugaskan: JSON.stringify(s.assignedUserIds || [])
            })),
            jobRoles: settings.jobRoles.map(j => ({
                id: j.id,
                judul: j.title,
                level: j.level,
                tanggung_jawab_utama: JSON.stringify(j.coreResponsibilities || []),
                mode_login: j.loginMode || 'username'
            })),
            departments: settings.departments?.map(d => ({
                id: d.id,
                nama: d.name,
                id_manajer: d.managerId,
                deskripsi: d.description
            })),
            leaveTypes: settings.leaveTypes?.map(l => ({
                id: l.id,
                nama: l.name,
                kuota_per_tahun: l.quota,
                dibayar: l.isPaid,
                butuh_lampiran: l.requiresFile
            }))
        });
    },

    syncTask: async (task: Task) => {
        return postData('syncTask', {
            id: task.id,
            judul: task.title,
            deskripsi: task.description,
            kategori: task.category,
            id_user_ditugaskan: JSON.stringify(task.assignedUserIds || []),
            id_peran_ditugaskan: JSON.stringify(task.assignedRoleIds || []),
            id_dept_ditugaskan: JSON.stringify(task.assignedDepartmentIds || []),
            aktif: task.isActive,
            dibuat_pada: task.createdAt,
            dibuat_oleh: task.createdBy
        });
    },

    deleteTask: async (taskId: string) => {
        return postData('deleteTask', { id: taskId });
    },

    syncWorkReport: async (report: WorkReport) => {
        return postData('syncWorkReport', {
            id: report.id,
            id_user: report.userId,
            id_tugas: report.taskId,
            tanggal: report.date,
            status: report.status,
            catatan: report.notes,
            url_bukti: report.proofUrl,
            dikirim_pada: report.submittedAt
        });
    },

    deleteRequest: async (requestId: string) => {
        return postData('deleteRequest', { id: requestId });
    },

    ping: async () => {
        return postData('ping', {});
    }
};
