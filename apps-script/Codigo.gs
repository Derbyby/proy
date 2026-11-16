/**
 * BACKEND DE LA PARED DE BUENOS DESEOS  (Google Sheets + Apps Script)
 * ---------------------------------------------------------------
 * Todo mensaje nuevo entra como PENDIENTE (casilla "Aprobado" sin marcar).
 * En la invitación solo se muestran las filas con la casilla marcada.
 *
 * INSTALACIÓN
 * 1. Crea una Hoja de Cálculo de Google nueva.
 * 2. Extensiones > Apps Script. Borra lo que haya y pega este archivo. Guarda.
 * 3. En la barra de arriba elige la función "configurar" y pulsa Ejecutar (autoriza permisos).
 *    Esto crea la pestaña "Deseos" con sus columnas y casillas.
 * 4. Implementar > Nueva implementación > tipo "Aplicación web"
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier usuario
 * 5. Copia la URL que termina en /exec y pégala en WISHES_API_URL (wishes.js).
 *
 * MODERAR
 * - Marca la casilla "Aprobado" para publicar un mensaje; desmárcala para ocultarlo.
 * - Borra la fila si quieres eliminarlo para siempre.
 * - Puedes corregir faltas de ortografía editando la celda directamente.
 * - Para publicar tus propios mensajes escribe una fila nueva y marca la casilla.
 * - El orden en la invitación es el de la hoja (la última fila aparece primero).
 * - Menú "Buenos deseos" (aparece al abrir la hoja): aprobar todos los pendientes.
 *
 * Si cambias este código: Implementar > Administrar implementaciones > Editar > Nueva versión.
 *
 * ¿NO ABRE "Extensiones > Apps Script" DESDE LA HOJA?
 * Entra a https://script.google.com > Nuevo proyecto, pega este archivo y llena ID_HOJA
 * con el ID de tu hoja (lo que va entre /d/ y /edit en su URL). Lo demás es igual,
 * solo que el menú "Buenos deseos" no aparecerá dentro de la hoja.
 */

const CONFIG = {
  ID_HOJA: "",               // déjalo vacío si creaste el script desde la hoja
  HOJA: "Deseos",
  AUTO_APROBAR: true,       // true = se publican sin revisión (no recomendado)
  NOTIFICAR_CORREO: false,   // true = te llega un correo con cada mensaje nuevo
  MAX_NOMBRE: 60,
  MAX_MENSAJE: 300,
  MAX_POR_HORA: 40,          // freno contra spam: mensajes aceptados por hora en total
  PALABRAS_BLOQUEADAS: []    // ej. ["groseria1", "http"]: si aparecen, el mensaje se descarta
};

const COL = { FECHA: 1, NOMBRE: 2, MENSAJE: 3, APROBADO: 4 };

/* ---------- Utilidades ---------- */

function getSheet_() {
  const ss = CONFIG.ID_HOJA
    ? SpreadsheetApp.openById(CONFIG.ID_HOJA)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.HOJA);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.HOJA);
    sheet.appendRow(["Fecha", "Nombre", "Mensaje", "Aprobado"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f6a5ca").setFontColor("#ffffff");
    sheet.setColumnWidth(COL.FECHA, 150);
    sheet.setColumnWidth(COL.NOMBRE, 200);
    sheet.setColumnWidth(COL.MENSAJE, 450);
    sheet.setColumnWidth(COL.APROBADO, 90);
    sheet.getRange("C:C").setWrap(true);
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function limpiar_(texto, max) {
  return String(texto || "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")  // caracteres de control
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/* ---------- Menú en la hoja ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Buenos deseos")
    .addItem("Aprobar todos los pendientes", "aprobarTodos")
    .addItem("Reparar columnas / casillas", "configurar")
    .addToUi();
}

function configurar() {
  const sheet = getSheet_();
  const last = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, COL.APROBADO, last - 1, 1).insertCheckboxes();
}

function aprobarTodos() {
  const sheet = getSheet_();
  const n = sheet.getLastRow() - 1;
  if (n > 0) sheet.getRange(2, COL.APROBADO, n, 1).setValue(true);
}

/* ---------- API ---------- */

// GET -> solo los deseos aprobados (el más reciente primero)
function doGet() {
  const sheet = getSheet_();
  const n = sheet.getLastRow() - 1;
  if (n < 1) return json_({ ok: true, wishes: [] });

  const rows = sheet.getRange(2, 1, n, 4).getValues();
  const wishes = rows
    .filter(r => r[COL.APROBADO - 1] === true && r[COL.NOMBRE - 1] && r[COL.MENSAJE - 1])
    .map(r => ({ nombre: String(r[COL.NOMBRE - 1]), mensaje: String(r[COL.MENSAJE - 1]) }))
    .reverse();

  return json_({ ok: true, wishes: wishes });
}

// POST -> guardar un deseo nuevo como pendiente
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Trampa para bots: campo oculto que una persona nunca llena
    if (data.website) return json_({ ok: true, pendiente: true });

    // Formularios enviados en menos de 3 s casi siempre son bots
    if (Number(data.tiempo) < 3000) return json_({ ok: false, error: "Intenta de nuevo" });

    const nombre = limpiar_(data.nombre, CONFIG.MAX_NOMBRE);
    const mensaje = limpiar_(data.mensaje, CONFIG.MAX_MENSAJE);
    if (!nombre || !mensaje) return json_({ ok: false, error: "Faltan datos" });

    const texto = (nombre + " " + mensaje).toLowerCase();
    if (CONFIG.PALABRAS_BLOQUEADAS.some(p => p && texto.includes(p.toLowerCase()))) {
      return json_({ ok: true, pendiente: true });   // se descarta en silencio
    }

    // Límite global por hora
    const cache = CacheService.getScriptCache();
    const usados = Number(cache.get("por_hora") || 0);
    if (usados >= CONFIG.MAX_POR_HORA) {
      return json_({ ok: false, error: "Hay muchos mensajes ahora, intenta más tarde" });
    }
    cache.put("por_hora", String(usados + 1), 3600);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      // El apóstrofo inicial evita que Sheets interprete el texto como fórmula
      sheet.appendRow([new Date(), "'" + nombre, "'" + mensaje, CONFIG.AUTO_APROBAR]);
      sheet.getRange(sheet.getLastRow(), COL.APROBADO).insertCheckboxes();
      if (CONFIG.AUTO_APROBAR) sheet.getRange(sheet.getLastRow(), COL.APROBADO).setValue(true);
    } finally {
      lock.releaseLock();
    }

    if (CONFIG.NOTIFICAR_CORREO) {
      MailApp.sendEmail(
        Session.getEffectiveUser().getEmail(),
        "Nuevo buen deseo de " + nombre,
        mensaje + "\n\nApruébalo en: " + getSheet_().getParent().getUrl()
      );
    }

    return json_({ ok: true, pendiente: !CONFIG.AUTO_APROBAR });
  } catch (err) {
    return json_({ ok: false, error: "No se pudo guardar" });
  }
}
