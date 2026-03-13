
export enum AttendanceStatus {
  PRESENT = 'Hadir',
  LATE = 'Terlambat',
  ABSENT = 'Alpha',
  LEAVE = 'Cuti',
  SICK = 'Sakit',
  HOLIDAY = 'Libur',
}

export enum RequestType {
  LEAVE = 'Cuti',
  PERMISSION = 'Izin',
  OVERTIME = 'Lembur',
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Disetujui',
  REJECTED = 'Ditolak',
}

// New: Job Role Configuration
export interface JobRole {
  id: string;
  title: string; // Nama Jabatan (e.g., Staff IT)
  level: string; // e.g., Junior, Senior, Manager
  coreResponsibilities: string[]; // List of job descriptions
  loginMode?: 'username' | 'employee_id'; // New: Login mode per job role
}

export interface Department {
  id: string;
  name: string;
  managerId?: string;
  description?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  quota: number;
  isPaid: boolean;
  requiresFile: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'employee' | 'admin' | 'manager' | 'hr' | 'superadmin';
  avatar: string;
  position: string; // Legacy string, now driven by jobRoleId
  jobRoleId?: string; // Link to JobRole
  departmentId?: string; // Link to Department
  leaveQuota: number;
  isActive: boolean;
  email?: string;
  username?: string; // New: Unique username for login
  employeeId?: string; // New: Unique Employee ID for login
  loginMode?: 'username' | 'employee_id'; // New: Login mode per user
  phone?: string;
  joinDate?: string;
  
  // New: Biodata
  birthPlace?: string;
  birthDate?: string;
  gender?: 'L' | 'P';
  address?: string;

  // New: Documents
  documents?: {
      ktp?: string; // Base64 Data URL (Image/PDF)
      kk?: string;
      ijazah?: string;
  };
}

export interface LocationLog {
  id: string;
  timestamp: string; 
  lat: number;
  lng: number;
  type: 'AUTO' | 'MANUAL';
  address?: string; 
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; 
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  checkOutLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  locationLogs?: LocationLog[]; 
  photoUrl?: string; 
  notes?: string;
  isOnlineWork: boolean;
  officeId?: string; // New: ID of the office where user checked in
  officeName?: string; // New: Name of the office where user checked in
  syncStatus?: 'synced' | 'pending' | 'failed'; 
}

export interface RequestRecord {
  id: string;
  userId: string;
  type: RequestType;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  aiEnhancedReason?: string;
  leaveTypeId?: string; // Link to LeaveType
  attachmentUrl?: string; // Base64 or URL for evidence
  syncStatus?: 'synced' | 'pending'; 
}

export interface Shift {
  id: string;
  name: string; 
  startTime: string;      
  endTime: string;        
  breakStart: string;     
  breakEnd: string;       
  overtimeStart: string;  
  isFlexible: boolean;    
  workDays: number[];     
  assignedUserIds: string[]; 
}

export interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in KM
}

export interface RolePermission {
  role: 'employee' | 'admin' | 'manager' | 'hr' | 'superadmin';
  allowedModules: string[]; // e.g., ['dashboard', 'attendance', 'requests', 'history']
}

export interface AppSettings {
  offices?: OfficeLocation[]; // Support multiple offices
  officeLat: number; // Legacy, for backward compatibility
  officeLng: number; // Legacy
  officeRadius: number; // Legacy
  officeName: string; // Legacy
  apiUrl?: string; 
  gracePeriodMinutes: number; // New: Grace period for late check-in
  roleMode: 'username' | 'employee_id' | 'restricted' | 'per_role'; // New: Global login mode
  rolePermissions?: RolePermission[]; // New: Dynamic role permissions
  shifts: Shift[]; 
  jobRoles: JobRole[]; // New: List of configured jobs
  departments?: Department[]; // New: List of departments
  leaveTypes?: LeaveType[]; // New: List of leave types
}

export type TaskCategory = string;

export const TASK_CATEGORIES = {
  DAILY: 'Harian',
  ADDITIONAL: 'Tambahan',
  DIREKTUR_GM: 'Direktur & GM',
  MARKETING: 'Marketing',
  ADMINISTRASI: 'Administrasi',
  KEUANGAN: 'Keuangan',
  IT_SUPPORT: 'IT Support',
  BRANCH_MANAGER: 'Branch Manager',
  SUPPORT: 'Support'
};

export enum TaskStatus {
  TODO = 'Belum Selesai',
  DONE = 'Selesai',
  CANCELLED = 'Dibatalkan',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority?: 'Low' | 'Medium' | 'High';
  assignedUserIds: string[]; // Specific users
  assignedRoleIds: string[]; // Specific job roles
  assignedDepartmentIds: string[]; // Specific departments
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface WorkReport {
  id: string;
  userId: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  notes?: string;
  proofUrl?: string;
  submittedAt: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[]; 
  attendanceHistory: AttendanceRecord[];
  requests: RequestRecord[];
  tasks: Task[];
  workReports: WorkReport[];
  appSettings: AppSettings;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;
}
