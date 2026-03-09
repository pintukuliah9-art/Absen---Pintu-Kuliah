# Skema Database Pintu Kuliah (Google Spreadsheet)

Dokumen ini menjelaskan struktur tabel (Sheet) yang akan dibuat secara otomatis oleh skript Google Apps Script.

## 1. Karyawan (Users)
Menyimpan data profil karyawan.
- **id**: ID Unik (UUID)
- **name**: Nama Lengkap
- **email**: Email
- **username**: Username Login
- **employee_id**: NIP / ID Karyawan
- **password**: Password (Plaintext/Hashed tergantung implementasi)
- **role**: Peran (admin, employee, manager, hr, superadmin)
- **job_role_id**: ID Jabatan (Relasi ke Sheet Jabatan)
- **department_id**: ID Departemen (Relasi ke Sheet Departemen)
- **phone**: Nomor Telepon
- **join_date**: Tanggal Bergabung
- **leave_quota**: Sisa Cuti Tahunan
- **is_active**: Status Aktif (TRUE/FALSE)
- **avatar_url**: URL Foto Profil
- **birth_place**: Tempat Lahir
- **birth_date**: Tanggal Lahir
- **gender**: Jenis Kelamin (L/P)
- **address**: Alamat Lengkap
- **doc_ktp**: URL/Base64 Dokumen KTP
- **doc_kk**: URL/Base64 Dokumen KK
- **doc_ijazah**: URL/Base64 Dokumen Ijazah

## 2. Absensi (Attendance)
Menyimpan riwayat kehadiran harian.
- **id**: ID Unik
- **user_id**: ID Karyawan
- **date**: Tanggal (YYYY-MM-DD)
- **check_in_time**: Jam Masuk (HH:mm)
- **check_out_time**: Jam Keluar (HH:mm)
- **status**: Status (Hadir, Terlambat, Alpha, Cuti, Sakit, Libur)
- **is_online_work**: Apakah WFH/Remote? (TRUE/FALSE)
- **photo_url**: Bukti Foto Selfie
- **notes**: Catatan Tambahan
- **lat_in**: Latitude Masuk
- **lng_in**: Longitude Masuk
- **lat_out**: Latitude Keluar
- **lng_out**: Longitude Keluar
- **office_id**: ID Kantor Lokasi Check-in
- **office_name**: Nama Kantor Lokasi Check-in

## 3. Pengajuan (Requests)
Menyimpan data pengajuan izin, cuti, atau lembur.
- **id**: ID Unik
- **user_id**: ID Karyawan
- **type**: Tipe (Cuti, Izin, Lembur)
- **start_date**: Tanggal Mulai
- **end_date**: Tanggal Selesai
- **reason**: Alasan Pengajuan
- **ai_enhanced_reason**: Alasan yang diperbaiki AI
- **status**: Status (Pending, Disetujui, Ditolak)
- **leave_type_id**: ID Tipe Cuti (Relasi ke Sheet TipeCuti)
- **attachment_url**: Bukti Lampiran (Surat Dokter, dll)

## 4. Tugas (Tasks)
Menyimpan daftar tugas yang diberikan admin.
- **id**: ID Unik
- **title**: Judul Tugas
- **description**: Deskripsi Detail
- **category**: Kategori (Harian, Tambahan)
- **assigned_user_ids**: JSON Array ID Karyawan yang ditugaskan
- **assigned_role_ids**: JSON Array ID Jabatan yang ditugaskan
- **assigned_department_ids**: JSON Array ID Departemen yang ditugaskan
- **is_active**: Status Aktif Tugas
- **created_at**: Tanggal Dibuat
- **created_by**: ID Pembuat Tugas

## 5. LaporanKerja (WorkReports)
Menyimpan laporan progres tugas dari karyawan.
- **id**: ID Unik
- **user_id**: ID Karyawan
- **task_id**: ID Tugas
- **date**: Tanggal Laporan
- **status**: Status Pengerjaan (Belum Selesai, Selesai)
- **notes**: Catatan Pengerjaan
- **proof_url**: Bukti Foto Hasil Kerja
- **submitted_at**: Waktu Submit

## 6. Pengaturan (Settings)
Menyimpan konfigurasi global aplikasi.
- **key**: Nama Pengaturan (misal: office_name, api_url)
- **value**: Nilai Pengaturan (Bisa berupa string atau JSON)

## 7. Shift
Konfigurasi jadwal kerja.
- **id**: ID Shift
- **name**: Nama Shift (Pagi, Siang, Malam)
- **start_time**: Jam Masuk
- **end_time**: Jam Pulang
- **break_start**: Jam Istirahat Mulai
- **break_end**: Jam Istirahat Selesai
- **overtime_start**: Jam Mulai Hitung Lembur
- **is_flexible**: Jam Kerja Fleksibel?
- **work_days**: JSON Array Hari Kerja (0=Minggu, 1=Senin, dst)
- **assigned_user_ids**: JSON Array Karyawan yang mendapat shift ini

## 8. Jabatan (JobRoles)
Daftar jabatan dalam perusahaan.
- **id**: ID Jabatan
- **title**: Nama Jabatan
- **level**: Level (Junior, Senior, Manager)
- **core_responsibilities**: JSON Array Tanggung Jawab Utama
- **login_mode**: Mode Login (username, employee_id)

## 9. Departemen (Departments)
Daftar departemen/divisi.
- **id**: ID Departemen
- **name**: Nama Departemen
- **manager_id**: ID Manager Departemen

## 10. TipeCuti (LeaveTypes)
Jenis-jenis cuti yang tersedia.
- **id**: ID Tipe
- **name**: Nama Cuti
- **quota_per_year**: Jatah Per Tahun
- **is_paid**: Dibayar?
- **requires_file**: Wajib Lampiran?

## 11. LokasiKantor (Offices)
Daftar lokasi kantor untuk geofencing.
- **id**: ID Kantor
- **name**: Nama Kantor
- **lat**: Latitude
- **lng**: Longitude
- **radius**: Radius Toleransi (KM)
