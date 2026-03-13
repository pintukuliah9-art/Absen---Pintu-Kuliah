# Dokumentasi Database (Pintu Kuliah) - Versi Indonesia

Dokumen ini berisi daftar tabel dan kolom yang dibutuhkan untuk aplikasi Pintu Kuliah. Backend menggunakan **Google Sheets** yang diakses lewat Google Apps Script.

## 1. Tabel: `Karyawan` (Data Karyawan)
Menyimpan data diri dan login karyawan.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik karyawan (otomatis). |
| `id_karyawan` | TEXT | Nomor Induk Karyawan (NIK). |
| `nama` | TEXT | Nama lengkap karyawan. |
| `username` | TEXT | Username untuk login. |
| `email` | TEXT | Email karyawan. |
| `peran` | TEXT | Hak akses: `employee`, `admin`, `manager`, `hr`, `superadmin`. |
| `jabatan` | TEXT | Nama jabatan (teks bebas). |
| `id_jabatan` | TEXT | ID dari tabel `Jabatan`. |
| `id_departemen` | TEXT | ID dari tabel `Departemen`. |
| `telepon` | TEXT | Nomor HP / WhatsApp. |
| `tgl_bergabung` | DATE | Tanggal masuk kerja (YYYY-MM-DD). |
| `kuota_cuti` | NUMBER | Sisa jatah cuti tahunan. |
| `status_aktif` | BOOLEAN | `TRUE` jika aktif, `FALSE` jika sudah keluar. |
| `url_avatar` | TEXT | Link foto profil. |
| `tempat_lahir` | TEXT | Tempat lahir. |
| `tgl_lahir` | DATE | Tanggal lahir. |
| `gender` | TEXT | `L` (Laki-laki) atau `P` (Perempuan). |
| `alamat` | TEXT | Alamat tinggal. |
| `dok_ktp` | TEXT | File KTP (Link Drive). |
| `dok_kk` | TEXT | File KK (Link Drive). |
| `dok_ijazah` | TEXT | File Ijazah (Link Drive). |
| `mode_login` | TEXT | `username` atau `email`. |

---

## 2. Tabel: `Absensi` (Data Absensi)
Menyimpan riwayat absen harian.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik absensi. |
| `id_user` | TEXT | ID karyawan. |
| `tanggal` | DATE | Tanggal absen (YYYY-MM-DD). |
| `jam_masuk` | TIME | Jam masuk. |
| `jam_keluar` | TIME | Jam pulang. |
| `status` | TEXT | Status: `Hadir`, `Terlambat`, `Alpha`, `Cuti`, `Sakit`. |
| `kerja_online` | BOOLEAN | `TRUE` jika WFH/Remote. |
| `url_foto` | TEXT | Link foto selfie saat absen. |
| `lat_masuk` | NUMBER | Koordinat Latitude saat masuk. |
| `lng_masuk` | NUMBER | Koordinat Longitude saat masuk. |
| `lat_keluar` | NUMBER | Koordinat Latitude saat pulang. |
| `lng_keluar` | NUMBER | Koordinat Longitude saat pulang. |
| `id_kantor` | TEXT | ID Kantor tempat absen. |
| `nama_kantor` | TEXT | Nama Kantor tempat absen. |
| `catatan` | TEXT | Catatan tambahan. |
| `location_logs` | JSON | Data jejak lokasi. |

---

## 3. Tabel: `Pengajuan` (Izin/Cuti)
Menyimpan data pengajuan dari karyawan.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik pengajuan. |
| `id_user` | TEXT | ID karyawan. |
| `tipe` | TEXT | Jenis: `Cuti`, `Izin`, `Lembur`. |
| `tgl_mulai` | DATE | Tanggal mulai. |
| `tgl_selesai` | DATE | Tanggal selesai. |
| `alasan` | TEXT | Alasan pengajuan. |
| `alasan_ai` | TEXT | Alasan yang sudah diperbaiki AI. |
| `status` | TEXT | Status: `Pending`, `Disetujui`, `Ditolak`. |
| `id_tipe_cuti` | TEXT | ID jenis cuti. |
| `url_lampiran` | TEXT | Link file lampiran. |

---

## 4. Tabel: `Jabatan` (Job Roles)
Daftar jabatan dan tugasnya. Menggunakan format **1 Tugas 1 Kolom** untuk memudahkan edit manual.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik jabatan. |
| `judul` | TEXT | Nama Jabatan (misal: Staff IT). |
| `level` | TEXT | Level (Staff, Supervisor, Manager). |
| `tugas_1` | TEXT | Tanggung jawab utama ke-1. |
| `tugas_2` | TEXT | Tanggung jawab utama ke-2. |
| ... | ... | ... |
| `tugas_20` | TEXT | Tanggung jawab utama ke-20. |
| `mode_login` | TEXT | Default login mode untuk jabatan ini. |

---

## 5. Tabel: `Shift` (Jadwal Kerja)
Pengaturan jam kerja.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik shift. |
| `nama` | TEXT | Nama Shift. |
| `jam_masuk` | TIME | Jam masuk. |
| `jam_selesai` | TIME | Jam pulang. |
| `mulai_istirahat` | TIME | Jam mulai istirahat. |
| `selesai_istirahat` | TIME | Jam selesai istirahat. |
| `mulai_lembur` | TIME | Jam mulai hitung lembur. |
| `fleksibel` | BOOLEAN | `TRUE` jika jam bebas. |
| `hari_kerja` | JSON | Hari kerja (0-6). |
| `id_user_ditugaskan` | JSON | Daftar ID karyawan. |

---

## 6. Tabel: `Departemen` (Divisi)
Daftar divisi perusahaan.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik divisi. |
| `nama` | TEXT | Nama Divisi. |
| `id_manajer` | TEXT | ID karyawan manajer. |
| `deskripsi` | TEXT | Deskripsi divisi. |

---

## 7. Tabel: `JenisCuti` (Leave Types)
Aturan jenis-jenis cuti.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `id` | TEXT | ID unik jenis cuti. |
| `nama` | TEXT | Nama cuti. |
| `kuota_per_tahun` | NUMBER | Jatah hari. |
| `berbayar` | BOOLEAN | `TRUE` jika digaji. |
| `butuh_file` | BOOLEAN | `TRUE` jika wajib upload lampiran. |

---

## 8. Tabel: `Pengaturan` (Settings)
Konfigurasi kantor.

| Nama Kolom | Tipe Data | Penjelasan |
| :--- | :--- | :--- |
| `kunci` | TEXT | Nama pengaturan (e.g., `nama_kantor`). |
| `nilai` | TEXT | Nilai pengaturan. |

---

### Cara Pakai di Google Sheets

1.  Buka Spreadsheet Anda.
2.  Ganti nama Tab (Sheet) sesuai nama tabel di atas (contoh: `Karyawan`, `Absensi`).
3.  Isi **Baris Pertama** dengan **Nama Kolom** persis seperti di tabel.
4.  Gunakan warna background **Orange (#E67E22)** untuk header agar terlihat premium.
