/**
 * Google Apps Script for Michael Rodenkirch Website
 * 
 * SETUP INSTRUCTIONS:
 * 1. In Google Sheets, go to Extensions > Apps Script
 * 2. Delete any existing code and paste this entire file
 * 3. Save the script
 * 4. Click "Run" > "initializeSheets" to set up the sheet structure automatically
 * 5. Go to Project Settings (gear icon) > Script Properties
 * 6. Add property: GITHUB_TOKEN = [Your GitHub Personal Access Token]
 * 7. Add property: GITHUB_REPO = autumngreenbean/michaels-website
 * 8. (Optional) Add property: NOTIFICATION_EMAIL = [recipient email]
 *    If omitted, notifications default to autumnjingg@gmail.com
 * 9. Run "authorizeMailApp" and APPROVE the permission popup when it appears
 *    - Look for permission dialog in your browser
 *    - Click "Review permissions" > select account > "Allow"
 *    - If no popup: check browser popup blocker settings
 * 10. Run "testMailAppSimple" to verify email sending works
 * 11. Check your inbox and spam folder for test email
 * 12. Click "Deploy" > "Manage deployments" and create NEW deployment version
 * 13. Set deployment to: Execute as: "Me" | Access: "Anyone"
 * 14. Copy the NEW Web App URL
 * 15. Paste that URL into config.js on your website
 * 
 * AUTOMATIC UPDATES:
 * - Whenever you edit the sheet, it automatically updates the website JSON file
 * - Run installTrigger to enable automatic updates on sheet edits
 */

/**
 * Configuration - uses Script Properties for security
 */
function getConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const configuredNotificationEmail = scriptProperties.getProperty('NOTIFICATION_EMAIL');

  return {
    githubToken: scriptProperties.getProperty('GITHUB_TOKEN'),
    githubRepo: scriptProperties.getProperty('GITHUB_REPO') || 'autumngreenbean/michaels-website',
    githubBranch: 'main',
    githubFilePath: 'data/content.json',
    notificationEmail: (configuredNotificationEmail || 'rodenkirch2@gmail.com').trim()
  };
}

// ============================================================
// FIRST-TIME INIT: Populate data/content.json from all sheets
// ============================================================

/**
 * Run ONCE to push all sheet data to data/content.json on GitHub.
 * Skips 'Drafts' and 'Control' sheets.
 * Run: Extensions > Apps Script > initializeJSONFromSheet
 */
function initializeJSONFromSheet() {
  const config = getConfig();
  if (!config.githubToken) throw new Error('GITHUB_TOKEN not set in Script Properties.');

  const data = buildContentJSON();

  const getUrl = `https://api.github.com/repos/${config.githubRepo}/contents/${config.githubFilePath}`;
  const authHeaders = {
    'Authorization': 'token ' + config.githubToken,
    'Accept': 'application/vnd.github.v3+json'
  };

  const getRes = UrlFetchApp.fetch(getUrl, { method: 'get', headers: authHeaders, muteHttpExceptions: true });
  let sha = null;
  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  }

  const payload = {
    message: 'Initialize JSON cache from Google Sheets',
    content: Utilities.base64Encode(JSON.stringify(data, null, 2)),
    branch: config.githubBranch
  };
  if (sha) payload.sha = sha;

  const putRes = UrlFetchApp.fetch(getUrl, {
    method: 'put',
    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (putRes.getResponseCode() === 200 || putRes.getResponseCode() === 201) {
    SpreadsheetApp.getUi().alert('✅ JSON cache initialized on GitHub.');
  } else {
    throw new Error('GitHub push failed: ' + putRes.getContentText());
  }
}

// ============================================================
// INCREMENTAL UPDATE: Process asterisk-marked rows via Control
// ============================================================

/**
 * Reads sheet names from Control!B2:B* (one per cell, stop at first empty).
 * For each sheet, finds rows where col A = '*', collects col B/C/D,
 * removes the asterisk, updates JSON on GitHub, logs to Control!B3,
 * then resets Control!B2 to 'Ready for changes'.
 */
function processControlSheetUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const control = ss.getSheetByName('Control');
  if (!control) throw new Error('"Control" sheet not found.');

  // Collect sheet names from B2 downward
  const markedSheets = [];
  const ctrlVals = control.getRange('B2:B100').getValues();
  for (let i = 0; i < ctrlVals.length; i++) {
    const name = String(ctrlVals[i][0] || '').trim();
    if (!name) break;
    markedSheets.push(name);
  }

  if (markedSheets.length === 0) {
    SpreadsheetApp.getUi().alert('No sheet names found in Control B2:B*');
    return;
  }

  const changedLog = [];

  for (const sheetName of markedSheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) { console.warn('Sheet not found: ' + sheetName); continue; }

    const rows = sheet.getDataRange().getValues();
    const entries = [];

    for (let r = 0; r < rows.length; r++) {
      if (String(rows[r][0] || '').trim() !== '*') continue;
      entries.push({
        header:    String(rows[r][1] || '').trim(),
        subheader: String(rows[r][2] || '').trim(),
        body:      String(rows[r][3] || '').trim()
      });
      sheet.getRange(r + 1, 1).setValue(''); // remove asterisk
      changedLog.push(`${sheetName}!A${r + 1}`);
    }

    if (entries.length > 0) updateJSONForSheet(sheetName, entries);
  }

  // Write log to Control!B3
  const logMsg = changedLog.length
    ? `Updated ${markedSheets.join(', ')} | Cells: ${changedLog.join(', ')} | ${new Date().toLocaleString()}`
    : `No asterisk rows found in: ${markedSheets.join(', ')} | ${new Date().toLocaleString()}`;
  control.getRange('B3').setValue(logMsg);

  // Clear B2:B* and reset B2
  control.getRange('B2:B100').clearContent();
  control.getRange('B2').setValue('Ready for changes');

  SpreadsheetApp.getUi().alert('✅ Updates complete.\n\n' + logMsg);
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Builds a full content JSON object from all sheets except Drafts/Control.
 * Columns: A=identifier, B=header, C=subheader, D=body.
 * Skips rows with empty col B (excluding row 1 header row).
 */
function buildContentJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = { _metadata: { sheets: [], lastModified: new Date().toISOString() } };

  for (const sheet of ss.getSheets()) {
    const name = sheet.getName();
    if (name === 'Drafts' || name === 'Control') continue;

    const rows = sheet.getDataRange().getValues();
    const entries = [];

    for (let r = 1; r < rows.length; r++) { // skip row 0 (header)
      const header = String(rows[r][1] || '').trim();
      if (!header) continue;
      entries.push({
        header,
        subheader: String(rows[r][2] || '').trim(),
        body:      String(rows[r][3] || '').trim()
      });
    }

    if (entries.length > 0) {
      data[name] = entries;
      data._metadata.sheets.push(name);
    }
  }

  return data;
}

/**
 * Fetches current data/content.json from GitHub, merges the updated sheet entries,
 * and pushes the result back.
 */
function updateJSONForSheet(sheetName, entries) {
  const config = getConfig();
  if (!config.githubToken) throw new Error('GITHUB_TOKEN not set in Script Properties.');

  const url = `https://api.github.com/repos/${config.githubRepo}/contents/${config.githubFilePath}`;
  const headers = {
    'Authorization': 'token ' + config.githubToken,
    'Accept': 'application/vnd.github.v3+json'
  };

  const getRes = UrlFetchApp.fetch(url, { method: 'get', headers, muteHttpExceptions: true });
  let current = { _metadata: { sheets: [], lastModified: '' } };
  let sha = null;

  if (getRes.getResponseCode() === 200) {
    const parsed = JSON.parse(getRes.getContentText());
    sha = parsed.sha;
    const decoded = Utilities.base64Decode(parsed.content);
    current = JSON.parse(Utilities.newBlob(decoded).getAsString());
  }

  current[sheetName] = entries;
  current._metadata = current._metadata || {};
  current._metadata.lastModified = new Date().toISOString();
  if (!current._metadata.sheets) current._metadata.sheets = [];
  if (!current._metadata.sheets.includes(sheetName)) current._metadata.sheets.push(sheetName);

  const payload = {
    message: `Update ${sheetName} from Google Sheets`,
    content: Utilities.base64Encode(JSON.stringify(current, null, 2)),
    branch: config.githubBranch,
    sha
  };

  const putRes = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (putRes.getResponseCode() !== 200 && putRes.getResponseCode() !== 201) {
    throw new Error(`GitHub push failed for ${sheetName}: ` + putRes.getContentText());
  }
}

/**
 * Install trigger to auto-update GitHub on sheet edit
 * Run this function once: Run > installTrigger
 */
function installTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Install new trigger for future edits only
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  
  SpreadsheetApp.getUi().alert(
    'Trigger Installed!',
    'The website will now automatically update when you edit the sheet.\n\n' +
    'Run "updateGitHubFile" manually to push the current data to the website right now.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Called automatically when sheet is edited (with debouncing)
 */
function onSheetEdit(e) {
  // Debounce - wait 5 seconds for multiple edits, then update
  Utilities.sleep(5000);
  
  try {
    updateGitHubFile();
  } catch (error) {
    console.error('Auto-update failed:', error);
    // Don't show error to user during auto-update
  }
}

/**
 * Update the JSON file on GitHub with current sheet data
 * Can also be run manually: Run > updateGitHubFile
 */
function updateGitHubFile() {
  const config = getConfig();
  
  if (!config.githubToken) {
    throw new Error('GitHub token not configured. Add GITHUB_TOKEN to Script Properties.');
  }
  
  // Get all data from sheets
  const data = getAllData();
  
  // Get current file from GitHub to get its SHA
  const getUrl = `https://api.github.com/repos/${config.githubRepo}/contents/${config.githubFilePath}`;
  const getOptions = {
    method: 'get',
    headers: {
      'Authorization': 'token ' + config.githubToken,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };
  
  const getResponse = UrlFetchApp.fetch(getUrl, getOptions);
  const getResult = JSON.parse(getResponse.getContentText());
  
  // Update file on GitHub
  const putUrl = `https://api.github.com/repos/${config.githubRepo}/contents/${config.githubFilePath}`;
  const content = Utilities.base64Encode(JSON.stringify(data, null, 2));
  
  const putPayload = {
    message: 'Auto-update content from Google Sheets',
    content: content,
    branch: config.githubBranch,
    sha: getResult.sha
  };
  
  const putOptions = {
    method: 'put',
    headers: {
      'Authorization': 'token ' + config.githubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(putPayload),
    muteHttpExceptions: true
  };
  
  const putResponse = UrlFetchApp.fetch(putUrl, putOptions);
  const putResult = JSON.parse(putResponse.getContentText());
  
  if (putResponse.getResponseCode() === 200) {
    console.log('✅ GitHub file updated successfully!');
    return { success: true, message: 'Content updated on website' };
  } else {
    console.error('GitHub API Error:', putResult);
    throw new Error('Failed to update GitHub: ' + putResult.message);
  }
}

/**
 * Run this function ONCE to automatically set up your sheet structure
 * Go to: Run > initializeSheets
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or get Tab 1: Biography Discography Events Video Links
  let tab1 = ss.getSheetByName('Biography Discography Events Video Links');
  if (!tab1) {
    // Create new sheet or rename first sheet
    const sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getName() === 'Sheet1') {
      tab1 = sheets[0].setName('Biography Discography Events Video Links');
    } else {
      tab1 = ss.insertSheet('Biography Discography Events Video Links');
    }
  }
  
  // Set up Tab 1 structure
  setupTab1(tab1);
  
  // Create or get Tab 2: CONTACT SUBMISSIONS
  let tab2 = ss.getSheetByName('CONTACT SUBMISSIONS');
  if (!tab2) {
    tab2 = ss.insertSheet('CONTACT SUBMISSIONS');
  }
  
  // Set up Tab 2 structure
  setupTab2(tab2);
  
  // Create or get Tab 3: EVENTS
  let tab3 = ss.getSheetByName('EVENTS');
  if (!tab3) {
    tab3 = ss.insertSheet('EVENTS');
  }
  
  // Set up Tab 3 structure
  setupTab3(tab3);
  
  // Success message
  SpreadsheetApp.getUi().alert(
    'Sheet Setup Complete!',
    'Your sheet structure has been created with:\n\n' +
    '✅ Biography Discography Events Video Links\n' +
    '✅ CONTACT SUBMISSIONS\n' +
    '✅ EVENTS\n\n' +
    'You can now add your content and deploy the web app!',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Set up Tab 1: Biography Discography Events Video Links
 */
function setupTab1(sheet) {
  // Clear existing content
  sheet.clear();
  
  // Set column widths
  sheet.setColumnWidth(1, 120);  // Column A
  sheet.setColumnWidth(2, 400);  // Column B
  sheet.setColumnWidth(3, 100);  // Column C
  sheet.setColumnWidth(4, 200);  // Column D
  
  // DISCOGRAPHY SECTION (Rows 1-10)
  sheet.getRange('A1').setValue('Discography').setFontWeight('bold');
  sheet.getRange('B1').setValue('Title').setFontWeight('bold');
  sheet.getRange('C1').setValue('Year').setFontWeight('bold');
  sheet.getRange('D1').setValue('Association').setFontWeight('bold');
  
  // Add sample discography data
  const sampleDiscography = [
    ['Live at the Churchill School', '2021', 'Rob Scheps and the TBA Band'],
    ['Just Us, Just We', '2021', 'Shaymus Hanlin Quartet'],
    ['M.J. LIVE! Volume 2 (Trio Sessions)', '2023', 'M.J. Johnston'],
    ['Introducing the Jonathan Arcangel Quartet', '2023', 'Jonathan Arcangel'],
    ['The Stuff of Dreams', '2024', 'M.J. Johnston'],
    ['Live at Blue Butler', '2025', 'Wyatt Button']
  ];
  sheet.getRange(2, 2, sampleDiscography.length, 3).setValues(sampleDiscography);
  
  // BIOGRAPHY SECTION (Row 11)
  sheet.getRange('A11').setValue('Biography').setFontWeight('bold').setFontSize(12);
  const bioText = 'Michael Rodenkirch is a drummer, arranger, composer, and educator based in Portland, OR. ' +
    'He graduated from the University of North Texas in the winter of 2024 with a Bachelor of Arts degree in Music with a minor in History. ' +
    'Michael has a plethora of playing experience playing anything from musicals to playing jazz festivals. ' +
    'He has studied with many great musicians including Alan Jones, Quincy Davis, Richard DeRosa, and Chuck Israels. ' +
    'Since graduating, Michael has played as a member of the Chuck Israels trio and the Chuck Israels Orchestra. ' +
    'Through that experience and others, Michael has shared the stage playing with Portland legends such as Randy Porter, Joe Bagg, David Evans, Paul Mazzio, George Colligan, Darrell Grant, Kerry Politzer, Quinn Walker, Kiran Raphael, Wyatt Button, David Barber, and many more. ' +
    'As an educator, Michael has taught private lessons for 8 years. He teaches drum set, piano, guitar, music theory, and composition. ' +
    'He currently teaches at Lakeridge High School and Grant High School as a rhythm section coach.';
  
  // Merge cells B11:I23 for biography
  sheet.getRange('B11:I23').merge().setValue(bioText).setWrap(true).setVerticalAlignment('top');
  
  // VIDEO LINKS SECTION (Starting at Row 25)
  sheet.getRange('A25').setValue('Portfolio Videos').setFontWeight('bold').setFontSize(12);
  sheet.getRange('B25').setValue('YouTube Video ID').setFontWeight('bold');
  sheet.getRange('C25').setValue('Video Title').setFontWeight('bold');
  
  // Add sample videos
  const sampleVideos = [
    ['zpt7ffA5-Wc', 'Drum Set senior recital Mixed'],
    ['6dyFDNnSiY4', 'Laverne Walk'],
    ['11KM_ZOdqhA', 'White Christmas - The Rob Scheps Quartet'],
    ['BOV5sTbQxkQ', 'Para Volar'],
    ['P2xUt77qvDI', 'Lullaby in Blue (Concert Choir); MWC Concert'],
    ['aOg7lmnAd5E', 'The Song Is You']
  ];
  sheet.getRange(26, 2, sampleVideos.length, 2).setValues(sampleVideos);
  
  // Format header rows
  sheet.getRange('A1:D1').setBackground('#d9ead3');
  sheet.getRange('A11').setBackground('#c9daf8');
  sheet.getRange('A25:C25').setBackground('#fff2cc');
  
  // Freeze first row
  sheet.setFrozenRows(1);
}

/**
 * Set up Tab 2: CONTACT SUBMISSIONS
 */
function setupTab2(sheet) {
  // Clear existing content
  sheet.clear();
  
  // Set column widths
  sheet.setColumnWidth(1, 150);  // Name
  sheet.setColumnWidth(2, 250);  // Email
  sheet.setColumnWidth(3, 120);  // Instrument
  sheet.setColumnWidth(4, 150);  // Inquiry Type
  sheet.setColumnWidth(5, 400);  // Additional Notes
  sheet.setColumnWidth(6, 180);  // Timestamp
  
  // Set headers
  const headers = [['Name', 'Email', 'Instrument', 'Inquiry Type', 'Additional Notes', 'Timestamp']];
  sheet.getRange('A1:F1').setValues(headers).setFontWeight('bold').setBackground('#f3f3f3');
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

/**
 * Set up Tab 3: EVENTS
 */
function setupTab3(sheet) {
  // Clear existing content
  sheet.clear();
  
  // Set column widths
  sheet.setColumnWidth(1, 250);  // Event
  sheet.setColumnWidth(2, 150);  // Location
  sheet.setColumnWidth(3, 120);  // Date
  sheet.setColumnWidth(4, 100);  // Time
  sheet.setColumnWidth(5, 300);  // Additional Notes
  
  // Set headers
  const headers = [['Event', 'Location', 'Date', 'Time', 'Additional Notes']];
  sheet.getRange('A1:E1').setValues(headers).setFontWeight('bold').setBackground('#f3f3f3');
  
  // Add sample events
  const sampleEvents = [
    ['SUNDAY AFTERNOON JAZZ', 'FOXTROT', 'JULY 13', '4PM', ''],
    ['SHAYMUS HAMLIN QUARTET', '1905', 'AUGUST 15', '10:15PM', '']
  ];
  sheet.getRange(2, 1, sampleEvents.length, 5).setValues(sampleEvents);
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

function doGet(e) {
  const action = e.parameter.action || 'getAllData';
  
  try {
    let result;
    
    switch(action) {
      case 'getAllData':
        result = getAllData();
        break;
      
      case 'getBiography':
        result = getBiography();
        break;
      
      case 'getDiscography':
        result = getDiscography();
        break;
      
      case 'getEvents':
        result = getEvents();
        break;
      
      case 'getVideos':
        result = getVideos();
        break;
      
      default:
        result = { error: 'Invalid action' };
    }
    
    // Return with CORS headers
    return createCorsResponse(result);
  } catch(error) {
    return createCorsResponse({ error: error.toString() });
  }
}

/**
 * Create a response with CORS headers to allow cross-origin requests
 */
function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Note: Apps Script Web Apps automatically handle CORS when deployed as "Anyone"
  // But we return proper JSON format
  return output;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'submitContact';
    
    if (action === 'submitContact') {
      return ContentService.createTextOutput(JSON.stringify(submitContactForm(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get all website data in one request
 */
function getAllData() {
  return {
    biography: getBiography(),
    discography: getDiscography(),
    events: getEvents(),
    videos: getVideos(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get biography text from the sheet
 * Expected format: Cell B11 contains the biography text
 */
function getBiography() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Biography Discography Events Video Links');
  if (!sheet) {
    throw new Error('Sheet "Biography Discography Events Video Links" not found');
  }
  
  // Biography is in cell B11 (merged B11:I23 in your export)
  const bioText = sheet.getRange('B11').getValue();
  
  return {
    text: bioText || ''
  };
}

/**
 * Get discography entries
 * Expected format: Starting at row 2, columns B (Title), C (Year), D (Association)
 */
function getDiscography() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Biography Discography Events Video Links');
  if (!sheet) {
    throw new Error('Sheet "Biography Discography Events Video Links" not found');
  }
  
  // Get discography data starting from row 2
  // Row 1 has headers: Title, Year, Association
  const dataRange = sheet.getRange('B2:D50'); // Adjust range as needed
  const values = dataRange.getValues();
  
  const discography = [];
  
  for (let i = 0; i < values.length; i++) {
    const [title, year, association] = values[i];
    
    // Stop at first empty row
    if (!title && !year && !association) {
      break;
    }
    
    // Only add if at least title is present
    if (title) {
      discography.push({
        title: title.toString().trim(),
        year: year ? year.toString().trim() : '',
        association: association ? association.toString().trim() : ''
      });
    }
  }
  
  return discography;
}

/**
 * Get video links for portfolio
 * Expected format: Starting at row 25 (after bio section)
 * Columns: B (YouTube Video ID), C (Title/Description)
 */
function getVideos() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Biography Discography Events Video Links');
  if (!sheet) {
    throw new Error('Sheet "Biography Discography Events Video Links" not found');
  }
  
  // Get video data starting from row 25
  const dataRange = sheet.getRange('B25:C50'); // Adjust range as needed
  const values = dataRange.getValues();
  
  const videos = [];
  
  for (let i = 0; i < values.length; i++) {
    const [videoId, title] = values[i];
    
    // Stop at first empty row
    if (!videoId && !title) {
      break;
    }
    
    // Only add if video ID is present
    if (videoId) {
      videos.push({
        id: videoId.toString().trim(),
        title: title ? title.toString().trim() : 'Untitled Video'
      });
    }
  }
  
  return videos;
}

/**
 * Get events from the EVENTS sheet
 * Expected format: Columns A (Event), B (Location), C (Date), D (Time), E (Additional Notes)
 */
function getEvents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('EVENTS');
  if (!sheet) {
    throw new Error('Sheet "EVENTS" not found');
  }
  
  // Get events starting from row 2 (row 1 has headers)
  const dataRange = sheet.getRange('A2:E50'); // Adjust range as needed
  const values = dataRange.getValues();
  
  const events = [];
  
  for (let i = 0; i < values.length; i++) {
    const [event, location, date, time, notes] = values[i];
    
    // Stop at first empty row
    if (!event && !location && !date) {
      break;
    }
    
    // Only add if event name is present
    if (event) {
      events.push({
        title: event.toString().trim(),
        location: location ? location.toString().trim() : '',
        date: date ? formatDate(date) : '',
        time: time ? time.toString().trim() : '',
        notes: notes ? notes.toString().trim() : ''
      });
    }
  }
  
  return events;
}

/**
 * Submit contact form data to the CONTACT SUBMISSIONS sheet
 */
function submitContactForm(data) {
  const config = getConfig();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONTACT SUBMISSIONS');
  if (!sheet) {
    throw new Error('Sheet "CONTACT SUBMISSIONS" not found');
  }

  const submission = {
    name: (data.name || '').toString().trim(),
    email: (data.email || '').toString().trim(),
    instrument: (data.instrument || '').toString().trim(),
    inquiryType: (data.inquiryType || '').toString().trim(),
    message: (data.message || '').toString().trim(),
    timestamp: new Date()
  };
  
  // Append new row with form data
  // Columns: Name, Email, Instrument, Inquiry Type, Additional Notes
  sheet.appendRow([
    submission.name,
    submission.email,
    submission.instrument,
    submission.inquiryType,
    submission.message,
    submission.timestamp.toLocaleString() // Add timestamp
  ]);

  // Send notification email after save. Failures are logged but do not block submissions.
  let notificationStatus = { success: true, recipients: [] };
  try {
    notificationStatus = sendContactSubmissionNotification(submission, config.notificationEmail);
    logEmailAttempt(submission, config.notificationEmail, true);
  } catch (error) {
    notificationStatus = {
      success: false,
      recipients: [],
      message: error.toString()
    };
    console.error('Contact notification email failed:', error);
    logEmailAttempt(submission, config.notificationEmail, false, error.toString());
  }

  console.log('Contact submission processed:', {
    email: submission.email,
    notificationStatus: notificationStatus
  });
  
  return {
    success: true,
    message: 'Form submitted successfully',
    notification: notificationStatus
  };
}

/**
 * Send an email notification when a new contact form is submitted.
 * 
 * IMPORTANT: This email is sent FROM the Google Account that owns the Apps Script
 * (the account you used to deploy). It should appear as:
 *   From: [Your Google Account Email]
 * If you deployed with a different account than autumnjingg@gmail.com,
 * emails may go to spam. Check spam folder or forward/delegate the script to the correct account.
 */
function sendContactSubmissionNotification(submission, recipientEmail) {
  const recipients = normalizeRecipientEmails(recipientEmail);
  if (recipients.length === 0) {
    return {
      success: false,
      recipients: [],
      message: 'No valid notification recipient configured.'
    };
  }

  const remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota <= 0) {
    throw new Error('MailApp daily quota exhausted.');
  }

  const submittedAt = Utilities.formatDate(
    submission.timestamp,
    Session.getScriptTimeZone() || 'America/Los_Angeles',
    'yyyy-MM-dd HH:mm:ss z'
  );

  const safe = value => value || '(not provided)';
  const subject = `New contact form submission: ${safe(submission.name)}`;

  const bodyLines = [
    'A new contact form was submitted on michaelrodenkirch.com.',
    '',
    `Name: ${safe(submission.name)}`,
    `Email: ${safe(submission.email)}`,
    `Instrument: ${safe(submission.instrument)}`,
    `Inquiry Type: ${safe(submission.inquiryType)}`,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    safe(submission.message)
  ];

  const emailBody = bodyLines.join('\n');
  const recipientList = recipients.join(',');

  const emailOptions = {};
  if (submission.email && isLikelyEmail(submission.email)) {
    emailOptions.replyTo = submission.email;
  }

  try {
    MailApp.sendEmail(recipientList, subject, emailBody, emailOptions);
    console.log('Email sent successfully to:', recipientList);
  } catch (sendError) {
    throw new Error('MailApp.sendEmail() failed: ' + sendError.toString());
  }

  return {
    success: true,
    recipients: recipients,
    quotaRemaining: remainingQuota - 1
  };
}

/**
 * Normalize NOTIFICATION_EMAIL into validated recipient addresses.
 * Supports comma or semicolon separated lists.
 */
function normalizeRecipientEmails(recipientEmail) {
  if (!recipientEmail) {
    return [];
  }

  return recipientEmail
    .split(/[;,]/)
    .map(email => email.trim())
    .filter(email => !!email)
    .filter(isLikelyEmail);
}

/**
 * Lightweight email format check.
 */
function isLikelyEmail(value) {
  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString().trim());
}

/**
 * Authorize MailApp by requesting send_mail permission.
 * CRITICAL: When you click Run > authorizeMailApp:
 * 1. Look for a popup asking for permissions (usually top right)
 * 2. Click "Review permissions" or similar
 * 3. Select your Google account
 * 4. Click "Allow" on the permission screen
 * 5. If no popup appears, check browser settings for blocked popups
 * 6. After authorization succeeds, redeploy the web app
 */
function authorizeMailApp() {
  try {
    console.log('Attempting to authorize MailApp with send_mail scope...');
    
    // Request permission by actually sending a test email
    // This is more reliable than just checking quota
    const testRecipient = Session.getActiveUser().getEmail();
    const testSubject = 'Authorization Test - Michael Rodenkirch Apps Script';
    const testBody = 'This email confirms that MailApp authorization succeeded.';
    
    MailApp.sendEmail(testRecipient, testSubject, testBody);
    console.log('Authorization successful - test email sent to:', testRecipient);
    
    SpreadsheetApp.getUi().alert(
      'Authorization Granted!',
      'MailApp send_mail permission has been granted.\n\n' +
      'A test email was sent to: ' + testRecipient + '\n\n' +
      'Next steps:\n' +
      '1. Check your inbox for the test email\n' +
      '2. Go to Apps Script > Deploy > Manage deployments\n' +
      '3. Click the web app deployment\n' +
      '4. Click the 3-dot menu and select "Create new version"\n' +
      '5. Or redeploy it as a new version to include the new scope\n' +
      '6. Then test form submissions\n\n' +
      'After deployment, run testMailAppSimple() to verify.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    console.error('Authorization error:', error);
    SpreadsheetApp.getUi().alert(
      'ERROR - Authorization Not Granted',
      'Did you see a permission popup and click "Allow"?\n\n' +
      'If no popup appeared:\n' +
      '- Check your browser settings for blocked popups\n' +
      '- Try a different browser\n' +
      '- Disable popup blockers\n\n' +
      'Error: ' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Simple diagnostic test - run this AFTER authorizing to check step-by-step where it fails.
 */
function testMailAppSimple() {
  try {
    console.log('Step 1: Getting config...');
    const config = getConfig();
    console.log('Config loaded:', config.notificationEmail);
    
    console.log('Step 2: Normalizing email...');
    const recipients = normalizeRecipientEmails(config.notificationEmail);
    console.log('Recipients:', recipients);
    
    if (recipients.length === 0) {
      SpreadsheetApp.getUi().alert('ERROR: No valid recipients configured.');
      return;
    }
    
    console.log('Step 3: Checking mail quota...');
    const quota = MailApp.getRemainingDailyQuota();
    console.log('Remaining quota:', quota);
    
    if (quota <= 0) {
      SpreadsheetApp.getUi().alert('ERROR: MailApp quota exhausted.');
      return;
    }
    
    console.log('Step 4: Sending test email...');
    const recipient = recipients[0];
    const subject = 'TEST EMAIL from Michael Rodenkirch Apps Script';
    const body = 'This is a test email to verify MailApp is working.\n\nIf you receive this, email notifications are functional.';
    
    MailApp.sendEmail(recipient, subject, body);
    console.log('SUCCESS: Email sent to:', recipient);
    
    SpreadsheetApp.getUi().alert(
      'SUCCESS',
      'Test email sent to: ' + recipient + '\n\nCheck your inbox (and spam folder).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    console.error('ERROR at some step:', error);
    SpreadsheetApp.getUi().alert(
      'ERROR',
      'Failed: ' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Run manually to authorize MailApp and verify notification delivery.
 */
function testNotificationEmail() {
  try {
    const config = getConfig();
    const testSubmission = {
      name: 'Test Submission',
      email: 'noreply@example.com',
      instrument: 'Drums',
      inquiryType: 'General Inquiry',
      message: 'This is a test email from testNotificationEmail().',
      timestamp: new Date()
    };

    const result = sendContactSubmissionNotification(testSubmission, config.notificationEmail);
    console.log('Test notification result:', result);

    SpreadsheetApp.getUi().alert(
      'Notification test sent',
      `Result: ${JSON.stringify(result)}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return result;
  } catch (error) {
    console.error('testNotificationEmail error:', error);
    SpreadsheetApp.getUi().alert(
      'ERROR in testNotificationEmail',
      error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Log email send attempt to EMAIL_AUDIT sheet for delivery troubleshooting.
 */
function logEmailAttempt(submission, recipients, success, errorMessage = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let auditSheet = ss.getSheetByName('EMAIL_AUDIT');
    
    // Create sheet if it doesn't exist
    if (!auditSheet) {
      auditSheet = ss.insertSheet('EMAIL_AUDIT');
      auditSheet.appendRow(['Timestamp', 'Sender Email', 'Recipients', 'Subject', 'Status', 'Error Message']);
      auditSheet.setFrozenRows(1);
    }
    
    const timestamp = new Date().toLocaleString();
    const submitterEmail = (submission.email || 'unknown').toString().trim();
    const recipientList = Array.isArray(recipients) ? recipients.join('; ') : recipients;
    const subject = `New contact form submission: ${(submission.name || 'unknown').toString().trim()}`;
    const status = success ? 'SENT' : 'FAILED';
    const error = errorMessage ? errorMessage.toString() : '';
    
    auditSheet.appendRow([timestamp, submitterEmail, recipientList, subject, status, error]);
  } catch (auditError) {
    console.error('Failed to log email attempt:', auditError);
    // Don't throw—audit logging failure should not block anything
  }
}

/**
 * Helper function to format dates consistently
 */
function formatDate(date) {
  if (!date) return '';
  
  // If already a string, return as is
  if (typeof date === 'string') {
    return date;
  }
  
  // If it's a Date object, format it
  if (date instanceof Date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  return date.toString();
}
