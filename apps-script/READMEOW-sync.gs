/**
 * READMEOW sync: Google Sheet -> READMEOW.json in the GitHub repo.
 *
 * Setup (one time):
 *   1. In the spreadsheet: Extensions > Apps Script, paste this file as Code.gs.
 *   2. In the editor, select installTrigger in the function dropdown and Run it once
 *      (authorize when asked). This installs auto-publish and the "READMEOW" menu.
 *   3. READMEOW > Reset sheet to current site data   (creates and fills the tabs)
 *   4. READMEOW > Set GitHub token                   (fine-grained PAT, this repo only,
 *                                                     "Contents: Read and write")
 *   5. READMEOW > Publish now                        (optional, to test)
 *
 * After that, any edit is committed to GitHub about a minute after you stop editing.
 * Links inside cells are written as [text](https://url).
 */

const CONFIG = {
  owner: 'autumngreenbean',
  repo: 'portfolio',
  branch: 'gh-pages',
  path: 'READMEOW.json',
  debounceMs: 60 * 1000,
};

const INITIAL_DATA = {
  title: '# hello peepol',
  intro: 'welcome to the media archive of digitized things liked by autumn.',
  updated: 'last updated 11-23-26: improved pdf viewer zoom nav, added castlevania and cookies & cream',
  about: "I like looking on [archive.org](https://archive.org) and other media sites like [spriter's resource](https://www.spriters-resource.com/) and [modeler's resource](https://www.modelersresource.com/). This site is a place for the things I find.",
  todo: {
    look: [
      "[Vimm's Manual Collection](https://vimm.net/?p=manual)",
      '[Baroque PS1 Walkthrough Site](https://nervetower.neocities.org/main)',
      '[this console database](https://www.rfgeneration.com/cgi-bin/search.pl)',
      '[making a BC-1 clone](https://teenage.engineering/store/bc-1)',
      '[another game manual collection](https://archive.org/details/SonyPlaystation2Manuals_201812/Castlevania%20-%20Lament%20of%20Innocence%20(USA)%20(En,Ja).pdf)',
      "[sprites from spriter's resource](https://www.spriters-resource.com/game_boy_advance/doraemondokodemowalker/asset/637536/)",
    ],
    add: ['stationary collection', 'icon collection', 'sprite collection with animator'],
    make: [
      'my own strategy guide for _____?',
      'a cd player',
      '[a matrix-based instrument](https://github.com/autumngreenbean/matrix)',
    ],
    aside: 'I will have to figure how to embed + display assets sometime soon. I will have to source and host them myself which will be a task.',
  },
  collection: {
    heading: 'this collection currently has',
    items: [
      'strategy guides',
      'video game magazines',
      'video game booklets',
      'video game OST lyric booklets',
      'game theory analysis',
      'computing magazines',
      'anime & manga magazines',
    ],
    image: {
      src: './assets/LCD Handhelds - Tamagotchi On - Characters - Teenagers.png',
      alt: 'Tamagotchi On - Characters - Teenagers',
      caption: 'I originally intended for this to be a game assets collection, but I found a trove of online media collectibles and wanted to start with a publication library first.',
    },
  },
  playing: 'once upon a katamari***, super monkey ball, SNES collection on nintendo switch, pokemon mystery dungeon explorers of time',
  favorites: [
    'risk of rain 2',
    'final fantasy revenant wings',
    'pokemon mystery dungeon',
    'hades I',
    'katamari damacy',
    'factorio',
    'terraria',
    'plate up',
    'skyrim',
    'vampire survivors',
    'Sims games for the GBA',
    'MySims for the DS',
    'and games by KAIROSOFT',
  ],
  attributes: [
    { label: 'archive curated by:', value: 'signalkitten (autumn)' },
    { label: 'built with:', value: 'HTML5, CSS3, JavaScript, [PDF.js](https://mozilla.github.io/pdf.js/), [Archive.org API](https://archive.org)' },
  ],
};

// Page tab: key/value rows. Order here is the row order in the sheet.
const PAGE_KEYS = [
  'title', 'intro', 'updated', 'about', 'playing', 'todo_aside',
  'collection_heading', 'image_src', 'image_alt', 'image_caption',
];

const TAB_NAMES = ['Page', 'Todo', 'Collection', 'Favorites', 'Attributes'];

/* ------------------------------------------------------------------ */
/* Pure conversion: data <-> 2D tables (no Apps Script services)       */
/* ------------------------------------------------------------------ */

function dataToTables_(d) {
  const pageValues = {
    title: d.title,
    intro: d.intro,
    updated: d.updated,
    about: d.about,
    playing: d.playing,
    todo_aside: d.todo.aside,
    collection_heading: d.collection.heading,
    image_src: d.collection.image.src,
    image_alt: d.collection.image.alt,
    image_caption: d.collection.image.caption,
  };
  const t = d.todo;
  const todoRows = Math.max(t.look.length, t.add.length, t.make.length);
  const todo = [['look', 'add', 'make']];
  for (let i = 0; i < todoRows; i++) todo.push([t.look[i] || '', t.add[i] || '', t.make[i] || '']);

  return {
    Page: [['key', 'value']].concat(PAGE_KEYS.map(k => [k, pageValues[k]])),
    Todo: todo,
    Collection: [['items']].concat(d.collection.items.map(x => [x])),
    Favorites: [['favorites']].concat(d.favorites.map(x => [x])),
    Attributes: [['label', 'value']].concat(d.attributes.map(a => [a.label, a.value])),
  };
}

function tablesToData_(tables) {
  const str = v => (v === null || v === undefined ? '' : String(v)).trim();
  const column = (rows, col) => rows.slice(1).map(r => str(r[col])).filter(Boolean);

  for (const name of TAB_NAMES) {
    if (!tables[name] || tables[name].length < 1) throw new Error('Missing or empty tab: ' + name);
  }

  const page = {};
  tables.Page.slice(1).forEach(r => { if (str(r[0])) page[str(r[0])] = str(r[1]); });
  for (const k of PAGE_KEYS) {
    if (!(k in page)) throw new Error('Page tab is missing key: ' + k);
  }
  if (!page.title) throw new Error('Page tab: title is empty');

  const attributes = tables.Attributes.slice(1)
    .map(r => ({ label: str(r[0]), value: str(r[1]) }))
    .filter(a => a.label || a.value);

  return {
    title: page.title,
    intro: page.intro,
    updated: page.updated,
    about: page.about,
    todo: {
      look: column(tables.Todo, 0),
      add: column(tables.Todo, 1),
      make: column(tables.Todo, 2),
      aside: page.todo_aside,
    },
    collection: {
      heading: page.collection_heading,
      items: column(tables.Collection, 0),
      image: { src: page.image_src, alt: page.image_alt, caption: page.image_caption },
    },
    playing: page.playing,
    favorites: column(tables.Favorites, 0),
    attributes: attributes,
  };
}

/* ------------------------------------------------------------------ */
/* Sheet I/O                                                           */
/* ------------------------------------------------------------------ */

function readTables_() {
  const ss = SpreadsheetApp.getActive();
  const tables = {};
  for (const name of TAB_NAMES) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) throw new Error('Missing tab: ' + name);
    tables[name] = sheet.getDataRange().getValues();
  }
  return tables;
}

function writeTables_(tables) {
  const ss = SpreadsheetApp.getActive();
  for (const name of TAB_NAMES) {
    const rows = tables[name];
    const width = Math.max.apply(null, rows.map(r => r.length));
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    // Plain text everywhere so Sheets doesn't turn "1994-04" etc. into dates/numbers.
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setNumberFormat('@');
    sheet.getRange(1, 1, rows.length, width).setValues(rows);
    sheet.getRange(1, 1, 1, width).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, width, width === 1 ? 500 : 320);
  }
  const first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);
}

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */

function github_(method, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('No GitHub token set. Use READMEOW > Set GitHub token.');
  const url = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo +
    '/contents/' + encodeURI(CONFIG.path) +
    (method === 'get' ? '?ref=' + encodeURIComponent(CONFIG.branch) : '');
  const res = UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    payload: payload ? JSON.stringify(payload) : undefined,
    muteHttpExceptions: true,
  });
  return { code: res.getResponseCode(), body: JSON.parse(res.getContentText() || '{}') };
}

/** Builds JSON from the sheet and commits it if it differs from the repo. Returns a status string. */
function publish_() {
  const data = tablesToData_(readTables_());
  const text = JSON.stringify(data, null, 2) + '\n';

  const current = github_('get');
  let sha;
  if (current.code === 200) {
    sha = current.body.sha;
    const existing = Utilities.newBlob(Utilities.base64Decode(current.body.content.replace(/\n/g, ''))).getDataAsString();
    try {
      if (JSON.stringify(JSON.parse(existing)) === JSON.stringify(data)) return 'No changes to publish.';
    } catch (e) { /* existing file unparsable: overwrite it */ }
  } else if (current.code !== 404) {
    throw new Error('GitHub GET failed (' + current.code + '): ' + (current.body.message || ''));
  }

  const put = github_('put', {
    message: 'Update READMEOW.json from Google Sheet',
    content: Utilities.base64Encode(Utilities.newBlob(text).getBytes()),
    branch: CONFIG.branch,
    sha: sha,
  });
  if (put.code !== 200 && put.code !== 201) {
    throw new Error('GitHub PUT failed (' + put.code + '): ' + (put.body.message || ''));
  }
  return 'Published commit ' + put.body.commit.sha.slice(0, 7) + '.';
}

function runPublish_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return 'Another publish is running; skipped.';
  let status;
  try {
    status = publish_();
  } catch (e) {
    status = 'ERROR: ' + e.message;
    PropertiesService.getScriptProperties().setProperty('LAST_STATUS', new Date().toISOString() + ' ' + status);
    throw e;
  } finally {
    lock.releaseLock();
  }
  PropertiesService.getScriptProperties().setProperty('LAST_STATUS', new Date().toISOString() + ' ' + status);
  return status;
}

/* ------------------------------------------------------------------ */
/* Triggers (installable; simple triggers cannot call UrlFetchApp)     */
/* ------------------------------------------------------------------ */

/** Fires on every spreadsheet change; schedules one debounced publish. */
function handleChange(e) {
  if (e && e.changeType === 'FORMAT') return;
  deleteTriggers_('publishScheduled');
  ScriptApp.newTrigger('publishScheduled').timeBased().after(CONFIG.debounceMs).create();
}

function publishScheduled() {
  deleteTriggers_('publishScheduled');
  runPublish_();
}

function deleteTriggers_(handler) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === handler)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

function installTrigger() {
  const ss = SpreadsheetApp.getActive();
  deleteTriggers_('handleChange');
  deleteTriggers_('buildMenu');
  ScriptApp.newTrigger('handleChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('buildMenu').forSpreadsheet(ss).onOpen().create();
  buildMenu();
  ss.toast('Auto-publish and menu installed.', 'READMEOW');
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

function buildMenu() {
  SpreadsheetApp.getUi().createMenu('READMEOW')
    .addItem('Publish now', 'menuPublish')
    .addItem('Last publish status', 'menuStatus')
    .addSeparator()
    .addItem('Set GitHub token', 'menuSetToken')
    .addItem('Install auto-publish trigger', 'installTrigger')
    .addItem('Reset sheet to current site data', 'initSheet')
    .addToUi();
}

function menuPublish() {
  const status = runPublish_();
  SpreadsheetApp.getActive().toast(status, 'READMEOW', 10);
}

function menuStatus() {
  const s = PropertiesService.getScriptProperties().getProperty('LAST_STATUS') || 'Nothing published yet.';
  SpreadsheetApp.getUi().alert('READMEOW', s, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuSetToken() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('GitHub token', 'Fine-grained PAT for ' + CONFIG.owner + '/' + CONFIG.repo + ' with Contents: read and write.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', r.getResponseText().trim());
  SpreadsheetApp.getActive().toast('Token saved.', 'READMEOW');
}

/** Creates/overwrites all tabs with the data the site had when this script was written. */
function initSheet() {
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Reset sheet', 'This overwrites the Page, Todo, Collection, Favorites and Attributes tabs with the original content. Continue?', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  writeTables_(dataToTables_(INITIAL_DATA));
}
