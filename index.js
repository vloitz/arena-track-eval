const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Secretos (Lee lo que guardaste en Settings)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Objetivo: House, publicado en la última hora
const TARGET = 'https://soundcloud.com/search/sounds?q=*&filter.created_at=last_hour&filter.genre_or_tag=house';

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

// 4. Ejecución Principal
async function run() {
    console.log("Iniciando Recolector...");
    
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
        console.log(`🌍 Viajando a SoundCloud...`);
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
            
            if (error) console.error("Error DB:", error);
            else console.log("✅ Datos guardados en la nube exitosamente.");
        } else {
            console.log("⚠️ No se encontró música nueva en esta hora.");
        }

    } catch (e) {
        console.error("❌ Error crítico:", e);
    } finally {
        await browser.close();
    }
}

run();
