/**
 * BACKEND DE LA PARED DE BUENOS DESEOS (Google Sheets + Apps Script)
 *
 * 1. Crea una Hoja de Cálculo de Google nueva.
 * 2. Menú Extensiones > Apps Script. Borra lo que haya y pega este archivo.
 * 3. Guarda y pulsa Implementar > Nueva implementación > tipo "Aplicación web".
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier usuario
 * 4. Autoriza los permisos y copia la URL que termina en /exec.
 * 5. Pégala en WISHES_API_URL dentro de wishes.js.
 *
 * Para borrar un mensaje inapropiado basta con eliminar su fila en la hoja.
 * Si cambias este código, vuelve a implementar (Administrar implementaciones > Editar > Nueva versión).
 */

const SHEET_NAME = "Deseos";
const MAX_NOMBRE = 60;
const MAX_MENSAJE = 300;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Fecha", "Nombre", "Mensaje"]);
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET -> lista de deseos (más recientes primero)
function doGet() {
  const rows = getSheet_().getDataRange().getValues().slice(1);
  const wishes = rows
    .filter(r => r[1] && r[2])
    .map(r => ({ fecha: r[0], nombre: String(r[1]), mensaje: String(r[2]) }))
    .reverse();
  return json_({ ok: true, wishes: wishes });
}

// POST -> agregar un deseo
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const nombre = String(data.nombre || "").trim().slice(0, MAX_NOMBRE);
    const mensaje = String(data.mensaje || "").trim().slice(0, MAX_MENSAJE);
    if (!nombre || !mensaje) return json_({ ok: false, error: "Faltan datos" });

    // El apóstrofo inicial evita que Sheets interprete el texto como fórmula
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    getSheet_().appendRow([new Date(), "'" + nombre, "'" + mensaje]);
    lock.releaseLock();

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
