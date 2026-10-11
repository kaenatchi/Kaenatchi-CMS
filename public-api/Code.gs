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
  const bookingContent = getPublicActiveRows_('bookingContent');
  bookingContent.sort((a,b) => (Number(a['ترتیب'])||0) - (Number(b['ترتیب'])||0));
  return {
    success:true,
    services:getPublicActiveRows_('services'),
    courses:getPublicActiveRows_('courses'),
    events:getPublicActiveRows_('events'),
    faq:getPublicActiveRows_('faq'),
    pages:getPublicActiveRows_('pages'),
    settings:getPublicSettings_(),
    dailyContent:getPublicActiveRows_('dailyContent'),
    bookingContent:bookingContent
  };
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
  const quotedRange = quotePublicRange_(range);
  const result = Sheets.Spreadsheets.Values.get(
    PUBLIC_CMS_SPREADSHEET_ID,
    quotedRange,
    { majorDimension: 'ROWS' }
  );
  return result.values || [];
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
  const columns = indexes.map(function(index) {
    return readPublicValues_(sheetName + '!' + publicColumnLetter_(index + 1) + '2:' +
      publicColumnLetter_(index + 1)).map(function(row) {
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
  return publicRowIndexes.map(function(rowNumber) {
    const obj = {};
    publicColumns.forEach(function(column) {
      const values = readPublicValues_(sheetName + '!' + column.letter + rowNumber);
      const value = values.length && values[0].length ? String(values[0][0] == null ? '' : values[0][0]) : '';
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
/** Exact allowlist; confirm live Settings keys before deploying. */
function isPublicSettingKey_(rawKey) {
  const key=normalizeHeader_(rawKey);
  const allowed=[
    'hours','businesshours','hoursofoperation','ساعات','ساعاتکاری',
    'telegram','telegramurl','telegramlink','تلگرام','لینکتلگرام',
    'whatsapp','whatsappurl','whatsapplink','واتساپ','واتس‌اپ','لینکواتساپ',
    'instagram','instagramurl','instagramlink','اینستاگرام','لینکاینستاگرام',
    'channel','telegramchannel','telegramchannelurl','telegramchannellink','کانال','لینککانال','کانالتلگرام','telegramchannelink',
    'bookingcardnumber','شمارهکارت','کارتبانکی','bookingbankname','نامبانک','بانک',
    'bookingcardholder','صاحبکارت','نامصاحبکارت','بنام','بنـام',
    'bookingpaymenttext','توضیحپرداخت','متنپرداخت'
  ];
  return allowed.indexOf(key)>=0;
}
/** Structural/privacy test only; live headers and compatibility remain unverified. */
function testPublicPayloadSafety() {
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
  const result={ok:topKeys&&privateCollectionsAbsent&&settingsSafe&&projectionSafe&&rowMetadataAbsent,
    expectedTopLevelKeysOnly:topKeys,privateCollectionsAbsent,settingsAllowlisted:settingsSafe,
    onlyAllowlistedFields:projectionSafe,rowMetadataAbsent,
    counts:{services:data.services.length,courses:data.courses.length,events:data.events.length,faq:data.faq.length,pages:data.pages.length,settings:data.settings.length,dailyContent:data.dailyContent.length,bookingContent:data.bookingContent.length},
    noWritesPerformed:true};
  console.log(JSON.stringify(result,null,2)); return result;
}
