const { createClient } = require('@supabase/supabase-js');
// Importación dinámica para compatibilidad con Node 18+ y node-fetch v3
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- 1. CONFIGURACIÓN ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🛡️ MODO SIMULACRO (DRY RUN)
// true = Solo avisa en consola, NO borra ni toca la BD.
// false = El Verdugo actúa de verdad y actualiza/borra.
const DRY_RUN = false;

// Velocidad: 10 peticiones simultáneas (Fase 3.5 Detective)
const PARALLEL_POOL_SIZE = 10;
const MAX_RETRIES = 2; // Intentos antes de rendirse si no hay raíz
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

// NUEVA PONDERACIÓN FASE 3.5 (Enfoque Humano)
// Comentarios (60%) > Likes (30%) > Reposts (10%)
const POINTS = {
    PLAY: 0.01,   // Ruido (casi nulo)
    LIKE: 30,     // Plata
    REPOST: 10,   // Bronce (puede ser bot/gate)
    COMMENT: 60   // Oro Puro
};

// --- 2. CÁLCULOS MATEMÁTICOS ---
function calcularHype(plays, likes, reposts, comments, dias) {
    if (dias < 1) dias = 1;
    const rawScore = (plays * POINTS.PLAY) + (likes * POINTS.LIKE) + (reposts * POINTS.REPOST) + (comments * POINTS.COMMENT);
    return rawScore / dias; // Velocidad de puntos por día
}

// --- 3. EL CEREBRO DEL DETECTIVE (FASE 3.5) ---
function juzgarTrack(track, statsActuales, diasAntiguedad) {
    const { plays_actuales, likes, comentarios, reposts } = statsActuales;

    // 1. Cálculo de Calidad Humana (Score)
    // Usamos los nuevos pesos para ignorar el ruido de los plays
    const interacciones = likes + comentarios + reposts;
    const rawScore = (plays_actuales * POINTS.PLAY) + (likes * POINTS.LIKE) + (reposts * POINTS.REPOST) + (comentarios * POINTS.COMMENT);
    const hypeScore = rawScore / (diasAntiguedad || 1); // Velocidad diaria

    // 2. Factor Exponencial (Memoria)
    // Comparamos con la foto del inicio (si existe)
    let factorCrecimiento = 1;
    let mensajeCrecimiento = "Sin datos previos";

    if (track.likes_iniciales !== null && track.likes_iniciales > 0) {
        factorCrecimiento = likes / track.likes_iniciales;
        mensajeCrecimiento = `x${factorCrecimiento.toFixed(1)} (Ini:${track.likes_iniciales} -> Hoy:${likes})`;
    }

    const resultado = {
        accion: 'UPDATE', // Por defecto, observamos
        razon: 'En observación',
        nuevosDatos: {
            plays_actuales, likes, comentarios, reposts,
            hype_score: hypeScore,
            ultima_inspeccion: new Date().toISOString()
        }
    };

    // --- 🚉 ESTACIÓN 1: PRUEBA DE VIDA (Día 3.5 - 5) ---
    if (diasAntiguedad >= 3 && diasAntiguedad < 6) {
        // Si nadie interactuó en casi 4 días, es basura.
        if (interacciones === 0 && plays_actuales < 50) {
            resultado.accion = 'DELETE';
            resultado.razon = '💀 Muerte Cerebral (0 interacciones en Estación 1)';
            return resultado;
        }
        resultado.razon = '🌱 Sobrevivió Estación 1 (Tiene vida)';
    }

    // --- 🚉 ESTACIÓN 2: INERCIA (Día 7 - 10) ---
    if (diasAntiguedad >= 7 && diasAntiguedad < 12) {
        // Si tiene likes pero no ha crecido NADA desde el inicio (si tenemos memoria)
        if (track.likes_iniciales > 0 && factorCrecimiento <= 1.0) {
            // No lo borramos, lo mandamos al Baúl (Hibernación)
            resultado.nuevosDatos.fase = 'hibernando';
            resultado.razon = '💤 Estancado (Sin crecimiento vs Inicio)';
        } else if (factorCrecimiento >= 2) {
             resultado.razon = `🚀 Exponencial detectado: ${mensajeCrecimiento}`;
        }
    }

    // --- 🚉 ESTACIÓN 3: EL JUICIO FINAL (Día 21+) ---
    if (diasAntiguedad >= 21) {
        // Si llegó hasta aquí, ¿es un éxito o un zombie?

        // CRITERIO DE GRADUACIÓN (Playlist de Oro)
        if (hypeScore > 50 || factorCrecimiento > 3 || comentarios > 5) {
            resultado.nuevosDatos.fase = 'graduado';
            resultado.razon = '🏆 GRADUADO (Superó las expectativas)';
        }
        // CRITERIO DE HIBERNACIÓN (Repechaje)
        else if (interacciones > 0) {
            resultado.nuevosDatos.fase = 'repechaje';
            resultado.razon = '🧟 Zombie/Repechaje (Tiene vida, pero lenta)';
        }
        // CRITERIO DE PURGA FINAL
        else {
            resultado.accion = 'DELETE';
            resultado.razon = '🗑️ Purga Mensual (No cuajó en 21 días)';
        }
    }

    // Si ya era zombie y sigue sin hacer nada a los 60 días
    if (track.fase === 'repechaje' && diasAntiguedad > 60) {
         if (likes < (track.likes || 0) + 5) { // Hard Goal: +5 likes en repechaje
             resultado.accion = 'DELETE';
             resultado.razon = '💀 Fin del Repechaje (No cumplió Hard Goal)';
         }
    }

    return resultado;
}

// --- FUNCIÓN AUXILIAR: REINTENTO INTELIGENTE (Fase 3.5) ---
async function fetchConReintento(url, titulo) {
    let attempts = 0;
    let match = null;

    while (attempts <= MAX_RETRIES && !match) {
        try {
            if (attempts > 0) {
                const delay = 2000 * attempts;
                console.log(`⚠️ [RETRY ${attempts}/${MAX_RETRIES}] Esperando ${delay}ms para: "${titulo}"`);
                await new Promise(res => setTimeout(res, delay));
            }

            const response = await fetch(url, {
                headers: { 'User-Agent': MOBILE_UA },
                timeout: 10000 // 10s timeout
            });

            if (response.status === 404 || response.status === 410) return '404'; // Código especial para borrados

            const html = await response.text();
            const regex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
            match = html.match(regex);

            if (!match) attempts++; // Si no hay raíz, cuenta como fallo

        } catch (err) {
            attempts++;
            console.error(`❌ Error Red (${attempts}/${MAX_RETRIES}) en "${titulo}": ${err.message}`);
        }
    }
    return match;
}

// --- 4. MOTOR DE INSPECCIÓN ---
async function procesarLote(tracks) {
    console.log(`⚡ Procesando lote de ${tracks.length} tracks...`);

    await Promise.all(tracks.map(async (track) => {
        const mobileUrl = track.url.replace('https://soundcloud.com', 'https://m.soundcloud.com');

        try {
            // Usamos el motor con reintento (Fase 3.5)
            const match = await fetchConReintento(mobileUrl, track.titulo);

            // Manejo de errores fatales
            if (match === '404') {
                console.log(`❌ URL Rota: ${track.titulo} -> DELETE (404)`);
                if (!DRY_RUN) await supabase.from('tracks').delete().eq('id', track.id);
                return;
            }

            if (!match) {
                console.log(`💀 [ABANDONO] Datos vacíos para: "${track.titulo}" tras reintentos.`);
                return; // Protegemos la BD: No guardamos ceros falsos
            }

            const json = JSON.parse(match[1]);
            const entities = json.props?.pageProps?.initialStoreState?.entities?.tracks || {};
            const trackKey = Object.keys(entities).find(k => k.includes('soundcloud:tracks'));
            if (!trackKey) return;
            const data = entities[trackKey].data;

            const statsActuales = {
                plays_actuales: data.playback_count,
                likes: data.likes_count,
                comentarios: data.comment_count,
                reposts: data.reposts_count
            };

            // Calcular antigüedad
            const fechaIngreso = new Date(track.fecha_ingreso);
            const hoy = new Date();
            const diasAntiguedad = Math.floor((hoy - fechaIngreso) / (1000 * 60 * 60 * 24));

            // Juicio
            const veredicto = juzgarTrack(track, statsActuales, diasAntiguedad);

            // Sentencia
            const logPrefix = DRY_RUN ? '🔍 [SIMULACRO]' : '🚀 [REAL]';

            if (veredicto.accion === 'DELETE') {
                console.log(`${logPrefix} 💀 ELIMINAR: "${track.titulo}" | Razón: ${veredicto.razon}`);
                if (!DRY_RUN) await supabase.from('tracks').delete().eq('id', track.id);
            } else {
                console.log(`${logPrefix} 💾 ACTUALIZAR: "${track.titulo}" | Fase: ${veredicto.nuevosDatos.fase || track.fase || 'normal'} | Hype: ${veredicto.nuevosDatos.hype_score.toFixed(1)} | Razón: ${veredicto.razon}`);
                if (!DRY_RUN) await supabase.from('tracks').update(veredicto.nuevosDatos).eq('id', track.id);
            }

        } catch (err) {
            console.error(`Error procesando ${track.titulo}:`, err.message);
        }
    }));
}

// --- 5. EJECUCIÓN PRINCIPAL ---
async function run() {
    console.log(`💀 INICIANDO VERDUGO - DRY RUN: ${DRY_RUN}`);

    // Traemos tracks que NO sean graduados.
    // Ordenamos por antigüedad para auditar primero los más viejos.
    const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .neq('fase', 'graduado')
        .order('fecha_ingreso', { ascending: true })
        .limit(200);

    if (error) {
        console.error("Error BD:", error);
        return;
    }

    if (!tracks || tracks.length === 0) {
        console.log("✅ No hay tracks para auditar.");
        return;
    }

    // Procesar en lotes paralelos
    for (let i = 0; i < tracks.length; i += PARALLEL_POOL_SIZE) {
        const lote = tracks.slice(i, i + PARALLEL_POOL_SIZE);
        await procesarLote(lote);
    }
    console.log("\n🏁 Auditoría finalizada.");
}

run();
