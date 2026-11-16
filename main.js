/* =========================================
   CONFIGURACIÓN DE LA INVITACIÓN
   Cambia aquí fechas y enlaces sin tocar el HTML.
========================================= */
const CONFIG = {
    // Inicio del evento (Misa). Formato: AAAA-MM-DDTHH:MM:SS
    fechaEvento: "2026-12-05T18:00:00",

    // Enlaces de Google Maps. Si uno queda vacío, su botón "Ubicación" se oculta.
    mapsMisa: "https://maps.app.goo.gl/hJ6YoWABpuF71pyk6",
    mapsRecepcion: "https://maps.app.goo.gl/GHx2wh75Nm3DNwnQA?g_st=ac"
};


/* =========================================
   ARCHIVOS EXPORTADOS (data-asset)
   Si el archivo existe se usa; si no, se queda el respaldo en CSS.
========================================= */
document.querySelectorAll("[data-asset]").forEach(el => {
    const src = el.dataset.asset;
    const img = new Image();
    img.onload = () => {
        el.style.setProperty("--asset", `url("${src}")`);
        el.classList.add("asset-ok");
    };
    img.src = src;
});


/* =========================================
   MÚSICA (misma funcionalidad que antes)
========================================= */
const audio = document.getElementById("audio1");
const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("pause-button");

function playMusic() {
    audio.play().catch(() => console.log("No se pudo reproducir el audio"));
}

function pauseMusic() {
    audio.pause();
}

function updateMusicButtons() {
    playButton.style.display = audio.paused ? "inline-block" : "none";
    pauseButton.style.display = audio.paused ? "none" : "inline-block";
}

playButton.addEventListener("click", playMusic);
pauseButton.addEventListener("click", pauseMusic);
audio.addEventListener("play", updateMusicButtons);
audio.addEventListener("pause", updateMusicButtons);
updateMusicButtons();


/* =========================================
   SOBRE
   Secuencia (igual que el video):
   1. el sello desaparece
   2. la solapa se abre hacia arriba
   3. la tarjeta con la foto sube y sale del sobre
   4. se libera el resto de la invitación
========================================= */
const envelope = document.getElementById("envelope");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function openEnvelope() {
    if (envelope.classList.contains("is-open")) return;

    envelope.classList.add("is-open");
    envelope.setAttribute("aria-label", "Invitación abierta");
    envelope.disabled = true;
    document.body.classList.add("is-opening");

    playMusic();                       // primer toque = inicia la música

    const total = reduceMotion ? 50 : 1900;
    setTimeout(() => {
        document.body.classList.remove("is-sealed");
        document.body.classList.add("is-opened");
        startReveal();
    }, total);
}

envelope.addEventListener("click", openEnvelope);


/* =========================================
   CONTADOR (lógica de elements/countdown.html)
========================================= */
const target = new Date(CONFIG.fechaEvento).getTime();
const pad = n => String(n).padStart(2, "0");

function tick() {
    const distance = target - Date.now();

    if (distance <= 0) {
        document.getElementById("countdown").innerHTML =
            '<p class="countdown-done">¡Llegó el gran día!</p>';
        clearInterval(timer);
        return;
    }

    document.getElementById("cd-days").textContent = pad(Math.floor(distance / 86400000));
    document.getElementById("cd-hours").textContent = pad(Math.floor(distance % 86400000 / 3600000));
    document.getElementById("cd-minutes").textContent = pad(Math.floor(distance % 3600000 / 60000));
    document.getElementById("cd-seconds").textContent = pad(Math.floor(distance % 60000 / 1000));
}

const timer = setInterval(tick, 1000);
tick();


/* =========================================
   BOTONES DE UBICACIÓN
========================================= */
function setMap(id, url) {
    const link = document.getElementById(id);
    if (url) link.href = url;
    else link.hidden = true;
}

setMap("map-misa", CONFIG.mapsMisa);
setMap("map-recepcion", CONFIG.mapsRecepcion);


/* =========================================
   ANIMACIONES AL HACER SCROLL
========================================= */
function startReveal() {
    const items = document.querySelectorAll("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });

    items.forEach(el => observer.observe(el));
}
