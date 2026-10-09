const SPREADSHEET_ID = '1cf6SFL80xJ8YrBPlr_Fp9TYhkKGkhu2U45D2WTSyNz0';

const SHEETS = {
  services: 'Services',
  courses: 'Courses',
  events: 'Events',
  faq: 'FAQ',
  pages: 'Pages',
  settings: 'Settings'
};

function doGet(e) {
  const action = e && e.parameter && e.parameter.action ? e.parameter.action : '';
  if (action === 'getMiniAppData') {
    return ContentService.createTextOutput(JSON.stringify(getMiniAppData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const page = e && e.parameter && e.parameter.page ? e.parameter.page : 'central';
  return HtmlService
    .createTemplateFromFile(page === 'central' ? 'Central' : 'Admin')
    .evaluate()
    .setTitle(page === 'central' ? 'پنل مدیریت کائنات‌چی' : 'KaenatChi CMS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function resolveSheetName_(sheetName) {
  const aliases={services:'Services',courses:'Courses',events:'Events',faq:'FAQ',pages:'Pages',settings:'Settings',dailyContent:'DailyContent',bookingContent:'BookingContent',bookingSettings:'BookingSettings',bookingLogs:'BookingLogs',blockedDates:'BlockedDates',blockedSlots:'BlockedSlots',bookings:'Bookings',customers:'Customers',payments:'Payments',schedule:'Schedule'};
  const requested=String(sheetName||''),ss=getSpreadsheet_(),candidates=[aliases[requested]||requested];
  if(requested==='bookingSettings'||requested==='BookingSettings')candidates.push('BookingSetings');
  for(var i=0;i<candidates.length;i++){var found=ss.getSheetByName(candidates[i]);if(found)return found;}
  throw new Error('برگه پیدا نشد: '+requested);
}
function getSheet_(sheetName){return resolveSheetName_(sheetName);}
function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1,1,1,lastColumn).getValues()[0].map(String);
}
function getAllData_(sheetName) {
  const sheet = getSheet_(sheetName), lastRow = sheet.getLastRow(), lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return {headers:[],rows:[]};
  const headers = getHeaders_(sheet);
  if (lastRow < 2) return {headers:headers,rows:[]};
  const values = sheet.getRange(2,1,lastRow-1,lastColumn).getDisplayValues();
  return {headers:headers,rows:values.map(function(row,index){
    const obj={_row:index+2};
    headers.forEach(function(header,i){obj[header]=row[i];});
    return obj;
  })};
}
function getOrCreateCmsSheet_(sheetName, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function ensureCmsHeaders_(sheet, requiredHeaders) {
  const existing = getHeaders_(sheet);
  const missing = requiredHeaders.filter(function(header) {
    return existing.indexOf(header) < 0;
  });
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function getCMSData() {
  /*
   * BookingSettings and Booking data live in the same authoritative
   * spreadsheet used by Booking Backend. BookingContent is CMS-only
   * presentation content, so it is provisioned here when missing.
   */
  const bookingContentSheet = getOrCreateCmsSheet_('BookingContent', [
    'کلید', 'عنوان', 'بخش', 'محتوا', 'لینک تصویر', 'ترتیب', 'فعال'
  ]);
  const dailyContentSheet = ensureCmsHeaders_(
    getOrCreateCmsSheet_('DailyContent', [
      'شناسه', 'عنوان', 'متن', 'لینک تصویر', 'دسته', 'فعال', 'تاریخ شروع', 'تاریخ پایان', 'ترتیب'
    ]),
    ['محل نمایش']
  );

  const settingsSheet=getSpreadsheet_().getSheetByName('BookingSettings')||getSpreadsheet_().getSheetByName('BookingSetings');
  return {
    services:getAllData_(SHEETS.services),courses:getAllData_(SHEETS.courses),events:getAllData_(SHEETS.events),
    faq:getAllData_(SHEETS.faq),pages:getAllData_(SHEETS.pages),settings:getAllData_(SHEETS.settings),
    dailyContent:{headers:getHeaders_(dailyContentSheet),rows:getAllData_('DailyContent').rows},
    bookingContent:{headers:getHeaders_(bookingContentSheet),rows:getAllData_('BookingContent').rows},
    bookingSettings:settingsSheet?getAllData_(settingsSheet.getName()):{headers:[],rows:[]},
    bookings:getAllData_('Bookings'),customers:getAllData_('Customers'),payments:getAllData_('Payments'),
    schedule:getAllData_('Schedule'),blockedDates:getAllData_('BlockedDates'),blockedSlots:getAllData_('BlockedSlots'),
    bookingLogs:getAllData_('BookingLogs')
  };
}

/*
 * Schedule is backend-owned configuration. The CMS is allowed to edit the
 * same authoritative Schedule sheet through this admin function; it never
 * creates a second schedule source.
 */
function saveBookingSchedule(rows) {
  if (!Array.isArray(rows)) throw new Error('ساختار زمان‌بندی نامعتبر است.');

  const sheet = getSheet_('Schedule');
  const headers = getHeaders_(sheet);
  const required = ['Day','Active','Start Time','End Time','Slot Duration'];

  required.forEach(function(h) {
    if (headers.indexOf(h) === -1) {
      throw new Error('ستون '+h+' در شیت Schedule پیدا نشد.');
    }
  });

  const dayIndex = headers.indexOf('Day');
  const activeIndex = headers.indexOf('Active');
  const startIndex = headers.indexOf('Start Time');
  const endIndex = headers.indexOf('End Time');
  const durationIndex = headers.indexOf('Slot Duration');

  const allowedDays = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  const seen = {};

  const normalized = rows.map(function(row, index) {
    const day = String(row.day || '').trim();
    const active = row.active === true || String(row.active).toLowerCase() === 'true' ||
      ['بله','فعال','1','yes'].indexOf(String(row.active).toLowerCase()) >= 0;
    const startTime = normalizeAdminTime_(row.startTime);
    const endTime = normalizeAdminTime_(row.endTime);
    const duration = Number(row.slotDuration || 30);

    if (allowedDays.indexOf(day) === -1) {
      throw new Error('روز ردیف '+(index+1)+' معتبر نیست.');
    }
    if (!startTime || !endTime || startTime >= endTime) {
      throw new Error('بازه ساعت ردیف '+(index+1)+' معتبر نیست.');
    }
    if (![15,30,60].includes(duration)) {
      throw new Error('مدت Slot در ردیف '+(index+1)+' باید 15، 30 یا 60 دقیقه باشد.');
    }

    const key = day+'|'+startTime+'|'+endTime;
    if (seen[key]) {
      throw new Error('بازه تکراری در زمان‌بندی وجود دارد: '+day+' '+startTime+' تا '+endTime);
    }
    seen[key] = true;

    return {day:day, active:active, startTime:startTime, endTime:endTime, slotDuration:duration};
  });

  const values = normalized.map(function(row) {
    const out = new Array(headers.length).fill('');
    out[dayIndex] = row.day;
    out[activeIndex] = row.active ? 'TRUE' : 'FALSE';
    out[startIndex] = row.startTime;
    out[endIndex] = row.endTime;
    out[durationIndex] = row.slotDuration;
    return out;
  });

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  if (values.length) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  return {ok:true, schedule:normalized};
}

function normalizeAdminTime_(value) {
  const s = String(value == null ? '' : value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  const h = Number(m[1]), min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return '';
  return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
}

/*
 * Booking Schedule is owned by the Booking Backend.
 * Central CMS reads it through the booking transport layer and never
 * creates, edits or deletes Schedule rows locally.
 */
var BOOKING_TRANSPORT_URL =
  'https://kaenatchi-booking-transport.mayanaz-oriflame.workers.dev/';

function parseBookingJsonResponse_(response, sourceName) {
  var status = response.getResponseCode();
  var text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(
      'پاسخ ' + sourceName + ' با وضعیت HTTP ' + status + ' دریافت شد.'
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      'پاسخ ' + sourceName + ' JSON معتبر نیست. ' +
      'ابتدای پاسخ: ' + String(text || '').slice(0, 180)
    );
  }
}

function getBookingSchedule() {
  var urls = [
    CENTRAL_BOOKING_WEB_APP_URL + '?action=getSchedule',
    BOOKING_TRANSPORT_URL + '?action=getSchedule'
  ];

  var lastError = null;

  for (var i = 0; i < urls.length; i++) {
    try {
      var response = UrlFetchApp.fetch(urls[i], {
        muteHttpExceptions: true,
        followRedirects: true
      });

      var data = parseBookingJsonResponse_(
        response,
        i === 0 ? 'Booking Backend' : 'Booking Transport'
      );

      if (data && data.ok === true) {
        return data;
      }

      lastError = new Error(
        data && data.message
          ? data.message
          : 'دریافت زمان‌بندی از سامانه رزرو ناموفق بود.'
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError && lastError.message
      ? lastError.message
      : 'دریافت زمان‌بندی از سامانه رزرو ناموفق بود.'
  );
}
function addItem(sheetName,data) {
  const sheet=getSheet_(sheetName),headers=getHeaders_(sheet);
  if(!headers.length) throw new Error('ردیف عنوان‌ها در برگه '+sheetName+' پیدا نشد.');
  sheet.appendRow(headers.map(function(header){return data[header]!==undefined?data[header]:'';}));
  return {success:true,message:'با موفقیت اضافه شد.'};
}
function updateItem(sheetName,rowNumber,data) {
  const sheet=getSheet_(sheetName),headers=getHeaders_(sheet);
  if(!rowNumber||rowNumber<2) throw new Error('شماره ردیف نامعتبر است.');
  sheet.getRange(rowNumber,1,1,headers.length).setValues([headers.map(function(header){return data[header]!==undefined?data[header]:'';})]);
  return {success:true,message:'با موفقیت ویرایش شد.'};
}
function deleteItem(sheetName,rowNumber) {
  const sheet=getSheet_(sheetName);
  if(!rowNumber||rowNumber<2) throw new Error('شماره ردیف نامعتبر است.');
  sheet.deleteRow(rowNumber);
  return {success:true,message:'با موفقیت حذف شد.'};
}
function toggleItem(sheetName,rowNumber) {
  const sheet=getSheet_(sheetName);
  if(!rowNumber||rowNumber<2) throw new Error('شماره ردیف نامعتبر است.');
  const headers=getHeaders_(sheet);
  const activeHeader=headers.indexOf('فعال')>=0?'فعال':headers.indexOf('Active')>=0?'Active':'';
  const column=activeHeader?headers.indexOf(activeHeader)+1:1;
  const cell=sheet.getRange(rowNumber,column),current=String(cell.getDisplayValue()).trim().toLowerCase();
  const active=current==='بله'||current==='فعال'||current==='true'||current==='1'||current==='yes';
  cell.setValue(active?'خیر':'بله');
  return {success:true,active:!active};
}
function getDashboardStats() {
  const data=getCMSData();
  return {services:data.services.rows.length,courses:data.courses.rows.length,events:data.events.rows.length,faq:data.faq.rows.length,pages:data.pages.rows.length,settings:data.settings.rows.length};
}
function getMiniAppData() {
  const data=getCMSData();
  return {success:true,services:getActiveRows_(data.services.rows),courses:getActiveRows_(data.courses.rows),events:getActiveRows_(data.events.rows),faq:getActiveRows_(data.faq.rows),pages:getActiveRows_(data.pages.rows),settings:data.settings.rows,dailyContent:getActiveRows_(data.dailyContent.rows),bookingContent:getActiveRows_(data.bookingContent.rows).sort(function(a,b){return (Number(a['ترتیب'])||0)-(Number(b['ترتیب'])||0);})};
}
function getActiveRows_(rows) {
  return rows.filter(function(row){
    const value=String(row['فعال']||'').trim().toLowerCase();
    return value==='بله'||value==='فعال'||value==='true'||value==='1'||value==='yes';
  });
}
function testMiniAppData() {
  console.log(JSON.stringify(getMiniAppData(),null,2));
}


/* =========================================================
   پنل مرکزی | پروکسی امن مدیریت Booking
========================================================= */

var CENTRAL_BOOKING_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyGSzpV9iHxMsVmceAI4i5KIhbsttuD5pOkDqRK58mx-QlP60CWjg2PZfU5miLgN2ssSw/exec';

function getBookingClosures() {
  var response = UrlFetchApp.fetch(
    CENTRAL_BOOKING_WEB_APP_URL + '?action=centralAdminClosures',
    { muteHttpExceptions: true }
  );
  var text = response.getContentText();
  var data = JSON.parse(text);
  if (!data || data.ok !== true) {
    throw new Error(data && data.message ? data.message : 'دریافت تعطیلی‌ها ناموفق بود.');
  }
  return data;
}

function addBookingClosure(payload) {
  return callBookingAdmin_({
    central_admin_action: 'addClosure',
    startDate: payload.startDate || '',
    endDate: payload.endDate || '',
    startTime: payload.startTime || '00:00',
    endTime: payload.endTime || '23:59',
    reason: payload.reason || ''
  });
}

function toggleBookingClosure(row) {
  return callBookingAdmin_({
    central_admin_action: 'toggleClosure',
    row: Number(row)
  });
}

function deleteBookingClosure(row) {
  return callBookingAdmin_({
    central_admin_action: 'deleteClosure',
    row: Number(row)
  });
}

function callBookingAdmin_(payload) {
  var response = UrlFetchApp.fetch(
    CENTRAL_BOOKING_WEB_APP_URL,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  var text = response.getContentText();
  var data = JSON.parse(text);

  if (!data || data.ok !== true) {
    throw new Error(data && data.message ? data.message : 'عملیات نوبت‌دهی ناموفق بود.');
  }

  return data;
}


function uploadDailyContentImage(dataUrl, fileName, mimeType) {
  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.indexOf('base64,') < 0) throw new Error('تصویر معتبر نیست.');
  var match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('فرمت تصویر پشتیبانی نمی‌شود.');
  var type = String(mimeType || match[1]).toLowerCase();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) throw new Error('فرمت مجاز: JPG، PNG، WebP یا GIF.');
  var bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('حجم تصویر باید کمتر از ۵ مگابایت باشد.');
  var safeName = String(fileName || 'kaenatchi-image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  var props = PropertiesService.getScriptProperties(), folderId = props.getProperty('KAENATCHI_DAILY_CONTENT_FOLDER_ID'), folder;
  if (folderId) { try { folder = DriveApp.getFolderById(folderId); } catch (e) { folder = null; } }
  if (!folder) { folder = DriveApp.createFolder('KaenatChi CMS Daily Content'); props.setProperty('KAENATCHI_DAILY_CONTENT_FOLDER_ID', folder.getId()); }
  var file = folder.createFile(Utilities.newBlob(bytes, type, safeName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {success:true, url:'https://drive.google.com/uc?export=view&id=' + file.getId(), fileId:file.getId(), name:file.getName()};
}

// Adds a curated starter library once, without duplicating rows on repeat runs.
// Images are optional; the Mini App keeps its branded visual fallback when none is attached.
function seedDailyContentStarterPack() {
  const sheet = getSheet_('dailyContent');
  const headers = getHeaders_(sheet);
  const existingIds = new Set(getAllData_('dailyContent').rows.map(function(row) {
    return String(row['شناسه'] || '').trim();
  }));
  const starter = [
    ['starter-mood-01','یک مکث کوچک','لازم نیست همه‌چیز همین امروز حل شود. گاهی کافی است چند نفس آرام بکشی و فقط قدم بعدی را ببینی.','تأمل','حال‌وهوای امروز'],
    ['starter-mood-02','با خودت مهربان‌تر باش','با خودت همان‌طور حرف بزن که با یک دوست عزیز حرف می‌زنی؛ با صبر، احترام و کمی مهربانی بیشتر.','یادآوری','حال‌وهوای امروز'],
    ['starter-mood-03','از نو شروع‌کردن','شروع دوباره همیشه پر سر و صدا نیست. گاهی فقط یک انتخاب کوچک و آرام است که مسیر روز را تغییر می‌دهد.','انگیزشی','حال‌وهوای امروز'],
    ['starter-mood-04','به ریتم خودت اعتماد کن','لازم نیست با سرعت دیگران پیش بروی. برای بعضی مسیرها، آهسته و پیوسته رفتن بهترین راه است.','تأمل','حال‌وهوای امروز'],
    ['starter-mood-05','یک گوشه برای آرامش','چند دقیقه از شلوغی فاصله بگیر؛ پنجره را باز کن، آب بنوش و اجازه بده ذهنت کمی خلوت شود.','عمومی','حال‌وهوای امروز'],
    ['starter-mood-06','همه‌چیز لازم نیست کامل باشد','گاهی نسخهٔ ساده و واقعیِ یک کار، از نسخهٔ بی‌نقصی که هیچ‌وقت شروع نمی‌شود ارزشمندتر است.','انگیزشی','حال‌وهوای امروز'],
    ['starter-mood-07','احساست را نام‌گذاری کن','اگر روز شلوغی داری، از خودت بپرس: الان دقیقاً چه احساسی دارم و به چه چیزی نیاز دارم؟ همین پرسش می‌تواند شروعی روشن باشد.','آموزشی','حال‌وهوای امروز'],
    ['starter-mood-08','به چیزهای کوچک توجه کن','نور روی دیوار، عطر چای یا چند دقیقه سکوت؛ گاهی لحظه‌های ساده کمک می‌کنند دوباره به اکنون برگردیم.','تأمل','حال‌وهوای امروز'],
    ['starter-mood-09','برای خودت جا باز کن','استراحت جایزه‌ای برای تمام‌کردن همهٔ کارها نیست. بخشی طبیعی از مراقبت از خودت است.','یادآوری','حال‌وهوای امروز'],
    ['starter-mood-10','یک قدم کافی است','وقتی مسیر بزرگ به نظر می‌رسد، آن را کوچک‌تر کن. امروز فقط یک قدم روشن و قابل انجام بردار.','انگیزشی','حال‌وهوای امروز'],
    ['starter-mood-11','به بدنت گوش بده','کمی مکث کن و ببین بدنت چه می‌گوید: حرکت می‌خواهد، آب، غذا، استراحت یا فقط چند لحظه سکوت؟','عمومی','حال‌وهوای امروز'],
    ['starter-mood-12','فضای تازه بساز','مرتب‌کردن یک گوشهٔ کوچک، خاموش‌کردن یک اعلان یا کنارگذاشتن یک کار غیرضروری می‌تواند فضا را سبک‌تر کند.','عمومی','حال‌وهوای امروز'],
    ['starter-mood-13','لازم نیست عجله کنی','بعضی پاسخ‌ها با فشار بیشتر پیدا نمی‌شوند. کمی فاصله بگیر و بعد با ذهنی آرام‌تر برگرد.','تأمل','حال‌وهوای امروز'],
    ['starter-mood-14','به انتخاب بعدی فکر کن','به‌جای قضاوت‌کردن تمام مسیر، از خودت بپرس: قدم بعدی که با ارزش‌هایم هماهنگ است چیست؟','آموزشی','حال‌وهوای امروز'],
    ['starter-mood-15','امروز را ساده‌تر کن','سه اولویت کافی است. بقیهٔ کارها را یادداشت کن تا لازم نباشد همه را هم‌زمان در ذهن نگه داری.','عمومی','حال‌وهوای امروز'],
    ['starter-mood-16','با کنجکاوی نگاه کن','به‌جای اینکه فوراً برای هر تجربه‌ای نتیجه‌گیری کنی، کمی کنجکاو بمان و ببین چه چیزی می‌توانی از آن یاد بگیری.','تأمل','حال‌وهوای امروز'],
    ['starter-suggest-01','یک تجربه برای خودت انتخاب کن','اگر دلت می‌خواهد زمانی را به خودت اختصاص بدهی، خدمات کائنات‌چی را ببین و گزینه‌ای را انتخاب کن که با نیاز امروزت هماهنگ است.','معرفی خدمات','پیشنهاد امروز'],
    ['starter-suggest-02','یادگیری را به تعویق نینداز','اگر موضوعی مدت‌هاست توجهت را جلب کرده، نگاهی به کلاس‌ها و دوره‌های کائنات‌چی بینداز و از یک قدم کوچک شروع کن.','آموزشی','پیشنهاد امروز'],
    ['starter-suggest-03','برای تجربه‌ای تازه جا باز کن','رویدادهای فعال کائنات‌چی را بررسی کن؛ شاید یک برنامهٔ تازه، فرصتی برای یادگیری یا آشنایی با تجربه‌ای متفاوت باشد.','معرفی خدمات','پیشنهاد امروز'],
    ['starter-suggest-04','از بین گزینه‌ها آگاهانه انتخاب کن','قبل از انتخاب خدمت یا کلاس، توضیحات را بخوان و ببین کدام گزینه با زمان، علاقه و نیاز فعلی‌ات تناسب بیشتری دارد.','آموزشی','پیشنهاد امروز'],
    ['starter-curated-01','مکثی برای خودت','یک یادآوری کوتاه برای روزهای پرمشغله: تو هم بخشی از فهرست کارهای مهمت هستی.','یادآوری','منتخب'],
    ['starter-curated-02','تمرین یک‌دقیقه‌ای','شانه‌هایت را رها کن، سه نفس آرام بکش و توجهت را برای چند لحظه به محیط اطرافت برگردان.','آموزشی','منتخب'],
    ['starter-curated-03','پرسشی برای نوشتن','این هفته چه چیزی انرژی‌ات را بیشتر می‌کند و چه چیزی بی‌دلیل از تو انرژی می‌گیرد؟ دو مورد از هر کدام بنویس.','تأمل','منتخب'],
    ['starter-curated-04','انتخاب آگاهانه','پیش از گفتن بله به یک کار تازه، از خودت بپرس آیا واقعاً برایش زمان و ظرفیت دارم؟','یادآوری','منتخب']
  ];
  const rowsToAdd = starter.filter(function(item) { return !existingIds.has(item[0]); });
  if (!rowsToAdd.length) {
    return {success:true, added:0, message:'بستهٔ محتوای شروع قبلاً اضافه شده است.'};
  }
  const nowOrder = getAllData_('dailyContent').rows.reduce(function(max, row) {
    return Math.max(max, Number(row['ترتیب']) || 0);
  }, 0);
  const values = rowsToAdd.map(function(item, index) {
    const record = {
      'شناسه':item[0], 'عنوان':item[1], 'متن':item[2], 'لینک تصویر':'',
      'دسته':item[3], 'فعال':'بله', 'تاریخ شروع':'', 'تاریخ پایان':'',
      'ترتیب':String(nowOrder + index + 1), 'محل نمایش':item[4]
    };
    return headers.map(function(header) { return record[header] == null ? '' : record[header]; });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  return {success:true, added:values.length, message:'محتوای شروع با موفقیت اضافه شد.'};
}

