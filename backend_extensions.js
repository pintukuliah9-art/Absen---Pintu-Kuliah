/**
 * PINTU KULIAH BACKEND EXTENSIONS - VERSI 1.0.0
 * 
 * File ini berisi fungsi tambahan untuk mendukung fitur organisasi,
 * izin peran dinamis, dan fitur lanjutan lainnya.
 */

/**
 * Inisialisasi tabel tambahan yang belum ada di core backend.
 */
function setupExtendedDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var extendedSchema = [
    { n: 'departments', c: ['id', 'nama', 'id_manajer', 'deskripsi'] },
    { n: 'role_permissions', c: ['peran', 'modul_diizinkan'] },
    { n: 'leave_balances', c: ['id', 'user_id', 'leave_type_id', 'year', 'remaining_balance'] },
    { n: 'holidays', c: ['id', 'date', 'name', 'is_recurring', 'type'] },
    { n: 'notifications', c: ['id', 'user_id', 'title', 'message', 'is_read', 'created_at'] },
    { n: 'audit_logs', c: ['id', 'actor_id', 'action', 'target_table', 'target_id', 'details', 'timestamp', 'ip_address'] },
    { n: 'overtime_rules', c: ['id', 'name', 'multiplier', 'min_hours'] },
    { n: 'contracts', c: ['id', 'user_id', 'start_date', 'end_date', 'status', 'type'] },
    { n: 'assets', c: ['id', 'user_id', 'item_name', 'serial_number', 'handed_over_date', 'condition'] },
    { n: 'announcements', c: ['id', 'title', 'content', 'target_dept', 'created_at', 'is_active'] }
  ];

  extendedSchema.forEach(function(s) {
    var sheet = ss.getSheetByName(s.n) || ss.insertSheet(s.n);
    var headers = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    s.c.forEach(function(col) {
      if (headers.indexOf(col) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col).setBackground('#34A853').setFontColor('#FFFFFF').setFontWeight('bold');
      }
    });
    sheet.setFrozenRows(1);
  });
  
  // Tambahkan kolom yang mungkin hilang di tabel utama
  ensureColumnExists('Karyawan', 'mode_login');
  ensureColumnExists('Absensi', 'location_logs');
}

/**
 * Memastikan kolom tertentu ada di sebuah sheet.
 */
function ensureColumnExists(sheetName, columnName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf(columnName) === -1) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(columnName).setBackground('#FBBC05').setFontColor('#000000').setFontWeight('bold');
  }
}

/**
 * Handler untuk mendapatkan data dari tabel-tabel tambahan.
 */
function handleGetExtendedData() {
  var tables = [
    {k: 'departments', n: ['departments', 'Departemen']},
    {k: 'role_permissions', n: ['role_permissions', 'IzinPeran']},
    {k: 'leave_balances', n: ['leave_balances', 'SaldoCuti']},
    {k: 'holidays', n: ['holidays', 'HariLibur']},
    {k: 'notifications', n: ['notifications', 'Notifikasi']},
    {k: 'audit_logs', n: ['audit_logs', 'AuditLog']},
    {k: 'overtime_rules', n: ['overtime_rules', 'AturanLembur']},
    {k: 'contracts', n: ['contracts', 'Kontrak']},
    {k: 'assets', n: ['assets', 'Aset']},
    {k: 'announcements', n: ['announcements', 'Pengumuman']}
  ];
  
  var result = {};
  tables.forEach(function(t) {
    var sheet = getSheetFlexible(t.k);
    if (!sheet || sheet.getLastRow() <= 1) { result[t.k] = []; return; }
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    result[t.k] = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { if(h) obj[h] = row[i]; });
      return obj;
    });
  });
  
  return result;
}

/**
 * Fungsi untuk mencatat audit log.
 */
function logAudit(actorId, action, table, targetId, details) {
  try {
    var payload = {
      id: "LOG-" + Date.now(),
      actor_id: actorId,
      action: action,
      target_table: table,
      target_id: targetId,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      timestamp: new Date().toISOString()
    };
    handleUpsert("audit_logs", payload);
  } catch (e) {
    console.error("Gagal mencatat audit log: " + e.toString());
  }
}
