const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Secretos (Lee lo que guardaste en Settings)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Objetivo: House, publicado en la última hora
const TARGET = 'https://soundcloud.com/search/sounds?q=house&filter.duration=medium&filter.created_at=last_hour';

// 3. Tu Función de Scroll Humano (Adaptada para el robot)
async function humanScroll(page) {
    return await page.evaluate(async () => {
        return new Promise(async (resolve) => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            const SELECTOR = '.searchList__item'; 
            
            let lastCount = document.querySelectorAll(SELECTOR).length;
            let lastChangeTime = Date.now();
            const NO_CHANGE_TIMEOUT = 5000; // Si en 5s no carga nada, asumimos fin
            console.log("⬇️ Iniciando Scroll Humano...");
            while (true) {
                // Scroll aleatorio (Tu algoritmo)
                const distance = 300 + Math.random() * 400;
                window.scrollBy(0, distance);
                // Pausa aleatoria
                let pause = 100 + Math.random() * 200;
                await sleep(pause);
                const currentCount = document.querySelectorAll(SELECTOR).length;
                if (currentCount > lastCount) {
                    lastCount = currentCount;
                    lastChangeTime = Date.now();
                } else if (Date.now() - lastChangeTime > NO_CHANGE_TIMEOUT) {
                     // Terminamos
                     resolve(currentCount);
                     break;
                }
            }
        });
    });
}

// 4. Nueva Función: Inspección de Métricas
async function inspeccionMetricas() {
    console.log("\n🔍 === FASE DE INSPECCIÓN DE MÉTRICAS ===");
    
    try {
        // Consulta: Obtener 15 URLs donde plays_iniciales sea NULL
        const { data: tracksToInspect, error: queryError } = await supabase
            .from('tracks')
            .select('url')
            .is('plays_iniciales', null)
            .limit(15);
        
        if (queryError) {
            console.error("❌ Error al consultar tracks:", queryError);
            return;
        }
        
        if (!tracksToInspect || tracksToInspect.length === 0) {
            console.log("✅ No hay tracks pendientes de inspección.");
            return;
        }
        
        console.log(`📊 Inspeccionando ${tracksToInspect.length} tracks...`);
        
        // Bucle de Inspección
        for (let i = 0; i < tracksToInspect.length; i++) {
            const { url } = tracksToInspect[i];
            console.log(`\n[${i + 1}/${tracksToInspect.length}] Inspeccionando: ${url}`);
            
            try {
                // Fetch del HTML
                const response = await fetch(url);
                if (!response.ok) {
                    console.log(`⚠️ Error HTTP ${response.status} para ${url}`);
                    continue;
                }
                
                const html = await response.text();
                
                // Regex para extraer el JSON de window.__sc_hydration
                const regex = /window\.__sc_hydration\s*=\s*(\[.*?\]);/s;
                const match = html.match(regex);
                
                if (!match) {
                    console.log(`⚠️ No se encontró __sc_hydration en ${url}`);
                    continue;
                }
                
                const hydrationData = JSON.parse(match[1]);
                
                // Buscar el objeto con los datos del track (usualmente en hydratable: "sound")
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
                
                // Extracción de Datos
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
                
                // Update en Supabase
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
            
            // Pausa de seguridad (1.5 a 2 segundos)
            const pausaSeguridad = 1500 + Math.random() * 500;
            console.log(`⏳ Pausa de ${(pausaSeguridad / 1000).toFixed(2)}s...`);
            await new Promise(resolve => setTimeout(resolve, pausaSeguridad));
        }
        
        console.log("\n✅ Inspección de métricas completada.");
        
    } catch (error) {
        console.error("❌ Error en fase de inspección:", error);
    }
}

// 5. Ejecución Principal
async function run() {
    console.log("🚀 Iniciando Recolector...");
    
    // Configuración para servidor (Sin pantalla visual)
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }); 
    
    const page = await browser.newPage();
    
    // TRUCO: Bloquear imágenes para que vaya super rápido
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    });
    
    try {
        console.log("🌍 Viajando a SoundCloud...");
        await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
        
        // Ejecutamos el scroll
        await humanScroll(page);
        
        // Extraemos los datos
        const data = await page.evaluate(() => {
            const items = document.querySelectorAll('.searchList__item a.soundTitle__title');
            return Array.from(items).map(a => ({
                url: 'https://soundcloud.com' + a.getAttribute('href'),
                titulo: a.innerText.trim()
            }));
        });
        
        console.log(`🌾 Recolectados: ${data.length} tracks.`);
        
        if (data.length > 0) {
            // Guardamos en Supabase (Si la URL ya existe, no hace nada)
            const { error } = await supabase
                .from('tracks')
                .upsert(data.map(d => ({ url: d.url, titulo: d.titulo })), { onConflict: 'url', ignoreDuplicates: true });
            
            if (error) console.error("❌ Error DB:", error);
            else console.log("✅ Datos guardados en la nube exitosamente.");
        } else {
            console.log("⚠️ No se encontró música nueva en esta hora.");
        }
        
    } catch (e) {
        console.error("❌ Error crítico:", e);
    } finally {
        await browser.close();
    }
    
    // ========================================
    // NUEVA FASE: INSPECCIÓN DE MÉTRICAS
    // ========================================
    await inspeccionMetricas();
}

run();
