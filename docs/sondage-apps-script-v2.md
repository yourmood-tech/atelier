# Apps Script v2 — Sondage Mood (avec doGet pour dashboard)

Cette nouvelle version ajoute la fonction `doGet` qui permet au dashboard `/sondage/admin` de lire les réponses depuis le Sheet et générer les graphiques.

## Que faire (1 min)

1. Va sur ton Google Sheet "Sondage Mood — Réponses"
2. **Extensions → Apps Script** (rouvre la fenêtre)
3. **Efface tout** le code actuel et **colle exactement** le code ci-dessous
4. **Cmd+S** pour sauver
5. **Déployer → Gérer les déploiements** → clique sur le crayon ✏️ à droite de "Sondage Mood"
6. **Version : Nouvelle version** → Description : `v2 avec dashboard` → **Déployer**
7. L'URL ne change pas, tu n'as rien d'autre à faire 🌸

## Code à coller

```javascript
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    let data = sheet.getDataRange().getValues();

    if (data.length === 0 || data[0].every(cell => cell === "" || cell === null)) {
      if (Array.isArray(body.headers) && body.headers.length > 0) {
        if (data.length === 0) {
          sheet.appendRow(body.headers);
        } else {
          sheet.getRange(1, 1, 1, body.headers.length).setValues([body.headers]);
        }
        sheet.getRange(1, 1, 1, body.headers.length)
          .setFontWeight("bold")
          .setBackground("#FDF8F3");
        sheet.setFrozenRows(1);
        data = sheet.getDataRange().getValues();
      }
    }

    const emailCol = 2;
    const codeCol = 3;
    const incomingEmail = String(body.email || "").toLowerCase().trim();

    if (incomingEmail) {
      for (let i = 1; i < data.length; i++) {
        const rowEmail = String(data[i][emailCol] || "").toLowerCase().trim();
        if (rowEmail === incomingEmail) {
          return ContentService
            .createTextOutput(JSON.stringify({ ok: true, bon_code: data[i][codeCol], existing: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (Array.isArray(body.row) && body.row.length > 0) {
      sheet.appendRow(body.row);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, bon_code: body.code }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, headers: [], rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const headers = data[0].map(String);
    const rows = data.slice(1).map(row => row.map(cell => cell === null || cell === undefined ? "" : String(cell)));
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, headers, rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
