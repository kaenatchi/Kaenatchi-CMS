/**
 * READ-ONLY schema diagnostics for KaenatChi CMS.
 *
 * Use ONLY in a separate temporary Apps Script project after reviewing the
 * spreadsheet ID and granting the narrow read-only spreadsheet scope.
 * Do not paste this file into the live CMS project. Do not deploy as a Web App.
 *
 * Output is limited to sheet names, headers, row counts, and Settings key names.
 * It never reads or logs customer rows, booking rows, payment values, receipts,
 * phone numbers, VIP tokens, setting values, or any other row contents.
 */
const DIAGNOSTIC_SPREADSHEET_ID = '1cf6SFL80xJ8YrBPlr_Fp9TYhkKGkhu2U45D2WTSyNz0';

const DIAGNOSTIC_SHEETS = [
  'Services', 'Courses', 'Events', 'FAQ', 'Pages', 'Settings',
  'DailyContent', 'BookingContent', 'Bookings', 'Customers', 'Schedule',
  'BlockedDates', 'BlockedSlots', 'Payments', 'BookingSetings',
  'BookingSettings', 'BookingLogs'
];

function runReadOnlyCmsSchemaDiagnostic() {
  const ss = SpreadsheetApp.openById(DIAGNOSTIC_SPREADSHEET_ID);
  const report = {
    diagnostic: 'KaenatChi CMS schema-only audit',
    readOnlyIntent: true,
    noWritesPerformed: true,
    noDeploymentPerformed: true,
    sheets: []
  };

  DIAGNOSTIC_SHEETS.forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      report.sheets.push({ name: name, exists: false });
      return;
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const headers = lastColumn > 0
      ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(String)
      : [];

    const item = {
      name: name,
      exists: true,
      dataRowCount: Math.max(0, lastRow - 1),
      headers: headers
    };

    // Only for Settings: read the key/name column, never the value column.
    if (name === 'Settings' && lastRow > 1 && headers.length) {
      const keyIndex = findSettingsKeyColumn_(headers);
      if (keyIndex >= 0) {
        item.settingKeyColumn = headers[keyIndex];
        item.settingKeyNames = sheet
          .getRange(2, keyIndex + 1, lastRow - 1, 1)
          .getDisplayValues()
          .map(function(row) { return String(row[0] || '').trim(); })
          .filter(function(value) { return value !== ''; });
      } else {
        item.settingKeyColumn = null;
        item.settingKeyNames = [];
        item.settingsKeyColumnFound = false;
      }
    }

    report.sheets.push(item);
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

function findSettingsKeyColumn_(headers) {
  const aliases = ['کلید', 'key', 'نام', 'name'];
  const normalize = function(value) {
    return String(value || '').trim().toLowerCase()
      .replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[\\s_-]+/g, '');
  };
  const normalized = headers.map(normalize);
  for (let i = 0; i < aliases.length; i++) {
    const index = normalized.indexOf(normalize(aliases[i]));
    if (index >= 0) return index;
  }
  return -1;
}
