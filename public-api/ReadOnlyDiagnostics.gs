/**
 * READ-ONLY schema diagnostics for KaenatChi CMS.
 *
 * Run only in a separate temporary Apps Script project. Never paste into the
 * live CMS project and never deploy as a Web App.
 *
 * Uses the Advanced Google Sheets service with spreadsheets.readonly.
 * It reads sheet metadata, header rows, and ONLY the key/name column in Settings.
 * It does not read customer, booking, payment, receipt, VIP-token, or other
 * private data rows. It intentionally does not report populated row counts:
 * Sheets API grid row counts are capacity, not actual data row counts.
 */
const DIAGNOSTIC_SPREADSHEET_ID = '1cf6SFL80xJ8YrBPlr_Fp9TYhkKGkhu2U45D2WTSyNz0';

const DIAGNOSTIC_SHEETS = [
  'Services', 'Courses', 'Events', 'FAQ', 'Pages', 'Settings',
  'DailyContent', 'BookingContent', 'Bookings', 'Customers', 'Schedule',
  'BlockedDates', 'BlockedSlots', 'Payments', 'BookingSetings',
  'BookingSettings', 'BookingLogs'
];

function runReadOnlyCmsSchemaDiagnostic() {
  const metadata = Sheets.Spreadsheets.get(DIAGNOSTIC_SPREADSHEET_ID, {
    fields: 'spreadsheetId,properties(title),sheets(properties(sheetId,title))'
  });
  const actualSheets = metadata.sheets || [];
  const actualNames = {};
  actualSheets.forEach(function(item) {
    if (item.properties && item.properties.title) {
      actualNames[item.properties.title] = item.properties.sheetId;
    }
  });

  const report = {
    diagnostic: 'KaenatChi CMS schema-only audit',
    readOnlyIntent: true,
    noWritesPerformed: true,
    noDeploymentPerformed: true,
    method: 'Google Sheets API Advanced Service; spreadsheets.readonly',
    spreadsheetTitle: metadata.properties ? metadata.properties.title : null,
    sheets: []
  };

  DIAGNOSTIC_SHEETS.forEach(function(name) {
    if (!Object.prototype.hasOwnProperty.call(actualNames, name)) {
      report.sheets.push({ name: name, exists: false });
      return;
    }

    const headerRows = readValues_(name + '!1:1');
    const headers = headerRows.length ? headerRows[0].map(function(v) {
      return String(v == null ? '' : v);
    }) : [];
    const item = { name: name, exists: true, headers: headers };

    // Settings: retrieve only the recognized key/name column, never values.
    if (name === 'Settings') {
      const keyIndex = findSettingsKeyColumn_(headers);
      if (keyIndex >= 0) {
        const column = columnLetter_(keyIndex + 1);
        const keyRows = readValues_(name + '!' + column + '2:' + column);
        item.settingKeyColumn = headers[keyIndex];
        item.settingKeyNames = keyRows.map(function(row) {
          return String(row[0] == null ? '' : row[0]).trim();
        }).filter(function(value) { return value !== ''; });
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

function readValues_(range) {
  const quotedRange = quoteSheetRange_(range);
  const result = Sheets.Spreadsheets.Values.get(
    DIAGNOSTIC_SPREADSHEET_ID,
    quotedRange,
    { majorDimension: 'ROWS' }
  );
  return result.values || [];
}

function quoteSheetRange_(range) {
  const separator = range.indexOf('!');
  const sheetName = range.substring(0, separator);
  const cellRange = range.substring(separator + 1);
  return "'" + sheetName.replace(/'/g, "''") + "'!" + cellRange;
}

function findSettingsKeyColumn_(headers) {
  const aliases = ['کلید', 'key', 'نام', 'name'];
  const normalize = function(value) {
    return String(value || '').trim().toLowerCase()
      .replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[\s_-]+/g, '');
  };
  const normalized = headers.map(normalize);
  for (let i = 0; i < aliases.length; i++) {
    const index = normalized.indexOf(normalize(aliases[i]));
    if (index >= 0) return index;
  }
  return -1;
}

function columnLetter_(column) {
  let result = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    column = Math.floor((column - 1) / 26);
  }
  return result;
}
