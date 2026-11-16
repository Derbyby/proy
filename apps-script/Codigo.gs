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
  ID_HOJA: "1gkwf_3Hbb9aYGcCTpyAmJleptXCZZe6t519cGIlT0ok",               // déjalo vacío si creaste el script desde la hoja
  HOJA: "Deseos",
  AUTO_APROBAR: true,       // true = se publican sin revisión (no recomendado)
  NOTIFICAR_CORREO: false,   // true = te llega un correo con cada mensaje nuevo
  MAX_NOMBRE: 60,
  MAX_MENSAJE: 300,
  MAX_POR_HORA: 40,          // freno contra spam: mensajes aceptados por hora en total
  PALABRAS_BLOQUEADAS: [
    "pendejo", "pendeja", "pendejos", "pendejas", "pendejada", "pendejadas",
    "estupido", "estúpido", "estupida", "estúpida", "estupidos", "estúpidos", "estupidez",
    "imbecil", "imbécil", "imbeciles", "imbéciles",
    "cabron", "cabrón", "cabrona", "cabrones", "cabronas",
    "mierda", "mierdas", "m1erda", "mierd4",
    "pinche", "pinches",
    "culero", "culera", "culeros", "culeras",
    "chinga", "chingada", "chingado", "chingar", "chingas", "chingatumadre", "ctm", "ptm",
    "puta", "puto", "putas", "putos", "puton", "putón", "putona", "putazo",
    "maricon", "maricón", "marica", "maricas", "joto", "jotos",
    "idiota", "idiotas",
    "verga", "vergas", "vrg", "vergazo",
    "mamon", "mamón", "mamona", "mamones", "mamar", "mamada", "mamadas",
    "ojete", "ojetes",
    "zorra", "zorras", "perra", "perras",
    "bastardo", "bastarda", "bastardos",
    "maldito", "maldita", "malditos", "malditas",
    "baboso", "babosa", "babosos", "babosas",
    "tarado", "tarada", "tarados", "taradas",
    "naco", "naca", "nacos", "nacas",
    "prieto", "prieta", "indio", "india",

    // Contenido sexual, vulgar o inapropiado
    "sexo", "sexual", "coger", "cojer", "follar", "culear",
    "teta", "tetas", "chichi", "chichis", "pechos",
    "culo", "culos", "nalgas", "ano",
    "pene", "pito", "pitos", "riata", "pija",
    "vagina", "panocha", "concha", "chocha",
    "orgia", "orgía", "porn", "porno", "pornografia", "pornografía", "xxx",
    "desnuda", "desnudo", "nudes", "pack", "packs",
    "droga", "drogas", "marihuana", "mota", "cocaina", "cocaína", "perico", "cristal", "fentanilo",
    "pedofilo", "pedófilo", "violacion", "violación", "violar",

    // Acoso, odio y violencia
    "muerte", "muérete", "muerete", "matar", "matate", "mátate", "matarte",
    "suicidio", "suicidate", "suicídate",
    "odio", "odia", "odiada", "odiado",
    "asesinato", "asesinar",
    "fea", "feo", "feas", "feos", "horrible", "asquerosa", "asqueroso",
    "gorda", "gordo", "gordas", "gordos", "ballena", "cerda", "cerdo",
    "flaca", "anorexica", "anoréxica",
    "ridicula", "ridícula", "ridiculo", "ridículo",
    "fracasada", "fracasado", "perdedora", "perdedor",
    "asco", "das asco",

    // Spam y enlaces
    "http://", "https://", "www.", ".com", ".net", ".org", ".xyz", ".mx",
    "bit.ly", "t.me", "tinyurl", "wa.me",
    "whatsapp", "telegram", "onlyfans",
    "dinero", "prestamo", "préstamo", "prestamos", "préstamos",
    "crypto", "cripto", "bitcoin", "inversion", "inversión", "inversiones",
    "casino", "apuesta", "apuestas", "gana dinero", "gratis"
  ]    // ej. ["groseria1", "http"]: si aparecen, el mensaje se descarta
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

/* ---------- Filtro de palabras ---------- */

// Pasa el texto a una forma comparable:
// minúsculas, sin acentos (pero conserva la ñ), números/símbolos usados como letras
// (p3nd3j0, put@, $exo) y letras repetidas (pendejooo -> pendejo).
function normalizar_(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/n\u0303/g, "ñ")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/([a-zñ])\1+/g, "$1");
}

let BLOQUEADAS_ = null;

function bloqueadas_() {
  if (!BLOQUEADAS_) {
    BLOQUEADAS_ = CONFIG.PALABRAS_BLOQUEADAS
      .map(p => normalizar_(p).replace(/[^a-zñ]/g, ""))
      .filter(Boolean);
  }
  return BLOQUEADAS_;
}

// true si el texto contiene una palabra bloqueada
function contieneBloqueada_(texto) {
  const lista = bloqueadas_();
  const norm = normalizar_(texto);

  const tokens = norm.split(/[^a-zñ]+/).filter(Boolean);

  // a) palabra completa: "ano" bloquea "ano" pero no "hermano" ni "año"
  const palabras = new Set(tokens);

  // b) letras sueltas seguidas se unen: "p.u.t.o" / "p u t o" -> "puto"
  let sueltas = "";
  tokens.concat("").forEach(t => {
    if (t.length === 1) { sueltas += t; return; }
    if (sueltas.length > 1) palabras.add(sueltas);
    sueltas = "";
  });

  if (lista.some(p => palabras.has(p))) return true;

  // c) palabras largas pegadas o partidas: "chinga tu madre", "pen dejo"
  //    (solo de 6+ letras, para no bloquear palabras normales como "Indiana")
  const pegado = tokens.join("");
  return lista.some(p => p.length >= 6 && pegado.includes(p));
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
    // aunque esté aprobado, nunca se muestra si trae una palabra bloqueada
    .filter(r => !contieneBloqueada_(r[COL.NOMBRE - 1] + " " + r[COL.MENSAJE - 1]))
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

    if (contieneBloqueada_(nombre + " " + mensaje)) {
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
