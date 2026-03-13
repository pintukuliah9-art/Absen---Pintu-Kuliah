/**
 * SCRIPT SETUP DATABASE OTOMATIS
 * 
 * Salin kode ini ke dalam editor Google Apps Script Anda (Extensions > Apps Script).
 * Jalankan fungsi 'setupDatabase' sekali untuk membuat semua sheet (tabel) yang belum ada.
 * Script ini AMAN dijalankan berulang kali (tidak akan menghapus data yang sudah ada).
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Definisi Tabel dan Kolom (Header) - Menggunakan Bahasa Indonesia
  const tables = {
    'Karyawan': ['id', 'id_karyawan', 'nama', 'username', 'peran', 'jabatan', 'id_jabatan', 'id_departemen', 'telepon', 'tgl_bergabung', 'kuota_cuti', 'status_aktif', 'url_avatar', 'tempat_lahir', 'tgl_lahir', 'gender', 'alamat', 'dok_ktp', 'dok_kk', 'dok_ijazah', 'mode_login'],
    'Absensi': ['id', 'id_user', 'tanggal', 'jam_masuk', 'jam_keluar', 'status', 'kerja_online', 'url_foto', 'lat_masuk', 'lng_masuk', 'lat_keluar', 'lng_keluar', 'id_kantor', 'nama_kantor', 'catatan', 'location_logs'],
    'Pengajuan': ['id', 'id_user', 'tipe', 'tgl_mulai', 'tgl_selesai', 'alasan', 'alasan_ai', 'status', 'id_tipe_cuti', 'url_lampiran'],
    'Tugas': ['id', 'judul', 'deskripsi', 'kategori', 'id_user_ditugaskan', 'id_peran_ditugaskan', 'id_dept_ditugaskan', 'aktif', 'dibuat_pada', 'dibuat_oleh'],
    'LaporanKerja': ['id', 'tanggal', 'id_user', 'id_tugas', 'status', 'catatan', 'url_bukti', 'dikirim_pada'],
    'Pengaturan': ['kunci', 'nilai'],
    'LokasiKantor': ['id', 'nama', 'lat', 'lng', 'radius'],
    'Shift': ['id', 'nama', 'jam_masuk', 'jam_selesai', 'mulai_istirahat', 'selesai_istirahat', 'mulai_lembur', 'fleksibel', 'hari_kerja', 'id_user_ditugaskan'],
    'Jabatan': ['id', 'judul', 'level', 'tugas_1', 'tugas_2', 'tugas_3', 'tugas_4', 'tugas_5', 'tugas_6', 'tugas_7', 'tugas_8', 'tugas_9', 'tugas_10', 'tugas_11', 'tugas_12', 'tugas_13', 'tugas_14', 'tugas_15', 'tugas_16', 'tugas_17', 'tugas_18', 'tugas_19', 'tugas_20', 'mode_login'],
    'JenisCuti': ['id', 'nama', 'kuota_per_tahun', 'berbayar', 'butuh_file'],
    'Departemen': ['id', 'nama', 'id_manajer', 'deskripsi'],
    'IzinPeran': ['peran', 'modul_diizinkan']
  };

  // Loop setiap definisi tabel
  for (let tableName in tables) {
    let sheet = ss.getSheetByName(tableName);
    const headers = tables[tableName];

    // 1. Jika Sheet belum ada, buat baru
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      console.log(`[INFO] Membuat Sheet baru: ${tableName}`);
      
      // Tambahkan Header
      sheet.appendRow(headers);
      
      // Format Header (Bold, Frozen, Orange)
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E67E22").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    } 
    // 2. Jika Sheet sudah ada, cek apakah kolomnya lengkap
    else {
      console.log(`[INFO] Sheet '${tableName}' sudah ada. Mengecek kolom...`);
      
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
      const missingHeaders = headers.filter(h => !currentHeaders.includes(h));

      if (missingHeaders.length > 0) {
        // Tambahkan kolom yang kurang di sebelah kanan
        const startCol = currentHeaders.length + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]).setFontWeight("bold").setBackground("#E67E22").setFontColor("#FFFFFF");
        console.log(`[UPDATE] Menambahkan kolom ke '${tableName}': ${missingHeaders.join(', ')}`);
      }
    }
  }

  console.log("--- SELESAI: Database telah diperbarui ---");
}

/**
 * CARA PENGGUNAAN:
 * 1. Buka Spreadsheet Anda.
 * 2. Klik menu Extensions > Apps Script.
 * 3. Buat file script baru (misal: 'Setup.gs') atau tempel di paling bawah file yang ada.
 * 4. Paste kode di atas.
 * 5. Pilih fungsi 'setupDatabase' di toolbar atas.
 * 6. Klik 'Run'.
 * 7. Berikan izin (Review Permissions) jika diminta.
 */
