/**
 * @fileoverview API Backend Pintu Kuliah (Google Apps Script)
 * Menangani request dari aplikasi web.
 * Spreadsheet ID: 1c4_albuIverQaUcXQBeU4n0AYcKs20kkaQQ1JiLkLRE
 */

function doGet(e) {
  return responseJSON({
    status: 'success',
    message: 'Pintu Kuliah API is Online',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000); // Tunggu 15 detik jika ada proses lain

  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data yang diterima");
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;

    let result = {};

    switch (action) {
      case 'ping':
        result = { message: 'pong' };
        break;
      case 'getAllData':
        result = getAllData();
        break;
      case 'syncAttendance':
        result = syncAttendance(payload);
        break;
      case 'syncRequest':
        result = syncRequest(payload);
        break;
      case 'syncUser':
        result = syncUser(payload);
        break;
      case 'deleteUser':
        result = deleteRecord('users', payload.id);
        break;
      case 'syncSettings':
        result = syncSettings(payload);
        break;
      case 'syncTask':
        result = syncTask(payload);
        break;
      case 'deleteTask':
        result = deleteRecord('tasks', payload.id);
        break;
      case 'syncWorkReport':
        result = syncWorkReport(payload);
        break;
      case 'deleteRequest':
        result = deleteRecord('requests', payload.id);
        break;
      default:
        throw new Error(`Aksi tidak dikenal: ${action}`);
    }

    return responseJSON({ status: 'success', ...result });

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- LOGIKA DATA ---

function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    users: getTableData(ss, 'users'),
    jobRoles: getTableData(ss, 'job_roles'),
    shifts: getTableData(ss, 'shifts'),
    attendance: getTableData(ss, 'attendance'),
    requests: getTableData(ss, 'requests'),
    settings: getSettings(ss),
    departments: getTableData(ss, 'departments'),
    leaveTypes: getTableData(ss, 'leave_types'),
    tasks: getTableData(ss, 'tasks'),
    workReports: getTableData(ss, 'work_reports'),
    offices: getTableData(ss, 'branches')
  };
}

function syncAttendance(record) {
  if (record.url_foto && record.url_foto.startsWith('data:image')) {
    record.url_foto = saveToDrive(record.url_foto, `att_${record.id_user}_${Date.now()}.jpg`);
  }
  return upsertRecord('attendance', record, 'id');
}

function syncRequest(record) {
  if (record.url_lampiran && record.url_lampiran.startsWith('data:image')) {
    record.url_lampiran = saveToDrive(record.url_lampiran, `req_${record.id_user}_${Date.now()}.jpg`);
  }
  return upsertRecord('requests', record, 'id');
}

function syncUser(user) {
  if (user.url_avatar && user.url_avatar.startsWith('data:image')) {
    user.url_avatar = saveToDrive(user.url_avatar, `avatar_${user.id}.jpg`);
  }
  return upsertRecord('users', user, 'id');
}

function syncTask(task) {
  return upsertRecord('tasks', task, 'id');
}

function syncWorkReport(report) {
  if (report.url_bukti && report.url_bukti.startsWith('data:image')) {
    report.url_bukti = saveToDrive(report.url_bukti, `rep_${report.id_user}_${Date.now()}.jpg`);
  }
  return upsertRecord('work_reports', report, 'id');
}

function syncSettings(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Update Settings Sheet
  const settingsData = {
    'nama_kantor': payload.nama_kantor,
    'lat_kantor': payload.lat_kantor,
    'lng_kantor': payload.lng_kantor,
    'radius_kantor_km': payload.radius_kantor_km,
    'toleransi_menit': payload.toleransi_menit
  };
  
  let sheet = ss.getSheetByName('settings');
  const headers = Object.keys(settingsData);
  const values = Object.values(settingsData);
  
  if (!sheet) {
    sheet = ss.insertSheet('settings');
    sheet.appendRow(headers);
  }
  
  if (sheet.getLastRow() < 2) {
    sheet.appendRow(values);
  } else {
    sheet.getRange(2, 1, 1, values.length).setValues([values]);
  }

  // Update Pendukung (Shifts, JobRoles, Branches)
  if (payload.shifts) replaceAllData(ss, 'shifts', payload.shifts);
  if (payload.jobRoles) replaceAllData(ss, 'job_roles', payload.jobRoles);
  if (payload.offices) replaceAllData(ss, 'branches', payload.offices);
  
  return { message: "Pengaturan berhasil diperbarui" };
}

// --- HELPER FUNCTIONS ---

function getTableData(ss, tableName) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('settings');
  if (!sheet || sheet.getLastRow() < 2) return {};
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  let settings = {};
  headers.forEach((h, i) => settings[h] = values[i]);
  return settings;
}

function upsertRecord(tableName, record, keyField) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error(`Tabel ${tableName} tidak ditemukan`);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error(`Kolom kunci '${keyField}' tidak ada`);

  const rowData = headers.map(h => {
    let val = record[h];
    if (val === undefined) return "";
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return val;
  });

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]) === String(record[keyField])) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    return { message: "Data diperbarui", id: record[keyField] };
  } else {
    sheet.appendRow(rowData);
    return { message: "Data ditambahkan", id: record[keyField] };
  }
}

function deleteRecord(tableName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { message: "Tabel tidak ditemukan" };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIndex = headers.indexOf('id');
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { message: "Data dihapus", id: id };
    }
  }
  return { message: "Data tidak ditemukan" };
}

function replaceAllData(ss, tableName, data) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  if (!data || data.length === 0) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = data.map(item => headers.map(h => {
    let val = item[h];
    return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val === undefined ? "" : val);
  }));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function saveToDrive(base64Data, fileName) {
  try {
    const folderName = "PintuKuliah_Files";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    const base64Content = base64Data.split(',')[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), 'image/jpeg', fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
  } catch (e) {
    return base64Data; // Balikkan base64 jika gagal
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
