const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Secretos
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// 5. Ritmo de Lectura Variable (TURBO DJ WORKFLOW)
function calculateReadingTime(title) {
    const baseTime = 20;
    const charTime = 25;
    const randomFactor = 0.7 + Math.random() * 0.6;
    const readingTime = baseTime + (title.length * charTime * randomFactor);
    return Math.min(readingTime, 1200);
}

// 6. Click-Stream Fantasma
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

// 7. Scroll Humano
async function humanScroll(page) {
    return await page.evaluate(async () => {
        return new Promise(async (resolve) => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            const SELECTOR = '.searchList__item';
            let lastCount = document.querySelectorAll(SELECTOR).length;
            let lastChangeTime = Date.now();
            const NO_CHANGE_TIMEOUT = 5000;
            console.log("⬇️ Iniciando Scroll Humano...");
            while (true) {
                const distance = 300 + Math.random() * 400;
                window.scrollBy(0, distance);
                let pause = 100 + Math.random() * 200;
                await sleep(pause);
                const currentCount = document.querySelectorAll(SELECTOR).length;
                if (currentCount > lastCount) {
                    lastCount = currentCount;
                    lastChangeTime = Date.now();
                } else if (Date.now() - lastChangeTime > NO_CHANGE_TIMEOUT) {
                     resolve(currentCount);
                     break;
                }
            }
        });
    });
}

// 8. Función de Inspección "Mobile Turbo" (CORREGIDA FINAL)
async function inspeccionMetricas() {
    console.log("\n🔍 === FASE DE INSPECCIÓN TURBO MÓVIL (140 TRACKS) ===");

    // User-Agent obligatorio para inspección móvil
    const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

    try {
        const { data: tracksToInspect, error: queryError } = await supabase
            .from('tracks')
            .select('url, titulo, fecha_ingreso')
            .is('plays_iniciales', null)
            .order('fecha_ingreso', { ascending: false })
            .limit(140);

        if (queryError) {
            console.error("❌ Error al consultar tracks:", queryError);
            return;
        }

        if (!tracksToInspect || tracksToInspect.length === 0) {
            console.log("✅ No hay tracks pendientes de inspección.");
            return;
        }

        console.log(`📊 Inspeccionando ${tracksToInspect.length} tracks en modo 'Turbo Móvil'...`);

        for (let i = 0; i < tracksToInspect.length; i++) {
            const { url, titulo } = tracksToInspect[i];

            // Transformar URL a versión móvil
            const mobileUrl = url.replace('https://soundcloud.com', 'https://m.soundcloud.com');
            console.log(`\n[${i + 1}/${tracksToInspect.length}] 📱 Inspect: ${mobileUrl}`);

            if (titulo) {
                const readTime = calculateReadingTime(titulo);
                await new Promise(resolve => setTimeout(resolve, readTime));
            }

            try {
                // Fetch con User-Agent de iPhone
                const response = await fetch(mobileUrl, {
                    headers: {
                        'User-Agent': MOBILE_UA
                    }
                });

                if (response.status === 404 || response.status === 410) {
                    console.log(`❌ URL Rota (${response.status}): Eliminando de la cola...`);
                    await supabase
                        .from('tracks')
                        .update({
                            plays_iniciales: -1,
                            ultima_inspeccion: new Date().toISOString()
                        })
                        .eq('url', url);
                    continue;
                }

                if (!response.ok) {
                    console.log(`⚠️ Error HTTP ${response.status} (Temporal) para ${url}`);
                    continue;
                }

                const html = await response.text();

                // Extracción basada en __NEXT_DATA__
                const regex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
                const match = html.match(regex);

                if (!match) {
                    console.log(`⚠️ No se encontró __NEXT_DATA__ en ${mobileUrl}`);
                    continue;
                }

                const json = JSON.parse(match[1]);
                const entities = json.props?.pageProps?.initialStoreState?.entities?.tracks || {};

                // --- 📝 CORRECCIÓN FINAL: BÚSQUEDA EXACTA VALIDADA ---
                const trackKey = Object.keys(entities).find(k => k.includes('soundcloud:tracks'));

                if (!trackKey) {
                    console.log(`⚠️ No se encontró la key del track (soundcloud:tracks) en ${mobileUrl}`);
                    continue;
                }

                // Extracción directa usando .data como solicitado
                const trackData = entities[trackKey].data;

                if (!trackData) {
                    console.log(`⚠️ La propiedad .data está vacía en la entidad ${trackKey}`);
                    continue;
                }
                // -----------------------------------------------------

                const extractedData = {
                    sc_id: trackData.id,
                    plays_iniciales: trackData.playback_count,
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
                    console.error(`❌ Error DB Update:`, updateError);
                } else {
					console.log(`✅ DATAZO CAPTURADO (Móvil):
				   🆔 ID: ${extractedData.sc_id} | 📅 Pub: ${extractedData.fecha_publicacion}
				   👁️ Plays: ${extractedData.plays_iniciales} | ❤️ Likes: ${extractedData.likes}
				   💬 Coms: ${extractedData.comentarios} | 🔄 Reposts: ${extractedData.reposts}`);
                }

            } catch (error) {
                console.error(`❌ Error Fetch/Parse:`, error.message);
            }

            // Fatiga Turbo (200ms - 500ms)
            const pausaFatiga = 200 + Math.random() * 300;
            await new Promise(resolve => setTimeout(resolve, pausaFatiga));

            // Descanso Flash cada 40 tracks (1 segundo)
            if ((i + 1) % 40 === 0 && i + 1 < tracksToInspect.length) {
                console.log(`\n⚡ Descanso Flash (1s)...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log("\n✅ Inspección 'Turbo Móvil' completada.");

    } catch (error) {
        console.error("❌ Error General en Inspección:", error);
    }
}

// 9. Ejecución Principal
async function run() {
    console.log("🚀 Iniciando Recolector Humano Elite (Versión Final Corregida)...");

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
        console.log("🔒 Navegador cerrado. Iniciando fase de procesamiento de datos...");
    }

    await inspeccionMetricas();
}

run();
