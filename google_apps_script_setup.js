/**
 * SCRIPT SETUP DATABASE OTOMATIS
 * 
 * Salin kode ini ke dalam editor Google Apps Script Anda (Extensions > Apps Script).
 * Jalankan fungsi 'setupDatabase' sekali untuk membuat semua sheet (tabel) yang belum ada.
 * Script ini AMAN dijalankan berulang kali (tidak akan menghapus data yang sudah ada).
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Definisi Tabel dan Kolom (Header)
  const tables = {
    // --- Tabel Utama (Sudah ada, tapi dicek lagi) ---
    'users': ['id', 'name', 'email', 'username', 'role', 'position', 'job_role_id', 'department_id', 'phone', 'join_date', 'leave_quota', 'is_active', 'avatar_url', 'birth_place', 'birth_date', 'gender', 'address', 'doc_ktp', 'doc_kk', 'doc_ijazah', 'login_mode'],
    'job_roles': ['id', 'title', 'level', 'core_responsibilities'],
    'shifts': ['id', 'name', 'start_time', 'end_time', 'break_start', 'break_end', 'overtime_start', 'is_flexible', 'work_days', 'assigned_user_ids'],
    'attendance': ['id', 'user_id', 'date', 'check_in_time', 'check_out_time', 'status', 'is_online_work', 'lat_in', 'lng_in', 'lat_out', 'lng_out', 'office_id', 'office_name', 'photo_url', 'notes'],
    'requests': ['id', 'user_id', 'type', 'start_date', 'end_date', 'reason', 'ai_enhanced_reason', 'status', 'leave_type_id', 'attachment_url'],
    'settings': ['office_name', 'office_lat', 'office_lng', 'office_radius_km', 'grace_period_minutes', 'api_url'],

    // --- Tabel Tambahan (Baru) ---
    
    // A. Organisasi & Lokasi
    'departments': ['id', 'name', 'manager_id', 'description'],
    'branches': ['id', 'name', 'address', 'latitude', 'longitude', 'radius_km', 'timezone'],

    // B. Cuti & Izin Lanjutan
    'leave_types': ['id', 'name', 'quota_per_year', 'is_paid', 'requires_file'],
    'leave_balances': ['id', 'user_id', 'leave_type_id', 'year', 'remaining_balance'],

    // C. Waktu & Lembur
    'holidays': ['id', 'date', 'name', 'is_recurring', 'type'],
    'overtime_rules': ['id', 'name', 'multiplier', 'min_hours'],

    // D. Kepegawaian
    'contracts': ['id', 'user_id', 'start_date', 'end_date', 'status', 'type'],
    'assets': ['id', 'user_id', 'item_name', 'serial_number', 'handed_over_date', 'condition'],

    // E. Fitur Pendukung
    'announcements': ['id', 'title', 'content', 'target_dept', 'created_at', 'is_active'],
    'audit_logs': ['id', 'actor_id', 'action', 'target_table', 'target_id', 'details', 'timestamp', 'ip_address'],
    'notifications': ['id', 'user_id', 'title', 'message', 'is_read', 'created_at']
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
      
      // Format Header (Bold, Frozen)
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
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
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]).setFontWeight("bold");
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
