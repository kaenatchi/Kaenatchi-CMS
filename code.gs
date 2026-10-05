const SPREADSHEET_ID = '1cf6SFL80xJ8YrBPlr_Fp9TYhkKGkhu2U45D2WTSyNz0';

const SHEETS = {
  services: 'Services',
  courses: 'Courses',
  events: 'Events',
  faq: 'FAQ',
  pages: 'Pages',
  settings: 'Settings'
};


/* =====================================================
   ADMIN PANEL
===================================================== */

function doGet(e) {

  const action =
    e &&
    e.parameter &&
    e.parameter.action
      ? e.parameter.action
      : '';

  /*
    اگر Mini App درخواست اطلاعات CMS بدهد،
    اطلاعات فعال را به صورت JSON برمی‌گردانیم.
  */

  if (action === 'getMiniAppData') {

    const result = getMiniAppData();

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }


  /*
    حالت عادی:
    نمایش پنل مدیریت CMS
  */

  return HtmlService
    .createTemplateFromFile('Admin')
    .evaluate()
    .setTitle('KaenatChi CMS')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}


/* =====================================================
   SPREADSHEET
===================================================== */

function getSpreadsheet_() {

  return SpreadsheetApp.openById(
    SPREADSHEET_ID
  );

}


function getSheet_(sheetName) {

  const sheet =
    getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet) {

    throw new Error(
      'برگه پیدا نشد: ' + sheetName
    );

  }

  return sheet;

}


/* =====================================================
   HEADERS
===================================================== */

function getHeaders_(sheet) {

  const lastColumn =
    sheet.getLastColumn();

  if (lastColumn === 0) {

    return [];

  }

  return sheet
    .getRange(
      1,
      1,
      1,
      lastColumn
    )
    .getValues()[0]
    .map(String);

}


/* =====================================================
   GET ALL DATA
===================================================== */

function getAllData_(sheetName) {

  const sheet =
    getSheet_(sheetName);

  const lastRow =
    sheet.getLastRow();

  const lastColumn =
    sheet.getLastColumn();


  if (lastColumn === 0) {

    return {
      headers: [],
      rows: []
    };

  }


  const headers =
    getHeaders_(sheet);


  if (lastRow < 2) {

    return {
      headers: headers,
      rows: []
    };

  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .getDisplayValues();


  const rows =
    values.map(function(row, index) {

      const obj = {
        _row: index + 2
      };


      headers.forEach(function(header, i) {

        obj[header] =
          row[i];

      });


      return obj;

    });


  return {
    headers: headers,
    rows: rows
  };

}


/* =====================================================
   GET CMS DATA
===================================================== */

function getCMSData() {

  return {

    services:
      getAllData_(
        SHEETS.services
      ),

    courses:
      getAllData_(
        SHEETS.courses
      ),

    events:
      getAllData_(
        SHEETS.events
      ),

    faq:
      getAllData_(
        SHEETS.faq
      ),

    pages:
      getAllData_(
        SHEETS.pages
      ),

    settings:
      getAllData_(
        SHEETS.settings
      )

  };

}


/* =====================================================
   ADD ITEM
===================================================== */

function addItem(sheetName, data) {

  const sheet =
    getSheet_(sheetName);

  const headers =
    getHeaders_(sheet);


  if (!headers.length) {

    throw new Error(
      'ردیف عنوان‌ها در برگه ' +
      sheetName +
      ' پیدا نشد.'
    );

  }


  const row =
    headers.map(function(header) {

      return data[header] !== undefined
        ? data[header]
        : '';

    });


  sheet.appendRow(row);


  return {

    success: true,

    message:
      'با موفقیت اضافه شد.'

  };

}


/* =====================================================
   UPDATE ITEM
===================================================== */

function updateItem(
  sheetName,
  rowNumber,
  data
) {

  const sheet =
    getSheet_(sheetName);

  const headers =
    getHeaders_(sheet);


  if (
    !rowNumber ||
    rowNumber < 2
  ) {

    throw new Error(
      'شماره ردیف نامعتبر است.'
    );

  }


  const row =
    headers.map(function(header) {

      return data[header] !== undefined
        ? data[header]
        : '';

    });


  sheet
    .getRange(
      rowNumber,
      1,
      1,
      headers.length
    )
    .setValues([row]);


  return {

    success: true,

    message:
      'با موفقیت ویرایش شد.'

  };

}


/* =====================================================
   DELETE ITEM
===================================================== */

function deleteItem(
  sheetName,
  rowNumber
) {

  const sheet =
    getSheet_(sheetName);


  if (
    !rowNumber ||
    rowNumber < 2
  ) {

    throw new Error(
      'شماره ردیف نامعتبر است.'
    );

  }


  sheet.deleteRow(
    rowNumber
  );


  return {

    success: true,

    message:
      'با موفقیت حذف شد.'

  };

}


/* =====================================================
   TOGGLE ACTIVE
===================================================== */

function toggleItem(
  sheetName,
  rowNumber
) {

  const sheet =
    getSheet_(sheetName);


  if (
    !rowNumber ||
    rowNumber < 2
  ) {

    throw new Error(
      'شماره ردیف نامعتبر است.'
    );

  }


  const activeColumn = 1;

  const cell =
    sheet.getRange(
      rowNumber,
      activeColumn
    );


  const current =
    String(
      cell.getDisplayValue()
    )
      .trim()
      .toLowerCase();


  const isActive =
    current === 'بله' ||
    current === 'فعال' ||
    current === 'true' ||
    current === '1' ||
    current === 'yes';


  cell.setValue(
    isActive
      ? 'خیر'
      : 'بله'
  );


  return {

    success: true,

    active:
      !isActive

  };

}


/* =====================================================
   DASHBOARD STATS
===================================================== */

function getDashboardStats() {

  const data =
    getCMSData();


  return {

    services:
      data.services.rows.length,

    courses:
      data.courses.rows.length,

    events:
      data.events.rows.length,

    faq:
      data.faq.rows.length,

    pages:
      data.pages.rows.length,

    settings:
      data.settings.rows.length

  };

}


/* =====================================================
   MINI APP API
===================================================== */

/*
  این تابع فقط اطلاعات فعال CMS
  را برای Mini App آماده می‌کند.
*/

function getMiniAppData() {

  const data =
    getCMSData();


  return {

    success: true,

    services:
      getActiveRows_(
        data.services.rows
      ),

    courses:
      getActiveRows_(
        data.courses.rows
      ),

    events:
      getActiveRows_(
        data.events.rows
      ),

    faq:
      getActiveRows_(
        data.faq.rows
      ),

    pages:
      getActiveRows_(
        data.pages.rows
      ),

    /*
      Settings فعلاً بدون فیلتر فعال بودن
      ارسال می‌شود چون این برگه ستون «فعال» ندارد.
    */

    settings:
      data.settings.rows

  };

}


/* =====================================================
   ACTIVE ROWS
===================================================== */

function getActiveRows_(rows) {

  return rows.filter(
    function(row) {

      const value =
        String(
          row['فعال'] || ''
        )
          .trim()
          .toLowerCase();


      return (

        value === 'بله' ||

        value === 'فعال' ||

        value === 'true' ||

        value === '1' ||

        value === 'yes'

      );

    }
  );

}


/* =====================================================
   TEST MINI APP DATA
===================================================== */

function testMiniAppData() {

  const result =
    getMiniAppData();


  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

}
