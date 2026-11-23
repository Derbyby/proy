/* =========================================
   CONFIGURACIÓN DE LA INVITACIÓN
   Cambia aquí fechas, enlaces y canciones sin tocar el HTML.
========================================= */
const CONFIG = {
    // Inicio del evento. Formato: AAAA-MM-DDTHH:MM:SS
    fechaEvento: "2026-12-05T18:00:00",

    // Enlaces de Google Maps. Si uno queda vacío, su botón "Ubicación" se oculta.
    mapsCeremonia: "https://maps.app.goo.gl/hJ6YoWABpuF71pyk6",
    mapsRecepcion: "https://maps.app.goo.gl/GHx2wh75Nm3DNwnQA?g_st=ac",

    // Canciones del reproductor (se pueden agregar más; ◀◀ y ▶▶ cambian entre ellas)
    canciones: [
        "assets/musica/say-yes.mp3"
    ]
};


/* =========================================
   MÚSICA
   - La música empieza al tocar "Da click aquí" o ▶
   - |◀ atrasa y ▶| adelanta 10 segundos
   - La barra muestra el avance y se puede tocar para saltar
   - El botón flotante aparece cuando ya sonó la música
========================================= */
const SALTO_SEGUNDOS = 10;

const audio = document.getElementById("audio1");
const musicToggle = document.getElementById("music-toggle");
const musicFloat = document.getElementById("music-float");
const progress = document.getElementById("music-progress");
let track = 0;

function loadTrack(i) {
    track = (i + CONFIG.canciones.length) % CONFIG.canciones.length;
    audio.src = CONFIG.canciones[track];
}

function playMusic() {
    document.body.classList.add("music-started");
    audio.play().catch(() => console.log("No se pudo reproducir el audio"));
}

function toggleMusic() {
    if (audio.paused) playMusic();
    else audio.pause();
}

function seek(seconds) {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration - 0.25);
    updateProgress();
}

function updateMusicButtons() {
    const playing = !audio.paused;
    const label = playing ? "Pausar música" : "Reproducir música";
    document.body.classList.toggle("is-playing", playing);
    musicToggle.setAttribute("aria-label", label);
    musicFloat.setAttribute("aria-label", label);
}

function updateProgress() {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.style.setProperty("--p", pct + "%");
    progress.setAttribute("aria-valuenow", Math.round(pct));
}

loadTrack(0);

// Con una sola canción se repite; con varias pasa a la siguiente al terminar
audio.addEventListener("ended", () => {
    if (CONFIG.canciones.length > 1) loadTrack(track + 1);
    else audio.currentTime = 0;
    playMusic();
});

document.getElementById("music-start").addEventListener("click", () => {
    if (audio.paused) playMusic();
});
musicToggle.addEventListener("click", toggleMusic);
musicFloat.addEventListener("click", toggleMusic);
document.getElementById("music-back").addEventListener("click", () => seek(-SALTO_SEGUNDOS));
document.getElementById("music-forward").addEventListener("click", () => seek(SALTO_SEGUNDOS));

// Tocar o arrastrar sobre la barra para ir a esa parte de la canción
function seekToPointer(e) {
    if (!isFinite(audio.duration)) return;
    const r = progress.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
    audio.currentTime = (x / r.width) * audio.duration;
    updateProgress();
}

progress.addEventListener("pointerdown", e => {
    progress.setPointerCapture(e.pointerId);
    seekToPointer(e);
});
progress.addEventListener("pointermove", e => {
    if (progress.hasPointerCapture(e.pointerId)) seekToPointer(e);
});
progress.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { seek(SALTO_SEGUNDOS); e.preventDefault(); }
    if (e.key === "ArrowLeft")  { seek(-SALTO_SEGUNDOS); e.preventDefault(); }
});

audio.addEventListener("play", updateMusicButtons);
audio.addEventListener("pause", updateMusicButtons);
audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", updateProgress);
updateMusicButtons();


/* =========================================
   CONTADOR
========================================= */
const target = new Date(CONFIG.fechaEvento).getTime();
const pad = n => String(n).padStart(2, "0");
let timer;

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

timer = setInterval(tick, 1000);
tick();


/* =========================================
   BOTONES DE UBICACIÓN (dentro del cuadro SVG)
========================================= */
function setMap(id, url) {
    const link = document.getElementById(id);
    if (url) {
        link.setAttribute("href", url);
    } else {
        link.style.display = "none";
    }
}

setMap("map-ceremonia", CONFIG.mapsCeremonia);
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
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    items.forEach(el => observer.observe(el));
}

startReveal();
