/**
 * PINTU KULIAH BACKEND - VERSI 5.0.5 (ANTI-GAGAL)
 * Target Spreadsheet: 1PesDkprztQlrs6KX-KIx531dJzI1Elxva-NKkBuNxA8
 */

var SPREADSHEET_ID = "1PesDkprztQlrs6KX-KIx531dJzI1Elxva-NKkBuNxA8";

function getSS() {
  var ss = null;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    console.error("Gagal membuka spreadsheet by ID: " + e.toString());
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) throw new Error("Spreadsheet tidak ditemukan. Pastikan SPREADSHEET_ID benar dan script memiliki izin akses.");
  return ss;
}

// --- 1. FUNGSI SETUP (JALANKAN INI) ---

function setupDatabaseLengkap() {
  var ss = getSS();
  
  var skema = [
    {
      nama: "Dashboard",
      warna: "#16A085",
      kolom: ["Indikator", "Nilai", "Keterangan"]
    },
    {
      nama: "Karyawan",
      warna: "#2C3E50",
      kolom: ["id", "id_karyawan", "nama", "username", "peran", "jabatan", "id_departemen", "aktif", "tanggal_bergabung", "kuota_cuti", "password", "email", "telepon", "url_avatar", "jenis_kelamin", "alamat", "mode_login"],
      dropdown: {
        "peran": ["Admin", "Manajer", "Karyawan"],
        "aktif": ["TRUE", "FALSE"],
        "jenis_kelamin": ["Laki-laki", "Perempuan"],
        "mode_login": ["Password", "Wajah", "Keduanya"]
      }
    },
    {
      nama: "Absensi",
      warna: "#27AE60",
      kolom: ["id", "tanggal", "id_user", "jam_masuk", "jam_keluar", "status", "nama_kantor", "url_foto", "lat_masuk", "lng_masuk", "catatan", "kerja_online"],
      dropdown: {
        "status": ["Hadir", "Terlambat", "Izin", "Sakit", "Alpa"],
        "kerja_online": ["Ya", "Tidak"]
      }
    },
    {
      nama: "Pengajuan",
      warna: "#E67E22",
      kolom: ["id", "id_user", "tipe", "tanggal_mulai", "tanggal_selesai", "alasan", "status", "url_lampiran"],
      dropdown: {
        "tipe": ["Cuti", "Izin", "Sakit", "Lembur", "Dinas"],
        "status": ["Pending", "Disetujui", "Ditolak"]
      }
    },
    {
      nama: "Tugas",
      warna: "#2980B9",
      kolom: ["id", "judul", "deskripsi", "kategori", "id_user_ditugaskan", "id_peran_ditugaskan", "id_dept_ditugaskan", "aktif", "dibuat_pada", "dibuat_oleh"],
      dropdown: { "aktif": ["Ya", "Tidak"] }
    },
    {
      nama: "LaporanKerja",
      warna: "#8E44AD",
      kolom: ["id", "tanggal", "id_user", "id_tugas", "status", "catatan", "url_bukti", "dikirim_pada"],
      dropdown: { "status": ["Selesai", "Proses", "Tertunda"] }
    },
    {
      nama: "Pengaturan",
      warna: "#7F8C8D",
      kolom: ["kunci", "nilai"]
    },
    {
      nama: "LokasiKantor",
      warna: "#C0392B",
      kolom: ["id", "nama", "lat", "lng", "radius"]
    },
    {
      nama: "Jabatan",
      warna: "#1ABC9C",
      kolom: ["id", "judul", "level", "tanggung_jawab_utama", "mode_login"]
    },
    {
      nama: "Shift",
      warna: "#F1C40F",
      kolom: ["id", "nama", "jam_mulai", "jam_selesai", "mulai_istirahat", "selesai_istirahat", "mulai_lembur", "fleksibel", "hari_kerja", "id_user_ditugaskan"]
    },
    {
      nama: "TipeCuti",
      warna: "#E74C3C",
      kolom: ["id", "nama", "kuota_per_tahun", "dibayar", "butuh_lampiran"]
    },
    {
      nama: "Departemen",
      warna: "#34495E",
      kolom: ["id", "nama", "id_manajer", "deskripsi"]
    },
    {
      nama: "IzinPeran",
      warna: "#95A5A6",
      kolom: ["peran", "modul_diizinkan"]
    }
  ];

  skema.forEach(function(s) {
    var sheet = ss.getSheetByName(s.nama) || ss.insertSheet(s.nama);
    sheet.clear(); 
    
    // Set Header
    sheet.getRange(1, 1, 1, s.kolom.length).setValues([s.kolom]);
    
    // Styling Header
    var headerRange = sheet.getRange(1, 1, 1, s.kolom.length);
    headerRange.setBackground(s.warna)
               .setFontColor("#FFFFFF")
               .setFontWeight("bold")
               .setHorizontalAlignment("center")
               .setVerticalAlignment("middle");
    
    // Tampilan (Freeze & Gridlines)
    sheet.setFrozenRows(1);
    
    // --- PROTEKSI ANTI-ERROR UNTUK GRIDLINES ---
    try {
      if (typeof sheet.setHideGridlines === 'function') {
        sheet.setHideGridlines(true); 
      }
    } catch (e) {
      console.warn("Gridlines tidak bisa disembunyikan otomatis, silakan lakukan manual di View > Show > Gridlines");
    }
    // --------------------------------------------
    
    sheet.setRowHeight(1, 35);
    
    // Dropdown Otomatis
    if (s.dropdown) {
      for (var colName in s.dropdown) {
        var colIdx = s.kolom.indexOf(colName) + 1;
        if (colIdx > 0) {
          var rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(s.dropdown[colName])
            .setAllowInvalid(false)
            .build();
          sheet.getRange(2, colIdx, 1000, 1).setDataValidation(rule);
        }
      }
    }
    
    // Auto Resize Kolom
    for (var i = 1; i <= s.kolom.length; i++) {
      sheet.autoResizeColumn(i);
      sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 20);
    }
  });

  // Formula Dashboard Otomatis
  var dash = ss.getSheetByName("Dashboard");
  var dataDash = [
    ["Total Karyawan", "=COUNTA(Karyawan!A2:A)", "Orang Terdaftar"],
    ["Hadir Hari Ini", "=COUNTIF(Absensi!B2:B; TODAY())", "Total Absensi Masuk"],
    ["Pengajuan Pending", "=COUNTIF(Pengajuan!G2:G; \"Pending\")", "Butuh Persetujuan"],
    ["Tugas Aktif", "=COUNTIF(Tugas!F2:F; \"Ya\")", "Tugas Belum Selesai"]
  ];
  dash.getRange(2, 1, dataDash.length, 3).setValues(dataDash);
  dash.getRange("B2:B5").setFontWeight("bold").setFontSize(14).setFontColor("#2C3E50");

  SpreadsheetApp.getUi().alert("✅ Database Berhasil Dibuat! Jika garis kisi masih ada, silakan sembunyikan manual di menu View > Show > Gridlines.");
}

// --- 2. API HANDLER ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return responseJSON({ status: 'success', message: 'API Pintu Kuliah Online v5.0.5' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var success = lock.tryLock(30000);
  if (!success) return responseJSON({ status: 'error', message: 'Lock timeout' });
  
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("No data received");
    var request = JSON.parse(e.postData.contents);
    var action = request.action;
    var payload = request.payload || {};
    
    var result = {};
    switch(action) {
      case 'getAllData': result = ambilSemuaData(); break;
      case 'syncUser': result = simpanData("Karyawan", payload); break;
      case 'syncAttendance': result = simpanData("Absensi", payload); break;
      case 'syncRequest': result = simpanData("Pengajuan", payload); break;
      case 'syncTask': result = simpanData("Tugas", payload); break;
      case 'syncWorkReport': result = simpanData("LaporanKerja", payload); break;
      case 'syncSettings': result = simpanPengaturan(payload); break;
      case 'syncJobRole': result = simpanData("Jabatan", payload); break;
      case 'syncShift': result = simpanData("Shift", payload); break;
      case 'syncLeaveType': result = simpanData("TipeCuti", payload); break;
      case 'syncDepartment': result = simpanData("Departemen", payload); break;
      case 'syncOffice': result = simpanData("LokasiKantor", payload); break;
      case 'syncRolePermission': result = simpanData("IzinPeran", payload); break;
      case 'deleteUser': result = hapusData("Karyawan", payload.id); break;
      case 'deleteTask': result = hapusData("Tugas", payload.id); break;
      case 'deleteRequest': result = hapusData("Pengajuan", payload.id); break;
      case 'deleteJobRole': result = hapusData("Jabatan", payload.id); break;
      case 'deleteShift': result = hapusData("Shift", payload.id); break;
      case 'deleteOffice': result = hapusData("LokasiKantor", payload.id); break;
      default: throw new Error("Aksi tidak dikenal: " + action);
    }
    
    // Flatten response for frontend compatibility
    var response = { status: 'success' };
    if (result && typeof result === 'object') {
      for (var key in result) {
        if (result.hasOwnProperty(key)) {
          response[key] = result[key];
        }
      }
    }
    
    return responseJSON(response);
      
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function ambilSemuaData() {
  var ss = getSS();
  var mapping = {
    "Karyawan": "users",
    "Absensi": "attendance",
    "Pengajuan": "requests",
    "Tugas": "tasks",
    "LaporanKerja": "work_reports",
    "Pengaturan": "settings",
    "LokasiKantor": "offices",
    "Jabatan": "job_roles",
    "Shift": "shifts",
    "TipeCuti": "leave_types",
    "Departemen": "departments",
    "IzinPeran": "role_permissions"
  };
  
  var hasil = {};
  for (var sheetName in mapping) {
    var key = mapping[sheetName];
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        hasil[key] = data.slice(1).map(function(row) {
          var obj = {};
          headers.forEach(function(h, i) { 
            if (h) {
              var val = row[i];
              // Auto-parse JSON strings if they look like arrays or objects
              if (typeof val === 'string' && ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}')))) {
                try { val = JSON.parse(val); } catch(e) {}
              }
              obj[h] = val;
            }
          });
          return obj;
        });
      } else {
        hasil[key] = [];
      }
    } else {
      hasil[key] = [];
    }
  }
  return hasil;
}

function simpanData(namaSheet, data) {
  var ss = getSS();
  var sheet = ss.getSheetByName(namaSheet);
  if (!sheet) throw new Error("Sheet tidak ditemukan: " + namaSheet);
  
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) throw new Error("Sheet " + namaSheet + " kosong (tidak ada header). Jalankan setupDatabaseLengkap.");
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  if (rows.length > 1) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) { rowIndex = i + 1; break; }
    }
  }
  
  var rowData = headers.map(function(h) { 
    var val = data[h];
    if (val === undefined || val === null) return "";
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { message: "Data disimpan", id: data.id };
}

function hapusData(namaSheet, id) {
  var ss = getSS();
  var sheet = ss.getSheetByName(namaSheet);
  if (!sheet) throw new Error("Sheet tidak ditemukan: " + namaSheet);
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { message: "Data dihapus", id: id };
    }
  }
  return { message: "Data tidak ditemukan", id: id };
}

function simpanPengaturan(payload) {
  var ss = getSS();
  var sheet = ss.getSheetByName("Pengaturan");
  
  // Mapping from payload key to Sheet Name for complex settings
  var sheetMapping = {
    "offices": "LokasiKantor",
    "shifts": "Shift",
    "jobRoles": "Jabatan",
    "departments": "Departemen",
    "leaveTypes": "TipeCuti",
    "role_permissions": "IzinPeran"
  };

  for (var kunci in payload) {
    var value = payload[kunci];
    
    if (sheetMapping[kunci] && Array.isArray(value)) {
      var targetSheetName = sheetMapping[kunci];
      var targetSheet = ss.getSheetByName(targetSheetName);
      if (targetSheet) {
        var lastRow = targetSheet.getLastRow();
        if (lastRow > 1) {
          targetSheet.deleteRows(2, lastRow - 1);
        }
        
        var lastCol = targetSheet.getLastColumn();
        if (lastCol > 0) {
          var headers = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
          value.forEach(function(item) {
            var rowData = headers.map(function(h) {
              var val = item[h];
              if (val === undefined || val === null) return "";
              if (typeof val === 'object') return JSON.stringify(val);
              return val;
            });
            targetSheet.appendRow(rowData);
          });
        }
      }
    } else {
      // Normal key-value setting
      var data = sheet.getDataRange().getValues();
      var found = false;
      var stringValue = (typeof value === 'object') ? JSON.stringify(value) : value;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == kunci) {
          sheet.getRange(i + 1, 2).setValue(stringValue);
          found = true;
          break;
        }
      }
      if (!found) sheet.appendRow([kunci, stringValue]);
    }
  }
  return { message: "Pengaturan diperbarui" };
}
