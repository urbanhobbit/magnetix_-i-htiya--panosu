/**
 * Google Apps Script — MagnetiX İhtiyaç Panosu Backend
 * 
 * KURULUM:
 * 1. Google Sheets'te yeni bir tablo oluşturun
 * 2. Üst menüden Uzantılar > Apps Script'i açın
 * 3. Bu dosyanın içeriğini Code.gs'ye yapıştırın
 * 4. Dağıt > Web uygulaması olarak dağıt
 *    - Şu kullanıcı olarak çalıştır: "Ben"
 *    - Erişim: "Herkes" (anonim dahil)
 * 5. Deploy URL'ini kopyalayıp .env dosyasına VITE_APPS_SCRIPT_URL olarak yazın
 * 
 * TABLO YAPISI (otomatik oluşturulur):
 * - "Oturumlar" sayfası: sessionId, expertName, startedAt, submittedAt, needsJson, groupsJson
 * - "İhtiyaçlar" sayfası: sessionId, expertName, needId, needText, stage, groupId, groupName, submittedAt
 */

const SESSIONS_SHEET = 'Oturumlar';
const NEEDS_SHEET = 'İhtiyaçlar';

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─── POST: Uzman verisi kaydet ──────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Oturumlar sayfası
    const sessionsSheet = getOrCreateSheet(SESSIONS_SHEET, [
      'sessionId', 'expertName', 'startedAt', 'submittedAt', 'needsJson', 'groupsJson'
    ]);
    
    // Mevcut oturumu bul (güncelleme durumu için)
    const sessionRows = sessionsSheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < sessionRows.length; i++) {
      if (sessionRows[i][0] === data.sessionId) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }
    
    const sessionRowData = [
      data.sessionId,
      data.expertName,
      data.startedAt,
      data.submittedAt,
      JSON.stringify(data.needs),
      JSON.stringify(data.groups),
    ];
    
    if (existingRow > 0) {
      sessionsSheet.getRange(existingRow, 1, 1, sessionRowData.length).setValues([sessionRowData]);
    } else {
      sessionsSheet.appendRow(sessionRowData);
    }
    
    // İhtiyaçlar sayfası — detay satırları
    const needsSheet = getOrCreateSheet(NEEDS_SHEET, [
      'sessionId', 'expertName', 'needId', 'needText', 'stage', 'groupId', 'groupName', 'submittedAt'
    ]);
    
    // Mevcut oturumun ihtiyaçlarını sil (güncelleme)
    const needRows = needsSheet.getDataRange().getValues();
    for (let i = needRows.length - 1; i >= 1; i--) {
      if (needRows[i][0] === data.sessionId) {
        needsSheet.deleteRow(i + 1);
      }
    }
    
    // Yeni satırlar ekle
    const newRows = data.needs.map(n => [
      data.sessionId,
      data.expertName,
      n.id,
      n.text,
      n.stage,
      n.groupId || '',
      n.groupName || '',
      data.submittedAt,
    ]);
    
    if (newRows.length > 0) {
      needsSheet.getRange(needsSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, sessionId: data.sessionId }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── GET: Tüm oturumları oku ────────────────────────────────────────────────

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'sessions';
    
    if (action === 'sessions') {
      return getSessions();
    } else if (action === 'needs') {
      return getNeeds(e.parameter.sessionId);
    } else if (action === 'allNeeds') {
      return getAllNeeds();
    } else if (action === 'update') {
      return updateNeed(e.parameter);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSessions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SESSIONS_SHEET);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ sessions: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sessions = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    // Parse JSON fields
    try { obj.needs = JSON.parse(obj.needsJson); } catch(_) { obj.needs = []; }
    try { obj.groups = JSON.parse(obj.groupsJson); } catch(_) { obj.groups = []; }
    delete obj.needsJson;
    delete obj.groupsJson;
    return obj;
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({ sessions }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getNeeds(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(NEEDS_SHEET);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ needs: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const needs = data.slice(1)
    .filter(row => !sessionId || row[0] === sessionId)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  
  return ContentService
    .createTextOutput(JSON.stringify({ needs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllNeeds() {
  return getNeeds(null);
}

// ─── GET with action=update: Tek ihtiyaç güncelle (analist inline düzenleme) ─

function updateNeed(params) {
  const { sessionId, needId, field, value } = params;
  
  if (!sessionId || !needId || !field || value === undefined) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Missing parameters' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // İhtiyaçlar sayfasını güncelle
  const needsSheet = ss.getSheetByName(NEEDS_SHEET);
  if (needsSheet) {
    const data = needsSheet.getDataRange().getValues();
    const headers = data[0];
    const colIndex = headers.indexOf(field);
    
    if (colIndex >= 0) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === sessionId && data[i][2] === needId) {
          needsSheet.getRange(i + 1, colIndex + 1).setValue(value);
          break;
        }
      }
    }
  }
  
  // Oturumlar sayfasının needsJson'ını da güncelle
  const sessionsSheet = ss.getSheetByName(SESSIONS_SHEET);
  if (sessionsSheet) {
    const sData = sessionsSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      if (sData[i][0] === sessionId) {
        try {
          const needs = JSON.parse(sData[i][4]);
          const need = needs.find(n => n.id === needId);
          if (need) {
            need[field] = value;
            sessionsSheet.getRange(i + 1, 5).setValue(JSON.stringify(needs));
          }
        } catch(_) {}
        break;
      }
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
