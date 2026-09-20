# Menyambungkan RSVP & Wedding Wish ke Google Sheet Pribadi

Form RSVP dan Wedding Wish di halaman ini bisa mengirim setiap submission
ke Google Sheet milikmu sendiri — cuma kamu yang bisa lihat, tamu tidak
melihat data tamu lain sama sekali.

## Langkah 1 — Buat Google Sheet

1. Buka [sheets.google.com](https://sheets.google.com), buat spreadsheet baru.
2. Beri nama misalnya "RSVP Wahyu & Wanda".

## Langkah 2 — Tambahkan script

1. Di spreadsheet itu, klik **Extensions → Apps Script**.
2. Hapus semua kode default di editor, lalu tempel kode ini:

```javascript
function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "bad json" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // If the invitation link goes out to a big family WhatsApp group,
  // several guests can easily submit within the same second. Without a
  // lock, two requests can both see "the tab doesn't exist yet" and both
  // try to create it — the second one then throws (a sheet name can't be
  // duplicated), silently losing that guest's RSVP or wish. The lock
  // makes every request wait its turn instead of racing.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabName = payload.type === "rsvp" ? "RSVP" : "Ucapan";
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      var header = payload.type === "rsvp"
        ? ["Waktu", "Nama", "Jumlah Tamu", "Kehadiran"]
        : ["Waktu", "Nama", "Ucapan & Doa"];
      sheet.appendRow(header);
    }

    var now = new Date();
    if (payload.type === "rsvp") {
      sheet.appendRow([now, payload.name || "", payload.guests || "", payload.attendance || ""]);
    } else {
      sheet.appendRow([now, payload.name || "", payload.message || ""]);
    }
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Klik ikon Save (disket) di toolbar.

## Langkah 3 — Deploy sebagai Web App

1. Klik tombol **Deploy → New deployment** (kanan atas).
2. Klik ikon gear di sebelah "Select type", pilih **Web app**.
3. Isi:
   - Description: bebas, misal "RSVP webhook".
   - Execute as: **Me**.
   - Who has access: **Anyone**.
4. Klik **Deploy**.
5. Google akan minta izin akses — klik **Authorize access**, pilih akun
   Google-mu, lalu di layar peringatan "Google hasn't verified this app"
   klik **Advanced** → **Go to (nama project) (unsafe)**. Ini aman,
   karena ini script buatanmu sendiri, bukan punya orang lain.
6. Setelah deploy selesai, copy **Web app URL** yang muncul (diakhiri
   `/exec`).

## Langkah 4 — Pasang URL-nya ke situs

1. Buka file `wahyu-wanda/data.json`.
2. Cari bagian ini di bagian paling atas:
   ```json
   "integrations": {
     "webhookUrl": ""
   },
   ```
3. Tempel URL dari Langkah 3 di antara tanda kutip:
   ```json
   "integrations": {
     "webhookUrl": "https://script.google.com/macros/s/XXXXXXXX/exec"
   },
   ```
4. Commit & push (atau edit langsung di GitHub lalu commit).

Selesai — setiap ada tamu yang submit RSVP atau Wedding Wish, akan otomatis
masuk sebagai baris baru di tab "RSVP" atau "Ucapan" pada spreadsheet itu.
Kalau `webhookUrl` dikosongkan lagi, situsnya tetap jalan normal (form tetap
bisa disubmit tamu, cuma datanya gak dikirim ke mana pun).

## Kalau mau ubah script-nya nanti

Setiap kali kamu edit kode di Apps Script, kamu perlu **Deploy → Manage
deployments → edit (ikon pensil) → Version: New version → Deploy** lagi
supaya perubahannya kepakai — Web App URL-nya tetap sama, gak perlu
diganti di `data.json`.
