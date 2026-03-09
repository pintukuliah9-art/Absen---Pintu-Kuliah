import { User } from './types';

// Mock Office Location (dcc bandarjaya)
export const OFFICE_LOCATION = {
  lat: -4.945485,
  lng: 105.205185,
  radius: 2, // km
  name: "dcc bandarjaya",
};

export const MOCK_USER: User = {
  id: 'user-001',
  name: 'Budi Santoso',
  role: 'employee',
  position: 'Senior Developer',
  avatar: 'https://i.pravatar.cc/150?u=user-001',
  leaveQuota: 12,
  isActive: true,
  username: 'budi',
  employeeId: 'EMP-001'
};

export const MOCK_ADMIN: User = {
  id: 'admin-001',
  name: 'Administrator Utama',
  role: 'admin',
  position: 'Administrator',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
  leaveQuota: 12,
  isActive: true,
  email: 'admin@absensipro.com',
  username: 'admin',
  employeeId: 'ADM-001'
};

export const OTHER_USERS: User[] = [
    { 
        id: 'user-002', 
        name: 'Siti Aminah', 
        role: 'employee', 
        position: 'Designer', 
        avatar: 'https://i.pravatar.cc/150?u=user-002', 
        leaveQuota: 10, 
        isActive: true,
        username: 'siti',
        employeeId: 'EMP-002'
    },
    { 
        id: 'user-003', 
        name: 'Joko Anwar', 
        role: 'employee', 
        position: 'Marketing', 
        avatar: 'https://i.pravatar.cc/150?u=user-003', 
        leaveQuota: 12, 
        isActive: true,
        username: 'joko',
        employeeId: 'EMP-003'
    },
];

// Colors
export const COLORS = {
  primary: '#2563EB', // blue-600
  secondary: '#3B82F6', // blue-500
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F3F4F6',
};

export const WEEK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];