const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Secretos
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Objetivo: House, publicado en la última hora
const TARGET = 'https://soundcloud.com/search/sounds?q=house&filter.duration=medium&filter.created_at=last_hour';

// 3. Array de User-Agents Variables (Rotación de identidad)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

// 4. MEJORA 1: Curva de Bézier con Micro-Temblor (Simula Pulso Humano)
async function humanMouseWithShake(page) {
    const startX = Math.floor(Math.random() * 200) + 50;
    const startY = Math.floor(Math.random() * 200) + 50;
    const endX = Math.floor(Math.random() * 400) + 200;
    const endY = Math.floor(Math.random() * 400) + 200;
    
    // Control points para Bézier cúbica
    const cp1X = startX + (Math.random() - 0.5) * 200;
    const cp1Y = startY + (Math.random() - 0.5) * 200;
    const cp2X = endX + (Math.random() - 0.5) * 200;
    const cp2Y = endY + (Math.random() - 0.5) * 200;
    
    const steps = 20 + Math.floor(Math.random() * 15);
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Fórmula de Bézier cúbica
        const x = Math.pow(1-t, 3) * startX + 
                  3 * Math.pow(1-t, 2) * t * cp1X + 
                  3 * (1-t) * Math.pow(t, 2) * cp2X + 
                  Math.pow(t, 3) * endX;
        
        const y = Math.pow(1-t, 3) * startY + 
                  3 * Math.pow(1-t, 2) * t * cp1Y + 
                  3 * (1-t) * Math.pow(t, 2) * cp2Y + 
                  Math.pow(t, 3) * endY;
        
        // 🎯 MICRO-TEMBLOR: Añadir offset aleatorio de 1-2 píxeles (Pulso humano)
        const shakeX = (Math.random() - 0.5) * 2;
        const shakeY = (Math.random() - 0.5) * 2;
        
        await page.mouse.move(x + shakeX, y + shakeY);
        await new Promise(r => setTimeout(r, 8 + Math.random() * 15));
    }
    
    console.log("🖱️ Movimiento con temblor humano completado");
}

// 5. MEJORA 2: Ritmo de Lectura Variable Basado en Longitud de Título
function calculateReadingTime(title) {
    // Velocidad promedio de lectura: 200-250 palabras por minuto
    // Aproximadamente 5 caracteres por palabra = 40-50 ms por carácter
    const baseTime = 30; // ms base
    const charTime = 45; // ms por carácter
    const randomFactor = 0.7 + Math.random() * 0.6; // Variabilidad 70%-130%
    
    const readingTime = baseTime + (title.length * charTime * randomFactor);
    
    return Math.min(readingTime, 3000); // Máximo 3 segundos
}

// 6. MEJORA 4: Click-Stream Fantasma (Clics accidentales en zonas muertas)
async function ghostClick(page) {
    // Zona muerta: áreas sin elementos interactivos
    const deadZones = [
        { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 },
        { x: 800 + Math.random() * 200, y: 100 + Math.random() * 150 },
        { x: 300 + Math.random() * 200, y: 600 + Math.random() * 100 }
    ];
    
    const zone = deadZones[Math.floor(Math.random() * deadZones.length)];
    
    // Mover mouse a zona muerta con temblor
    await page.mouse.move(zone.x, zone.y);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    
    // 30% de probabilidad de hacer clic (no siempre)
    if (Math.random() < 0.3) {
        await page.mouse.click(zone.x, zone.y);
        console.log("👻 Click fantasma ejecutado");
    }
}

// 7. Tu Función de Scroll Humano (INTACTA)
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

// 8. Función de Inspección con Humanización Avanzada
async function inspeccionMetricas() {
    console.log("\n🔍 === FASE DE INSPECCIÓN DE MÉTRICAS (60 TRACKS) ===");
    
    try {
        const { data: tracksToInspect, error: queryError } = await supabase
            .from('tracks')
            .select('url, titulo')
            .is('plays_iniciales', null)
            .limit(60);
        
        if (queryError) {
            console.error("❌ Error al consultar tracks:", queryError);
            return;
        }
        
        if (!tracksToInspect || tracksToInspect.length === 0) {
            console.log("✅ No hay tracks pendientes de inspección.");
            return;
        }
        
        console.log(`📊 Inspeccionando ${tracksToInspect.length} tracks con patrones humanos avanzados...`);
        
        for (let i = 0; i < tracksToInspect.length; i++) {
            const { url, titulo } = tracksToInspect[i];
            console.log(`\n[${i + 1}/${tracksToInspect.length}] Inspeccionando: ${url}`);
            
            // 🎯 MEJORA 2: Simular tiempo de lectura del título
            if (titulo) {
                const readTime = calculateReadingTime(titulo);
                console.log(`📖 Leyendo título "${titulo.substring(0, 30)}..." (${Math.round(readTime)}ms)`);
                await new Promise(resolve => setTimeout(resolve, readTime));
            }
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.log(`⚠️ Error HTTP ${response.status} para ${url}`);
                    continue;
                }
                
                const html = await response.text();
                const regex = /window\.__sc_hydration\s*=\s*(\[.*?\]);/s;
                const match = html.match(regex);
                
                if (!match) {
                    console.log(`⚠️ No se encontró __sc_hydration en ${url}`);
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
                    console.log(`⚠️ No se encontraron datos del track en ${url}`);
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
                    ultima_inspeccion: new Date().toISOString()
                };
                
                const { error: updateError } = await supabase
                    .from('tracks')
                    .update(extractedData)
                    .eq('url', url);
                
                if (updateError) {
                    console.error(`❌ Error al actualizar ${url}:`, updateError);
                } else {
                    console.log(`✅ Métricas actualizadas: ${trackData.playback_count} plays, ${trackData.likes_count} likes`);
                }
                
            } catch (error) {
                console.error(`❌ Error procesando ${url}:`, error.message);
            }
            
            // Pausa de Fatiga Variable (0.8s a 1.2s)
            const pausaFatiga = 800 + Math.random() * 400;
            console.log(`⏳ Pausa humana: ${(pausaFatiga / 1000).toFixed(2)}s`);
            await new Promise(resolve => setTimeout(resolve, pausaFatiga));
            
            // Descanso cada 20 tracks
            if ((i + 1) % 20 === 0 && i + 1 < tracksToInspect.length) {
                console.log(`\n☕ Descanso de fatiga después de 20 inspecciones...`);
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }
        
        console.log("\n✅ Inspección de métricas completada.");
        
    } catch (error) {
        console.error("❌ Error en fase de inspección:", error);
    }
}

// 9. Ejecución Principal con Humanización Elite
async function run() {
    console.log("🚀 Iniciando Recolector Humano Elite...");
    
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    console.log(`🎭 Identidad seleccionada: ${randomUA.includes('Safari') && randomUA.includes('Version') ? 'Safari' : randomUA.includes('Edg') ? 'Edge' : 'Chrome'}`);
    
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
    
    // 🎯 MEJORA 3: Evasión de Huella Digital (Stealth Mode)
    await page.evaluateOnNewDocument(() => {
        // Ocultar navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
        
        // Simular chrome.app (solo existe en navegadores reales)
        window.chrome = {
            app: {
                isInstalled: false,
                InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
            },
            runtime: {
                OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
                OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
                PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
                PlatformNacos: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
                PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
                RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' }
            }
        };
        
        // Simular hardwareConcurrency aleatorio (4, 8, o 16 núcleos)
        const cores = [4, 8, 16][Math.floor(Math.random() * 3)];
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => cores
        });
        
        // Simular plugins reales
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
            ]
        });
        
        // Simular languages realista
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'es']
        });
        
        console.log("🛡️ Stealth mode activado - Huella digital camuflada");
    });
    
    await page.setUserAgent(randomUA);
    
    // Bloquear imágenes (INTACTO)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    });
    
    try {
        console.log("🌍 Viajando a SoundCloud...");
        await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
        
        // Movimiento de mouse con temblor
        console.log("🖱️ Simulando movimiento humano con micro-temblor...");
        await humanMouseWithShake(page);
        
        // Scroll humano
        await humanScroll(page);
        
        // 🎯 MEJORA 4: Click fantasma antes de extraer datos
        await ghostClick(page);
        
        // Extraer datos
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
            
            if (error) console.error("❌ Error DB:", error);
            else console.log("✅ Datos guardados en la nube exitosamente.");
        } else {
            console.log("⚠️ No se encontró música nueva en esta hora.");
        }
        
        // Click fantasma final
        await ghostClick(page);
        
    } catch (e) {
        console.error("❌ Error crítico:", e);
    } finally {
        await browser.close();
    }
    
    // FASE DE INSPECCIÓN
    await inspeccionMetricas();
}

run();
