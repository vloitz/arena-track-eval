const puppeteer = require('puppeteer');
const {
    createClient
} = require('@supabase/supabase-js');

// 1. Configuración de Secretos
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Objetivo: House, publicado en la última hora
const TARGET = 'https://soundcloud.com/search/sounds?q=house&filter.duration=medium&filter.created_at=last_hour';

// --- CRITERIOS ÉLITE (DJ STYLE) ---
const DURACION_MIN = 180000; // 3 minutos en ms
const DURACION_MAX = 480000; // 8 minutos en ms
const GENEROS_ELITE = [
    'tech house', 'house', 'deep tech', 'minimal house', 'microhouse',
    'afro house', 'deep house', 'dance edm', 'funky house',
    'jackin house', 'groove house', 'garage house', 'hard house',
    'uk garage', 'bassline', 'hardgroove', 'indie dance'
];
// --- 🚫 FILTRO DE EXCLUSIÓN (Basura Detectada) ---
const BLACKLIST_ELITE = [
    'techno', 'electronic', 'rock', 'cute', 'pop', 'slap',
    'progressive', 'tropical', 'kpop', 'radio edit', 'bootleg'
];

// --- LA LLAVE MAESTRA: INTERCEPTOR XHR ---
const INTERCEPTOR_SCRIPT = `
(function() {
    window.COLECCION_MAESTRA = [];
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m, url) { this._url = url; return originalOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            if (this._url.match(/\\/search|\\/tracks|\\/selections/)) {
                try {
                    const data = JSON.parse(this.responseText);
                    const items = data.collection || data.tracks || [];
                    items.forEach(item => {
                        const t = item.track || item;
                        if (t.kind === 'track' && !window.COLECCION_MAESTRA.some(m => m.id === t.id)) {
                            window.COLECCION_MAESTRA.push(t);
                        }
                    });
                } catch (e) {}
            }
        });
        return originalSend.apply(this, arguments);
    };
})();`;

// 3. Array de User-Agents Variables (Escritorio - Se mantiene para búsqueda)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];

// 4. Curva de Bézier con Micro-Temblor
async function humanMouseWithShake(page) {
    const startX = Math.floor(Math.random() * 200) + 50;
    const startY = Math.floor(Math.random() * 200) + 50;
    const endX = Math.floor(Math.random() * 400) + 200;
    const endY = Math.floor(Math.random() * 400) + 200;

    const cp1X = startX + (Math.random() - 0.5) * 200;
    const cp1Y = startY + (Math.random() - 0.5) * 200;
    const cp2X = endX + (Math.random() - 0.5) * 200;
    const cp2Y = endY + (Math.random() - 0.5) * 200;

    const steps = 20 + Math.floor(Math.random() * 15);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.pow(1 - t, 3) * startX + 3 * Math.pow(1 - t, 2) * t * cp1X + 3 * (1 - t) * Math.pow(t, 2) * cp2X + Math.pow(t, 3) * endX;
        const y = Math.pow(1 - t, 3) * startY + 3 * Math.pow(1 - t, 2) * t * cp1Y + 3 * (1 - t) * Math.pow(t, 2) * cp2Y + Math.pow(t, 3) * endY;

        const shakeX = (Math.random() - 0.5) * 2;
        const shakeY = (Math.random() - 0.5) * 2;

        await page.mouse.move(x + shakeX, y + shakeY);
        await new Promise(r => setTimeout(r, 8 + Math.random() * 15));
    }
    console.log("🖱️ Movimiento con temblor humano completado");
}

// 5. Click-Stream Fantasma
async function ghostClick(page) {
    const deadZones = [{
            x: 50 + Math.random() * 100,
            y: 50 + Math.random() * 100
        },
        {
            x: 800 + Math.random() * 200,
            y: 100 + Math.random() * 150
        },
        {
            x: 300 + Math.random() * 200,
            y: 600 + Math.random() * 100
        }
    ];
    const zone = deadZones[Math.floor(Math.random() * deadZones.length)];
    await page.mouse.move(zone.x, zone.y);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    if (Math.random() < 0.3) {
        await page.mouse.click(zone.x, zone.y);
        console.log("👻 Click fantasma ejecutado");
    }
}

// 6. Scroll Humano Turbo + Sacudón
async function humanScroll(page) {
    return await page.evaluate(async () => {
        return new Promise(async (resolve) => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            const SELECTOR = '.searchList__item';
            let lastCount = document.querySelectorAll(SELECTOR).length;
            let lastChangeTime = Date.now();
            let hasReset = false; // Control de reseteo

            const NO_CHANGE_TIMEOUT = 5000;
            const RESET_THRESHOLD = 2000; // 2 segundos sin cambios dispara el sacudón

            console.log("🚀 Iniciando Scroll Turbo con Reseteo...");

            while (true) {
                // 1. SCROLL AGRESIVO (Fuerza Bruta)
                window.scrollBy(0, window.innerHeight * 4);

                await sleep(100);

                const currentCount = document.querySelectorAll(SELECTOR).length;
                const timeSinceLastChange = Date.now() - lastChangeTime;

                if (currentCount > lastCount) {
                    lastCount = currentCount;
                    lastChangeTime = Date.now();
                    hasReset = false; // Resetear bandera si hay música nueva
                }
                // 2. SISTEMA DE SACUDÓN (Detección de Bloqueo)
                else if (timeSinceLastChange > RESET_THRESHOLD && !hasReset) {
                    console.log("⚠️ Carga trabada. Aplicando sacudón arriba/abajo...");
                    hasReset = true;

                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    await sleep(500);
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: 'smooth'
                    });

                    lastChangeTime = Date.now(); // Reiniciar cronómetro tras el sacudón
                }
                // 3. CIERRE FINAL
                else if (timeSinceLastChange > NO_CHANGE_TIMEOUT) {
                    resolve(currentCount);
                    break;
                }
            }
        });
    });
}


// 8. Ejecución Principal (CON PRECISIÓN DINÁMICA DE TIEMPO)
async function run() {
    // 1. OBTENCIÓN DEL TIEMPO REAL (Safety Layer)
    // Leemos la marca de tiempo del YAML para saber cuánto tardó el Setup
    const jobStartTime = process.env.JOB_START_TIME ?
        parseInt(process.env.JOB_START_TIME) :
        Date.now();

    // Límite duro de GitHub (15m) - 30s de Buffer para cierre limpio
    const DEADLINE = jobStartTime + (15 * 60 * 1000) - 30000;

    console.log("🚀 Iniciando Recolector Humano Elite (Versión PARALLEL POOL)...");
    console.log(`⏱️ Sincronización de Reloj: Setup consumió ${((Date.now() - jobStartTime)/1000).toFixed(1)}s`);

    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const browser = await puppeteer.launch({
        headless: 'shell',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        userDataDir: '/tmp/puppeteer-data'
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Evasión de Huella Digital
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
        window.chrome = {
            app: {
                isInstalled: false,
                InstallState: {
                    DISABLED: 'disabled',
                    INSTALLED: 'installed',
                    NOT_INSTALLED: 'not_installed'
                },
                RunningState: {
                    CANNOT_RUN: 'cannot_run',
                    READY_TO_RUN: 'ready_to_run',
                    RUNNING: 'running'
                }
            },
            runtime: {
                OnInstalledReason: {
                    CHROME_UPDATE: 'chrome_update',
                    INSTALL: 'install',
                    SHARED_MODULE_UPDATE: 'shared_module_update',
                    UPDATE: 'update'
                },
                OnRestartRequiredReason: {
                    APP_UPDATE: 'app_update',
                    OS_UPDATE: 'os_update',
                    PERIODIC: 'periodic'
                },
                PlatformArch: {
                    ARM: 'arm',
                    ARM64: 'arm64',
                    MIPS: 'mips',
                    MIPS64: 'mips64',
                    X86_32: 'x86-32',
                    X86_64: 'x86-64'
                },
                PlatformNacos: {
                    ANDROID: 'android',
                    CROS: 'cros',
                    LINUX: 'linux',
                    MAC: 'mac',
                    OPENBSD: 'openbsd',
                    WIN: 'win'
                },
                PlatformOs: {
                    ANDROID: 'android',
                    CROS: 'cros',
                    LINUX: 'linux',
                    MAC: 'mac',
                    OPENBSD: 'openbsd',
                    WIN: 'win'
                },
                RequestUpdateCheckStatus: {
                    NO_UPDATE: 'no_update',
                    THROTTLED: 'throttled',
                    UPDATE_AVAILABLE: 'update_available'
                }
            }
        };
        const cores = [4, 8, 16][Math.floor(Math.random() * 3)];
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => cores
        });
        Object.defineProperty(navigator, 'plugins', {
            get: () => [{
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format'
            }, {
                name: 'Chrome PDF Viewer',
                filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                description: ''
            }, {
                name: 'Native Client',
                filename: 'internal-nacl-plugin',
                description: ''
            }]
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'es']
        });
    });

    await page.setUserAgent(randomUA);

    // Inyectar el interceptor antes de cargar la web
    await page.evaluateOnNewDocument(INTERCEPTOR_SCRIPT);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    try {
        // CHECK DE SEGURIDAD 1: ¿Nos queda tiempo para navegar?
        if (Date.now() > DEADLINE) throw new Error("Tiempo agotado antes de navegar");

        console.log("🌍 Viajando a SoundCloud...");
        await page.goto(TARGET, {
            waitUntil: 'domcontentloaded'
        });

        // --- 🛡️ BLINDAJE TOTAL ---
        await page.evaluate(() => {
            const selectors = {
                "Cookies": '#onetrust-banner-sdk',
                "Filtro Oscuro": '.onetrust-pc-dark-filter',
                "Banners Publicidad": '.l-product-banners',
                "Panel de Filtros": '.l-fixed-left',
                "Barra Navegación": 'header[role="banner"]',
                "Banner Get Heard": '.m-get_heard',
                "Diálogo Privacidad": 'div[role="dialog"][aria-label*="privacidad"]'
            };

            for (const [nombre, selector] of Object.entries(selectors)) {
                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.style.visibility = 'hidden';
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    }
                } catch (err) {
                    console.error(`Error ocultando ${nombre}`);
                }
            }
            try {
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = 'auto';
                const mainContent = document.querySelector('.l-container');
                if (mainContent) mainContent.style.marginLeft = '0';
            } catch (e) {}
        });
        // --- FIN BLINDAJE ---

        await humanMouseWithShake(page);
        await humanScroll(page);
        await ghostClick(page);

        const reporteCosecha = await page.evaluate((minDur, maxDur, eliteGenres, blacklist) => {
            const rawTracks = window.COLECCION_MAESTRA || [];
            const resultados = {
                aceptados: [],
                ignorados: []
            };

            rawTracks.forEach(t => {
                const durMinutos = (t.duration / 60000).toFixed(2);


                // 1. Limpieza de ADN (Quitamos TODO lo que no sea letra o número para comparar)
                const adnOriginal = ((t.genre || '') + ' ' + (t.tag_list || '')).toLowerCase();
                const adnLimpio = adnOriginal.replace(/[^a-z0-9]/g, '');


                // --- 🛡️ ESCUDO DE DOBLE NIVEL (Lógica de Aduana Diferenciada) ---
                // Separamos el Género Principal de los Tags para aplicar justicia selectiva.
                const generoPrincipal = (t.genre || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const tagsLimpios = (t.tag_list || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                // NIVEL A: BLOQUEO RADICAL POR GÉNERO (El "Pasaporte")
                // Si el artista declara oficialmente que su género es uno de la blacklist, el rechazo es total.
                // Aquí 'electronic', 'techno' o 'rock' son veneno mortal si aparecen como género principal.
                const generoEsBasura = blacklist.some(word => {
                    const wordLimpia = word.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return generoPrincipal.includes(wordLimpia);
                });

                // NIVEL B: BLOQUEO DE TAGS CON "PERDÓN" (El "Equipaje")
                // Filtramos la basura en las etiquetas, pero extraemos 'electronic' de la lista de prohibidos.
                // Esto permite que un track de 'House' o 'EDM' que use el tag 'electronic' para ganar visibilidad pase el filtro.
                const tagsTienenBasura = blacklist
                    .filter(word => word.toLowerCase() !== 'electronic') // Perdonamos 'electronic' solo en los tags
                    .some(word => {
                        const wordLimpia = word.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return tagsLimpios.includes(wordLimpia);
                    });

                // SENTENCIA FINAL: El track es basura si el género declarado es prohibido
                // O si los tags contienen cualquier otra palabra prohibida que NO sea 'electronic'.
                const esBasura = generoEsBasura || tagsTienenBasura;


                // 2. Validar Tiempo
                const cumpleTiempo = t.duration >= minDur && t.duration <= maxDur;

                // 3. Validar Género (ADN) con Normalización Nuclear
                const cumpleGenero = eliteGenres.some(g => {
                    const generoBuscadoLimpio = g.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return adnLimpio.includes(generoBuscadoLimpio);
                });

                // 4. NUEVO: Validar Juventud (Máximo 3 meses / 90 días)
                const fechaPublicacion = new Date(t.created_at);
                const hoy = new Date();
                const limiteMeses = 3;
                // Calculamos la diferencia exacta en meses (promedio de 30.44 días)
                const diferenciaMeses = (hoy - fechaPublicacion) / (1000 * 60 * 60 * 24 * 30.44);
                const esReciente = diferenciaMeses <= limiteMeses;

                const trackData = {
                    sc_id: t.id,
                    titulo: t.title,
                    duracion: `${durMinutos}m`,
                    genero: t.genre || 'N/A',
                    tags: t.tag_list || ''
                };



                if (!esBasura && cumpleTiempo && cumpleGenero && esReciente) {
                    const pTitle = (t.purchase_title || '').toLowerCase();
                    const pUrl = (t.purchase_url || '').toLowerCase();

                    // --- 🏷️ CATEGORIZACIÓN POR TRANSPARENCIA ---
                    let categoria = 'NONE';
                    const esTiendaPro = pUrl.includes('beatport') || pUrl.includes('traxsource') || pUrl.includes('bandcamp');
                    // Unificación: Drive, Dropbox, Mega y Mediafire se consideran descarga directa para el DJ
                    const esNubeDirecta = pUrl.includes('drive.google') || pUrl.includes('dropbox') || pUrl.includes('mega.nz') || pUrl.includes('mediafire.com');

                    if (esTiendaPro) {
                        // Si está en tiendas, es categoría profesional/compra (evitamos el engaño)
                        categoria = 'PURCHASE';
                    } else if (t.downloadable || esNubeDirecta) {
                        // Si no es de tienda pero tiene botón de SoundCloud o link de nube directa
                        categoria = 'DIRECT';
                    } else if (pUrl.includes('hypeddit') || pUrl.includes('toneden') || pUrl.includes('theartistunion')) {
                        categoria = 'GATE';
                    } else if (pTitle.includes('free')) {
                        categoria = 'FREE_OTHER';
                    }

                    resultados.aceptados.push({
                        ...trackData,
                        url: t.permalink_url,
                        duracion_ms: t.duration,
                        has_download: categoria !== 'NONE',
                        download_category: categoria,
                        plays_iniciales: t.playback_count,
                        likes_iniciales: t.likes_count,
                        comentarios_iniciales: t.comment_count,
                        plays_actuales: t.playback_count,
                        likes: t.likes_count,
                        comentarios: t.comment_count,
                        reposts: t.reposts_count,
                        fecha_publicacion: t.created_at,
                        ultima_inspeccion: new Date().toISOString()
                    });
                } else {
                    let razon = '';
                    if (esBasura) {
                        razon = `🚫 BLACKLIST: ADN Prohibido en '${generoPrincipal}'`;
                    } else if (!cumpleTiempo) {
                        razon = `Duración fuera de rango (${durMinutos}m)`;
                    } else if (!esReciente) {
                        razon = `Demasiado viejo (${diasAntiguedad} días)`;
                    } else {
                        razon = `Género/Tags no élite`;
                    }

                    resultados.ignorados.push({
                        ...trackData,
                        razon
                    });
                }
            });
            return resultados;
        }, DURACION_MIN, DURACION_MAX, GENEROS_ELITE, BLACKLIST_ELITE);

        const {
            aceptados,
            ignorados
        } = reporteCosecha;

        console.log(`\n📊 --- REPORTE DE INTELIGENCIA ---`);
        console.log(`✅ ACEPTADOS PARA DB: ${aceptados.length}`);
        console.log(`❌ IGNORADOS POR FILTRO: ${ignorados.length}`);
        console.log(`📦 TOTAL PROCESADOS EN RED: ${aceptados.length + ignorados.length}`);

        if (aceptados.length > 0) {
            console.log("\n💎 MUESTRA DE TRACKS ÉLITE:");
            console.table(aceptados.slice(0, 10).map(t => ({
                Titulo: t.titulo.substring(0, 30),
                Dur: t.duracion,
                Cat: t.download_category
            })));
        }

        if (ignorados.length > 0) {
            console.log("\n🗑️ RAZONES DE DESCARTE (Muestra):");
            console.table(ignorados.map(t => ({
                Titulo: t.titulo.substring(0, 30),
                Razon: t.razon
            })));
        }

        // Sincronizamos los datos filtrados quitando la columna visual 'duracion' que no existe en DB
        const data = aceptados.map(({
            duracion,
            ...dbData
        }) => dbData);

        if (data.length > 0) {
            // Realizamos el Upsert usando sc_id como identificador único real
            // Esto evita duplicados si el artista cambia el título/URL más adelante.
            const {
                error
            } = await supabase
                .from('tracks')
                .upsert(data, {
                    onConflict: 'sc_id',
                    ignoreDuplicates: true
                });

            if (error) {
                console.error("❌ Error DB Upsert:", error);
            } else {
                console.log(`✅ ${data.length} tracks con DATA COMPLETA sembrados en la nube.`);
            }
        } else {
            console.log("⚠️ No se encontró música nueva que cumpla tus criterios Élite en esta tanda.");
        }

        await ghostClick(page);

    } catch (e) {
        console.error("❌ Error crítico en recolección:", e);
    } finally {
        if (browser) await browser.close();
        console.log("🔒 Navegador cerrado.");
    }

    // CHECK DE SEGURIDAD 2: ¿Nos queda tiempo para inspeccionar métricas?
    if (Date.now() < DEADLINE) {
        console.log("⚡ Iniciando fase de procesamiento de datos...");
    } else {
        console.log("🛑 Tiempo agotado. Saltando inspección de métricas por seguridad.");
    }

    console.log(`🏁 Fin del Trabajo. Duración Total: ${((Date.now() - jobStartTime)/1000).toFixed(1)}s`);
}

run();
