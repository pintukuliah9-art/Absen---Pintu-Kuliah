# Dokumentasi Database (Pintu Kuliah)

Dokumen ini berisi daftar tabel dan kolom yang dibutuhkan untuk aplikasi Pintu Kuliah. Backend menggunakan **Google Sheets** yang diakses lewat Google Apps Script.

## 1. Tabel: `users` (Data Karyawan)
Menyimpan data diri dan login karyawan.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik karyawan (otomatis). |
| `name` | TEXT | Nama lengkap karyawan. |
| `email` | TEXT | Email untuk login. |
| `role` | TEXT | Hak akses: `employee` (karyawan), `admin`, `manager`, `hr`. |
| `job_role_id` | TEXT | ID dari tabel `job_roles` (Jabatan). |
| `department_id` | TEXT | ID dari tabel `departments` (Divisi). |
| `position` | TEXT | Nama jabatan (teks biasa, opsional). |
| `phone` | TEXT | Nomor HP / WhatsApp. |
| `join_date` | DATE | Tanggal masuk kerja (YYYY-MM-DD). |
| `leave_quota` | NUMBER | Sisa jatah cuti tahunan. |
| `is_active` | BOOLEAN | `TRUE` jika aktif, `FALSE` jika sudah keluar. |
| `avatar_url` | TEXT | Link foto profil. |
| `birth_place` | TEXT | Tempat lahir. |
| `birth_date` | DATE | Tanggal lahir. |
| `gender` | TEXT | `L` (Laki-laki) atau `P` (Perempuan). |
| `address` | TEXT | Alamat tinggal. |
| `doc_ktp` | TEXT | File KTP (Base64/Link). |
| `doc_kk` | TEXT | File KK (Base64/Link). |
| `doc_ijazah` | TEXT | File Ijazah (Base64/Link). |

---

## 2. Tabel: `attendance` (Data Absensi)
Menyimpan riwayat absen harian.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik absensi. |
| `user_id` | TEXT | ID karyawan (dari tabel `users`). |
| `date` | DATE | Tanggal absen (YYYY-MM-DD). |
| `check_in_time` | TIME | Jam masuk (contoh: 08:00). |
| `check_out_time` | TIME | Jam pulang (contoh: 17:00). |
| `status` | TEXT | Status: `Hadir`, `Terlambat`, `Alpha`, `Cuti`, `Sakit`. |
| `is_online_work` | BOOLEAN | `TRUE` jika WFH/Remote. |
| `photo_url` | TEXT | Link foto selfie saat absen. |
| `lat_in` | NUMBER | Koordinat Latitude saat masuk. |
| `lng_in` | NUMBER | Koordinat Longitude saat masuk. |
| `lat_out` | NUMBER | Koordinat Latitude saat pulang. |
| `lng_out` | NUMBER | Koordinat Longitude saat pulang. |
| `office_id` | TEXT | ID Kantor tempat absen. |
| `office_name` | TEXT | Nama Kantor tempat absen. |
| `notes` | TEXT | Catatan tambahan. |
| `location_logs` | JSON | Data jejak lokasi (disimpan sebagai teks JSON). |

---

## 3. Tabel: `requests` (Pengajuan Izin/Cuti)
Menyimpan data pengajuan dari karyawan.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik pengajuan. |
| `user_id` | TEXT | ID karyawan. |
| `type` | TEXT | Jenis: `Cuti`, `Izin`, `Lembur`. |
| `start_date` | DATE | Tanggal mulai. |
| `end_date` | DATE | Tanggal selesai. |
| `reason` | TEXT | Alasan pengajuan. |
| `ai_enhanced_reason` | TEXT | Alasan yang sudah diperbaiki AI (opsional). |
| `status` | TEXT | Status: `Pending`, `Disetujui`, `Ditolak`. |
| `leave_type_id` | TEXT | ID jenis cuti (jika tipe-nya Cuti). |

---

## 4. Tabel: `job_roles` (Jabatan)
Daftar jabatan dan tugasnya.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik jabatan. |
| `title` | TEXT | Nama Jabatan (misal: Staff IT). |
| `level` | TEXT | Level (Staff, Supervisor, Manager). |
| `core_responsibilities` | JSON | Daftar tugas utama (disimpan sebagai JSON). |

---

## 5. Tabel: `shifts` (Jadwal Kerja)
Pengaturan jam kerja.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik shift. |
| `name` | TEXT | Nama Shift (misal: Shift Pagi). |
| `start_time` | TIME | Jam masuk. |
| `end_time` | TIME | Jam pulang. |
| `break_start` | TIME | Jam mulai istirahat. |
| `break_end` | TIME | Jam selesai istirahat. |
| `overtime_start` | TIME | Jam mulai hitung lembur. |
| `is_flexible` | BOOLEAN | `TRUE` jika jam bebas/remote. |
| `work_days` | JSON | Hari kerja (0=Minggu, 1=Senin, dst). |
| `assigned_user_ids` | JSON | Daftar ID karyawan yang kena shift ini. |

---

## 6. Tabel: `departments` (Divisi)
Daftar divisi perusahaan.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik divisi. |
| `name` | TEXT | Nama Divisi (misal: HRD, Marketing). |
| `manager_id` | TEXT | ID karyawan yang jadi kepala divisi. |

---

## 7. Tabel: `leave_types` (Jenis Cuti)
Aturan jenis-jenis cuti.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik jenis cuti. |
| `name` | TEXT | Nama (misal: Cuti Tahunan, Melahirkan). |
| `quota` | NUMBER | Jatah hari per tahun. |
| `is_paid` | BOOLEAN | `TRUE` jika digaji, `FALSE` jika potong gaji. |
| `requires_file` | BOOLEAN | `TRUE` jika wajib upload surat (misal: surat dokter). |

---

## 8. Tabel: `settings` (Pengaturan)
Konfigurasi kantor (biasanya cuma 1 baris).

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `office_name` | TEXT | Nama kantor. |
| `office_lat` | NUMBER | Koordinat Latitude kantor. |
| `office_lng` | NUMBER | Koordinat Longitude kantor. |
| `office_radius_km` | NUMBER | Jarak toleransi absen (dalam KM). |

---

### Cara Pakai di Google Sheets

1.  Buat **Sheet Baru** di Google Spreadsheet.
2.  Ganti nama Tab (Sheet) sesuai nama tabel di atas (contoh: `users`, `attendance`).
3.  Isi **Baris Pertama** dengan **Nama Kolom** persis seperti di tabel (huruf kecil semua, pakai underscore `_`).
4.  Jangan ubah nama kolom sembarangan karena aplikasi akan error.
