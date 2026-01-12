const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Necesario para GitHub Actions

// --- 1. CONFIGURACIÓN ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🛡️ MODO SIMULACRO (DRY RUN)
// true = Solo avisa en consola, NO borra ni toca la BD.
// false = El Verdugo actúa de verdad y actualiza/borra.
const DRY_RUN = true; 

// Velocidad: 5 peticiones simultáneas
const PARALLEL_POOL_SIZE = 5; 
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

// PONDERACIÓN DEL HYPE SCORE
const POINTS = { PLAY: 1, LIKE: 10, REPOST: 20, COMMENT: 30 };

// --- 2. CÁLCULOS MATEMÁTICOS ---
function calcularHype(plays, likes, reposts, comments, dias) {
    if (dias < 1) dias = 1; 
    const rawScore = (plays * POINTS.PLAY) + (likes * POINTS.LIKE) + (reposts * POINTS.REPOST) + (comments * POINTS.COMMENT);
    return rawScore / dias; // Velocidad de puntos por día
}

// --- 3. EL CEREBRO DEL VERDUGO ---
function juzgarTrack(track, statsActuales, diasAntiguedad) {
    const { plays_actuales, likes, comentarios, reposts } = statsActuales;
    const interacciones = likes + comentarios + reposts;

    // CÁLCULO DE PROYECCIONES
    const hypeScore = calcularHype(plays_actuales, likes, reposts, comentarios, diasAntiguedad);
    const proyeccionVistas = (plays_actuales / diasAntiguedad) * 30;
    const proyeccionHype = hypeScore * 30;

    const resultado = {
        accion: 'UPDATE', 
        razon: 'Sobrevive',
        nuevosDatos: {
            plays_actuales, likes, comentarios, reposts,
            hype_score: hypeScore,
            proyeccion_vistas_30d: proyeccionVistas,
            proyeccion_hype_30d: proyeccionHype,
            ultima_inspeccion: new Date().toISOString()
        }
    };

    // --- 🚪 PUERTA 1: LA MORGUE (Día 3) ---
    if (diasAntiguedad >= 3 && diasAntiguedad < 7) {
        if (plays_actuales === 0 && interacciones === 0) {
            resultado.accion = 'DELETE';
            resultado.razon = 'Muerte Cerebral (0/0 en Día 3)';
            return resultado;
        }
    }

    // --- 🚪 PUERTA 2: DETECTOR DE FRAUDE (Día 7) ---
    if (diasAntiguedad >= 7 && diasAntiguedad < 14) {
        if (plays_actuales < 15) {
            resultado.accion = 'DELETE';
            resultado.razon = 'Falta de Tracción (<15 plays en Día 7)';
            return resultado;
        }
        if (plays_actuales > 50 && interacciones < 2) {
            resultado.accion = 'DELETE';
            resultado.razon = 'Sospecha de Bot (Vistas altas sin interacción)';
            return resultado;
        }
    }

    // --- 🚪 PUERTA 3: PRUEBA DE VIDA (Día 14) ---
    if (diasAntiguedad >= 14 && diasAntiguedad < 28) {
        const crecimientVistas = plays_actuales - (track.plays_actuales || 0); 
        
        if (crecimientVistas <= 0) {
            // INMUNIDAD
            if (comentarios > (track.comentarios || 0)) {
                resultado.razon = 'Salvado por Comentarios (Inmunidad)';
                return resultado;
            }
            if (likes > (track.likes || 0)) {
                resultado.razon = 'Salvado por Likes Nuevos';
                return resultado;
            }
            resultado.accion = 'DELETE';
            resultado.razon = 'Estancamiento Total (Día 14)';
            return resultado;
        }
    }

    // --- 🚪 PUERTA 4: REPECHAJE (Día 28) ---
    if (diasAntiguedad >= 28) {
        // Caso A: GRADUADO (>100 plays o score muy alto)
        if (plays_actuales > 100 || proyeccionHype > 100) { 
             resultado.nuevosDatos.fase = 'graduado';
             resultado.razon = '🎓 Graduado con Honor';
        } 
        // Caso B: REPECHAJE (Segunda oportunidad)
        else if (track.fase !== 'repechaje') {
            resultado.nuevosDatos.fase = 'repechaje';
            resultado.razon = '⏸️ Enviado a Repechaje';
        }
        // Caso C: FIN DEL JUEGO (Día 56+)
        else if (track.fase === 'repechaje' && diasAntiguedad > 56) {
             resultado.accion = 'DELETE';
             resultado.razon = 'Fin del Repechaje (Fracaso definitivo)';
        }
    }

    return resultado;
}

// --- 4. MOTOR DE INSPECCIÓN ---
async function procesarLote(tracks) {
    console.log(`⚡ Procesando lote de ${tracks.length} tracks...`);
    
    await Promise.all(tracks.map(async (track) => {
        const mobileUrl = track.url.replace('https://soundcloud.com', 'https://m.soundcloud.com');
        
        try {
            // Fetch Móvil
            const response = await fetch(mobileUrl, { headers: { 'User-Agent': MOBILE_UA } });
            
            if (response.status === 404 || response.status === 410) {
                console.log(`❌ URL Rota: ${track.titulo} -> DELETE (404)`);
                if (!DRY_RUN) await supabase.from('tracks').delete().eq('id', track.id);
                return;
            }

            // Extracción
            const html = await response.text();
            const regex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
            const match = html.match(regex);
            
            if (!match) return; 
            
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
