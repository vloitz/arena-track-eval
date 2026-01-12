const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Secretos
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Objetivo: House, publicado en la última hora
const TARGET = 'https://soundcloud.com/search/sounds?q=house&filter.duration=medium&filter.created_at=last_hour';

// 3. Array de User-Agents Variables
const USER_AGENTS = [
    // Windows 11 - Chrome y Edge (Los más comunes)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',

    // macOS - Chrome y Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',

    // Linux (Muy común en entornos de desarrollo)
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',

    // Versiones ligeramente anteriores (Para simular usuarios que no actualizan al día)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',

    // Firefox (Es vital tenerlo para romper el patrón de WebKit/Chrome)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0'
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

// 5. Ritmo de Lectura Variable
function calculateReadingTime(title) {
    const baseTime = 30;
    const charTime = 45;
    const randomFactor = 0.7 + Math.random() * 0.6;
    const readingTime = baseTime + (title.length * charTime * randomFactor);
    return Math.min(readingTime, 3000);
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

// 8. Función de Inspección "High Volume" (OPTIMIZADA)
async function inspeccionMetricas() {
    // ⚡ OPTIMIZACIÓN: Aumento de capacidad a 140 tracks
    console.log("\n🔍 === FASE DE INSPECCIÓN DE MÉTRICAS (140 TRACKS - HIGH VOLUME) ===");

    try {
        const { data: tracksToInspect, error: queryError } = await supabase
            .from('tracks')
            .select('url, titulo, created_at') // Se asume 'created_at' como fecha de ingreso
            .is('plays_iniciales', null)
            // ⚡ OPTIMIZACIÓN: Priorización LIFO (Lo último que entró se procesa primero)
            .order('created_at', { ascending: false })
            .limit(140);

        if (queryError) {
            console.error("❌ Error al consultar tracks:", queryError);
            return;
        }

        if (!tracksToInspect || tracksToInspect.length === 0) {
            console.log("✅ No hay tracks pendientes de inspección.");
            return;
        }

        console.log(`📊 Inspeccionando ${tracksToInspect.length} tracks en modo 'High Volume'...`);

        for (let i = 0; i < tracksToInspect.length; i++) {
            const { url, titulo } = tracksToInspect[i];
            console.log(`\n[${i + 1}/${tracksToInspect.length}] Inspeccionando: ${url}`);

            if (titulo) {
                const readTime = calculateReadingTime(titulo);
                // Pequeña optimización en logs para no saturar
                // console.log(`📖 Leyendo... (${Math.round(readTime)}ms)`);
                await new Promise(resolve => setTimeout(resolve, readTime));
            }

            try {
                const response = await fetch(url);

                // ⚡ OPTIMIZACIÓN: Lógica de 'Skip' Inteligente (404/410)
                if (response.status === 404 || response.status === 410) {
                    console.log(`❌ URL Rota (${response.status}): Eliminando de la cola...`);
                    await supabase
                        .from('tracks')
                        .update({
                            status: 'ELIMINADO', // Asegúrate de tener esta columna o usa otra lógica
                            plays_iniciales: -1, // Valor centinela para sacarlo del NULL
                            ultima_inspeccion: new Date().toISOString()
                        })
                        .eq('url', url);
                    continue; // Salta al siguiente track inmediatamente
                }

                if (!response.ok) {
                    console.log(`⚠️ Error HTTP ${response.status} (Temporal) para ${url}`);
                    continue;
                }

                const html = await response.text();
                const regex = /window\.__sc_hydration\s*=\s*(\[.*?\]);/s;
                const match = html.match(regex);

                if (!match) {
                    console.log(`⚠️ No se encontró __sc_hydration en ${url}`);
                    // Opcional: Marcar error si esto pasa muy seguido
                    continue;
                }

                const hydrationData = JSON.parse(match[1]);

                let trackData = null;
                for (const item of hydrationData) {
                    if (item.hydratable === 'sound' && item.data) {
                        trackData = item.data;
                        break;
                    }
                }

                if (!trackData) {
                    console.log(`⚠️ No se encontraron datos del track en el JSON.`);
                    continue;
                }

                const extractedData = {
                    sc_id: trackData.id,
                    plays_iniciales: trackData.playback_count,
                    plays_actuales: trackData.playback_count,
                    likes: trackData.likes_count,
                    comentarios: trackData.comment_count,
                    reposts: trackData.reposts_count,
                    fecha_publicacion: trackData.created_at,
                    ultima_inspeccion: new Date().toISOString(),
                    status: 'ACTIVO' // Confirmamos que está vivo
                };

                const { error: updateError } = await supabase
                    .from('tracks')
                    .update(extractedData)
                    .eq('url', url);

				if (updateError) {
                    console.error(`❌ Error DB Update:`, updateError);
                } else {
					// ⚡ OPTIMIZACIÓN: Log Verbose solicitado para monitoreo
					console.log(`✅ DATAZO CAPTURADO:
				   🆔 ID: ${extractedData.sc_id} | 📅 Pub: ${extractedData.fecha_publicacion}
				   👁️ Plays: ${extractedData.plays_iniciales} | ❤️ Likes: ${extractedData.likes}
				   💬 Coms: ${extractedData.comentarios} | 🔄 Reposts: ${extractedData.reposts}`);
                }

            } catch (error) {
                console.error(`❌ Error Fetch/Parse:`, error.message);
            }

            // ⚡ OPTIMIZACIÓN: Pausa de Fatiga Acelerada (0.5s a 1.0s)
            // Ganamos velocidad sin perder lo orgánico
            const pausaFatiga = 500 + Math.random() * 500;
            // console.log(`⏳ Pausa rápida: ${(pausaFatiga / 1000).toFixed(2)}s`);
            await new Promise(resolve => setTimeout(resolve, pausaFatiga));

            // Descanso leve cada 30 tracks (antes era 20)
            if ((i + 1) % 30 === 0 && i + 1 < tracksToInspect.length) {
                console.log(`\n☕ Micro-descanso táctico...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log("\n✅ Inspección 'High Volume' completada.");

    } catch (error) {
        console.error("❌ Error General en Inspección:", error);
    }
}

// 9. Ejecución Principal
async function run() {
    console.log("🚀 Iniciando Recolector Humano Elite (Versión High Volume)...");

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

    // ⚡ OPTIMIZACIÓN: Timeout Global para evitar zombies
    page.setDefaultTimeout(30000); // 30 segundos máximo por acción

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

    // Bloquear recursos pesados
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    try {
        console.log("🌍 Viajando a SoundCloud...");
        await page.goto(TARGET, { waitUntil: 'domcontentloaded' });

        await humanMouseWithShake(page);
        await humanScroll(page);
        await ghostClick(page);

        // Extracción de URLs
        const data = await page.evaluate(() => {
            const items = document.querySelectorAll('.searchList__item a.soundTitle__title');
            return Array.from(items).map(a => ({
                url: 'https://soundcloud.com' + a.getAttribute('href'),
                titulo: a.innerText.trim()
            }));
        });

        console.log(`🌾 Recolectados: ${data.length} tracks.`);

        if (data.length > 0) {
            // Nota: Aquí se asume que Supabase genera 'created_at' automáticamente
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
        // Cierre de sesión limpio garantizado antes de la inspección intensiva
        if (browser) await browser.close();
        console.log("🔒 Navegador cerrado. Iniciando fase de procesamiento de datos...");
    }

    // FASE DE INSPECCIÓN (Corre independientemente del browser)
    await inspeccionMetricas();
}

run();
