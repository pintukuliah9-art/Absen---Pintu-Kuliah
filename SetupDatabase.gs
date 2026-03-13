/**
 * @fileoverview Script untuk inisialisasi dan update struktur database Google Sheets.
 * Jalankan fungsi 'setupDatabase' untuk memulai.
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("Error: Script tidak terhubung dengan Spreadsheet.");
    return;
  }
  
  const tables = {
    'users': ['id', 'id_karyawan', 'nama', 'username', 'peran', 'jabatan', 'id_jabatan', 'id_departemen', 'aktif', 'tanggal_bergabung', 'kuota_cuti', 'password', 'email', 'telepon', 'url_avatar', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'dok_ktp', 'dok_kk', 'dok_ijazah', 'mode_login'],
    'attendance': ['id', 'tanggal', 'id_user', 'jam_masuk', 'jam_keluar', 'status', 'nama_kantor', 'url_foto', 'lat_masuk', 'lng_masuk', 'lat_keluar', 'lng_keluar', 'catatan', 'kerja_online', 'id_kantor', 'location_logs'],
    'tasks': ['id', 'judul', 'deskripsi', 'kategori', 'id_user_ditugaskan', 'id_peran_ditugaskan', 'id_departemen_ditugaskan', 'aktif', 'dibuat_pada', 'dibuat_oleh'],
    'work_reports': ['id', 'tanggal', 'id_user', 'id_tugas', 'status', 'catatan', 'url_bukti', 'dikirim_pada'],
    'requests': ['id', 'id_user', 'tipe', 'tanggal_mulai', 'tanggal_selesai', 'alasan', 'alasan_ai', 'status', 'url_lampiran', 'id_tipe_cuti'],
    'settings': ['kunci', 'nilai'],
    'job_roles': ['id', 'judul', 'level', 'tanggung_jawab_inti', 'mode_login'],
    'shifts': ['id', 'nama', 'jam_masuk', 'jam_selesai', 'mulai_istirahat', 'selesai_istirahat', 'mulai_lembur', 'fleksibel', 'hari_kerja', 'id_user_ditugaskan'],
    'branches': ['id', 'nama', 'lat', 'lng', 'radius'],
    'leave_types': ['id', 'nama', 'kuota_per_tahun', 'berbayar', 'butuh_file'],
    'departments': ['id', 'nama', 'id_manajer', 'deskripsi'],
    'role_permissions': ['peran', 'modul_diizinkan'],
    'leave_balances': ['id', 'user_id', 'leave_type_id', 'year', 'remaining_balance'],
    'holidays': ['id', 'date', 'name', 'is_recurring', 'type'],
    'notifications': ['id', 'user_id', 'title', 'message', 'is_read', 'created_at'],
    'audit_logs': ['id', 'actor_id', 'action', 'target_table', 'target_id', 'details', 'timestamp', 'ip_address'],
    'overtime_rules': ['id', 'name', 'multiplier', 'min_hours'],
    'contracts': ['id', 'user_id', 'start_date', 'end_date', 'status', 'type'],
    'assets': ['id', 'user_id', 'item_name', 'serial_number', 'handed_over_date', 'condition'],
    'announcements': ['id', 'title', 'content', 'target_dept', 'created_at', 'is_active']
  };

  for (let tableName in tables) {
    try {
      let sheet = ss.getSheetByName(tableName);
      const headers = tables[tableName];

      if (!sheet) {
        sheet = ss.insertSheet(tableName);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else {
        const lastCol = Math.max(1, sheet.getLastColumn());
        const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const missingHeaders = headers.filter(h => !currentHeaders.includes(h));
        
        if (missingHeaders.length > 0) {
          const startCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        }
      }

      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f3f3f3")
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
      sheet.setHideGridlines(true);
      
    } catch (e) {
      Logger.log(`Gagal memproses tabel '${tableName}': ${e.message}`);
    }
  }
  
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
    Logger.log("Super Admin berhasil ditambahkan.");
  }
}
