/**
 * PINTU KULIAH BACKEND - VERSI 4.0.0
 * 
 * Fitur:
 * 1. Format ID Karyawan: user-<timestamp>
 * 2. Penanganan Sheet Fleksibel (Indonesia/Inggris)
 * 3. Sinkronisasi Pengaturan & Data Master
 */

// --- FUNGSI GLOBAL ---

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success', 
    version: '4.0.0',
    message: 'Pintu Kuliah API v4.0.0 Online'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    if (!e.postData || !e.postData.contents) throw new Error("Data tidak diterima");
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var payload = data.payload || {};
    var result = {};

    switch(action) {
      case 'getAllData': result = handleGetAllData(); break;
      case 'syncUser': result = handleUpsert("Karyawan", payload); break;
      case 'syncAttendance': result = handleUpsert("Absensi", payload); break;
      case 'syncRequest': result = handleUpsert("Pengajuan", payload); break;
      case 'syncTask': result = handleUpsert("Tugas", payload); break;
      case 'syncWorkReport': result = handleUpsert("LaporanKerja", payload); break;
      case 'syncSettings': result = handleSyncSettings(payload); break;
      case 'deleteUser': result = handleDelete("Karyawan", payload.id); break;
      case 'ping': result = { message: "pong" }; break;
      default: throw new Error("Aksi tidak dikenal: " + action);
    }

    var response = { status: 'success', version: '4.0.0' };
    for (var key in result) { response[key] = result[key]; }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * FUNGSI PERBAIKAN: Jalankan ini sekali di editor GAS untuk melengkapi ID dengan format user-<timestamp>
 */
function repairKaryawanIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("users") || ss.getSheetByName("Karyawan");
  if (!sheet) return "Sheet users/Karyawan tidak ditemukan.";
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "Tidak ada data untuk diperbaiki.";
  
  var data = sheet.getDataRange().getValues();
  var idIdx = 0; // Kolom 'id' (wajib kolom pertama)
  
  var changed = false;
  var baseTimestamp = Date.now();
  
  for (var i = 1; i < data.length; i++) {
    // Lengkapi ID Internal dengan format user-<timestamp>
    if (!data[i][idIdx] || String(data[i][idIdx]).trim() === "") {
      // Tambahkan i agar timestamp unik jika diproses dalam waktu yang sangat cepat
      data[i][idIdx] = "user-" + (baseTimestamp + i);
      changed = true;
    }
  }
  
  if (changed) {
    sheet.getDataRange().setValues(data);
    return "Berhasil: Semua kolom ID di sheet Karyawan telah dilengkapi dengan format user-<timestamp>.";
  }
  return "Info: Semua ID sudah lengkap, tidak ada perubahan.";
}

// --- FUNGSI DATABASE CORE ---

function handleGetAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tables = [
    {k: 'users', n: ['users', 'Karyawan']}, 
    {k: 'attendance', n: ['attendance', 'Absensi']},
    {k: 'requests', n: ['requests', 'Pengajuan']}, 
    {k: 'tasks', n: ['tasks', 'Tugas']},
    {k: 'work_reports', n: ['work_reports', 'LaporanKerja']}, 
    {k: 'settings', n: ['settings', 'Pengaturan']},
    {k: 'offices', n: ['branches', 'LokasiKantor', 'offices']}, 
    {k: 'shifts', n: ['shifts', 'Shift']},
    {k: 'job_roles', n: ['job_roles', 'Jabatan']}, 
    {k: 'leave_types', n: ['leave_types', 'JenisCuti']}
  ];
  var result = {};
  tables.forEach(function(t) {
    var sheet = null;
    var names = Array.isArray(t.n) ? t.n : [t.n];
    for (var i = 0; i < names.length; i++) {
      sheet = ss.getSheetByName(names[i]);
      if (sheet) break;
    }
    
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

function getSheetFlexible(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mapping = {
    "Karyawan": ["users", "Karyawan"],
    "Absensi": ["attendance", "Absensi"],
    "Pengajuan": ["requests", "Pengajuan"],
    "Tugas": ["tasks", "Tugas"],
    "LaporanKerja": ["work_reports", "LaporanKerja"],
    "Pengaturan": ["settings", "Pengaturan"],
    "LokasiKantor": ["branches", "LokasiKantor", "offices"],
    "Shift": ["shifts", "Shift"],
    "Jabatan": ["job_roles", "Jabatan"],
    "JenisCuti": ["leave_types", "JenisCuti"]
  };
  
  var names = mapping[name] || [name];
  for (var i = 0; i < names.length; i++) {
    var sheet = ss.getSheetByName(names[i]);
    if (sheet) return sheet;
  }
  return null;
}

function handleUpsert(sheetName, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetFlexible(sheetName);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(sheetName); }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var allData = sheet.getDataRange().getValues();
  
  // Generate ID jika kosong
  if (!data.id) {
    if (sheetName === "Karyawan" || sheetName === "users") {
      data.id = "user-" + Date.now();
    } else {
      data.id = "ID-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  }
  
  var rowIndex = -1;
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(data.id)) { rowIndex = i + 1; break; }
  }
  
  var rowData = headers.map(function(h, colIdx) {
    var camelKey = h.replace(/_([a-z])/g, function(g) { return g[1].toUpperCase(); });
    var val = (data[h] !== undefined) ? data[h] : data[camelKey];
    if (val === undefined && rowIndex > 0) return allData[rowIndex - 1][colIdx];
    return (typeof val === 'object') ? JSON.stringify(val) : (val || "");
  });
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);
  return { message: "Success", id: data.id };
}

function handleDelete(sheetName, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetFlexible(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found" };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { message: "Deleted" }; }
  }
  return { status: "error", message: "Not found" };
}

function handleSyncSettings(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetFlexible("Pengaturan");
  if (sheet) {
    var keys = ['api_url', 'office_name', 'office_lat', 'office_lng', 'office_radius_km', 'grace_period_minutes', 'role_mode'];
    keys.forEach(function(k) {
      if (payload[k] !== undefined) {
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === k) { sheet.getRange(i + 1, 2).setValue(payload[k]); found = true; break; }
        }
        if (!found) sheet.appendRow([k, payload[k]]);
      }
    });
  }
  
  // Sync Arrays
  if (payload.offices && Array.isArray(payload.offices)) syncArrayToSheet("LokasiKantor", payload.offices);
  if (payload.shifts && Array.isArray(payload.shifts)) syncArrayToSheet("Shift", payload.shifts);
  if (payload.jobRoles && Array.isArray(payload.jobRoles)) syncArrayToSheet("Jabatan", payload.jobRoles);

  return { message: "Settings Synced" };
}

function syncArrayToSheet(sheetName, items) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(sheetName); }
  
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) { setupDatabase(); lastCol = sheet.getLastColumn(); }
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Clear existing data (except headers)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).clearContent();
  }
  
  if (items.length === 0) return;
  
  var rows = items.map(function(item) {
    return headers.map(function(h) {
      var camelKey = h.replace(/_([a-z])/g, function(g) { return g[1].toUpperCase(); });
      var val = (item[h] !== undefined) ? item[h] : item[camelKey];
      return (typeof val === 'object') ? JSON.stringify(val) : (val || "");
    });
  });
  
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schema = [
    { n: 'Karyawan', c: ['id', 'id_karyawan', 'nama', 'username', 'peran', 'jabatan', 'id_jabatan', 'id_departemen', 'aktif', 'tanggal_bergabung', 'kuota_cuti', 'password', 'email', 'telepon', 'url_avatar', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'dok_ktp', 'dok_kk', 'dok_ijazah'] },
    { n: 'Absensi', c: ['id', 'tanggal', 'id_user', 'jam_masuk', 'jam_keluar', 'status', 'nama_kantor', 'url_foto', 'lat_masuk', 'lng_masuk', 'lat_keluar', 'lng_keluar', 'catatan', 'kerja_online', 'id_kantor', 'location_logs'] },
    { n: 'Pengajuan', c: ['id', 'id_user', 'tipe', 'tanggal_mulai', 'tanggal_selesai', 'alasan', 'alasan_ai', 'status', 'url_lampiran', 'id_tipe_cuti'] },
    { n: 'Tugas', c: ['id', 'judul', 'deskripsi', 'kategori', 'id_user_ditugaskan', 'id_peran_ditugaskan', 'id_departemen_ditugaskan', 'aktif', 'dibuat_pada', 'dibuat_oleh'] },
    { n: 'LaporanKerja', c: ['id', 'tanggal', 'id_user', 'id_tugas', 'status', 'catatan', 'url_bukti', 'dikirim_pada'] },
    { n: 'Pengaturan', c: ['kunci', 'nilai'] },
    { n: 'LokasiKantor', c: ['id', 'nama', 'lat', 'lng', 'radius'] },
    { n: 'Shift', c: ['id', 'nama', 'jam_masuk', 'jam_selesai', 'mulai_istirahat', 'selesai_istirahat', 'mulai_lembur', 'fleksibel', 'hari_kerja', 'id_user_ditugaskan'] },
    { n: 'Jabatan', c: ['id', 'judul', 'level', 'tanggung_jawab_inti', 'mode_login'] },
    { n: 'JenisCuti', c: ['id', 'nama', 'kuota_per_tahun', 'berbayar', 'butuh_file'] }
  ];
  schema.forEach(function(s) {
    var sheet = ss.getSheetByName(s.n) || ss.insertSheet(s.n);
    var headers = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    s.c.forEach(function(col) {
      if (headers.indexOf(col) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col).setBackground('#1A73E8').setFontColor('#FFFFFF').setFontWeight('bold');
      }
    });
    sheet.setFrozenRows(1);
  });
}
