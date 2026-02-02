const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Secretos
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CONFIGURACIÓN DE PARALELISMO (NUEVO)
const PARALLEL_POOL_SIZE = 5; // Ajustable: Número de tracks a inspeccionar a la vez

// 2. Objetivo: House, publicado en la última hora
const TARGET = 'https://soundcloud.com/search/sounds?q=house&filter.duration=medium&filter.created_at=last_hour';

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
        const x = Math.pow(1-t, 3) * startX + 3 * Math.pow(1-t, 2) * t * cp1X + 3 * (1-t) * Math.pow(t, 2) * cp2X + Math.pow(t, 3) * endX;
        const y = Math.pow(1-t, 3) * startY + 3 * Math.pow(1-t, 2) * t * cp1Y + 3 * (1-t) * Math.pow(t, 2) * cp2Y + Math.pow(t, 3) * endY;

        const shakeX = (Math.random() - 0.5) * 2;
        const shakeY = (Math.random() - 0.5) * 2;

        await page.mouse.move(x + shakeX, y + shakeY);
        await new Promise(r => setTimeout(r, 8 + Math.random() * 15));
    }
    console.log("🖱️ Movimiento con temblor humano completado");
}

// 5. Click-Stream Fantasma
async function ghostClick(page) {
    const deadZones = [
        { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 },
        { x: 800 + Math.random() * 200, y: 100 + Math.random() * 150 },
        { x: 300 + Math.random() * 200, y: 600 + Math.random() * 100 }
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

                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    await sleep(500);
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

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

// 7. Función de Inspección "Zero Latency" con POOL DE PARALELISMO
async function inspeccionMetricas() {
    console.log("\n⚡ === FASE DE INSPECCIÓN ZERO LATENCY (POOL DE PARALELISMO) ===");

    // User-Agent obligatorio para inspección móvil
    const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

    try {
        const { data: tracksToInspect, error: queryError } = await supabase
            .from('tracks')
            .select('url, titulo, fecha_ingreso')
            .is('plays_iniciales', null)
            .order('fecha_ingreso', { ascending: false })
            .limit(300);

        if (queryError) {
            console.error("❌ Error al consultar tracks:", queryError);
            return;
        }

        if (!tracksToInspect || tracksToInspect.length === 0) {
            console.log("✅ No hay tracks pendientes de inspección.");
            return;
        }

        console.log(`🚀 Acelerando al máximo para ${tracksToInspect.length} tracks (Lotes de ${PARALLEL_POOL_SIZE})...`);

        // BUCLE CON POOL DE PARALELISMO
        for (let i = 0; i < tracksToInspect.length; i += PARALLEL_POOL_SIZE) {
            const chunk = tracksToInspect.slice(i, i + PARALLEL_POOL_SIZE);

            // Procesar el lote en paralelo
            await Promise.all(chunk.map(async (track, index) => {
                const globalIndex = i + index + 1;
                const { url, titulo } = track;

                // Transformar URL a versión móvil
                const mobileUrl = url.replace('https://soundcloud.com', 'https://m.soundcloud.com');
                console.log(`[${globalIndex}/${tracksToInspect.length}] 🔥 ${mobileUrl}`);

                try {
                    // Fetch con User-Agent de iPhone
                    const response = await fetch(mobileUrl, {
                        headers: {
                            'User-Agent': MOBILE_UA
                        }
                    });

                    if (response.status === 404 || response.status === 410) {
                        console.log(`❌ Roto (${response.status}) -> Eliminando.`);
                        await supabase
                            .from('tracks')
                            .update({
                                plays_iniciales: -1,
                                ultima_inspeccion: new Date().toISOString()
                            })
                            .eq('url', url);
                        return; // Salir de la función async para este track
                    }

                    if (!response.ok) {
                        console.log(`⚠️ HTTP ${response.status}`);
                        return;
                    }

                    const html = await response.text();

                    // Extracción basada en __NEXT_DATA__
                    const regex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
                    const match = html.match(regex);

                    if (!match) {
                        console.log(`⚠️ Sin __NEXT_DATA__`);
                        return;
                    }

                    const json = JSON.parse(match[1]);
                    const entities = json.props?.pageProps?.initialStoreState?.entities?.tracks || {};

                    // Búsqueda robusta de la llave
                    const trackKey = Object.keys(entities).find(k => k.includes('soundcloud:tracks'));

                    if (!trackKey) {
                        console.log(`⚠️ Key no encontrada`);
                        return;
                    }

                    const trackData = entities[trackKey].data;

                    if (!trackData) {
                        console.log(`⚠️ Data vacía`);
                        return;
                    }

                    const extractedData = {
                        sc_id: trackData.id,

                        // --- 📸 SNAPSHOT FASE 3.5 (MEMORIA INICIAL) ---
                        plays_iniciales: trackData.playback_count,
                        likes_iniciales: trackData.likes_count,          // <--- NUEVO
                        comentarios_iniciales: trackData.comment_count,  // <--- NUEVO

                        // Datos Actuales
                        plays_actuales: trackData.playback_count,
                        likes: trackData.likes_count,
                        comentarios: trackData.comment_count,
                        reposts: trackData.reposts_count,

                        fecha_publicacion: trackData.created_at,
                        ultima_inspeccion: new Date().toISOString()
                    };

                    const { error: updateError } = await supabase
                        .from('tracks')
                        .update(extractedData)
                        .eq('url', url);

                    if (updateError) {
                        console.error(`❌ DB Error`, updateError);
                    } else {
                        // Log simplificado
                        // Log Fase 3.5: Confirmación de Memoria
                        console.log(`✅ OK: ${extractedData.sc_id} | Init(P:${extractedData.plays_iniciales}/L:${extractedData.likes_iniciales}/C:${extractedData.comentarios_iniciales})`);
                    }

                } catch (error) {
                    console.error(`❌ Error en track ${globalIndex}:`, error.message);
                }
            }));
            // Fin del Promise.all para este lote, el bucle pasa al siguiente inmediatamente
        }

        console.log("\n✅ Inspección 'Zero Latency + Parallel Pool' completada.");

    } catch (error) {
        console.error("❌ Error General en Inspección:", error);
    }
}


// 8. Ejecución Principal (CON PRECISIÓN DINÁMICA DE TIEMPO)
async function run() {
    // 1. OBTENCIÓN DEL TIEMPO REAL (Safety Layer)
    // Leemos la marca de tiempo del YAML para saber cuánto tardó el Setup
    const jobStartTime = process.env.JOB_START_TIME
        ? parseInt(process.env.JOB_START_TIME)
        : Date.now();

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
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = {
            app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
            runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }, OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }, PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformNacos: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' } }
        };
        const cores = [4, 8, 16][Math.floor(Math.random() * 3)];
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores });
        Object.defineProperty(navigator, 'plugins', { get: () => [{ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }, { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' }, { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'es'] });
    });

    await page.setUserAgent(randomUA);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    try {
        // CHECK DE SEGURIDAD 1: ¿Nos queda tiempo para navegar?
        if (Date.now() > DEADLINE) throw new Error("Tiempo agotado antes de navegar");

        console.log("🌍 Viajando a SoundCloud...");
        await page.goto(TARGET, { waitUntil: 'domcontentloaded' });

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

        const data = await page.evaluate(() => {
            const items = document.querySelectorAll('.searchList__item a.soundTitle__title');
            return Array.from(items).map(a => ({
                url: 'https://soundcloud.com' + a.getAttribute('href'),
                titulo: a.innerText.trim()
            }));
        });

        console.log(`🌾 Recolectados: ${data.length} tracks.`);

        if (data.length > 0) {
            const { error } = await supabase
                .from('tracks')
                .upsert(data.map(d => ({ url: d.url, titulo: d.titulo })), { onConflict: 'url', ignoreDuplicates: true });

            if (error) console.error("❌ Error DB Upsert:", error);
            else console.log("✅ URLs nuevas sembradas en la nube.");
        } else {
            console.log("⚠️ No se encontró música nueva en esta hora.");
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
        await inspeccionMetricas();
    } else {
        console.log("🛑 Tiempo agotado. Saltando inspección de métricas por seguridad.");
    }

    console.log(`🏁 Fin del Trabajo. Duración Total: ${((Date.now() - jobStartTime)/1000).toFixed(1)}s`);
}

run();
