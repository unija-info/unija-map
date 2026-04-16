// ------------------ USER CONFIGURATION ------------------
// (1) FILL IN YOUR DETAILS HERE
const USER_CONFIG = {
  GITHUB_USERNAME: "unija-info", // Your GitHub username
  REPO_NAME: "unija-map", // The name of your GitHub repository
  FILE_PATH: "kgb/data/kgb-map.json", // The path and name for the data file
  SHEET_NAME: "JSON DATA" // The name of the sheet tab with your data
};
// --------------------------------------------------------

/**
 * Creates a custom menu in the Google Sheet UI to run the update script.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Campus Map Guide')
    .addItem('Update Website Data', 'showUpdateConfirmation')
    .addToUi();
}

/**
 * Shows a confirmation dialog before running the update.
 */
function showUpdateConfirmation() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Confirm Update',
    'This will send the latest data from this sheet to the GitHub repository. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    updateGitHubFile();
  }
}

function updateGitHubFile() {
  const ui = SpreadsheetApp.getUi();
  
  // --- NEW: Define the exact headers we need for the JSON output ---
  const REQUIRED_HEADERS = [
    'number', 'place', 'googleMapLink', 'locationType', 'shortForm', 'details'
  ];
  
  const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!GITHUB_TOKEN) {
    ui.alert('Error', 'GitHub Token not found. Please run the "storeToken" function from the Apps Script editor to set it.', ui.ButtonSet.OK);
    return;
  }
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USER_CONFIG.SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${USER_CONFIG.SHEET_NAME}" not found!`);
    }

    const data = sheet.getDataRange().getValues();
    const headerRow = data.shift().map(h => h.toString().trim()); // Get headers and trim whitespace

    // --- NEW LOGIC: Find the column index for each required header ---
    const headerMap = {}; // This will store { headerName: columnIndex }
    REQUIRED_HEADERS.forEach(requiredHeader => {
      const index = headerRow.indexOf(requiredHeader);
      if (index === -1) {
        // If a required header is not found, stop and alert the user.
        throw new Error(`Required column header not found in the sheet: "${requiredHeader}"`);
      }
      headerMap[requiredHeader] = index;
    });
    // --- END OF NEW LOGIC ---

    // --- NEW LOGIC: Build the JSON array by selectively picking data ---
    const jsonArray = data.map(row => {
      // Skip empty rows to keep the JSON clean
      if (row.join('').trim() === '') return null;

      let obj = {};
      REQUIRED_HEADERS.forEach(header => {
        const columnIndex = headerMap[header];
        obj[header] = row[columnIndex];
      });
      return obj;
    }).filter(obj => obj !== null); // Remove any empty rows we skipped
    // --- END OF NEW LOGIC ---

    const jsonString = JSON.stringify(jsonArray, null, 2);
    const encodedContent = Utilities.base64Encode(jsonString, Utilities.Charset.UTF_8);
    
    const { GITHUB_USERNAME, REPO_NAME, FILE_PATH } = USER_CONFIG;
    const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`;

    const headersApi = {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json"
    };

    let sha = undefined;
    try {
      const getFileResponse = UrlFetchApp.fetch(apiUrl, { method: "GET", headers: headersApi, muteHttpExceptions: true });
      if (getFileResponse.getResponseCode() == 200) {
        sha = JSON.parse(getFileResponse.getContentText()).sha;
      }
    } catch (e) {
      // File doesn't exist, which is fine.
    }
    
    const payload = {
      message: `[Automated] Update map data from Google Sheet at ${new Date().toISOString()}`,
      content: encodedContent,
      sha: sha
    };

    const options = {
      method: "PUT",
      headers: headersApi,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    
    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      ui.alert('Success!', 'The website data has been successfully updated.', ui.ButtonSet.OK);
    } else {
      throw new Error(`GitHub API Error: ${response.getResponseCode()}\n${response.getContentText()}`);
    }

  } catch (e) {
    Logger.log(e);
    ui.alert('An Error Occurred', e.message, ui.ButtonSet.OK);
  }
}