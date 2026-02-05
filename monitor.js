const {
    createClient
} = require('@supabase/supabase-js');
// Importación dinámica para compatibilidad con Node 18+ y node-fetch v3
const fetch = (...args) => import('node-fetch').then(({
    default: fetch
}) => fetch(...args));

// --- 1. CONFIGURACIÓN ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🛡️ MODO SIMULACRO (DRY RUN)
const DRY_RUN = false;

// Velocidad: 10 peticiones simultáneas (Fase 3.5 Detective)
const PARALLEL_POOL_SIZE = 10;
const MAX_RETRIES = 2;
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

// NUEVA PONDERACIÓN FASE 3.5 (Enfoque Humano)
const POINTS = {
    PLAY: 0.01,   // Ruido (casi nulo)
    LIKE: 30,     // Plata
    REPOST: 10,   // Bronce
    COMMENT: 60,  // Oro Puro
    DOWNLOAD: 70  // Diamante (Intención de uso real)
};

// CONFIGURACIÓN DE UMBRALES (El Juez)
const UMBRALES = {
    // Estación 1 (Prueba de vida - Día 3.5)
    E1_DIAS_MIN: 3,
    E1_DIAS_MAX: 6,
    E1_TRACCION_MIN: 50, // NUEVO: Mínimo de vistas nuevas para salvarse por "Popularidad"

    // Estación 2 (Inercia)
    E2_DIAS_MIN: 7,
    E2_DIAS_MAX: 12,
    E2_CRECIMIENTO_MIN: 1.0,

    // Estación 3 (Juicio Final)
    E3_DIAS_MIN: 21,
    GRADUADO_HYPE: 50,
    GRADUADO_CRECIMIENTO: 3,
    GRADUADO_COMENTARIOS: 5,
    E3_RATIO_MIN: 5.0, // % mínimo de (Likes/Plays) para salvar Joyas de Culto
};

// --- 2. CÁLCULOS MATEMÁTICOS (Versión Unificada) ---
function calcularHype(plays, likes, reposts, comments, hasDownload, dias) {
    if (dias < 1) dias = 1;

    // Si tiene descarga (sea cual sea), suma el puntaje diamante fijo de 70
    const puntosDescarga = hasDownload ? POINTS.DOWNLOAD : 0;

    const rawScore = (plays * POINTS.PLAY) + (likes * POINTS.LIKE) + (reposts * POINTS.REPOST) + (comments * POINTS.COMMENT) + puntosDescarga;

    return rawScore / dias; // Velocidad de puntos por día
}

// --- 3. EL CEREBRO DEL DETECTIVE (FASE 3.5 - LÓGICA DELTA) ---
function juzgarTrack(track, statsActuales, diasAntiguedad) {
    const {
        plays_actuales,
        likes,
        comentarios,
        reposts,
        has_download // Solo esto viene de statsActuales
    } = statsActuales;

    // 1. Cálculo de Score Actual
    const interacciones = likes + comentarios + reposts;
    const hypeScore = calcularHype(plays_actuales, likes, reposts, comentarios, has_download, diasAntiguedad);

    // 1.5 Cálculo de Proyecciones (El Oráculo)
    // Calculamos cuánto ha ganado desde que entró a la DB y lo proyectamos a 30 días
    const deltaVistasTotal = plays_actuales - (track.plays_iniciales || 0);
    const vistasPorDia = deltaVistasTotal / (diasAntiguedad || 1);
    const proyeccionVistas30d = plays_actuales + (vistasPorDia * 30);
    const proyeccionHype30d = hypeScore * 30; // Estimación de tracción mensual

    // 2. Factor Exponencial
    let factorCrecimiento = 1;
    let mensajeCrecimiento = "Sin datos previos";

    if (track.likes_iniciales !== null && track.likes_iniciales > 0) {
        factorCrecimiento = likes / track.likes_iniciales;
        mensajeCrecimiento = `x${factorCrecimiento.toFixed(1)} (Ini:${track.likes_iniciales} -> Hoy:${likes})`;
    }

    const resultado = {
        accion: 'UPDATE',
        razon: 'En observación',
        nuevosDatos: {
            plays_actuales,
            likes,
            comentarios,
            reposts,
            has_download: has_download,
            download_category: track.download_category,
            hype_score: hypeScore,
            proyeccion_vistas_30d: Math.round(proyeccionVistas30d), // Guardar número entero
            proyeccion_hype_30d: parseFloat(proyeccionHype30d.toFixed(2)), // Guardar con 2 decimales
            ultima_inspeccion: new Date().toISOString()
        }
    };

    // =================================================================================================
    // 🚉 ESTACIÓN 1: PRUEBA DE VIDA (Día 3.5 - El Primer Filtro)
    // =================================================================================================
    // OBJETIVO: Eliminar el "Ruido Blanco" (Tracks que existen pero nadie nota o valora).
    // JUSTICIA: Se aplica un criterio de "Equilibrio y Tolerancia" para no borrar falsos negativos.
    //
    // LÓGICA DE SUPERVIVENCIA (Debe cumplir AL MENOS UNA):
    //
    // 1. 💎 FACTOR DIAMANTE (Prioridad Máxima):
    //    - ¿El track tiene descargas registradas?
    //    - VEREDICTO: INMUNIDAD TOTAL. Se salva siempre. Es útil para el DJ.
    //
    // 2. ❤️ CALIDAD (Interacción Humana):
    //    - Se calcula el DELTA (Lo nuevo ganado en estos 3 días).
    //    - Fórmula: (Likes_Hoy - Likes_Ini) + (Coments_Hoy - Coments_Ini).
    //    - REGLA: Si Delta >= 1 (Al menos una persona real reaccionó).
    //    - VEREDICTO: SE SALVA. Hay conexión humana, aunque sea pequeña (Tortugas).
    //
    // 3. 📈 TRACCIÓN (La "Válvula de Escape" / Tolerancia):
    //    - Caso especial: Track con muchas vistas pero 0 likes (Escenario "Tímido").
    //    - Se calcula el Delta de Vistas (Vistas_Hoy - Vistas_Ini).
    //    - REGLA: Si Delta_Vistas >= 50 (Ganó tracción significativa de audiencia).
    //    - VEREDICTO: SE SALVA (Condicional).
    //      * Justificación: Si duplicó audiencia o creció mucho, merece una 2da oportunidad
    //      * hasta el Día 7, aunque la gente no de like. Evita borrar "Hits Pasivos".
    //
    // 💀 CRITERIO DE ELIMINACIÓN (La Purga):
    //    - Si NO es Diamante...
    //    - Y NO tuvo ninguna interacción nueva...
    //    - Y NO tuvo tracción significativa...
    //    - ENTONCES: Es "Ruido". Ocupa espacio y no aporta valor. -> DELETE.
    // =================================================================================================

    if (diasAntiguedad >= UMBRALES.E1_DIAS_MIN && diasAntiguedad < UMBRALES.E1_DIAS_MAX) {

        // A. CÁLCULO DE DELTAS (Crecimiento Real vs. Foto Inicial)
        // Usamos (|| 0) por si es un track viejo sin datos iniciales
        const deltaLikes = likes - (track.likes_iniciales || 0);
        const deltaComentarios = comentarios - (track.comentarios_iniciales || 0);
        const deltaPlays = plays_actuales - (track.plays_iniciales || 0);

        // B. EVALUACIÓN DE CRITERIOS
        const esDiamante = has_download === true; // Factor Diamante detectado
        const tieneCalidad = (deltaLikes + deltaComentarios) >= 1; // Al menos 1 reacción humana nueva
        const tieneTraccion = deltaPlays >= UMBRALES.E1_TRACCION_MIN; // Ganó +50 vistas (Inversión a futuro)

        // C. SENTENCIA
        if (esDiamante) {
            resultado.razon = '💎 SALVADO: Factor Diamante (Tiene descargas)';
        } else if (tieneCalidad) {
            resultado.razon = `🌱 SALVADO: Calidad Detectada (+${deltaLikes} Likes, +${deltaComentarios} Coments)`;
        } else if (tieneTraccion) {
            resultado.razon = `📈 SALVADO: Tracción Detectada (+${deltaPlays} Vistas nuevas)`;
        } else {
            // Si no cumple nada -> MUERTE
            resultado.accion = 'DELETE';
            resultado.razon = `💀 ELIMINADO: Ruido Blanco (0 Reacción, +${deltaPlays} Vistas insuficientes)`;
            return resultado;
        }
    }

    // =================================================================================================
    // 🚉 ESTACIÓN 2: AUDITORÍA DE RENDIMIENTO (Día 7 - 11)
    // =================================================================================================
    // OBJETIVO: Evaluar si la inversión de "Tracción" valió la pena y detectar paros cardíacos.
    //
    // 1. 🔍 AUDITORÍA FINAL (Anti-Bot / Ruido):
    //    - Si después de 7 días el track sigue con 0 interacciones humanas.
    //    - JUSTICIA: No se puede vivir solo de vistas por siempre. La tolerancia termina aquí.
    //    - VEREDICTO: Se confirma como "Basura" o "Falsa Promesa". -> DELETE.
    //
    // 2. 📉 CHEQUEO DE INERCIA (Movimiento Reciente):
    //    - Se calcula el cambio desde la última revisión (Día 3.5).
    //    - REGLA: Si no ha ganado ni 1 vista ni 1 like desde la inspección anterior.
    //    - VEREDICTO: Se marca como "hibernando". Se le da chance hasta el Día 21.
    // =================================================================================================
    if (diasAntiguedad >= UMBRALES.E2_DIAS_MIN && diasAntiguedad < UMBRALES.E2_DIAS_MAX) {

        const deltaRecienteLikes = likes - (track.likes || 0);
        const deltaRecientePlays = plays_actuales - (track.plays_actuales || 0);

        // A. Auditoría de Calidad Humana (Cierre de Tolerancia)
        if (likes === 0 && comentarios === 0 && !has_download) {
             resultado.accion = 'DELETE';
             resultado.razon = '💀 Auditoría Fallida: 7 días sin validación humana (La apuesta de tracción falló)';
             return resultado;
        }

        // B. Chequeo de Movimiento (Inercia)
        if (deltaRecienteLikes === 0 && deltaRecientePlays === 0) {
            resultado.nuevosDatos.fase = 'hibernando';
            resultado.razon = '💤 Inercia Cero: Sin actividad desde la revisión del Día 3.5';
        }
        // C. Reconocimiento de Éxito
        else if (factorCrecimiento >= 2) {
             resultado.razon = `🚀 Impulso mantenido: ${mensajeCrecimiento}`;
        }
    }


// =================================================================================================
    // 🚉 ESTACIÓN 3: EL JUICIO FINAL (Día 21+) - FIN DE TEMPORADA 1
    // =================================================================================================
    // OBJETIVO: Selección de Élite. Decidir quién entra a la maleta y quién merece una última chance.
    //
    // 🏆 CRITERIO DE GRADUACIÓN (Pasa a la Maleta):
    //    - El track es un "Hit" (Hype > 50), explotó (x3) o tiene muchos comentarios.
    //    - Posee el FACTOR DIAMANTE (Downloads > 0). Es una herramienta útil hoy.
    //
    // 🧟 CRITERIO DE REPECHAJE (Temporada 2):
    //    - JUSTICIA PARA TORTUGAS: Si no es hit, pero tiene un RATIO DE CALIDAD > 5%.
    //    - PERSISTENCIA: Si el track superó la hibernación y ganó vida recientemente.
    //
    // 🗑️ CRITERIO DE PURGA (Eliminación):
    //    - No logró graduarse ni demostró calidad de culto en 21 días.
    // =================================================================================================
    if (diasAntiguedad >= UMBRALES.E3_DIAS_MIN) {

        // Cálculo de Ratio de Calidad (Likes / Plays)
        const ratioCalidad = (likes / (plays_actuales || 1)) * 100;

        // A. GRADUACIÓN (Los Mejores)
        const esExitoso = hypeScore > UMBRALES.GRADUADO_HYPE || factorCrecimiento > 3 || comentarios > UMBRALES.GRADUADO_COMENTARIOS;
        const esDiamante = has_download === true;

        if (esExitoso || esDiamante) {
            resultado.nuevosDatos.fase = 'graduado';
            resultado.razon = esDiamante ? '🏆 GRADUADO: Factor Diamante' : `🏆 GRADUADO: Rendimiento Alto (Hype: ${hypeScore.toFixed(1)})`;
        }

        // B. REPECHAJE (Las Tortugas de Calidad)
        else {
            const esJoyaCulto = ratioCalidad >= UMBRALES.E3_RATIO_MIN;
            const tienePulso = interacciones > 3;

            if (esJoyaCulto || tienePulso) {
                resultado.nuevosDatos.fase = 'repechaje';
                resultado.razon = esJoyaCulto ? `🧟 REPECHAJE: Joya de Culto (Ratio: ${ratioCalidad.toFixed(1)}%)` : '🧟 REPECHAJE: Vida mínima detectada';
            }

            // C. PURGA (El Fin)
            else {
                resultado.accion = 'DELETE';
                resultado.razon = `🗑️ Purga: Ni éxito ni calidad de culto en 21 días (Ratio: ${ratioCalidad.toFixed(1)}%)`;
                return resultado;
            }
        }
    }

// =================================================================================================
    // 🚉 ESTACIÓN 4: AUDITORÍA DE ESTABILIDAD (Día 40 - 45) - MITAD DE TEMPORADA 2
    // =================================================================================================
    // OBJETIVO: Limpiar el repechaje. No dejar que tracks estancados ocupen espacio hasta el día 60.
    //
    // ⚖️ CRITERIO DE CONCORDANCIA:
    //    - Se compara el estado actual contra el estado del Día 21 (Fin de T1).
    //    - REGLA: Debe haber ganado al menos 1 Interacción Humana (Like/Coment) en estas 3 semanas.
    //    - VEREDICTO: Si el Delta es 0, se elimina por falta de persistencia.
    // =================================================================================================
    if (track.fase === 'repechaje' && diasAntiguedad >= 40 && diasAntiguedad <= 45) {
        const likesNuevosTemp2 = likes - (track.likes || 0);
        const comentsNuevosTemp2 = comentarios - (track.comentarios || 0);

        if (likesNuevosTemp2 === 0 && comentsNuevosTemp2 === 0 && !has_download) {
            resultado.accion = 'DELETE';
            resultado.razon = '💀 Estación 4: Sin señales de vida en la primera mitad del repechaje';
            return resultado;
        }
    }

// =================================================================================================
    // 🏁 ESTACIÓN 5: EL JUICIO FINAL DEL TORNEO (Día 60+) - FIN DE TEMPORADA 2
    // =================================================================================================
    // OBJETIVO: Graduación Definitiva o Purga Total. El límite final de estancia en la base de datos.
    //
    // 💎 CRITERIO DE SUPERVIVENCIA (Debe cumplir UNA):
    //    1. VOLUMEN: Ganó +5 likes desde que entró en repechaje.
    //    2. CALIDAD (Ratio): Mantiene un Ratio de Calidad (Likes/Plays) >= 5%.
    //
    // VEREDICTO: Si cumple, se gradúa como "Joya de Culto". Si no, eliminación permanente.
    // =================================================================================================
    if (track.fase === 'repechaje' && diasAntiguedad > 60) {

        const likesNuevosFinal = likes - (track.likes || 0);
        const ratioCalidad = (likes / (plays_actuales || 1)) * 100;

        const cumpleVolumen = likesNuevosFinal >= 5;
        const cumpleRatio = ratioCalidad >= UMBRALES.E3_RATIO_MIN; // Usamos el 5%

        if (cumpleVolumen || cumpleRatio) {
            resultado.nuevosDatos.fase = 'graduado';
            resultado.razon = cumpleRatio ? `🎓 GRADUADO TARDÍO: Joya de Culto (Ratio: ${ratioCalidad.toFixed(1)}%)` : `🎓 GRADUADO TARDÍO: Crecimiento por Volumen (+${likesNuevosFinal} likes)`;
        } else {
            resultado.accion = 'DELETE';
            resultado.razon = `💀 Purga Final: No alcanzó los estándares del torneo (Volumen: +${likesNuevosFinal}, Ratio: ${ratioCalidad.toFixed(1)}%)`;
        }
    }


}

// --- FUNCIÓN AUXILIAR: REINTENTO INTELIGENTE ---
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
                timeout: 10000
            });

            if (response.status === 404 || response.status === 410) return '404';

            const html = await response.text();
            const regex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
            match = html.match(regex);

            if (!match) attempts++;

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
            const match = await fetchConReintento(mobileUrl, track.titulo);

            if (match === '404') {
                console.log(`❌ URL Rota: ${track.titulo} -> DELETE (404)`);
                if (!DRY_RUN) await supabase.from('tracks').delete().eq('id', track.id);
                return;
            }

            if (!match) {
                console.log(`💀 [ABANDONO] Datos vacíos para: "${track.titulo}" tras reintentos.`);
                return;
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
                reposts: data.reposts_count,
                has_download: !!(data.download_count > 0 || data.downloadable)
            };

            const fechaIngreso = new Date(track.fecha_ingreso);
            const hoy = new Date();
            const diasAntiguedad = Math.floor((hoy - fechaIngreso) / (1000 * 60 * 60 * 24));

            const veredicto = juzgarTrack(track, statsActuales, diasAntiguedad);

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
    const jobStartTime = process.env.JOB_START_TIME ? parseInt(process.env.JOB_START_TIME) : Date.now();
    const GITHUB_HARD_LIMIT = 15 * 60 * 1000;
    const SAFETY_BUFFER = 30 * 1000;
    const DEADLINE = jobStartTime + GITHUB_HARD_LIMIT - SAFETY_BUFFER;

    let ciclo = 1;
    let totalProcesados = 0;

    console.log(`⏱️ INICIO DINÁMICO DETECTADO.`);
    console.log(`📅 Timestamp Inicio Job: ${jobStartTime}`);
    console.log(`🎯 Deadline Calculado: ${new Date(DEADLINE).toISOString()}`);

    while (Date.now() < DEADLINE) {
        const tiempoRestanteMs = DEADLINE - Date.now();
        console.log(`\n🔄 --- CICLO ${ciclo} (Restan ${(tiempoRestanteMs/1000).toFixed(0)}s) ---`);

        const hace4Horas = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

        const { data: tracks, error } = await supabase
            .from('tracks')
            .select('*')
            .neq('fase', 'graduado')
            .lt('ultima_inspeccion', hace4Horas)
            .order('fecha_ingreso', { ascending: true })
            .limit(100);

        if (error) {
            console.error("❌ Error Crítico BD:", error);
            break;
        }

        if (!tracks || tracks.length === 0) {
            console.log("✅ Tarea cumplida: No hay más tracks pendientes por hoy.");
            break;
        }

        for (let i = 0; i < tracks.length; i += PARALLEL_POOL_SIZE) {
            if (Date.now() > DEADLINE) {
                console.log("🛑 DEADLINE ALCANZADO. Aterrizaje de emergencia...");
                i = tracks.length;
                break;
            }

            const lote = tracks.slice(i, i + PARALLEL_POOL_SIZE);
            await procesarLote(lote);
            totalProcesados += lote.length;
        }

        if (Date.now() > DEADLINE) break;

        ciclo++;
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🏁 SESIÓN FINALIZADA.`);
    console.log(`📊 Total Auditados: ${totalProcesados}`);
    console.log(`⏱️ Duración Total del Job: ${((Date.now() - jobStartTime)/1000).toFixed(1)}s / 900s`);
}

run();
