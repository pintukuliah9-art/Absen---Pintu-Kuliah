# Blueprint Proyek: Pintu Kuliah

Dokumen ini menyajikan gambaran menyeluruh tentang arsitektur, fitur, dan struktur data aplikasi **Pintu Kuliah** saat ini.

## 1. Arsitektur Sistem
Aplikasi ini dibangun dengan pendekatan *full-stack* yang efisien:
- **Frontend**: React.js dengan Vite, Tailwind CSS, dan Lucide Icons.
- **Backend Proxy**: Express.js server yang bertindak sebagai jembatan (proxy) antara aplikasi web dan Google Apps Script untuk menghindari masalah CORS dan mengamankan logika API.
- **Database & Storage**: Google Sheets (sebagai database) dan Google Drive (sebagai penyimpanan file/foto) yang dikelola melalui Google Apps Script (GAS).

## 2. Fitur Utama
### A. Manajemen Kehadiran (Attendance)
- **Check-in/Out**: Validasi lokasi GPS dan foto selfie.
- **Deteksi Kantor**: Otomatis mendeteksi jika karyawan berada di radius kantor yang ditentukan.
- **Kerja Online (WFH)**: Opsi untuk absen dari luar kantor dengan catatan.
- **Jejak Lokasi**: Pencatatan koordinat secara berkala untuk tim lapangan.

### B. Manajemen Karyawan & Organisasi
- **Biodata Lengkap**: Nama, NIK, Jabatan, Departemen, hingga dokumen digital (KTP, KK, Ijazah).
- **Struktur Organisasi**: Manajemen Departemen dan Jabatan (Job Roles).
- **Multi-Cabang**: Dukungan untuk banyak lokasi kantor dengan radius masing-masing.

### C. Pengajuan Izin, Cuti & Lembur
- **Formulir Digital**: Pengajuan dengan lampiran dokumen.
- **AI-Powered Insights**: Menggunakan Gemini AI untuk memperbaiki atau memberikan saran pada alasan pengajuan agar lebih profesional.
- **Sistem Persetujuan**: Alur persetujuan bertingkat oleh Manager atau HR.

### D. Manajemen Tugas & Laporan Kerja
- **Delegasi Tugas**: Admin dapat memberikan tugas harian atau tambahan ke individu, jabatan, atau departemen tertentu.
- **Laporan Kerja**: Karyawan mengirimkan bukti penyelesaian tugas (foto/catatan).
- **Monitoring**: Dashboard untuk memantau progres kerja tim secara real-time.

## 3. Peta Peran (Role Map)
Sistem menggunakan *Role-Based Access Control* (RBAC) yang dinamis:
- **Employee**: Fokus pada absensi, tugas pribadi, dan pengajuan.
- **Manager**: Menyetujui izin tim dan memantau laporan kerja divisi.
- **HR**: Mengelola data karyawan, jatah cuti, dan laporan absensi bulanan.
- **Admin/Superadmin**: Kontrol penuh atas pengaturan sistem, lokasi kantor, tugas, dan monitoring real-time.

## 4. Struktur Database (Google Sheets)
Database diatur dalam Bahasa Indonesia untuk kemudahan pengelolaan manual:
- **Karyawan**: Data akun dan biodata.
- **Absensi**: Log kehadiran harian.
- **Pengajuan**: Data cuti, izin, dan lembur.
- **Jabatan**: Daftar peran dengan format **1 Tugas 1 Kolom** (tugas_1 s/d tugas_20).
- **Shift**: Pengaturan jam kerja.
- **LokasiKantor**: Daftar koordinat kantor/cabang.
- **Tugas & LaporanKerja**: Manajemen operasional harian.
- **Pengaturan**: Konfigurasi global aplikasi.

## 5. Integrasi & Keamanan
- **Google Drive API**: Foto selfie dan dokumen disimpan secara otomatis di folder Drive khusus.
- **Lock Service**: Mencegah tabrakan data (race condition) saat banyak pengguna absen bersamaan.
- **Environment Variables**: Mengamankan URL API dan kunci sensitif lainnya.

---
*Blueprint ini mencerminkan status aplikasi per 12 Maret 2026.*
