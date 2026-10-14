/**
 * KaenatChi public Mini App API — isolated staging scaffold.
 * Not deployed. Do not switch the live Mini App URL until compatibility checks pass.
 * Keep this project limited to read-only public content; never add admin/CRUD/VIP/booking functions.
 */
const PUBLIC_CMS_SPREADSHEET_ID = '1cf6SFL80xJ8YrBPlr_Fp9TYhkKGkhu2U45D2WTSyNz0';
const PUBLIC_SHEETS = {
  services:'Services', courses:'Courses', events:'Events', faq:'FAQ', pages:'Pages',
  settings:'Settings', dailyContent:'DailyContent', bookingContent:'BookingContent'
};
const PUBLIC_FIELDS = {
  services:['شناسه','id','slug','نام خدمت','عنوان','نام','title','دسته','دسته‌بندی','category','توضیحات کامل','توضیح کوتاه','توضیحات','توضیح','description','text','قیمت','هزینه','price','مدت','مدت زمان','duration','تصویر','image','ترتیب','order','فعال','active','status'],
  courses:['شناسه','id','slug','نام دوره','عنوان','نام','title','توضیحات کامل','توضیحات','توضیح کوتاه','توضیح','متن','description','text','سرفصل‌ها','سرفصل ها','هزینه','قیمت','price','base price','مدت','مدت زمان','duration','تصویر','image','فعال','active','status'],
  events:['شناسه','id','slug','نام ایونت','عنوان','نام','title','توضیحات کامل','توضیحات','توضیح کوتاه','توضیح','متن','description','text','تاریخ','date','ساعت','time','نحوه برگزاری','نحوه‌برگزاری','ظرفیت','capacity','هزینه','قیمت','price','base price','فعال','active','status'],
  faq:['شناسه','id','slug','سؤال','سوال','پرسش','question','عنوان','نام','title','پاسخ','answer','توضیحات','توضیحات کامل','توضیح کوتاه','توضیح','متن','description','text','دسته‌بندی','دسته','category','گروه','ترتیب','order','فعال','active','status'],
  pages:['شناسه','id','slug','کلید','key','نام صفحه','عنوان','نام','title','متن','توضیحات کامل','توضیحات','پاسخ','text','description','تصویر','image','فعال','active','status'],
  dailyContent:['شناسه','id','عنوان','title','متن','محتوا','توضیحات','text','content','لینک تصویر','تصویر','image url','image','دسته','دسته‌بندی','category','فعال','active','status','تاریخ شروع','شروع','start date','تاریخ پایان','پایان','end date','ترتیب','order','شرح کوتاه','خلاصه','محل نمایش','جایگاه نمایش','placement','display in'],
  bookingContent:['کلید','key','عنوان','title','بخش','section','محتوا','متن','توضیحات','content','text','لینک تصویر','تصویر','image url','image','ترتیب','order','فعال','active','status'],
  settings:['کلید','key','نام','name','مقدار','value','متن','text','لینک','url']
};
function doGet(e) {
  const action = e && e.parameter ? String(e.parameter.action || '') : '';
  if (action !== 'getMiniAppData') return jsonOutput_({success:false,error:'NOT_FOUND'});
  try { return jsonOutput_(getMiniAppData_()); }
  catch (err) { return jsonOutput_({success:false,error:'PUBLIC_CONTENT_UNAVAILABLE'}); }
}
function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function getMiniAppData_() {
  return getPublicPayloadBatched_();
}

/*
 * Fast read-only public payload builder.
 * One metadata lookup + one header batch + one data-column batch +
 * one settings-key read + one approved-settings-cell batch.
 * This intentionally does not call the CMS admin getCMSData() function
 * and never reads booking/customer/payment/schedule collections.
 */
function getPublicPayloadBatched_() {
  const startedAt = Date.now();
  const sheetNames = getPublicSheetNames_();
  const collectionNames = ['services','courses','events','faq','pages','dailyContent','bookingContent'];
  const allNames = collectionNames.concat(['settings']);
  const headerRanges = allNames
    .filter(function(name) { return !!sheetNames[PUBLIC_SHEETS[name]]; })
    .map(function(name) { return PUBLIC_SHEETS[name] + '!1:1'; });
  const headerValues = readPublicValuesBatch_(headerRanges);
  const headersByName = {};
  let headerCursor = 0;
  allNames.forEach(function(name) {
    if (!sheetNames[PUBLIC_SHEETS[name]]) {
      headersByName[name] = [];
      return;
    }
    const values = headerValues[headerCursor++] || [];
    headersByName[name] = values.length ? values[0].map(function(value) {
      return String(value == null ? '' : value);
    }) : [];
  });

  const outputRows = {};
  const columnDescriptors = [];
  collectionNames.forEach(function(name) {
    const headers = headersByName[name] || [];
    const allowed = new Set(PUBLIC_FIELDS[name].map(normalizeHeader_));
    const indexes = [];
    headers.forEach(function(header, index) {
      if (header && allowed.has(normalizeHeader_(header))) indexes.push(index);
    });
    outputRows[name] = [];
    indexes.forEach(function(index) {
      const letter = publicColumnLetter_(index + 1);
      columnDescriptors.push({
        name: name,
        index: index,
        header: headers[index],
        range: PUBLIC_SHEETS[name] + '!' + letter + '2:' + letter
      });
    });
  });

  const dataColumnValues = readPublicValuesBatch_(
    columnDescriptors.map(function(item) { return item.range; })
  );
  const columnsByName = {};
  columnDescriptors.forEach(function(item, index) {
    if (!columnsByName[item.name]) columnsByName[item.name] = [];
    columnsByName[item.name].push({
      index: item.index,
      header: item.header,
      values: (dataColumnValues[index] || []).map(function(row) {
        return row.length ? String(row[0] == null ? '' : row[0]) : '';
      })
    });
  });

  collectionNames.forEach(function(name) {
    const columns = columnsByName[name] || [];
    const rowCount = columns.reduce(function(maximum, column) {
      return Math.max(maximum, column.values.length);
    }, 0);
    const rows = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row = {};
      columns.forEach(function(column) {
        row[column.header] = column.values[rowIndex] || '';
      });
      rows.push(row);
    }
    outputRows[name] = rows.filter(publicRowIsActive_);
  });

  outputRows.settings = readPublicSettingsBatched_(
    headersByName.settings,
    !!sheetNames[PUBLIC_SHEETS.settings]
  );
  outputRows.bookingContent.sort(function(a,b) {
    return (Number(a['ترتیب']) || 0) - (Number(b['ترتیب']) || 0);
  });

  return {
    success: true,
    services: outputRows.services,
    courses: outputRows.courses,
    events: outputRows.events,
    faq: outputRows.faq,
    pages: outputRows.pages,
    settings: outputRows.settings,
    dailyContent: outputRows.dailyContent,
    bookingContent: outputRows.bookingContent
  };
}

/**
 * Match the Mini App's cmsActive behavior:
 * - use Persian or English active/status headers;
 * - blank or missing status means active;
 * - explicit false-like/unrecognized status means inactive.
 */
function publicRowIsActive_(row) {
  const aliases = ['فعال','active','status'];
  let raw = '';
  let found = false;
  aliases.some(function(alias) {
    const wanted = normalizeHeader_(alias);
    const actual = Object.keys(row).find(function(key) {
      return normalizeHeader_(key) === wanted;
    });
    if (actual !== undefined) {
      found = true;
      raw = String(row[actual] == null ? '' : row[actual]).trim().toLowerCase();
      return !!raw;
    }
    return false;
  });
  if (!found || !raw) return true;
  return ['بله','فعال','true','1','yes'].indexOf(raw) >= 0;
}

function readPublicSettingsBatched_(headers, sheetExists) {
  const sheetName = PUBLIC_SHEETS.settings;
  if (!sheetExists || !headers.length) return [];
  const keyAliases = ['کلید', 'key', 'نام'];
  const keyIndex = headers.findIndex(function(header) {
    return keyAliases.map(normalizeHeader_).indexOf(normalizeHeader_(header)) >= 0;
  });
  if (keyIndex < 0) return [];

  // Read each allowlisted Settings column once, then filter rows in memory.
  // This avoids constructing one API range per cell (which grows as
  // public setting rows × public columns) while never fetching non-public columns.
  const allowed = new Set(PUBLIC_FIELDS.settings.map(normalizeHeader_));
  const publicColumns = [];
  headers.forEach(function(header, index) {
    if (header && allowed.has(normalizeHeader_(header))) {
      publicColumns.push({header:header,index:index,letter:publicColumnLetter_(index + 1)});
    }
  });
  if (!publicColumns.length) return [];

  const keyLetter = publicColumnLetter_(keyIndex + 1);
  const keyValues = readPublicValuesBatch_([sheetName + '!' + keyLetter + '2:' + keyLetter])[0] || [];
  const approvedRowIndexes = [];
  keyValues.forEach(function(row, index) {
    const key = String(row[0] == null ? '' : row[0]).trim();
    if (key && isPublicSettingKey_(key)) approvedRowIndexes.push(index);
  });
  if (!approvedRowIndexes.length) return [];

  const columnValues = readPublicValuesBatch_(
    publicColumns.map(function(column) {
      return sheetName + '!' + column.letter + '2:' + column.letter;
    })
  );
  return approvedRowIndexes.map(function(rowIndex) {
    const row = {};
    publicColumns.forEach(function(column, columnIndex) {
      const cells = columnValues[columnIndex] || [];
      const cell = cells[rowIndex] || [];
      row[column.header] = cell.length ? String(cell[0] == null ? '' : cell[0]) : '';
    });
    return row;
  });
}

// Cache only sheet metadata for this execution. No spreadsheet values are cached here.
var PUBLIC_SHEET_NAMES_CACHE = null;

function getPublicSheetNames_() {
  if (PUBLIC_SHEET_NAMES_CACHE) return PUBLIC_SHEET_NAMES_CACHE;
  const metadata = Sheets.Spreadsheets.get(PUBLIC_CMS_SPREADSHEET_ID, {
    fields: 'sheets(properties(title))'
  });
  PUBLIC_SHEET_NAMES_CACHE = {};
  (metadata.sheets || []).forEach(function(item) {
    const title = item.properties && item.properties.title;
    if (title) PUBLIC_SHEET_NAMES_CACHE[title] = true;
  });
  return PUBLIC_SHEET_NAMES_CACHE;
}

function readPublicValues_(range) {
  return readPublicValuesBatch_([range])[0] || [];
}

// Batch ranges belonging to the same logical read into one Sheets API request.
// This reduces round trips without widening the public field allowlist.
var PUBLIC_VALUES_BATCH_REQUESTS = 0;

function readPublicValuesBatch_(ranges) {
  if (!ranges.length) return [];
  PUBLIC_VALUES_BATCH_REQUESTS++;
  const quotedRanges = ranges.map(quotePublicRange_);
  const result = Sheets.Spreadsheets.Values.batchGet(
    PUBLIC_CMS_SPREADSHEET_ID,
    { ranges: quotedRanges, majorDimension: 'ROWS' }
  );
  const valueRanges = result.valueRanges || [];
  return quotedRanges.map(function(_, index) {
    const item = valueRanges[index];
    return item && item.values ? item.values : [];
  });
}

function quotePublicRange_(range) {
  const separator = range.indexOf('!');
  const sheetName = range.substring(0, separator);
  const cellRange = range.substring(separator + 1);
  return "'" + sheetName.replace(/'/g, "''") + "'!" + cellRange;
}

function publicColumnLetter_(column) {
  let result = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    column = Math.floor((column - 1) / 26);
  }
  return result;
}

function getPublicRows_(name) {
  if (name === 'settings') throw new Error('Use the key-filtered Settings reader');
  const sheetName = PUBLIC_SHEETS[name], fields = PUBLIC_FIELDS[name];
  if (!sheetName || !fields) throw new Error('Unknown public collection');
  if (!getPublicSheetNames_()[sheetName]) return [];

  const headerRows = readPublicValues_(sheetName + '!1:1');
  const headers = headerRows.length ? headerRows[0].map(function(value) {
    return String(value == null ? '' : value);
  }) : [];
  if (!headers.length) return [];

  const allowed = new Set(fields.map(normalizeHeader_));
  const indexes = [];
  headers.forEach(function(header, index) {
    if (header && allowed.has(normalizeHeader_(header))) indexes.push(index);
  });
  if (!indexes.length) return [];

  // Read only explicitly allowlisted columns, never entire sheet rows.
  // One batchGet replaces one API round trip per column.
  const columnRanges = indexes.map(function(index) {
    const letter = publicColumnLetter_(index + 1);
    return sheetName + '!' + letter + '2:' + letter;
  });
  const columnValues = readPublicValuesBatch_(columnRanges);
  const columns = columnValues.map(function(values) {
    return values.map(function(row) {
      return row.length ? String(row[0] == null ? '' : row[0]) : '';
    });
  });
  const rowCount = columns.reduce(function(maximum, values) {
    return Math.max(maximum, values.length);
  }, 0);
  const result = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const obj = {};
    indexes.forEach(function(columnIndex, projectedIndex) {
      const header = headers[columnIndex];
      if (header && header.trim()) obj[header] = columns[projectedIndex][rowIndex] || '';
    });
    result.push(obj);
  }
  return result;
}

function getPublicActiveRows_(name) {
  // Match the current CMS endpoint: publish only when Persian "فعال" contains
  // a recognized active value.
  return getPublicRows_(name).filter(function(row) {
    const value = String(row['فعال'] || '').trim().toLowerCase();
    return value === 'بله' || value === 'فعال' || value === 'true' ||
      value === '1' || value === 'yes';
  });
}

function getPublicSettings_() {
  const sheetName = PUBLIC_SHEETS.settings;
  if (!getPublicSheetNames_()[sheetName]) return [];
  const headerRows = readPublicValues_(sheetName + '!1:1');
  const headers = headerRows.length ? headerRows[0].map(function(value) {
    return String(value == null ? '' : value);
  }) : [];
  const keyAliases = ['کلید', 'key', 'نام', 'name'];
  const keyIndex = headers.findIndex(function(header) {
    return keyAliases.map(normalizeHeader_).indexOf(normalizeHeader_(header)) >= 0;
  });
  if (keyIndex < 0) return [];

  // First read ONLY setting keys. Values of non-public keys are never fetched.
  const keyColumn = publicColumnLetter_(keyIndex + 1);
  const keys = readPublicValues_(sheetName + '!' + keyColumn + '2:' + keyColumn);
  const publicRowIndexes = [];
  keys.forEach(function(row, index) {
    const key = String(row[0] == null ? '' : row[0]).trim();
    if (key && isPublicSettingKey_(key)) publicRowIndexes.push(index + 2);
  });
  if (!publicRowIndexes.length) return [];

  const allowed = new Set(PUBLIC_FIELDS.settings.map(normalizeHeader_));
  const publicColumns = [];
  headers.forEach(function(header, index) {
    if (header && allowed.has(normalizeHeader_(header))) {
      publicColumns.push({ index: index, header: header, letter: publicColumnLetter_(index + 1) });
    }
  });

  // Fetch allowlisted fields only for individually approved public setting rows.
  // Batch the approved cells together; no cells from non-public setting rows
  // are included in this request.
  const approvedCellRanges = [];
  publicRowIndexes.forEach(function(rowNumber) {
    publicColumns.forEach(function(column) {
      approvedCellRanges.push(sheetName + '!' + column.letter + rowNumber);
    });
  });
  const approvedCellValues = readPublicValuesBatch_(approvedCellRanges);
  return publicRowIndexes.map(function(rowNumber, rowIndex) {
    const obj = {};
    publicColumns.forEach(function(column, columnIndex) {
      const valueIndex = rowIndex * publicColumns.length + columnIndex;
      const values = approvedCellValues[valueIndex] || [];
      const value = values.length && values[0].length
        ? String(values[0][0] == null ? '' : values[0][0])
        : '';
      obj[column.header] = value;
    });
    return obj;
  });
}
function firstValue_(row,aliases) {
  const normalized={};
  Object.keys(row||{}).forEach(k=>normalized[normalizeHeader_(k)]=row[k]);
  for (let i=0;i<aliases.length;i++) {
    const key=normalizeHeader_(aliases[i]);
    if (Object.prototype.hasOwnProperty.call(normalized,key) && String(normalized[key]==null?'':normalized[key]).trim()!=='') return String(normalized[key]).trim();
  }
  return '';
}
function normalizeHeader_(value) {
  return String(value||'').trim().toLowerCase().replace(/ي/g,'ی').replace(/ى/g,'ی').replace(/ك/g,'ک').replace(/[\s_-]+/g,'');
}
/**
 * Exact allowlist for keys consumed by src/App.tsx.
 * Keep this exact-match policy: do not return every Settings row publicly.
 * normalizeHeader_ removes spaces, underscores and hyphens before comparison.
 */
function isPublicSettingKey_(rawKey) {
  const key = normalizeHeader_(rawKey);
  const allowed = [
    // Opening hours / business hours
    'hours','businesshours','hoursofoperation','workinghours','openinghours',
    'ساعات','ساعاتکاری','ساعتکاری','ساعاتفعالیت','ساعتفعالیت',
    // Contact links used by cmsSetting(["telegram"/"تلگرام", ...])
    'telegram','telegramurl','telegramlink','telegramhandle','telegramusername',
    'تلگرام','لینکتلگرام','آدرس‌تلگرام',
    'whatsapp','whatsappurl','whatsapplink','whatsappbusiness',
    'واتساپ','واتس‌اپ','لینکواتساپ','لینکواتس‌اپ',
    'instagram','instagramurl','instagramlink','instagramhandle',
    'اینستاگرام','لینکاینستاگرام',
    // Channel link used by cmsSetting(["channel", "کانال", "telegramchannel"])
    'channel','channelurl','channellink','telegramchannel','telegramchannelurl',
    'telegramchannellink','telegramchannelink','کانال','لینککانال','کانالتلگرام',
    // Public card-transfer details consumed by the booking payment screen
    'bookingcardnumber','bookingbankcardnumber','شمارهکارت','کارتبانکی',
    'bookingbankname','نامبانک','بانک',
    'bookingcardholder','صاحبکارت','نامصاحبکارت','بنام','بنـام',
    'bookingpaymenttext','توضیحپرداخت','متنپرداخت'
  ];
  return allowed.indexOf(key) >= 0;
}
/** Structural/privacy test only; live headers and compatibility remain unverified. */
function testPublicPayloadSafety() {
  const startedAt = Date.now();
  PUBLIC_VALUES_BATCH_REQUESTS = 0;
  // These are the exact key families consumed by src/App.tsx. Check aliases
  // locally as well as checking the live payload, so accidental allowlist
  // regressions are caught without writing to the spreadsheet.
  const requiredSettingAliases = [
    'hours','ساعات','telegram','تلگرام','whatsapp','واتساپ',
    'instagram','اینستاگرام','channel','کانال',
    'booking_card_number','شماره کارت','booking_bank_name','نام بانک',
    'booking_card_holder','صاحب کارت','booking_payment_text','توضیح پرداخت'
  ];
  const settingAliasCoverage = requiredSettingAliases.every(function(key) {
    return isPublicSettingKey_(key);
  });
  const activeFilterCompatibility =
    publicRowIsActive_({title:'missing status is active'}) &&
    publicRowIsActive_({title:'blank status is active',active:''}) &&
    publicRowIsActive_({title:'English active is active',active:'yes'}) &&
    publicRowIsActive_({title:'Persian active is active','فعال':'بله'}) &&
    !publicRowIsActive_({title:'inactive is filtered','فعال':'خیر'}) &&
    !publicRowIsActive_({title:'false is filtered',status:'false'});
  const data=getMiniAppData_();
  const names=['services','courses','events','faq','pages','settings','dailyContent','bookingContent'];
  const expected=['success'].concat(names).sort();
  const actual=Object.keys(data).sort();
  const topKeys=JSON.stringify(actual)===JSON.stringify(expected);
  const privateKeys=['bookings','customers','payments','schedule','blockedDates','blockedSlots','bookingLogs','bookingSettings'];
  const privateCollectionsAbsent=privateKeys.every(key=>!Object.prototype.hasOwnProperty.call(data,key));
  const settingsSafe=data.settings.every(row=>isPublicSettingKey_(firstValue_(row,['کلید','key','نام','name'])));
  const projectionSafe=names.every(name=>{
    const allowed=new Set(PUBLIC_FIELDS[name].map(normalizeHeader_));
    return data[name].every(row=>Object.keys(row).every(key=>allowed.has(normalizeHeader_(key))));
  });
  const rowMetadataAbsent=names.every(name=>data[name].every(row=>!Object.prototype.hasOwnProperty.call(row,'_row')));
  const result={ok:topKeys&&privateCollectionsAbsent&&settingsSafe&&projectionSafe&&rowMetadataAbsent&&settingAliasCoverage&&activeFilterCompatibility,
    expectedTopLevelKeysOnly:topKeys,privateCollectionsAbsent,settingsAllowlisted:settingsSafe,settingAliasCoverage,
    onlyAllowlistedFields:projectionSafe,rowMetadataAbsent,settingAliasCoverage,activeFilterCompatibility,
    counts:{services:data.services.length,courses:data.courses.length,events:data.events.length,faq:data.faq.length,pages:data.pages.length,settings:data.settings.length,dailyContent:data.dailyContent.length,bookingContent:data.bookingContent.length},
    valuesBatchRequests:PUBLIC_VALUES_BATCH_REQUESTS,
    elapsedMs:Date.now()-startedAt,
    noWritesPerformed:true};
  console.log(JSON.stringify(result,null,2)); return result;
}
