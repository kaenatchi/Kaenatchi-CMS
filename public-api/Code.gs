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
  services:['شناسه','id','slug','نام خدمت','عنوان','نام','title','دسته','دسته‌بندی','category','توضیحات کامل','توضیح کوتاه','توضیحات','توضیح','description','text','قیمت','هزینه','price','مدت','مدت زمان','duration','فعال','active','status'],
  courses:['شناسه','id','slug','نام دوره','عنوان','نام','title','توضیحات کامل','توضیحات','توضیح کوتاه','توضیح','متن','description','text','قیمت','هزینه','price','base price','مدت','مدت زمان','duration','فعال','active','status'],
  events:['شناسه','id','slug','نام ایونت','عنوان','نام','title','توضیحات کامل','توضیحات','توضیح کوتاه','توضیح','متن','description','text','قیمت','هزینه','price','base price','مدت','مدت زمان','duration','فعال','active','status'],
  faq:['شناسه','id','slug','سؤال','سوال','پرسش','عنوان','نام','title','پاسخ','توضیحات','توضیح کوتاه','توضیح','متن','description','text','فعال','active','status'],
  pages:['شناسه','id','slug','کلید','key','نام صفحه','عنوان','نام','title','متن','توضیحات کامل','توضیحات','پاسخ','text','description','فعال','active','status'],
  dailyContent:['شناسه','id','عنوان','title','متن','محتوا','توضیحات','text','content','لینک تصویر','تصویر','image url','image','دسته','دسته‌بندی','category','فعال','active','status','تاریخ شروع','شروع','start date','تاریخ پایان','پایان','end date','ترتیب','order','محل نمایش','جایگاه نمایش','placement','display in'],
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
  return {
    success:true, services:getPublicRows_('services'), courses:getPublicRows_('courses'),
    events:getPublicRows_('events'), faq:getPublicRows_('faq'), pages:getPublicRows_('pages'),
    settings:getPublicSettings_(), dailyContent:getPublicRows_('dailyContent'),
    bookingContent:getPublicRows_('bookingContent')
  };
}
function getPublicRows_(name) {
  const sheetName=PUBLIC_SHEETS[name], fields=PUBLIC_FIELDS[name];
  if (!sheetName || !fields) throw new Error('Unknown public collection');
  const sheet=SpreadsheetApp.openById(PUBLIC_CMS_SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const nr=sheet.getLastRow(), nc=sheet.getLastColumn();
  if (nr<2 || nc<1) return [];
  const headers=sheet.getRange(1,1,1,nc).getDisplayValues()[0].map(String);
  const allowed=new Set(fields.map(normalizeHeader_));
  const indexes=[];
  headers.forEach((h,i)=>{if(allowed.has(normalizeHeader_(h)))indexes.push(i);});
  if (!indexes.length) return [];
  return sheet.getRange(2,1,nr-1,nc).getDisplayValues().map(row=>{
    const obj={};
    indexes.forEach(i=>{if(headers[i] && headers[i].trim())obj[headers[i]]=row[i];});
    return obj;
  }).filter(isPubliclyActive_);
}
function getPublicSettings_() {
  return getPublicRows_('settings').filter(row=>
    isPublicSettingKey_(firstValue_(row,['کلید','key','نام','name']))
  );
}
function isPubliclyActive_(row) {
  const raw=firstValue_(row,['فعال','active','status']);
  if (!raw) return true; // Match Main Mini App's behavior when no active field exists.
  return ['بله','فعال','true','1','yes'].indexOf(raw.trim().toLowerCase())>=0;
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
  return String(value||'').trim().toLowerCase().replace(/ي/g,'ی').replace(/ى/g,'ی').replace(/ك/g,'ک').replace(/[\\s_\\-]+/g,'');
}
/** Exact allowlist; confirm live Settings keys before deploying. */
function isPublicSettingKey_(rawKey) {
  const key=normalizeHeader_(rawKey);
  const allowed=[
    'hours','businesshours','hoursofoperation','ساعات','ساعاتکاری',
    'telegram','telegramurl','telegramlink','تلگرام','لینکتلگرام',
    'whatsapp','whatsappurl','whatsapplink','واتساپ','واتس‌اپ','لینکواتساپ',
    'instagram','instagramurl','instagramlink','اینستاگرام','لینکاینستاگرام',
    'channel','telegramchannel','telegramchannelurl','telegramchannellink','کانال','لینککانال','کانالتلگرام',
    'bookingcardnumber','شمارهکارت','کارتبانکی','bookingbankname','نامبانک','بانک',
    'bookingcardholder','صاحبکارت','نامصاحبکارت','بنام','بنـام',
    'bookingpaymenttext','توضیحپرداخت','متنپرداخت'
  ];
  return allowed.indexOf(key)>=0;
}
/** Structural/privacy test only; live headers and compatibility remain unverified. */
function testPublicPayloadSafety() {
  const data=getMiniAppData_();
  const expected=['success','services','courses','events','faq','pages','settings','dailyContent','bookingContent'].sort();
  const actual=Object.keys(data).sort();
  const topKeys=JSON.stringify(actual)===JSON.stringify(expected);
  const settingsSafe=data.settings.every(row=>isPublicSettingKey_(firstValue_(row,['کلید','key','نام','name'])));
  const rowMetadataAbsent=['services','courses','events','faq','pages','settings','dailyContent','bookingContent'].every(n=>data[n].every(row=>!Object.prototype.hasOwnProperty.call(row,'_row')));
  const result={ok:topKeys&&settingsSafe&&rowMetadataAbsent,expectedTopLevelKeysOnly:topKeys,privateCollectionsAbsent:true,settingsAllowlisted:settingsSafe,rowMetadataAbsent,
    counts:{services:data.services.length,courses:data.courses.length,events:data.events.length,faq:data.faq.length,pages:data.pages.length,settings:data.settings.length,dailyContent:data.dailyContent.length,bookingContent:data.bookingContent.length},
    noWritesPerformed:true};
  console.log(JSON.stringify(result,null,2)); return result;
}
