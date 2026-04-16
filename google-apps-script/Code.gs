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
 * - "L1Notlar" sayfası: noteId, sessionId, expertName, text, timestamp
 * - "L2Sonuçlar" sayfası: sessionId, expertName, submittedAt, needsJson, groupsJson
 * - "L3Sonuçlar" sayfası: sessionId, expertName, submittedAt, needsJson, groupsJson
 */

const SESSIONS_SHEET = 'Oturumlar';
const NEEDS_SHEET = 'İhtiyaçlar';
const L1_NOTES_SHEET = 'L1Notlar';
const L2_RESULTS_SHEET = 'L2Sonuçlar';
const L3_RESULTS_SHEET = 'L3Sonuçlar';
const GEMINI_API_KEY = 'AIzaSyCltmidQw58gddgequAEt_fAmIvCLqC8o8';
const GEMINI_MODEL = 'gemini-2.0-flash';

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

// ─── POST: Veri kaydet ──────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type || 'LEGACY';

    if (type === 'L1_NOTES') {
      return handleL1Notes(data);
    } else if (type === 'L2_BOARD') {
      return handleL2Board(data);
    } else if (type === 'L3_BOARD') {
      return handleL3Board(data);
    } else {
      // Legacy format (eski uzman arayüzü uyumluluğu)
      return handleLegacyPost(data);
    }
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── L1: Serbest notları kaydet ─────────────────────────────────────────────

function handleL1Notes(data) {
  const sheet = getOrCreateSheet(L1_NOTES_SHEET, [
    'noteId', 'sessionId', 'expertName', 'text', 'timestamp'
  ]);

  // Mevcut oturumun notlarını sil (güncelleme)
  const existing = sheet.getDataRange().getValues();
  for (let i = existing.length - 1; i >= 1; i--) {
    if (existing[i][1] === data.sessionId) {
      sheet.deleteRow(i + 1);
    }
  }

  // Yeni notları ekle
  const timestamp = data.submittedAt || new Date().toISOString();
  const rows = data.notes.map((text, idx) => [
    data.sessionId + '_' + idx,
    data.sessionId,
    data.expertName,
    text,
    timestamp,
  ]);

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, count: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── L2: Board sonuçlarını kaydet ───────────────────────────────────────────

function handleL2Board(data) {
  const sheet = getOrCreateSheet(L2_RESULTS_SHEET, [
    'sessionId', 'expertName', 'submittedAt', 'needsJson', 'groupsJson'
  ]);

  // Mevcut oturumu bul
  const rows = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.sessionId) {
      existingRow = i + 1;
      break;
    }
  }

  const rowData = [
    data.sessionId,
    data.expertName,
    data.submittedAt,
    JSON.stringify(data.needs),
    JSON.stringify(data.groups),
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // Ayrıca eski format uyumluluğu için Oturumlar ve İhtiyaçlar'a da yaz
  handleLegacyPost(data);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, sessionId: data.sessionId }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── L3: Moderatör board sonuçlarını kaydet ─────────────────────────────────

function handleL3Board(data) {
  const sheet = getOrCreateSheet(L3_RESULTS_SHEET, [
    'sessionId', 'expertName', 'submittedAt', 'needsJson', 'groupsJson'
  ]);

  // Mevcut oturumu bul
  const rows = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.sessionId) {
      existingRow = i + 1;
      break;
    }
  }

  const rowData = [
    data.sessionId,
    data.expertName,
    data.submittedAt,
    JSON.stringify(data.needs),
    JSON.stringify(data.groups),
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, sessionId: data.sessionId }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Legacy POST handler (eski format uyumluluğu) ──────────────────────────

function handleLegacyPost(data) {
  // Oturumlar sayfası
  const sessionsSheet = getOrCreateSheet(SESSIONS_SHEET, [
    'sessionId', 'expertName', 'startedAt', 'submittedAt', 'needsJson', 'groupsJson'
  ]);

  const sessionRows = sessionsSheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < sessionRows.length; i++) {
    if (sessionRows[i][0] === data.sessionId) {
      existingRow = i + 1;
      break;
    }
  }

  const sessionRowData = [
    data.sessionId,
    data.expertName,
    data.startedAt || data.submittedAt,
    data.submittedAt,
    JSON.stringify(data.needs || []),
    JSON.stringify(data.groups || []),
  ];

  if (existingRow > 0) {
    sessionsSheet.getRange(existingRow, 1, 1, sessionRowData.length).setValues([sessionRowData]);
  } else {
    sessionsSheet.appendRow(sessionRowData);
  }

  // İhtiyaçlar sayfası
  const needsSheet = getOrCreateSheet(NEEDS_SHEET, [
    'sessionId', 'expertName', 'needId', 'needText', 'stage', 'groupId', 'groupName', 'submittedAt'
  ]);

  const needRows = needsSheet.getDataRange().getValues();
  for (let i = needRows.length - 1; i >= 1; i--) {
    if (needRows[i][0] === data.sessionId) {
      needsSheet.deleteRow(i + 1);
    }
  }

  const needs = data.needs || [];
  const newRows = needs.map(n => [
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
}

// ─── GET: Veri oku ──────────────────────────────────────────────────────────

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
    } else if (action === 'getL1Notes') {
      return getL1Notes();
    } else if (action === 'getL2Results') {
      return getL2Results();
    } else if (action === 'getL3Results') {
      return getL3Results();
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

// ─── getL1Notes: Tüm uzmanların L1 notlarını parse edip sentezleyerek döndür ─

function getL1Notes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(L1_NOTES_SHEET);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ notes: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rawNotes = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return {
      id: obj['noteId'],
      expertName: obj['expertName'],
      text: obj['text'],
      timestamp: obj['timestamp'],
    };
  });

  if (rawNotes.length === 0) {
    return ContentService
      .createTextOutput(JSON.stringify({ notes: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Basit parse ile sentezle (Gemini yerine)
  const synthesized = parseAndDedup(rawNotes);
  return ContentService
    .createTextOutput(JSON.stringify({ notes: synthesized, raw: rawNotes }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Basit parse: satır satır ayır, tekrarları birleştir ────────────────────
// Notlar şu formatta geliyor:
//   Kategori Başlığı
//   - madde 1
//   - madde 2
// Parse eder, normalize eder, tekrarları çıkarır.

function parseAndDedup(rawNotes) {
  // Her notu satır satır parse et
  const itemMap = {}; // normalizedText -> { text, sources: Set, category }

  rawNotes.forEach(note => {
    const lines = note.text.split('\n');
    let currentCategory = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // "- " ile başlayan satır = ihtiyaç maddesi
      if (trimmed.startsWith('- ') || trimmed.startsWith('-')) {
        const itemText = trimmed.replace(/^-\s*/, '').trim();
        if (!itemText || itemText === ',') return;

        const normalized = itemText.toLowerCase()
          .replace(/[.,;:!?]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!normalized) return;

        if (!itemMap[normalized]) {
          itemMap[normalized] = {
            text: itemText,
            sources: new Set(),
            category: currentCategory,
          };
        }
        itemMap[normalized].sources.add(note.expertName);
      } else {
        // Başlık satırı (kategori)
        currentCategory = trimmed;
      }
    });
  });

  // Sonuçları frontend formatına dönüştür
  const results = [];
  let idx = 0;
  Object.keys(itemMap).forEach(key => {
    const entry = itemMap[key];
    const sources = Array.from(entry.sources);
    results.push({
      id: 'syn_' + idx,
      text: entry.text,
      expertName: sources.join(', '),
      timestamp: new Date().toISOString(),
      category: entry.category,
      sourceCount: sources.length,
    });
    idx++;
  });

  // Çok kaynaklı olanlar önce gelsin
  results.sort((a, b) => b.sourceCount - a.sourceCount);

  return results;
}

// ─── getL2Results: L2 sonuçlarını sentezle ve döndür ────────────────────────
// Birden fazla uzmanın L2 tasniflerini karşılaştırarak uzlaşma hesaplar

function getL2Results() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(L2_RESULTS_SHEET);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ needs: [], groups: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify({ needs: [], groups: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Her uzmanın sonuçlarını topla
  const expertResults = [];
  for (let i = 1; i < data.length; i++) {
    try {
      expertResults.push({
        expertName: data[i][1],
        needs: JSON.parse(data[i][3]),
        groups: JSON.parse(data[i][4]),
      });
    } catch (_) {}
  }

  if (expertResults.length === 0) {
    return ContentService
      .createTextOutput(JSON.stringify({ needs: [], groups: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Tek uzman varsa doğrudan döndür (consensus=1)
  if (expertResults.length === 1) {
    const r = expertResults[0];
    const needs = r.needs.map(n => ({ ...n, consensus: 1.0 }));
    return ContentService
      .createTextOutput(JSON.stringify({ needs: needs, groups: r.groups }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Birden fazla uzman: uzlaşma hesapla
  // Strateji: Her ihtiyaç metnini normalize et, aynı gruba koyan uzman sayısı / toplam uzman
  const totalExperts = expertResults.length;
  
  // Tüm unique ihtiyaç metinlerini topla
  const needTextMap = {}; // text -> { groupAssignments: [{groupName, expertName}], needObj }
  const allGroupNames = new Set();

  expertResults.forEach(er => {
    const groupMap = {};
    er.groups.forEach(g => { groupMap[g.id] = g.name; });
    
    er.needs.forEach(n => {
      const key = n.text.trim().toLowerCase();
      if (!needTextMap[key]) {
        needTextMap[key] = { text: n.text, id: n.id, assignments: [], stages: [] };
      }
      const groupName = n.groupId ? (groupMap[n.groupId] || '') : '';
      needTextMap[key].assignments.push({ groupName: groupName, expertName: er.expertName });
      needTextMap[key].stages.push(n.stage);
      if (groupName) allGroupNames.add(groupName);
    });
  });

  // Uzlaşma hesapla ve sonuç oluştur
  const mergedGroups = [];
  const groupNameToId = {};
  let gIdx = 0;
  allGroupNames.forEach(name => {
    const gId = 'mg_' + gIdx++;
    groupNameToId[name] = gId;
    mergedGroups.push({ id: gId, name: name, stage: 'processed' });
  });

  const mergedNeeds = [];
  Object.keys(needTextMap).forEach((key, idx) => {
    const entry = needTextMap[key];
    
    // En çok kullanılan grup adını bul
    const groupCounts = {};
    entry.assignments.forEach(a => {
      if (a.groupName) {
        groupCounts[a.groupName] = (groupCounts[a.groupName] || 0) + 1;
      }
    });

    let bestGroup = '';
    let bestCount = 0;
    Object.keys(groupCounts).forEach(gn => {
      if (groupCounts[gn] > bestCount) {
        bestCount = groupCounts[gn];
        bestGroup = gn;
      }
    });

    // Uzlaşma: aynı gruba koyan uzman oranı
    const consensus = bestGroup ? (bestCount / totalExperts) : 0;
    
    // Stage: çoğunluk processed ise processed, değilse pool
    const processedCount = entry.stages.filter(s => s === 'processed').length;
    const stage = processedCount > totalExperts / 2 ? 'processed' : 'pool';

    mergedNeeds.push({
      id: 'mn_' + idx,
      text: entry.text,
      stage: stage,
      groupId: bestGroup ? groupNameToId[bestGroup] : undefined,
      groupName: bestGroup || undefined,
      consensus: Math.round(consensus * 100) / 100,
      originalNotes: entry.assignments.map(a => a.expertName + ': ' + entry.text),
    });
  });

  return ContentService
    .createTextOutput(JSON.stringify({ needs: mergedNeeds, groups: mergedGroups }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── getL3Results: Moderatör sonuçlarını döndür ─────────────────────────────

function getL3Results() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(L3_RESULTS_SHEET);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ results: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    try {
      results.push({
        sessionId: data[i][0],
        expertName: data[i][1],
        submittedAt: data[i][2],
        needs: JSON.parse(data[i][3]),
        groups: JSON.parse(data[i][4]),
      });
    } catch (_) {}
  }

  return ContentService
    .createTextOutput(JSON.stringify({ results: results }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Eski fonksiyonlar (analist dashboard uyumluluğu) ───────────────────────

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

function updateNeed(params) {
  const { sessionId, needId, field, value } = params;

  if (!sessionId || !needId || !field || value === undefined) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Missing parameters' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

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
