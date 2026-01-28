# Google Sheets Connector Setup

Follow these steps to connect your webpage to your Google Sheet.

## 1. Google Apps Script Code

Copy this code into your Google Apps Script editor (`Extensions` > `Apps Script` in Google Sheets):

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Create headers once
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Week Start",
        "Name",
        "Type",
        "Item",
        "Hours",
        "Acknowledged",
        "Timestamp",
      ]);
    }

    // -----------------------------
    // ACKNOWLEDGE TASK
    // -----------------------------
    if (data.action === "acknowledge") {
      const rowNumber = data.rowNumber; // This is the actual row number in the sheet

      // Set Acknowledged column (column 6) to true
      sheet.getRange(rowNumber, 6).setValue(true);
      return ContentService.createTextOutput("Acknowledged");
    }

    // -----------------------------
    // CREATE NEW TASK
    // -----------------------------
    sheet.appendRow([
      data.weekStart,
      data.name,
      data.type,
      data.item,
      data.hours,
      false, // Acknowledged = false by default
      new Date().toLocaleString(),
    ]);

    return ContentService.createTextOutput("Inserted");
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();

  // Skip header row and map data with row numbers
  const data = rows.slice(1).map((row, index) => {
    return {
      rowNumber: index + 2, // Row number in sheet (1-indexed, +1 for header)
      weekStart: row[0],
      name: row[1],
      type: row[2],
      item: row[3],
      hours: row[4],
      acknowledged: row[5],
      timestamp: row[6],
    };
  });

  // Reverse to show newest first (descending order)
  data.reverse();

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
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
- Acknowledged (for acknowledgment status)
- Timestamp

**Note:** Row numbers are used as IDs internally (no separate ID column needed).
