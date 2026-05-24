# Setup Guide

## Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete all existing code and paste the contents of `google-apps-script/Code.gs`
3. **Project Settings (gear icon) > Script Properties** — add:
   - `GITHUB_TOKEN` = your classic PAT (needs `repo` scope)
   - `GITHUB_REPO` = `yourname/portfolio`
4. Run **`initializeJSONFromSheet`** — seeds `data/content.json` on GitHub from all content sheets
5. Run **`installTrigger`** — enables auto-updates when you edit the Control sheet

## Google Sheet Structure

| Tab | Purpose |
|-----|---------|
| Drafts | Notes only, no script interaction |
| Control | Script control panel (see below) |
| Video Games | Content sheet |
| MM/YYYY (e.g. 05/2026) | Content sheet |

**Content sheet columns:**
- A: Leave blank normally. Place `*` to mark a row for update.
- B: Header (game title, or any entry label)
- C: Subheader (optional)
- D: Body text

**Control sheet:**
- `B2:B*` — Enter sheet tab names to update (one per cell)
- `B3` — Auto-populated log after each push
- After a push, `B2:B*` clears and `B2` resets to `Ready for changes`

## Pushing Updates

1. In the content sheet, mark changed rows by typing `*` in col A
2. In **Control**, enter the sheet tab name(s) in `B2`, `B3`, etc.
3. The script fires automatically and updates `data/content.json` on GitHub

## First-Time Initialization

Run `initializeJSONFromSheet()` manually from Apps Script after your sheets have content.

## GitHub Token

1. https://github.com/settings/tokens > **Generate new token (classic)**
2. Scope: `repo`
3. Copy and paste into Script Properties as `GITHUB_TOKEN`
