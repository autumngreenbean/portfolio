/**
 * Google Apps Script — Portfolio Content Manager
 *
 * SHEET STRUCTURE
 * ───────────────
 * Tab 1: Drafts   — notebook only, no script functions
 * Tab 2: Control  — script control panel
 *   B2:Z2  One sheet tab name per cell, reading left to right across row 2.
 *          Entering a name in B2 triggers processControlSheetUpdates().
 *   B3     Programmatic log: populated after a push, then B2:Z2 is cleared
 *          and B2 is reset to 'Ready for changes'.
 * Tab 3+:  Content sheets (e.g. "Video Games", "03/2025", "05/2026")
 *   Col A  Identifier. Place a single * to mark a row for update.
 *   Col B  Header content (game title / date-sheet entry)
 *   Col C  Subheader (may be empty)
 *   Col D  Body text
 *
 * SETUP
 * ─────
 * 1. Extensions > Apps Script — paste this file, save.
 * 2. Project Settings > Script Properties:
 *      GITHUB_TOKEN  = <your classic PAT with repo scope>
 *      GITHUB_REPO   = <owner/repo>  e.g. yourname/portfolio
 * 3. Run initializeJSONFromSheet() once to seed data/content.json.
 * 4. Run installTrigger() once to enable auto-updates via Control sheet.
 */

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    githubToken:  props.getProperty('GITHUB_TOKEN'),
    githubRepo:   props.getProperty('GITHUB_REPO'),
    githubBranch: 'gh-pages',
    jsonFilePath: 'data/content.json'
  };
}

// ─────────────────────────────────────────────
// TRIGGER INSTALLATION
// ─────────────────────────────────────────────

/**
 * Run once: installs the onEdit trigger that watches the Control sheet.
 * Run > installTrigger
 */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onControlEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert('✅ Trigger installed. Edit Control B2 to push updates.');
}

/**
 * Fires on any edit. Only acts when the edited cell is in Control!B2:B*
 * (col B, row 2 or below) and the cell has a non-empty value.
 */
function onControlEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Control') return;
  if (e.range.getColumn() !== 2) return;       // must be col B
  if (e.range.getRow() < 2) return;            // must be row 2+
  // Use getDisplayValue() — e.value is unreliable for date/number cells
  if (!e.range.getDisplayValue().trim()) return;

  processControlSheetUpdates();
}

// ─────────────────────────────────────────────
// FIRST-TIME INIT
// ─────────────────────────────────────────────

/**
 * Reads every content sheet (skipping Drafts and Control) and pushes
 * a complete data/content.json to GitHub. Run once to seed the site.
 * Run > initializeJSONFromSheet
 */
function initializeJSONFromSheet() {
  const config = getConfig();
  _requireToken(config);

  const data = buildContentJSON();
  _pushToGitHub(config, data, 'Initialize JSON cache from Google Sheets');

  SpreadsheetApp.getUi().alert('✅ data/content.json initialized on GitHub.');
}

// ─────────────────────────────────────────────
// INCREMENTAL UPDATE (triggered via Control sheet)
// ─────────────────────────────────────────────

/**
 * Reads sheet names from Control B2:B* (stop at first empty cell).
 * For each named sheet:
 *   - Scans col A for '*'
 *   - Collects B (header), C (subheader), D (body) for each marked row
 *   - Removes the asterisk
 *   - Pushes the updated entries for that sheet to data/content.json
 * After all sheets are processed:
 *   - Writes a summary to Control B3
 *   - Clears Control B2:B*
 *   - Sets Control B2 = 'Ready for changes'
 */
function processControlSheetUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const control = ss.getSheetByName('Control');
  if (!control) throw new Error('"Control" sheet not found.');

  // Collect sheet names from row 2 horizontally: B2, C2, D2, ... (stop at first blank)
  // getDisplayValues() always returns strings — avoids date/number conversion issues
  const markedSheets = [];
  const ctrlRow = control.getRange('B2:Z2').getDisplayValues()[0];
  for (let i = 0; i < ctrlRow.length; i++) {
    const name = ctrlRow[i].trim();
    if (!name) break;
    markedSheets.push(name);
  }

  if (markedSheets.length === 0) return; // nothing to do

  const config = getConfig();
  _requireToken(config);

  const changedCells = [];

  for (const sheetName of markedSheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.warn('Sheet not found: ' + sheetName);
      continue;
    }

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
      changedCells.push(`${sheetName}!A${r + 1}`);
    }

    if (entries.length > 0) {
      _mergeSheetIntoJSON(config, sheetName, entries);
    }
  }

  // Log to Control B3
  const logLine = changedCells.length
    ? `Sheets: ${markedSheets.join(', ')} | Cells updated: ${changedCells.join(', ')} | ${new Date().toLocaleString()}`
    : `No asterisk rows found in: ${markedSheets.join(', ')} | ${new Date().toLocaleString()}`;
  control.getRange('B3').setValue(logLine);

  // Reset Control row 2: clear B2:Z2, then set B2
  control.getRange('B2:Z2').clearContent();
  control.getRange('B2').setValue('Ready for changes');
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Builds a complete content JSON from all sheets except Drafts and Control.
 * Row 1 of each sheet is treated as a header row and skipped.
 * Rows with an empty col B are skipped.
 */
function buildContentJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    _metadata: { sheets: [], lastModified: new Date().toISOString() }
  };

  for (const sheet of ss.getSheets()) {
    const name = sheet.getName();
    if (name === 'Drafts' || name === 'Control') continue;

    const rows = sheet.getDataRange().getValues();
    const entries = [];

    for (let r = 1; r < rows.length; r++) { // r=0 is header row
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
 * Fetches the current data/content.json from GitHub, merges one sheet's
 * updated entries, and pushes the result back.
 */
function _mergeSheetIntoJSON(config, sheetName, entries) {
  const url = `https://api.github.com/repos/${config.githubRepo}/contents/${config.jsonFilePath}`;
  const headers = {
    'Authorization': 'token ' + config.githubToken,
    'Accept': 'application/vnd.github.v3+json'
  };

  const getRes = UrlFetchApp.fetch(url + '?ref=' + config.githubBranch, { method: 'get', headers, muteHttpExceptions: true });
  let current = { _metadata: { sheets: [], lastModified: '' } };
  let sha = null;

  if (getRes.getResponseCode() === 200) {
    const parsed = JSON.parse(getRes.getContentText());
    sha = parsed.sha;
    current = JSON.parse(Utilities.newBlob(Utilities.base64Decode(parsed.content)).getDataAsString());
  }

  current[sheetName] = entries;
  current._metadata = current._metadata || {};
  current._metadata.lastModified = new Date().toISOString();
  if (!Array.isArray(current._metadata.sheets)) current._metadata.sheets = [];
  if (!current._metadata.sheets.includes(sheetName)) current._metadata.sheets.push(sheetName);

  _pushToGitHub(config, current, `Update ${sheetName} from Google Sheets`, sha);
}

/**
 * Pushes a JSON object to GitHub as data/content.json.
 * Pass sha when updating an existing file; omit when creating.
 */
function _pushToGitHub(config, data, commitMessage, sha) {
  const url = `https://api.github.com/repos/${config.githubRepo}/contents/${config.jsonFilePath}`;
  const headers = {
    'Authorization': 'token ' + config.githubToken,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  // Fetch current SHA if not provided
  if (!sha) {
    const getRes = UrlFetchApp.fetch(url + '?ref=' + config.githubBranch, { method: 'get', headers, muteHttpExceptions: true });
    if (getRes.getResponseCode() === 200) {
      sha = JSON.parse(getRes.getContentText()).sha;
    }
  }

  const payload = {
    message: commitMessage,
    content: Utilities.base64Encode(JSON.stringify(data, null, 2), Utilities.Charset.UTF_8),
    branch: config.githubBranch
  };
  if (sha) payload.sha = sha;

  const putRes = UrlFetchApp.fetch(url, {
    method: 'put',
    headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = putRes.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error(`GitHub push failed (${code}): ` + putRes.getContentText());
  }
}

function _requireToken(config) {
  if (!config.githubToken) throw new Error('GITHUB_TOKEN not set in Script Properties.');
  if (!config.githubRepo)  throw new Error('GITHUB_REPO not set in Script Properties.');
}
