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
  const page = e && e.parameter && e.parameter.page ? e.parameter.page : 'admin';
  return HtmlService
    .createTemplateFromFile(page === 'central' ? 'Central' : 'Admin')
    .evaluate()
    .setTitle(page === 'central' ? 'پنل مدیریت کائنات‌چی' : 'KaenatChi CMS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('برگه پیدا نشد: ' + sheetName);
  return sheet;
}
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
function getCMSData() {
  return {
    services:getAllData_(SHEETS.services),
    courses:getAllData_(SHEETS.courses),
    events:getAllData_(SHEETS.events),
    faq:getAllData_(SHEETS.faq),
    pages:getAllData_(SHEETS.pages),
    settings:getAllData_(SHEETS.settings)
  };
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
  const cell=sheet.getRange(rowNumber,1),current=String(cell.getDisplayValue()).trim().toLowerCase();
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
  return {success:true,services:getActiveRows_(data.services.rows),courses:getActiveRows_(data.courses.rows),events:getActiveRows_(data.events.rows),faq:getActiveRows_(data.faq.rows),pages:getActiveRows_(data.pages.rows),settings:data.settings.rows};
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
