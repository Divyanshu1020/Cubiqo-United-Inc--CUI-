# Google Sheets Connector Setup

Follow these steps to connect your webpage to your Google Sheet.

## 1. Google Apps Script Code

Copy this code into your Google Apps Script editor (`Extensions` > `Apps Script` in Google Sheets):

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Check if sheet is empty to add headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Week Start",
        "Name",
        "Type",
        "Item",
        "Hours",
        "Timestamp",
      ]);
    }

    // Appends data to the next empty row
    sheet.appendRow([
      data.weekStart,
      data.name,
      data.type,
      data.item,
      data.hours,
      new Date().toLocaleString(),
    ]);

    return ContentService.createTextOutput("Success").setMimeType(
      ContentService.MimeType.TEXT
    );
  } catch (error) {
    return ContentService.createTextOutput(
      "Error: " + error.toString()
    ).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
```

## 2. Deployment Instructions

1. Click **Deploy** > **New Deployment**.
2. Select type **Web App**.
3. **Description**: Weekly Task App.
4. **Execute as**: Me.
5. **Who has access**: Anyone. (Important for the form to work).
6. Click **Deploy**.
7. Copy the **Web App URL**.

## 3. Link to Webpage

1. Open `index.html`.
2. Find the `<script>` tag at the bottom (around line 125).
3. Replace `'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'` with your copied URL.

Example:

```javascript
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

## 4. Column Structure

The code will automatically create these columns if the sheet is empty:

- Week Start
- Name
- Type
- Item
- Hours
- Timestamp
