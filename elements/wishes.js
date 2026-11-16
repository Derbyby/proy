/* =========================================
   PARED DE BUENOS DESEOS
   -----------------------------------------
   Pega aquí la URL de tu Web App de Google Apps Script
   (ver apps-script/Codigo.gs). Si se deja vacía, los
   deseos se guardan solo en este navegador (modo prueba).
========================================= */
const WISHES_API_URL = "https://script.google.com/macros/s/AKfycbySWYPE_RdfJfdQX4f9LyBzmr3cBlgcEl2jebNopKhIcBvHhHw5fFCfZ9bD91BVoNkl-w/exec";

const LOCAL_KEY = "buenos-deseos";
const MAX_NOMBRE = 60;
const MAX_MENSAJE = 300;

const wishesModal = document.getElementById("wishes-modal");
const wishFormModal = document.getElementById("wish-form-modal");
const wishesList = document.getElementById("wishes-list");
const wishForm = document.getElementById("wish-form");
const wishStatus = document.getElementById("wish-status");
const wishSubmit = document.getElementById("wish-submit");

/* ---------- Abrir / cerrar ---------- */

function openModal(modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".wish-modal.is-open")) {
        document.body.classList.remove("modal-open");
    }
}

document.getElementById("open-wishes").addEventListener("click", () => {
    openModal(wishesModal);
    loadWishes();
});

let formOpenedAt = 0;

document.getElementById("open-wish-form").addEventListener("click", () => {
    wishStatus.textContent = "";
    formOpenedAt = Date.now();
    openModal(wishFormModal);
    setTimeout(() => document.getElementById("wish-nombre").focus(), 150);
});

document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.closest(".wish-modal")));
});

// Cerrar al tocar fuera de la tarjeta
document.querySelectorAll(".wish-modal").forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) closeModal(modal);
    });
});

// Cerrar con Esc (primero el formulario, luego la lista)
document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (wishFormModal.classList.contains("is-open")) closeModal(wishFormModal);
    else if (wishesModal.classList.contains("is-open")) closeModal(wishesModal);
});

/* ---------- Datos ---------- */

function getLocalWishes() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
        return [];
    }
}

function saveLocalWish(wish) {
    try {
        const wishes = getLocalWishes();
        wishes.unshift(wish);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(wishes));
    } catch { /* almacenamiento no disponible */ }
}

async function fetchWishes() {
    if (!WISHES_API_URL) return getLocalWishes();
    const res = await fetch(`${WISHES_API_URL}?t=${Date.now()}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error al cargar");
    return data.wishes;
}

async function sendWish(wish) {
    if (!WISHES_API_URL) {
        saveLocalWish(wish);
        return { pendiente: false };
    }
    // Sin cabecera Content-Type -> text/plain, evita el preflight CORS de Apps Script
    const res = await fetch(WISHES_API_URL, {
        method: "POST",
        body: JSON.stringify(wish)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error al enviar");
    return data;
}

/* ---------- Pintar la lista ---------- */

function renderWishes(wishes) {
    wishesList.innerHTML = "";

    if (!wishes.length) {
        const empty = document.createElement("p");
        empty.className = "wishes-empty";
        empty.textContent = "Aún no hay buenos deseos. ¡Sé el primero en dejar uno!";
        wishesList.appendChild(empty);
        return;
    }

    wishes.forEach(w => {
        const card = document.createElement("article");
        card.className = "wish-card";

        const name = document.createElement("h3");
        name.className = "wish-name";
        name.textContent = w.nombre;          // textContent evita inyectar HTML

        const msg = document.createElement("p");
        msg.className = "wish-message";
        msg.textContent = w.mensaje;

        card.append(name, msg);
        wishesList.appendChild(card);
    });
}

async function loadWishes() {
    wishesList.innerHTML = '<p class="wishes-empty">Cargando buenos deseos…</p>';
    try {
        renderWishes(await fetchWishes());
    } catch (err) {
        console.error(err);
        wishesList.innerHTML = '<p class="wishes-empty">No se pudieron cargar los mensajes. Intenta de nuevo más tarde.</p>';
    }
}

/* ---------- Enviar formulario ---------- */

wishForm.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = wishForm.nombre.value.trim().slice(0, MAX_NOMBRE);
    const mensaje = wishForm.mensaje.value.trim().slice(0, MAX_MENSAJE);

    if (!nombre || !mensaje) {
        wishStatus.textContent = "Por favor escribe tu nombre y tu mensaje.";
        return;
    }

    wishSubmit.disabled = true;
    wishSubmit.textContent = "ENVIANDO…";
    wishStatus.textContent = "";

    try {
        const result = await sendWish({
            nombre,
            mensaje,
            website: wishForm.website.value,          // trampa para bots (debe ir vacío)
            tiempo: Date.now() - formOpenedAt         // ms que tardó en llenar el formulario
        });
        wishForm.reset();

        if (result.pendiente) {
            // Con moderación: no aparece hasta que se apruebe
            wishStatus.textContent = "¡Gracias! Tu mensaje se publicará en cuanto sea revisado.";
            setTimeout(() => closeModal(wishFormModal), 3000);
        } else {
            closeModal(wishFormModal);
            loadWishes();
        }
    } catch (err) {
        console.error(err);
        wishStatus.textContent = "No se pudo enviar. Intenta de nuevo.";
    } finally {
        wishSubmit.disabled = false;
        wishSubmit.textContent = "ENVIAR";
    }
});
