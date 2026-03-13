/**
 * @fileoverview Script untuk inisialisasi dan update struktur database Google Sheets.
 * Jalankan fungsi 'setupDatabase' untuk memulai.
 * Spreadsheet ID: 1c4_albuIverQaUcXQBeU4n0AYcKs20kkaQQ1JiLkLRE
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("Error: Script tidak terhubung dengan Spreadsheet. Pastikan Anda membuka script dari dalam Google Sheets.");
    return;
  }
  
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

  for (let tableName in tables) {
    try {
      let sheet = ss.getSheetByName(tableName);
      const headers = tables[tableName];

      if (!sheet) {
        sheet = ss.insertSheet(tableName);
        // Set headers
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        Logger.log(`Tabel '${tableName}' berhasil dibuat.`);
      } else {
        // Sinkronisasi Kolom (Tambah jika ada yang kurang)
        const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
        const missingHeaders = headers.filter(h => !currentHeaders.includes(h));
        
        if (missingHeaders.length > 0) {
          const startCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
          Logger.log(`Tabel '${tableName}': Menambahkan kolom baru: ${missingHeaders.join(", ")}`);
        }
      }

      // Format Header (Bold, Frozen, Orange)
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#E67E22")
        .setFontColor("#FFFFFF")
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
      
    } catch (e) {
      Logger.log(`Gagal memproses tabel '${tableName}': ${e.message}`);
    }
  }
  
  // --- SEED SUPER ADMIN ---
  seedSuperAdmin(ss);

  Logger.log('Database Setup Selesai!');
}

function seedSuperAdmin(ss) {
  const userSheet = ss.getSheetByName('users');
  if (!userSheet) return;

  const data = userSheet.getDataRange().getValues();
  const headers = data[0];
  const usernameIdx = headers.indexOf('username');
  
  let adminExists = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameIdx] === 'superadmin') {
      adminExists = true;
      break;
    }
  }

  if (!adminExists) {
    const adminData = {
      'id': 'admin-001',
      'nama': 'Super Admin',
      'username': 'superadmin',
      'email': 'admin@pintukuliah.com',
      'id_karyawan': 'ADM-001',
      'peran': 'superadmin',
      'jabatan': 'Administrator',
      'status_aktif': true,
      'tgl_bergabung': new Date().toISOString().split('T')[0],
      'kuota_cuti': 12,
      'url_avatar': 'https://ui-avatars.com/api/?name=Super+Admin&background=random',
      'mode_login': 'username'
    };

    const row = headers.map(h => adminData[h] || "");
    userSheet.appendRow(row);
    Logger.log("Super Admin berhasil ditambahkan ke tabel users.");
  }
}
