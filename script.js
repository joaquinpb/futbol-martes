// Define la URL de tu Google Apps Script aquí.
// ¡Esta URL es la que me proporcionaste y es crucial para la comunicación!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG-Rrj60caUpE8OL90_pmgHMi6VRsp8lw4FKN2eE4z5XEG_fNOiDo8pMI3TgqORc4e/exec';

// Versión del script
const SCRIPT_VERSION = "v2.6"; // Added ABM for players in admin.html

// Variable global para almacenar partidos pendientes para fácil acceso
let currentPendingMatches = [];
// Variable global para almacenar TODOS los partidos para la página de administración
let allMatches = [];
// Variable global para almacenar todos los jugadores con sus datos originales
let allPlayersData = [];
// Variable global para almacenar el nombre del jugador actualmente seleccionado para modificación
let selectedPlayerForModification = null;


// Función auxiliar para formatear la fecha de string ISO a DD/MM/AAAA
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Función auxiliar para formatear la fecha de DD/MM/AAAA a YYYY-MM-DD (para input date)
function formatDateToYYYYMMDD(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
}


// --- Funciones para index.html (Crear Partido) ---

/**
 * Carga la lista de jugadores de la hoja "Jugadores" del Google Sheets,
 * los clasifica como Titulares o Suplentes y los muestra en sus respectivas listas.
 */
async function cargarJugadores() {
    const jugadoresTitularesSelect = document.getElementById('jugadoresTitulares');
    const jugadoresSuplentesSelect = document.getElementById('jugadoresSuplentes');
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    if (!jugadoresTitularesSelect || !jugadoresSuplentesSelect || !equipoClarosSelect || !equipoOscurosSelect || !mensajeElem) {
        const missingElements = [];
        if (!jugadoresTitularesSelect) missingElements.push('jugadoresTitulares');
        if (!jugadoresSuplentesSelect) missingElements.push('jugadoresSuplentes');
        if (!equipoClarosSelect) missingElements.push('equipoClaros');
        if (!equipoOscurosSelect) missingElements.push('equipoOscuros');
        if (!mensajeElem) missingElements.push('mensaje');

        const errorMessage = `Error crítico: No se encontraron los siguientes elementos HTML en la página: ${missingElements.join(', ')}. Asegúrate de que el HTML está completo y los IDs son correctos.`;
        console.error(errorMessage);

        if (mensajeElem) {
            mensajeElem.textContent = errorMessage;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        } else {
            alert(errorMessage + "\nPor favor, revisa la consola del navegador para más detalles.");
        }
        return;
    }

    jugadoresTitularesSelect.innerHTML = '';
    jugadoresSuplentesSelect.innerHTML = '';
    equipoClarosSelect.innerHTML = '';
    equipoOscurosSelect.innerHTML = '';

    mensajeElem.textContent = 'Intentando cargar jugadores (Titulares/Suplentes)...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const jugadores = await response.json();
        allPlayersData = jugadores; // Store all players data globally

        if (jugadores.length === 0) {
            mensajeElem.textContent = 'No se encontraron jugadores en la hoja "Jugadores". Asegúrate de que la hoja no está vacía y los encabezados son correctos (Nombre, Puntos, Tipo, PartidosJugados, Ganados, Perdidos, Empatados, PuntosChamigo).';
            mensajeElem.style.backgroundColor = '#fff3cd';
            mensajeElem.style.color = '#856404';
            return;
        }

        jugadores.forEach(jugador => {
            if (jugador.Nombre && jugador.Tipo) {
                const option = document.createElement('option');
                option.value = jugador.Nombre;
                option.textContent = jugador.Nombre;
                option.dataset.originalType = jugador.Tipo.toLowerCase().trim();
                option.dataset.puntos = jugador.Puntos;
                // Store other stats as well if needed for client-side logic later
                option.dataset.partidosJugados = jugador.PartidosJugados || 0;
                option.dataset.ganados = jugador.Ganados || 0;
                option.dataset.perdidos = jugador.Perdidos || 0;
                option.dataset.empatados = jugador.Empatados || 0;
                option.dataset.puntosChamigo = jugador.PuntosChamigo || 0;

                if (option.dataset.originalType === 'titular') {
                    jugadoresTitularesSelect.appendChild(option);
                } else if (option.dataset.originalType === 'suplente') {
                    jugadoresSuplentesSelect.appendChild(option);
                }
            }
        });
        mensajeElem.textContent = 'Jugadores cargados exitosamente en sus roles (Titulares/Suplentes).';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } catch (error) {
        console.error('Error al cargar jugadores:', error);
        mensajeElem.textContent = `Error al cargar jugadores: ${error.message}. Por favor, verifica: 1) Tu conexión a internet. 2) Que la URL del Apps Script en script.js sea EXACTA. 3) Que el Apps Script esté desplegado como "Aplicación web" con acceso "Cualquier persona". 4) Los nombres de las hojas ("Jugadores", "Partidos") y columnas ("Nombre", "Puntos", "Tipo", "PartidosJugados", "Ganados", "Perdidos", "Empatados", "PuntosChamigo").`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Mueve jugadores seleccionados de una lista de origen (Titulares/Suplentes) a un equipo (Claros/Oscuros).
 * @param {string} sourceListType - 'titulares' o 'suplentes'.
 * @param {string} teamType - 'claros' o 'oscuros'.
 */
function moveToTeam(sourceListType, teamType) {
    const sourceSelectId = `jugadores${sourceListType.charAt(0).toUpperCase() + sourceListType.slice(1)}`;
    const teamSelectId = `equipo${teamType.charAt(0).toUpperCase() + teamType.slice(1)}`;

    const sourceSelect = document.getElementById(sourceSelectId);
    const teamSelect = document.getElementById(teamSelectId);
    const mensajeElem = document.getElementById('mensaje');

    if (!sourceSelect || !teamSelect || !mensajeElem) {
        console.error(`Error: Elementos no encontrados para moveToTeam (Origen: ${sourceSelectId}, Destino: ${teamSelectId}).`);
        if (mensajeElem) {
            mensajeElem.textContent = 'Error interno: Elementos de la interfaz no encontrados.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
        return;
    }

    const selectedOptions = Array.from(sourceSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        mensajeElem.textContent = 'Por favor, selecciona al menos un jugador para mover al equipo.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    let movedCount = 0;
    selectedOptions.forEach(option => {
        if (teamSelect.options.length < 5) {
            teamSelect.appendChild(option);
            movedCount++;
        } else {
            mensajeElem.textContent = `No se pudo mover a ${option.textContent}. El equipo ${teamType} ya tiene 5 jugadores.`;
            mensajeElem.style.backgroundColor = '#fff3cd';
            mensajeElem.style.color = '#856404';
        }
    });

    if (movedCount > 0) {
        mensajeElem.textContent = `Se movieron ${movedCount} jugador(es) al equipo ${teamType}.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } else if (selectedOptions.length > 0 && teamSelect.options.length >= 5) {
        // Mensaje de límite ya mostrado
    } else {
        mensajeElem.textContent = `No se pudo mover ningún jugador al equipo ${teamType}.`;
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}

/**
 * Mueve jugadores seleccionados de un equipo (Claros/Oscuros) de vuelta a su lista original (Titulares/Suplentes).
 * @param {string} teamType - 'claros' o 'oscuros'.
 */
function moveFromTeam(teamType) {
    const teamSelectId = `equipo${teamType.charAt(0).toUpperCase() + teamType.slice(1)}`;
    const teamSelect = document.getElementById(teamSelectId);
    const mensajeElem = document.getElementById('mensaje');

    if (!teamSelect || !mensajeElem) {
        console.error(`Error: Elementos no encontrados para moveFromTeam (Origen: ${teamSelectId}).`);
        if (mensajeElem) {
            mensajeElem.textContent = 'Error interno: Elementos de la interfaz no encontrados.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
        return;
    }

    const selectedOptions = Array.from(teamSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        mensajeElem.textContent = 'Por favor, selecciona al menos un jugador para mover de vuelta.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    let movedCount = 0;
    selectedOptions.forEach(option => {
        const originalType = option.dataset.originalType;
        console.log(`[moveFromTeam] Moviendo jugador: ${option.textContent}, Tipo Original (dataset): '${originalType}'`);

        if (!originalType || (originalType !== 'titular' && originalType !== 'suplente')) {
            console.error(`[moveFromTeam] Error: Tipo original inesperado para el jugador ${option.textContent}: '${originalType}'. No se pudo mover de vuelta.`);
            mensajeElem.textContent = `Error: Tipo de jugador desconocido al intentar mover de vuelta a ${option.textContent}.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return;
        }

        let destinationSelectId;
        if (originalType === 'titular') {
            destinationSelectId = 'jugadoresTitulares';
        } else if (originalType === 'suplente') {
            destinationSelectId = 'jugadoresSuplentes';
        } else {
            console.error(`[moveFromTeam] Fallback: Tipo original no reconocido para destino: '${originalType}'`);
            mensajeElem.textContent = `Error interno al determinar lista de destino para ${option.textContent}.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }

        const destinationSelect = document.getElementById(destinationSelectId);

        if (destinationSelect) {
            destinationSelect.appendChild(option);
            movedCount++;
        } else {
            console.error(`[moveFromTeam] Error: Lista de destino '${destinationSelectId}' no encontrada para el jugador ${option.textContent}. Tipo Original era: ${originalType}`);
            mensajeElem.textContent = `Error: No se pudo mover a ${option.textContent}. Lista de destino no encontrada.`
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
    });

    if (movedCount > 0) {
        mensajeElem.textContent = `Se movieron ${movedCount} jugador(es) de vuelta desde el equipo ${teamType}.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } else {
        mensajeElem.textContent = `No se pudo mover ningún jugador de vuelta.`;
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}

/**
 * Guarda los detalles del partido (fecha, jugadores de cada equipo)
 * en la hoja "Partidos" de Google Sheets.
 */
async function guardarPartido() {
    const fecha = document.getElementById('fechaPartido').value;
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    if (!fecha) {
        mensajeElem.textContent = 'Por favor, selecciona la fecha del partido.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    if (equipoClarosSelect.options.length !== 5 || equipoOscurosSelect.options.length !== 5) {
        mensajeElem.textContent = 'Ambos equipos (Claros y Oscuros) deben tener exactamente 5 jugadores cada uno para guardar el partido.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    try {
        const existingMatchesResponse = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!existingMatchesResponse.ok) {
            throw new Error(`Error HTTP al verificar partidos existentes: ${existingMatchesResponse.status} ${existingMatchesResponse.statusText || ''}.`);
        }
        const existingMatches = await existingMatchesResponse.json();

        const isDuplicateDate = existingMatches.some(match => {
            const matchDateOnly = match.Fecha.split('T')[0];
            return matchDateOnly === fecha;
        });

        if (isDuplicateDate) {
            mensajeElem.textContent = 'Ya existe un partido programado para esta fecha. Por favor, elige otra fecha.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return;
        }

        const equipoClaros = Array.from(equipoClarosSelect.options).map(opt => opt.value).join(',');
        const equipoOscuros = Array.from(equipoOscurosSelect.options).map(opt => opt.value).join(',');

        const data = {
            fecha: fecha,
            equipoClaros: equipoClaros,
            equipoOscuros: equipoOscuros,
            ganador: 'PENDIENTE',
            action: 'addMatch' // Explicit action for adding a new match
        };

        const response = await fetch(`${SCRIPT_URL}`, { // Send to base URL for doPost
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        mensajeElem.textContent = 'Partido guardado exitosamente. ¡No olvides registrar el resultado más tarde!';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';

        equipoClarosSelect.innerHTML = '';
        equipoOscurosSelect.innerHTML = '';
        cargarJugadores();
        document.getElementById('fechaPartido').valueAsDate = new Date();
    } catch (error) {
        console.error('Error al guardar partido:', error);
        mensajeElem.textContent = `Error al guardar el partido: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}


// --- Funciones para resultados.html (Registrar Resultados) ---

/**
 * Carga los partidos marcados como 'PENDIENTE' de la hoja "Partidos"
 * y los muestra en el select para registrar resultados.
 */
async function cargarPartidosPendientes() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    if (!partidosSelect) {
        console.error("Elemento 'seleccionarPartido' no encontrado. Asegúrate de que estás en la página correcta (resultados.html) y el ID es correcto.");
        return;
    }

    partidosSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
    const mensajeElem = document.getElementById('mensajeResultados');

    if (!mensajeElem) {
        console.error("Elemento 'mensajeResultados' no encontrado.");
        return;
    }

    mensajeElem.textContent = 'Intentando cargar partidos pendientes...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const partidos = await response.json();
        currentPendingMatches = partidos.filter(p => p.Ganador === 'PENDIENTE');

        if (currentPendingMatches.length === 0) {
            mensajeElem.textContent = 'No hay partidos pendientes de registrar resultados.';
            mensajeElem.style.backgroundColor = '#e6e6e6';
            mensajeElem.style.color = '#333';
            return;
        }

        currentPendingMatches.forEach(partido => {
            const option = document.createElement('option');
            option.value = partido.Fecha;
            const formattedDate = formatDateToDDMMYYYY(partido.Fecha);
            option.textContent = formattedDate;
            option.dataset.equipoClaros = partido.EquipoClaros; // Store team players
            option.dataset.equipoOscuros = partido.EquipoOscuros; // Store team players
            partidosSelect.appendChild(option);
        });
        mensajeElem.textContent = 'Partidos pendientes cargados exitosamente.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } catch (error) {
        console.error('Error al cargar partidos:', error);
        mensajeElem.textContent = `Error al cargar partidos pendientes: ${error.message}. Por favor, verifica: 1) Tu conexión a internet. 2) Que la URL del Apps Script en script.js sea EXACTA. 3) Que el Apps Script esté desplegado como "Aplicación web" con acceso "Cualquier persona". 4) Los nombres de las hojas ("Jugadores", "Partidos") y columnas ("Nombre", "Puntos", "Tipo", "PartidosJugados", "Ganados", "Perdidos", "Empatados", "PuntosChamigo", "Fecha", "EquipoClaros", "EquipoOscuros", "Ganador", "ChamigoVotado").`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Muestra los detalles del partido seleccionado en las cajas de texto de equipos.
 */
function mostrarDetallesPartido() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    const equipoClarosDetalle = document.getElementById('equipoClarosDetalle');
    const equipoOscurosDetalle = document.getElementById('equipoOscurosDetalle');
    const mensajeElem = document.getElementById('mensajeResultados');

    const selectedDateValue = partidosSelect.value;

    if (!selectedDateValue) {
        equipoClarosDetalle.value = '';
        equipoOscurosDetalle.value = '';
        mensajeElem.textContent = 'Selecciona una fecha de partido para ver los detalles.';
        mensajeElem.style.backgroundColor = '#f0f8ff';
        mensajeElem.style.color = '#0056b3';
        return;
    }

    const selectedMatch = currentPendingMatches.find(match => match.Fecha === selectedDateValue);

    if (selectedMatch) {
        equipoClarosDetalle.value = selectedMatch.EquipoClaros.split(',').join('\n');
        equipoOscurosDetalle.value = selectedMatch.EquipoOscuros.split(',').join('\n');
        mensajeElem.textContent = '';
    } else {
        equipoClarosDetalle.value = '';
        equipoOscurosDetalle.value = '';
        mensajeElem.textContent = 'No se encontraron detalles para el partido seleccionado.';
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}


/**
 * Registra el resultado de un partido seleccionado y actualiza los puntos
 * y estadísticas de los jugadores en la hoja "Jugadores" a través del Apps Script.
 */
async function registrarResultado() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    const fechaPartido = partidosSelect.value;
    const mensajeElem = document.getElementById('mensajeResultados');

    if (!fechaPartido) {
        mensajeElem.textContent = 'Por favor, selecciona un partido de la lista.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    const ganadorRadio = document.querySelector('input[name="ganador"]:checked');
    if (!ganadorRadio) {
        mensajeElem.textContent = 'Por favor, selecciona el equipo ganador o si fue empate.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }
    const ganador = ganadorRadio.value;

    const selectedMatch = currentPendingMatches.find(match => match.Fecha === fechaPartido);

    if (!selectedMatch) {
        mensajeElem.textContent = 'Error: No se encontraron los detalles del partido seleccionado. Por favor, recarga la página.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    mensajeElem.textContent = 'Registrando resultado y actualizando puntos...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        // 1. Update match status in 'Partidos' sheet
        const updateMatchData = {
            originalFecha: selectedMatch.Fecha,
            ganador: ganador,
            action: 'updateMatchStatus' // New action for Apps Script
        };
        await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateMatchData),
        });
        // No need to check response for no-cors, assume success if no network error

        // 2. Calculate and update player stats in 'Jugadores' sheet
        const playersResponse = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);
        const allPlayers = await playersResponse.json();

        const playerStatsMap = new Map();
        allPlayers.forEach(p => {
            playerStatsMap.set(p.Nombre, {
                Puntos: parseInt(p.Puntos || 0),
                PartidosJugados: parseInt(p.PartidosJugados || 0),
                Ganados: parseInt(p.Ganados || 0),
                Perdidos: parseInt(p.Perdidos || 0),
                Empatados: parseInt(p.Empatados || 0),
                PuntosChamigo: parseInt(p.PuntosChamigo || 0) // Chamigo points are cumulative in Jugadores sheet
            });
        });

        const equipoClaros = selectedMatch.EquipoClaros.split(',').map(name => name.trim());
        const equipoOscuros = selectedMatch.EquipoOscuros.split(',').map(name => name.trim());

        const playersInMatch = [...new Set([...equipoClaros, ...equipoOscuros])]; // Get unique players in this match

        playersInMatch.forEach(playerName => {
            const stats = playerStatsMap.get(playerName) || { Puntos: 0, PartidosJugados: 0, Ganados: 0, Perdidos: 0, Empatados: 0, PuntosChamigo: 0 };
            stats.PartidosJugados++;

            if (ganador === 'Claros') {
                if (equipoClaros.includes(playerName)) {
                    stats.Puntos += 3;
                    stats.Ganados++;
                } else if (equipoOscuros.includes(playerName)) {
                    stats.Perdidos++;
                }
            } else if (ganador === 'Oscuros') {
                if (equipoOscuros.includes(playerName)) {
                    stats.Puntos += 3;
                    stats.Ganados++;
                } else if (equipoClaros.includes(playerName)) {
                    stats.Perdidos++;
                }
            } else if (ganador === 'Empate') {
                stats.Puntos += 1;
                stats.Empatados++;
            }
            playerStatsMap.set(playerName, stats);
        });

        const playersToUpdate = Array.from(playerStatsMap.keys()).map(playerName => ({
            Nombre: playerName,
            // Only send general stats, NOT PuntosChamigo, as it's handled by 'voteChamigo' now
            Puntos: playerStatsMap.get(playerName).Puntos,
            PartidosJugados: playerStatsMap.get(playerName).PartidosJugados,
            Ganados: playerStatsMap.get(playerName).Ganados,
            Perdidos: playerStatsMap.get(playerName).Perdidos,
            Empatados: playerStatsMap.get(playerName).Empatados
        }));

        const updatePlayersData = {
            playersToUpdate: playersToUpdate,
            action: 'updatePlayerStats' // New action for Apps Script
        };
        await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePlayersData),
        });

        mensajeElem.textContent = 'Resultado registrado y puntos de jugadores actualizados exitosamente.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';

        cargarPartidosPendientes();
        document.getElementById('equipoClarosDetalle').value = '';
        document.getElementById('equipoOscurosDetalle').value = '';

    } catch (error) {
        console.error('Error al registrar resultado o actualizar puntos:', error);
        mensajeElem.textContent = `Error al registrar el resultado o actualizar puntos: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Muestra la tabla de puntos de los jugadores, ordenada de mayor a menor.
 * @param {number} [filterYear=null] - Año para filtrar los partidos.
 * @param {string} [filterPeriod='Total'] - Período para filtrar ('Apertura', 'Clausura', 'Total').
 */
async function mostrarTablaPuntos(filterYear = null, filterPeriod = 'Total') {
    const puntosTablaContainer = document.getElementById('puntosTablaContainer');
    const mensajePuntosElem = document.getElementById('mensajePuntos');

    if (!puntosTablaContainer || !mensajePuntosElem) {
        console.error('Error: Elementos HTML para la tabla de puntos no encontrados.');
        return;
    }

    // Clear previous content
    puntosTablaContainer.innerHTML = '';

    if (!filterYear) {
        mensajePuntosElem.textContent = 'Por favor, selecciona un año para visualizar los datos de la tabla de puntos.';
        mensajePuntosElem.style.backgroundColor = '#fff3cd';
        mensajePuntosElem.style.color = '#856404';
        return; // Exit if no year is selected
    }

    mensajePuntosElem.textContent = 'Cargando tabla de puntos...';
    mensajePuntosElem.style.backgroundColor = '#f0f8ff';
    mensajePuntosElem.style.color = '#0056b3';

    try {
        // Fetch all players data (for initial names and types)
        const playersResponse = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);
        if (!playersResponse.ok) {
            throw new Error(`Error HTTP al cargar jugadores: ${playersResponse.status} ${playersResponse.statusText || ''}.`);
        }
        const allPlayers = await playersResponse.json();

        // Fetch all matches data
        const matchesResponse = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!matchesResponse.ok) {
            throw new Error(`Error HTTP al cargar partidos: ${matchesResponse.status} ${matchesResponse.statusText || ''}.`);
        }
        const allMatchesData = await matchesResponse.json();

        // Fetch all Chamigo votes data from the new sheet
        const chamigoVotesResponse = await fetch(`${SCRIPT_URL}?sheet=VotosChamigo`);
        if (!chamigoVotesResponse.ok) {
            throw new Error(`Error HTTP al cargar votos Chamigo: ${chamigoVotesResponse.status} ${chamigoVotesResponse.statusText || ''}.`);
        }
        const allChamigoVotes = await chamigoVotesResponse.json();


        // Initialize player stats with default values
        const playerStats = {};
        allPlayers.forEach(player => {
            playerStats[player.Nombre] = {
                Puntos: 0,
                PartidosJugados: 0,
                Ganados: 0,
                Perdidos: 0,
                Empatados: 0,
                PuntosChamigo: 0 // Initialize Chamigo wins to 0 for dynamic calculation
            };
        });

        // Filter matches based on year and period
        let filteredMatches = allMatchesData.filter(match => match.Ganador !== 'PENDIENTE'); // Only count finished matches

        if (filterYear) {
            filteredMatches = filteredMatches.filter(match => {
                const matchDate = new Date(match.Fecha);
                return matchDate.getFullYear() === filterYear;
            });

            // Apply period filter ONLY if a year is selected
            if (filterPeriod === 'Apertura') {
                filteredMatches = filteredMatches.filter(match => {
                    const matchDate = new Date(match.Fecha);
                    return matchDate.getMonth() >= 0 && matchDate.getMonth() <= 5; // Enero (0) a Junio (5)
                });
            } else if (filterPeriod === 'Clausura') {
                filteredMatches = filteredMatches.filter(match => {
                    const matchDate = new Date(match.Fecha);
                    return matchDate.getMonth() >= 6 && matchDate.getMonth() <= 11; // Julio (6) a Diciembre (11)
                });
            }
        }

        // --- DEBUG LOG: Mostrar los partidos filtrados ---
        console.log(`[DEBUG - Tabla Puntos] Partidos filtrados para Año: ${filterYear || 'Todos'}, Período: ${filterPeriod}:`);
        filteredMatches.forEach(match => {
            console.log(`  - Fecha: ${match.Fecha}, Ganador: ${match.Ganador}, Claros: ${match.EquipoClaros}, Oscuros: ${match.EquipoOscuros}`);
        });
        // --- FIN DEBUG LOG ---


        // Calculate general points and stats from filtered matches
        filteredMatches.forEach(match => {
            // Ensure unique players from team strings to prevent double counting if data is malformed
            const equipoClaros = [...new Set(match.EquipoClaros.split(',').map(name => name.trim()))];
            const equipoOscuros = [...new Set(match.EquipoOscuros.split(',').map(name => name.trim()))];

            const winner = match.Ganador;

            // Update stats for all players in the match
            // Create a combined set of unique players for the current match to increment PartidosJugados only once
            const playersInCurrentMatch = new Set([...equipoClaros, ...equipoOscuros]);

            playersInCurrentMatch.forEach(playerName => {
                // Ensure player exists in playerStats, if not, initialize them (should already be done by allPlayers.forEach)
                if (!playerStats[playerName]) {
                    playerStats[playerName] = {
                        Puntos: 0,
                        PartidosJugados: 0,
                        Ganados: 0,
                        Perdidos: 0,
                        Empatados: 0,
                        PuntosChamigo: 0
                    };
                }
                playerStats[playerName].PartidosJugados++;
            });

            if (winner === 'Claros') {
                equipoClaros.forEach(playerName => {
                    playerStats[playerName].Puntos += 3;
                    playerStats[playerName].Ganados++;
                });
                equipoOscuros.forEach(playerName => {
                    playerStats[playerName].Perdidos++;
                });
            } else if (winner === 'Oscuros') {
                equipoOscuros.forEach(playerName => {
                    playerStats[playerName].Puntos += 3;
                    playerStats[playerName].Ganados++;
                });
                equipoClaros.forEach(playerName => {
                    playerStats[playerName].Perdidos++;
                });
            } else if (winner === 'Empate') {
                playersInCurrentMatch.forEach(playerName => { // For empate, all players get 1 point and 1 tie
                    playerStats[playerName].Puntos += 1;
                    playerStats[playerName].Empatados++;
                });
            }
        });

        // Calculate Chamigo wins based on highest votes per match, considering filters
        const chamigoVotesByMatch = new Map(); // Key: matchDate (YYYY-MM-DD), Value: Array of {Jugador, PuntosOtorgados}
        allChamigoVotes.forEach(vote => {
            const matchDateOnly = vote.FechaPartido.split('T')[0]; // Get YYYY-MM-DD
            if (!chamigoVotesByMatch.has(matchDateOnly)) {
                chamigoVotesByMatch.set(matchDateOnly, []);
            }
            chamigoVotesByMatch.get(matchDateOnly).push(vote);
        });

        // Iterate through grouped Chamigo votes to find winners per match
        chamigoVotesByMatch.forEach((votesForMatch, matchDateString) => {
            const matchDate = new Date(matchDateString);
            let shouldIncludeMatchForChamigo = true;

            // Apply filters for Chamigo wins (same logic as general stats)
            if (filterYear && matchDate.getFullYear() !== filterYear) {
                shouldIncludeMatchForChamigo = false;
            }

            if (filterYear && filterPeriod === 'Apertura' && (matchDate.getMonth() < 0 || matchDate.getMonth() > 5)) {
                shouldIncludeMatchForChamigo = false;
            } else if (filterYear && filterPeriod === 'Clausura' && (matchDate.getMonth() < 6 || matchDate.getMonth() > 11)) {
                shouldIncludeMatchForChamigo = false;
            }

            if (shouldIncludeMatchForChamigo) {
                let maxPointsInMatch = 0;
                votesForMatch.forEach(vote => {
                    const points = parseInt(vote.PuntosOtorgados || 0);
                    if (points > maxPointsInMatch) {
                        maxPointsInMatch = points;
                    }
                });

                // If there are actual points awarded in this match (not all zeros)
                if (maxPointsInMatch > 0) {
                    votesForMatch.forEach(vote => {
                        if (parseInt(vote.PuntosOtorgados || 0) === maxPointsInMatch) {
                            // Increment Chamigo win count for this player
                            if (playerStats[vote.Jugador]) {
                                playerStats[vote.Jugador].PuntosChamigo++;
                            } else {
                                // This case means a player received Chamigo points but wasn't in the initial allPlayers list
                                // (e.g., if they were added to VotosChamigo but not Jugadores).
                                // Initialize them if they don't exist.
                                playerStats[vote.Jugador] = {
                                    Puntos: 0,
                                    PartidosJugados: 0,
                                    Ganados: 0,
                                    Perdidos: 0,
                                    Empatados: 0,
                                    PuntosChamigo: 1 // First Chamigo win
                                };
                            }
                        }
                    });
                }
            }
        });


        // Convert playerStats object to an array for sorting and display
        let jugadoresParaTabla = Object.keys(playerStats).map(name => ({
            Nombre: name,
            Puntos: playerStats[name].Puntos,
            PartidosJugados: playerStats[name].PartidosJugados,
            Ganados: playerStats[name].Ganados,
            Perdidos: playerStats[name].Perdidos,
            Empatados: playerStats[name].Empatados,
            PuntosChamigo: playerStats[name].PuntosChamigo // This now holds Chamigo wins
        }));

        // Filter out players who didn't play any filtered matches AND have no Chamigo points in the filtered period
        // This ensures only relevant players appear in the filtered view
        if (filterYear || filterPeriod !== 'Total') {
             jugadoresParaTabla = jugadoresParaTabla.filter(j => j.PartidosJugados > 0 || j.PuntosChamigo > 0);
        }

        // --- DEBUG LOG: Mostrar las estadísticas finales de los jugadores ---
        console.log(`[DEBUG - Tabla Puntos] Estadísticas finales de jugadores (filtrado):`);
        jugadoresParaTabla.forEach(player => {
            console.log(`  - ${player.Nombre}: Jugados=${player.PartidosJugados}, Ganados=${player.Ganados}, Empatados=${player.Empatados}, Perdidos=${player.Perdidos}, Puntos=${player.Puntos}, ChamigoGanados=${player.PuntosChamigo}`);
        });
        // --- FIN DEBUG LOG ---


        // Ordena los jugadores por puntos de mayor a menor, luego por Chamigo Ganados de mayor a menor,
        // luego por partidos jugados de mayor a menor.
        jugadoresParaTabla.sort((a, b) => {
            if (b.Puntos !== a.Puntos) {
                return b.Puntos - a.Puntos; // Puntos Totales (DESC)
            }
            // If total points are equal, sort by Chamigo wins (DESC)
            if (b.PuntosChamigo !== a.PuntosChamigo) {
                return b.PuntosChamigo - a.PuntosChamigo;
            }
            return b.PartidosJugados - a.PartidosJugados; // Jugados (DESC)
        });

        let tablaHTML = `
            <table class="puntos-table">
                <thead>
                    <tr>
                        <th class="left-aligned-cell">Posición</th>
                        <th class="left-aligned-cell">Jugador</th>
                        <th class="centered-cell">Puntos Totales</th>
                        <th class="centered-cell">Jugados</th>
                        <th class="centered-cell">Ganados</th>
                        <th class="centered-cell">Perdidos</th>
                        <th class="centered-cell">Empatados</th>
                        <th class="centered-cell">Chamigo Ganados</th> <!-- Updated header for clarity -->
                    </tr>
                </thead>
                <tbody>
        `;

        jugadoresParaTabla.forEach((jugador, index) => {
            tablaHTML += `
                <tr>
                    <td class="left-aligned-cell" data-label="Posición">${index + 1}</td>
                    <td class="left-aligned-cell" data-label="Jugador">${jugador.Nombre}</td>
                    <td class="centered-cell" data-label="Puntos Totales">${jugador.Puntos}</td>
                    <td class="centered-cell" data-label="Jugados">${jugador.PartidosJugados}</td>
                    <td class="centered-cell" data-label="Ganados">${jugador.Ganados}</td>
                    <td class="centered-cell" data-label="Perdidos">${jugador.Perdidos}</td>
                    <td class="centered-cell" data-label="Empatados">${jugador.Empatados}</td>
                    <td class="centered-cell" data-label="Chamigo Ganados">${jugador.PuntosChamigo}</td>
                </tr>
            `;
        });

        tablaHTML += `
                </tbody>
            </table>
        `;

        puntosTablaContainer.innerHTML = tablaHTML;
        mensajePuntosElem.textContent = 'Tabla de puntos cargada exitosamente.';
        mensajePuntosElem.style.backgroundColor = '#e2f0cb';
        mensajePuntosElem.color = '#28a745';

    } catch (error) {
        console.error('Error al cargar la tabla de puntos:', error);
        mensajePuntosElem.textContent = `Error al cargar la tabla de puntos: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajePuntosElem.style.backgroundColor = '#f8d7da';
        mensajePuntosElem.style.color = '#721c24';
    }
}

/**
 * Carga los años disponibles en el selector de filtro.
 * Obtiene los años de los partidos registrados.
 */
async function loadFilterYears() {
    const filterYearSelect = document.getElementById('filterYear');
    if (!filterYearSelect) return;

    filterYearSelect.innerHTML = '<option value="">Selecciona un Año</option>'; // Default option changed

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}.`);
        }
        const partidos = await response.json();

        const years = new Set();
        partidos.forEach(partido => {
            if (partido.Fecha) {
                const date = new Date(partido.Fecha);
                years.add(date.getFullYear());
            }
        });

        const sortedYears = Array.from(years).sort((a, b) => b - a); // Sort descending

        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filterYearSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar años para el filtro:', error);
        // Optionally show a message to the user
    }
}

/**
 * Aplica los filtros seleccionados a la tabla de puntos.
 */
function applyFilters() {
    const filterYearSelect = document.getElementById('filterYear');
    const selectedYear = filterYearSelect.value ? parseInt(filterYearSelect.value) : null;
    const selectedPeriod = document.querySelector('input[name="filterPeriod"]:checked').value;

    mostrarTablaPuntos(selectedYear, selectedPeriod);
}


// --- Funciones para administrador.html (Gestión de Partidos y Jugadores) ---

/**
 * Carga todos los partidos de la hoja "Partidos" y los muestra en el select de administración.
 */
async function cargarTodosLosPartidos() {
    const partidosAdminSelect = document.getElementById('seleccionarPartidoAdmin');
    const mensajeAdminElem = document.getElementById('mensajeAdmin');
    const adminForm = document.getElementById('adminForm');

    if (!partidosAdminSelect || !mensajeAdminElem || !adminForm) {
        console.error("Error: Elementos HTML para la administración de partidos no encontrados. Asegúrate de que estás en la página correcta (administrador.html) y los IDs son correctos.");
        return;
    }

    partidosAdminSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
    adminForm.style.display = 'none';
    mensajeAdminElem.textContent = 'Cargando todos los partidos...';
    mensajeAdminElem.style.backgroundColor = '#f0f8ff';
    mensajeAdminElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}.`);
        }
        allMatches = await response.json();

        if (allMatches.length === 0) {
            mensajeAdminElem.textContent = 'No hay partidos registrados para administrar.';
            mensajeAdminElem.style.backgroundColor = '#fff3cd';
            mensajeAdminElem.style.color = '#856404';
            return;
        }

        allMatches.sort((a, b) => {
            const dateA = new Date(a.Fecha);
            const dateB = new Date(b.Fecha);
            return dateA - dateB;
        });

        allMatches.forEach((partido, index) => {
            const option = document.createElement('option');
            option.value = index;
            const formattedDate = formatDateToDDMMYYYY(partido.Fecha);
            option.textContent = `${formattedDate} - Claros: ${partido.EquipoClaros} vs Oscuros: ${partido.EquipoOscuros} (${partido.Ganador})`;
            partidosAdminSelect.appendChild(option);
        });

        mensajeAdminElem.textContent = 'Partidos cargados exitosamente para administración.';
        mensajeAdminElem.style.backgroundColor = '#e2f0cb';
        mensajeAdminElem.style.color = '#28a745';

    } catch (error) {
        console.error('Error al cargar todos los partidos:', error);
        mensajeAdminElem.textContent = `Error al cargar partidos para administración: ${error.message}.`;
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
    }
}

/**
 * Carga los detalles de un partido seleccionado en el formulario de administración.
 */
function cargarDetallesPartidoAdmin() {
    const partidosAdminSelect = document.getElementById('seleccionarPartidoAdmin');
    const adminForm = document.getElementById('adminForm');
    const mensajeAdminElem = document.getElementById('mensajeAdmin');

    const selectedIndex = partidosAdminSelect.value;

    if (selectedIndex === "") {
        adminForm.style.display = 'none';
        mensajeAdminElem.textContent = 'Selecciona un partido para ver sus detalles.';
        mensajeAdminElem.style.backgroundColor = '#f0f8ff';
        mensajeAdminElem.style.color = '#0056b3';
        return;
    }

    const selectedMatch = allMatches[selectedIndex];

    if (selectedMatch) {
        document.getElementById('fechaPartidoAdmin').value = selectedMatch.Fecha.split('T')[0];
        document.getElementById('equipoClarosAdmin').value = selectedMatch.EquipoClaros.split(',').join('\n');
        document.getElementById('equipoOscurosAdmin').value = selectedMatch.EquipoOscuros.split(',').join('\n');

        const ganadorRadios = document.querySelectorAll('input[name="ganadorAdmin"]');
        ganadorRadios.forEach(radio => {
            if (radio.value === selectedMatch.Ganador) {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });

        adminForm.style.display = 'block';
        mensajeAdminElem.textContent = '';
    } else {
        adminForm.style.display = 'none';
        mensajeAdminElem.textContent = 'Error: No se encontraron los detalles del partido seleccionado.';
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
    }
}

/**
 * Actualiza un partido existente en la hoja de Google Sheets.
 */
async function actualizarPartido() {
    const partidosAdminSelect = document.getElementById('seleccionarPartidoAdmin');
    const selectedIndex = partidosAdminSelect.value;
    const mensajeAdminElem = document.getElementById('mensajeAdmin');

    if (selectedIndex === "") {
        mensajeAdminElem.textContent = 'Por favor, selecciona un partido para actualizar.';
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
        return;
    }

    const originalMatch = allMatches[selectedIndex];
    const nuevaFecha = document.getElementById('fechaPartidoAdmin').value;
    const nuevosClaros = document.getElementById('equipoClarosAdmin').value.split('\n').map(s => s.trim()).filter(s => s !== '').join(',');
    const nuevosOscuros = document.getElementById('equipoOscurosAdmin').value.split('\n').map(s => s.trim()).filter(s => s !== '').join(',');
    const nuevoGanador = document.querySelector('input[name="ganadorAdmin"]:checked')?.value || 'PENDIENTE';

    const isDuplicateDate = allMatches.some((match, idx) => {
        if (idx === parseInt(selectedIndex)) return false;
        return match.Fecha.split('T')[0] === nuevaFecha;
    });

    if (isDuplicateDate) {
        mensajeAdminElem.textContent = 'Ya existe otro partido programado para esta fecha. Por favor, elige otra fecha.';
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
        return;
    }

    const data = {
        originalFecha: originalMatch.Fecha,
        nuevaFecha: nuevaFecha, // This is not used in Apps Script's updateMatchStatus
        equipoClaros: nuevosClaros, // This is not used in Apps Script's updateMatchStatus
        equipoOscuros: nuevosOscuros, // This is not used in Apps Script's updateMatchStatus
        ganador: nuevoGanador,
        action: 'updateMatchStatus' // Use the specific action for status update
    };

    mensajeAdminElem.textContent = 'Guardando cambios...';
    mensajeAdminElem.style.backgroundColor = '#f0f8ff';
    mensajeAdminElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        mensajeAdminElem.textContent = 'Partido actualizado exitosamente.';
        mensajeAdminElem.style.backgroundColor = '#e2f0cb';
        mensajeAdminElem.style.color = '#28a745';
        cargarTodosLosPartidos();
    } catch (error) {
        console.error('Error al actualizar partido:', error);
        mensajeAdminElem.textContent = `Error al actualizar partido: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
    }
}

/**
 * Elimina un partido de la hoja de Google Sheets.
 */
async function eliminarPartido() {
    const partidosAdminSelect = document.getElementById('seleccionarPartidoAdmin');
    const selectedIndex = partidosAdminSelect.value;
    const mensajeAdminElem = document.getElementById('mensajeAdmin');
    const adminForm = document.getElementById('adminForm');

    if (selectedIndex === "") {
        mensajeAdminElem.textContent = 'Por favor, selecciona un partido para eliminar.';
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
        return;
    }

    const matchToDelete = allMatches[selectedIndex];

    // Using a custom modal/confirmation instead of browser's confirm()
    const confirmDelete = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el partido del ${formatDateToDDMMYYYY(matchToDelete.Fecha)}? Esta acción es irreversible.`);

    if (!confirmDelete) {
        mensajeAdminElem.textContent = 'Eliminación cancelada.';
        mensajeAdminElem.style.backgroundColor = '#fff3cd';
        mensajeAdminElem.style.color = '#856404';
        return;
    }

    const data = {
        fecha: matchToDelete.Fecha,
        action: 'deleteMatch'
    };

    mensajeAdminElem.textContent = 'Eliminando partido...';
    mensajeAdminElem.style.backgroundColor = '#f0f8ff';
    mensajeAdminElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        mensajeAdminElem.textContent = 'Partido eliminado exitosamente.';
        mensajeAdminElem.style.backgroundColor = '#e2f0cb';
        mensajeAdminElem.style.color = '#28a745';

        adminForm.style.display = 'none';
        cargarTodosLosPartidos();
    } catch (error) {
        console.error('Error al eliminar partido:', error);
        mensajeAdminElem.textContent = `Error al eliminar partido: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
    }
}

// Custom confirmation dialog (replaces alert/confirm)
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modalId = 'customConfirmModal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = `
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            modal.innerHTML = `
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); text-align: center; max-width: 400px;">
                    <p style="margin-bottom: 20px; font-size: 1.1em;">${message}</p>
                    <button id="confirmYes" style="background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Sí</button>
                    <button id="confirmNo" style="background-color: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">No</button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('p').textContent = message;
            modal.style.display = 'flex';
        }

        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');

        const cleanup = () => {
            confirmYes.removeEventListener('click', onYes);
            confirmNo.removeEventListener('click', onNo);
            modal.style.display = 'none';
        };

        const onYes = () => {
            cleanup();
            resolve(true);
        };

        const onNo = () => {
            cleanup();
            resolve(false);
        };

        confirmYes.addEventListener('click', onYes);
        confirmNo.addEventListener('click', onNo);
    });
}


// --- Funciones para chamigo.html (Votar Chamigo) ---

let currentChamigoMatchPlayers = []; // To store players of the selected match for voting

/**
 * Carga los partidos que NO están pendientes y NO han sido votados para Chamigo.
 */
async function cargarPartidosParaChamigo() {
    const partidosChamigoSelect = document.getElementById('seleccionarPartidoChamigo');
    const mensajeChamigoElem = document.getElementById('mensajeChamigo');

    if (!partidosChamigoSelect || !mensajeChamigoElem) {
        console.error("Error: Elementos HTML para Chamigo no encontrados. Asegúrate de que estás en la página correcta (chamigo.html) y los IDs son correctos.");
        return;
    }

    partidosChamigoSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
    mensajeChamigoElem.textContent = 'Cargando partidos disponibles para votar Chamigo...';
    mensajeChamigoElem.style.backgroundColor = '#f0f8ff';
    mensajeChamigoElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}.`);
        }
        const partidos = await response.json();

        // Filter for matches that are not PENDIENTE and have ChamigoVotado explicitly false or undefined
        const availableMatches = partidos.filter(p => p.Ganador !== 'PENDIENTE' && p.ChamigoVotado !== true);

        if (availableMatches.length === 0) {
            mensajeChamigoElem.textContent = 'No hay partidos disponibles para votar Chamigo.';
            mensajeChamigoElem.style.backgroundColor = '#fff3cd';
            mensajeChamigoElem.style.color = '#856404';
            return;
        }

        availableMatches.sort((a, b) => {
            const dateA = new Date(a.Fecha);
            const dateB = new Date(b.Fecha);
            return dateA - dateB;
        });

        availableMatches.forEach((partido, index) => {
            const option = document.createElement('option');
            // Store the full match object in value (stringified) for easy retrieval
            option.value = JSON.stringify(partido);
            const formattedDate = formatDateToDDMMYYYY(partido.Fecha);
            option.textContent = `${formattedDate} - Ganador: ${partido.Ganador}`;
            partidosChamigoSelect.appendChild(option);
        });

        mensajeChamigoElem.textContent = 'Partidos disponibles cargados exitosamente.';
        mensajeChamigoElem.style.backgroundColor = '#e2f0cb';
        mensajeChamigoElem.style.color = '#28a745';

    } catch (error) {
        console.error('Error al cargar partidos para Chamigo:', error);
        mensajeChamigoElem.textContent = `Error al cargar partidos para Chamigo: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeChamigoElem.style.backgroundColor = '#f8d7da';
        mensajeChamigoElem.style.color = '#721c24';
    }
}

/**
 * Carga los 10 jugadores del partido seleccionado en el formulario de votación Chamigo.
 */
function cargarJugadoresDelPartidoParaChamigo() {
    const partidosChamigoSelect = document.getElementById('seleccionarPartidoChamigo');
    const chamigoPlayersContainer = document.getElementById('chamigoPlayersContainer');
    const mensajeChamigoElem = document.getElementById('mensajeChamigo');

    chamigoPlayersContainer.innerHTML = ''; // Clear previous players

    const selectedMatchValue = partidosChamigoSelect.value;
    if (!selectedMatchValue) {
        mensajeChamigoElem.textContent = 'Selecciona un partido para ver los jugadores.';
        mensajeChamigoElem.style.backgroundColor = '#f0f8ff';
        mensajeChamigoElem.style.color = '#0056b3';
        return;
    }

    const selectedMatch = JSON.parse(selectedMatchValue);
    const equipoClaros = selectedMatch.EquipoClaros.split(',').map(name => name.trim());
    const equipoOscuros = selectedMatch.EquipoOscuros.split(',').map(name => name.trim());

    currentChamigoMatchPlayers = [...equipoClaros, ...equipoOscuros]; // Store for submission

    let playersHTML = '<h3>Vota por el Chamigo (0-10 puntos por jugador)</h3>';
    // Utiliza la clase chamigo-vote-items para el contenedor y player-vote-item para cada jugador
    // El estilo flexbox en style.css se encargará de la alineación
    currentChamigoMatchPlayers.forEach(player => {
        playersHTML += `
            <div class="player-vote-item">
                <label for="vote-${player}">${player}:</label>
                <input type="number" id="vote-${player}" name="vote-${player}" min="0" max="10" value="0">
            </div>
        `;
    });
    chamigoPlayersContainer.innerHTML = playersHTML;
    document.getElementById('chamigoVoteForm').style.display = 'block'; // Show the form
    mensajeChamigoElem.textContent = ''; // Clear message
}

/**
 * Envía los votos de Chamigo al Apps Script.
 */
async function submitChamigoVotes() {
    const partidosChamigoSelect = document.getElementById('seleccionarPartidoChamigo');
    const mensajeChamigoElem = document.getElementById('mensajeChamigo');

    const selectedMatchValue = partidosChamigoSelect.value;
    if (!selectedMatchValue) {
        mensajeChamigoElem.textContent = 'Por favor, selecciona un partido antes de votar.';
        mensajeChamigoElem.style.backgroundColor = '#f8d7da';
        mensajeChamigoElem.style.color = '#721c24';
        return;
    }

    const selectedMatch = JSON.parse(selectedMatchValue);
    const matchFechaISO = selectedMatch.Fecha;

    const playerVotes = [];
    let totalVotes = 0;
    let hasInvalidVote = false;
    currentChamigoMatchPlayers.forEach(player => {
        const input = document.getElementById(`vote-${player}`);
        const score = parseInt(input.value);
        if (!isNaN(score) && score >= 0 && score <= 10) {
            playerVotes.push({ playerName: player, score: score });
            totalVotes += score;
        } else {
            mensajeChamigoElem.textContent = `Error: El voto para ${player} debe ser un número entre 0 y 10.`;
            mensajeChamigoElem.style.backgroundColor = '#f8d7da';
            mensajeChamigoElem.style.color = '#721c24';
            hasInvalidVote = true;
            return; // Exit forEach
        }
    });

    if (hasInvalidVote) return; // Stop if any invalid vote was found

    if (totalVotes === 0) {
        mensajeChamigoElem.textContent = 'No se puede enviar la votación si todos los votos son 0. Por favor, asigna al menos un punto.';
        mensajeChamigoElem.style.backgroundColor = '#fff3cd';
        mensajeChamigoElem.style.color = '#856404';
        return;
    }

    const data = {
        matchFechaISO: matchFechaISO,
        playerVotes: playerVotes,
        action: 'voteChamigo' // Action for Apps Script
    };

    mensajeChamigoElem.textContent = 'Enviando votos de Chamigo...';
    mensajeChamigoElem.style.backgroundColor = '#f0f8ff';
    mensajeChamigoElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        mensajeChamigoElem.textContent = 'Voto de Chamigo registrado exitosamente. La tabla de puntos se actualizará.';
        mensajeChamigoElem.style.backgroundColor = '#e2f0cb';
        mensajeChamigoElem.style.color = '#28a745';

        // Clear form and reload available matches
        document.getElementById('chamigoVoteForm').style.display = 'none';
        partidosChamigoSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
        cargarPartidosParaChamigo(); // Reload to remove the just-voted match
        // Also reload points table if on that page, or suggest user to check
        if (window.location.pathname.includes('puntuaciones.html')) {
            mostrarTablaPuntos(); // Refresh the points table to reflect Chamigo changes
        }

    } catch (error) {
        console.error('Error al enviar votos de Chamigo:', error);
        mensajeChamigoElem.textContent = `Error al enviar votos de Chamigo: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeChamigoElem.style.backgroundColor = '#f8d7da';
        mensajeChamigoElem.style.color = '#721c24';
    }
}

// --- Funciones ABM para Jugadores en administrador.html ---

/**
 * Carga la lista de jugadores en la tabla de administración.
 */
async function cargarJugadoresAdmin() {
    const playersTableBody = document.getElementById('playersTable').querySelector('tbody');
    const mensajeElem = document.getElementById('mensajeJugadoresAdmin');

    if (!playersTableBody || !mensajeElem) {
        console.error("Error: Elementos HTML para la tabla de jugadores no encontrados.");
        return;
    }

    playersTableBody.innerHTML = ''; // Limpiar filas existentes
    mensajeElem.textContent = 'Cargando jugadores...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}.`);
        }
        allPlayersData = await response.json(); // Actualizar la variable global

        if (allPlayersData.length === 0) {
            mensajeElem.textContent = 'No hay jugadores registrados.';
            mensajeElem.style.backgroundColor = '#fff3cd';
            mensajeElem.style.color = '#856404';
            return;
        }

        allPlayersData.forEach(player => {
            const row = playersTableBody.insertRow();
            row.insertCell(0).textContent = player.Nombre;
            row.cells[0].classList.add('left-aligned-cell');
            row.insertCell(1).textContent = player.Tipo;
            row.cells[1].classList.add('centered-cell');

            const actionCell = row.insertCell(2);
            actionCell.classList.add('centered-cell');

            const selectButton = document.createElement('button');
            selectButton.textContent = 'Seleccionar';
            selectButton.style.marginRight = '5px';
            selectButton.style.backgroundColor = '#007bff'; // Azul
            selectButton.style.padding = '5px 10px';
            selectButton.style.fontSize = '0.8em';
            selectButton.style.width = 'auto';
            selectButton.onclick = () => seleccionarJugadorParaModificar(player.Nombre, player.Tipo);
            actionCell.appendChild(selectButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Eliminar';
            deleteButton.style.backgroundColor = '#dc3545'; // Rojo
            deleteButton.style.padding = '5px 10px';
            deleteButton.style.fontSize = '0.8em';
            deleteButton.style.width = 'auto';
            deleteButton.onclick = () => eliminarJugador(player.Nombre);
            actionCell.appendChild(deleteButton);
        });

        mensajeElem.textContent = 'Jugadores cargados exitosamente.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';

    } catch (error) {
        console.error('Error al cargar jugadores para administración:', error);
        mensajeElem.textContent = `Error al cargar jugadores: ${error.message}.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Selecciona un jugador de la tabla para cargar sus datos en el formulario de modificación.
 * @param {string} playerName - Nombre del jugador.
 * @param {string} playerType - Tipo del jugador ('Titular' o 'Suplente').
 */
function seleccionarJugadorParaModificar(playerName, playerType) {
    document.getElementById('playerNameInput').value = playerName;
    selectedPlayerForModification = playerName; // Almacenar el nombre original para la modificación

    const playerTypeRadios = document.querySelectorAll('input[name="playerType"]');
    playerTypeRadios.forEach(radio => {
        if (radio.value === playerType) {
            radio.checked = true;
        } else {
            radio.checked = false;
        }
    });
    document.getElementById('mensajeJugadoresAdmin').textContent = `Jugador "${playerName}" seleccionado para modificar.`;
    document.getElementById('mensajeJugadoresAdmin').style.backgroundColor = '#e2f0cb';
    document.getElementById('mensajeJugadoresAdmin').style.color = '#28a745';
}

/**
 * Limpia el formulario de agregar/modificar jugador.
 */
function clearPlayerForm() {
    document.getElementById('playerNameInput').value = '';
    selectedPlayerForModification = null;
    document.querySelectorAll('input[name="playerType"]').forEach(radio => radio.checked = false);
    document.getElementById('mensajeJugadoresAdmin').textContent = 'Formulario de jugador limpio.';
    document.getElementById('mensajeJugadoresAdmin').style.backgroundColor = '#f0f8ff';
    document.getElementById('mensajeJugadoresAdmin').style.color = '#0056b3';
}

/**
 * Agrega un nuevo jugador a la hoja "Jugadores".
 */
async function addPlayer() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const playerType = document.querySelector('input[name="playerType"]:checked')?.value;
    const mensajeElem = document.getElementById('mensajeJugadoresAdmin');

    if (!playerName) {
        mensajeElem.textContent = 'Por favor, ingresa el nombre del jugador.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }
    if (!playerType) {
        mensajeElem.textContent = 'Por favor, selecciona el tipo de jugador (Titular o Suplente).';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    // Check for duplicate player name
    if (allPlayersData.some(p => p.Nombre.toLowerCase() === playerName.toLowerCase())) {
        mensajeElem.textContent = `Error: Ya existe un jugador con el nombre "${playerName}".`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    mensajeElem.textContent = 'Agregando jugador...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    const data = {
        playerName: playerName,
        playerType: playerType,
        action: 'addPlayer'
    };

    try {
        const response = await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        mensajeElem.textContent = `Jugador "${playerName}" agregado exitosamente.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
        clearPlayerForm();
        cargarJugadoresAdmin(); // Recargar la tabla de jugadores
        cargarJugadores(); // Recargar en index.html si es necesario
    } catch (error) {
        console.error('Error al agregar jugador:', error);
        mensajeElem.textContent = `Error al agregar jugador: ${error.message}.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Modifica un jugador existente en la hoja "Jugadores".
 */
async function modifyPlayer() {
    const newPlayerName = document.getElementById('playerNameInput').value.trim();
    const newPlayerType = document.querySelector('input[name="playerType"]:checked')?.value;
    const mensajeElem = document.getElementById('mensajeJugadoresAdmin');

    if (!selectedPlayerForModification) {
        mensajeElem.textContent = 'Por favor, selecciona un jugador de la lista para modificar.';
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
        return;
    }
    if (!newPlayerName) {
        mensajeElem.textContent = 'Por favor, ingresa el nuevo nombre del jugador.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }
    if (!newPlayerType) {
        mensajeElem.textContent = 'Por favor, selecciona el nuevo tipo de jugador (Titular o Suplente).';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    // Check for duplicate new player name, excluding the player being modified
    if (allPlayersData.some(p => p.Nombre.toLowerCase() === newPlayerName.toLowerCase() && p.Nombre !== selectedPlayerForModification)) {
        mensajeElem.textContent = `Error: Ya existe otro jugador con el nombre "${newPlayerName}".`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensaje.style.color = '#721c24';
        return;
    }

    mensajeElem.textContent = 'Modificando jugador...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    const data = {
        originalPlayerName: selectedPlayerForModification,
        newPlayerName: newPlayerName,
        newPlayerType: newPlayerType,
        action: 'updatePlayer'
    };

    try {
        const response = await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        mensajeElem.textContent = `Jugador "${selectedPlayerForModification}" modificado a "${newPlayerName}" exitosamente.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
        clearPlayerForm();
        cargarJugadoresAdmin(); // Recargar la tabla de jugadores
        cargarJugadores(); // Recargar en index.html si es necesario
    } catch (error) {
        console.error('Error al modificar jugador:', error);
        mensajeElem.textContent = `Error al modificar jugador: ${error.message}.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Elimina un jugador de la hoja "Jugadores".
 * @param {string} playerName - Nombre del jugador a eliminar.
 */
async function eliminarJugador(playerName) {
    const mensajeElem = document.getElementById('mensajeJugadoresAdmin');

    const confirmDelete = await showCustomConfirm(`¿Estás seguro de que quieres eliminar al jugador "${playerName}"? Esta acción es irreversible.`);

    if (!confirmDelete) {
        mensajeElem.textContent = 'Eliminación de jugador cancelada.';
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
        return;
    }

    mensajeElem.textContent = `Eliminando jugador "${playerName}"...`;
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    const data = {
        playerName: playerName,
        action: 'deletePlayer'
    };

    try {
        const response = await fetch(`${SCRIPT_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        mensajeElem.textContent = `Jugador "${playerName}" eliminado exitosamente.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
        clearPlayerForm();
        cargarJugadoresAdmin(); // Recargar la tabla de jugadores
        cargarJugadores(); // Recargar en index.html si es necesario
    } catch (error) {
        console.error('Error al eliminar jugador:', error);
        mensajeElem.textContent = `Error al eliminar jugador: ${error.message}.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}


// Lógica de inicialización para cada página
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar la versión del HTML
    const htmlElement = document.documentElement;
    const htmlVersion = htmlElement.getAttribute('data-version');
    const htmlVersionDiv = document.getElementById('htmlVersion');
    if (htmlVersionDiv && htmlVersion) {
        htmlVersionDiv.textContent = `HTML: v${htmlVersion}`;
    }

    // Mostrar la versión del script
    const scriptVersionDiv = document.getElementById('scriptVersion');
    if (scriptVersionDiv) {
        scriptVersionDiv.textContent = `Script: ${SCRIPT_VERSION}`;
    }

    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/futbol-martes/') {
        cargarJugadores();
        const fechaInput = document.getElementById('fechaPartido');
        if (fechaInput) {
            fechaInput.valueAsDate = new Date();
        }
    } else if (window.location.pathname.includes('resultados.html')) {
        cargarPartidosPendientes();
    } else if (window.location.pathname.includes('puntuaciones.html')) {
        loadFilterYears().then(() => { // Ensure years are loaded before setting selection
            const filterYearSelect = document.getElementById('filterYear');
            const filterPeriodRadios = document.querySelectorAll('input[name="filterPeriod"]');
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth(); // 0-11

            let defaultPeriod = 'Total'; // Default to total if no specific period is required initially
            if (currentMonth >= 0 && currentMonth <= 5) {
                defaultPeriod = 'Apertura';
            } else if (currentMonth >= 6 && currentMonth <= 11) {
                defaultPeriod = 'Clausura';
            }

            // Set the year
            if (filterYearSelect) {
                // Check if the current year is available in the options
                const yearOptionExists = Array.from(filterYearSelect.options).some(option => parseInt(option.value) === currentYear);
                if (yearOptionExists) {
                    filterYearSelect.value = currentYear;
                } else {
                    // If current year is not in options, default to 'Selecciona un Año'
                    filterYearSelect.value = '';
                }
            }

            // Set the period
            filterPeriodRadios.forEach(radio => {
                if (radio.value === defaultPeriod) {
                    radio.checked = true;
                } else {
                    radio.checked = false; // Ensure others are unchecked
                }
            });

            // Apply filters with the automatically selected values
            applyFilters();
        });
    } else if (window.location.pathname.includes('administrador.html')) {
        cargarTodosLosPartidos(); // Carga los partidos para la sección de administración de partidos
        cargarJugadoresAdmin(); // Carga los jugadores para la nueva sección de administración de jugadores
    } else if (window.location.pathname.includes('chamigo.html')) { // New condition for Chamigo page
        cargarPartidosParaChamigo();
    }
});
