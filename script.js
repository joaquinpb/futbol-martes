// URL Válido: https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec

// Define la URL de tu Google Apps Script aquí.
// ¡Esta URL es la que me proporcionaste y es crucial para la comunicación!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec'; // ¡URL ACTUALIZADA!

// Helper function to format date from ISO string to DD/MM/YYYY
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Get day, month, year. Pad with leading zeros if necessary.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Global variable to store pending matches for easy access
let currentPendingMatches = [];

// --- Funciones para index.html (Crear Partido) ---

/**
 * Carga la lista de jugadores desde la hoja "Jugadores" de Google Sheets,
 * los clasifica como Titulares o Suplentes y los muestra en sus respectivas listas.
 */
async function cargarJugadores() {
    // Obtiene referencias a todos los elementos <select> y al elemento de mensaje
    const jugadoresTitularesSelect = document.getElementById('jugadoresTitulares');
    const jugadoresSuplentesSelect = document.getElementById('jugadoresSuplentes');
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    // **VERIFICACIÓN CRÍTICA: Asegura que todos los elementos HTML existen antes de usarlos.**
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

    // Limpia las opciones existentes en todos los selects
    jugadoresTitularesSelect.innerHTML = '';
    jugadoresSuplentesSelect.innerHTML = '';
    equipoClarosSelect.innerHTML = '';
    equipoOscurosSelect.innerHTML = '';

    // Mensaje de depuración inicial
    mensajeElem.textContent = 'Intentando cargar jugadores (Titulares/Suplentes)...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const jugadores = await response.json();

        if (jugadores.length === 0) {
            mensajeElem.textContent = 'No se encontraron jugadores en la hoja "Jugadores". Asegúrate de que la hoja no está vacía y los encabezados son correctos (Nombre, Puntos, Tipo).';
            mensajeElem.style.backgroundColor = '#fff3cd';
            mensajeElem.style.color = '#856404';
            return;
        }

        jugadores.forEach(jugador => {
            if (jugador.Nombre && jugador.Tipo) {
                const option = document.createElement('option');
                option.value = jugador.Nombre;
                option.textContent = jugador.Nombre; // Mostrar solo el nombre
                // Guarda el tipo original y lo recorta para evitar espacios extra
                option.dataset.originalType = jugador.Tipo.toLowerCase().trim();
                option.dataset.puntos = jugador.Puntos; // Guarda los puntos para referencia

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
        mensajeElem.textContent = `Error al cargar jugadores: ${error.message}. Por favor, verifica: 1) Tu conexión a internet. 2) Que la URL del Apps Script en script.js sea EXACTA. 3) Que el Apps Script esté desplegado como "Aplicación web" con acceso "Cualquier persona". 4) Los nombres de las hojas ("Jugadores", "Partidos") y columnas ("Nombre", "Puntos", "Tipo", etc.) en Google Sheets.`;
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
        if (teamSelect.options.length < 5) { // Límite de 5 jugadores por equipo
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
        // Obtiene el tipo original (titular/suplente) del atributo data-originalType
        const originalType = option.dataset.originalType;
        console.log(`[moveFromTeam] Moviendo jugador: ${option.textContent}, Tipo Original (dataset): '${originalType}'`);

        // Valida que el tipo original sea 'titular' o 'suplente'
        if (!originalType || (originalType !== 'titular' && originalType !== 'suplente')) {
            console.error(`[moveFromTeam] Error: Tipo original inesperado para el jugador ${option.textContent}: '${originalType}'. No se pudo mover de vuelta.`);
            mensajeElem.textContent = `Error: Tipo de jugador desconocido al intentar mover de vuelta a ${option.textContent}.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return; // Salta esta opción si el tipo es inválido
        }

        let destinationSelectId;
        // **CORRECCIÓN AQUÍ:** Aseguramos que el ID de destino sea plural.
        if (originalType === 'titular') {
            destinationSelectId = 'jugadoresTitulares'; // Correcto: plural
        } else if (originalType === 'suplente') {
            destinationSelectId = 'jugadoresSuplentes'; // Correcto: plural
        } else {
            // Esto no debería ocurrir si la validación anterior es correcta, pero es un fallback
            console.error(`[moveFromTeam] Fallback: Tipo original no reconocido para destino: '${originalType}'`);
            mensajeElem.textContent = `Error interno al determinar lista de destino para ${option.textContent}.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return;
        }

        const destinationSelect = document.getElementById(destinationSelectId);

        if (destinationSelect) {
            destinationSelect.appendChild(option);
            movedCount++;
        } else {
            console.error(`[moveFromTeam] Error: Lista de destino '${destinationSelectId}' no encontrada para el jugador ${option.textContent}. Tipo Original era: ${originalType}`);
            mensajeElem.textContent = `Error: No se pudo mover a ${option.textContent}. Lista de destino no encontrada.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
    });

    if (movedCount > 0) {
        mensajeElem.textContent = `Se movieron ${movedCount} jugador(es) de vuelta desde el equipo ${teamType}.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } else {
        // Este mensaje solo se muestra si no se movió NINGÚN jugador y no hubo un error específico de "lista no encontrada"
        mensajeElem.textContent = `No se pudo mover ningún jugador de vuelta.`;
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}

// La función togglePlayerRole ha sido eliminada ya que los botones asociados fueron removidos.

/**
 * Guarda los detalles del partido (fecha, jugadores de cada equipo)
 * en la hoja "Partidos" de Google Sheets.
 */
async function guardarPartido() {
    const fecha = document.getElementById('fechaPartido').value;
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    // Validaciones básicas antes de guardar
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
        // **NUEVA VALIDACIÓN:** No se pueden agregar 2 partidos con la misma fecha
        const existingMatchesResponse = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!existingMatchesResponse.ok) {
            throw new Error(`Error HTTP al verificar partidos existentes: ${existingMatchesResponse.status} ${existingMatchesResponse.statusText || ''}.`);
        }
        const existingMatches = await existingMatchesResponse.json();

        const isDuplicateDate = existingMatches.some(match => match.Fecha === fecha);

        if (isDuplicateDate) {
            mensajeElem.textContent = 'Ya existe un partido programado para esta fecha. Por favor, elige otra fecha.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return; // Detiene la ejecución si la fecha es duplicada
        }

        // Convierte las listas de jugadores de cada equipo en cadenas separadas por comas
        const equipoClaros = Array.from(equipoClarosSelect.options).map(opt => opt.value).join(',');
        const equipoOscuros = Array.from(equipoOscurosSelect.options).map(opt => opt.value).join(',');

        // Prepara los datos a enviar a Google Apps Script
        const data = {
            fecha: fecha,
            equipoClaros: equipoClaros,
            equipoOscuros: equipoOscuros,
            ganador: 'PENDIENTE' // Marca el partido como pendiente de resultado
        };

        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`, {
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

        // Limpiar los equipos y recargar la lista de jugadores Titulares/Suplentes
        equipoClarosSelect.innerHTML = '';
        equipoOscurosSelect.innerHTML = '';
        cargarJugadores(); // Recarga la lista de jugadores con sus roles fijos
        document.getElementById('fechaPartido').valueAsDate = new Date(); // Restablece la fecha actual
    } catch (error) {
        console.error('Error al guardar partido:', error);
        mensajeElem.textContent = `Error al guardar el partido: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}


// --- Funciones para resultados.html (Registrar Resultados) ---

/**
 * Carga los partidos marcados como 'PENDIENTE' desde la hoja "Partidos"
 * y los muestra en el select para registrar resultados.
 */
async function cargarPartidosPendientes() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    // Limpia las opciones existentes y añade una opción por defecto
    partidosSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
    const mensajeElem = document.getElementById('mensajeResultados');

    // Mensaje de depuración inicial
    mensajeElem.textContent = 'Intentando cargar partidos pendientes...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const partidos = await response.json();
        currentPendingMatches = partidos.filter(p => p.Ganador === 'PENDIENTE'); // Store pending matches globally

        if (currentPendingMatches.length === 0) {
            mensajeElem.textContent = 'No hay partidos pendientes de registrar resultados.';
            mensajeElem.style.backgroundColor = '#e6e6e6';
            mensajeElem.style.color = '#333';
            return;
        }

        // Add each pending match as an option in the select
        currentPendingMatches.forEach(partido => {
            const option = document.createElement('option');
            option.value = partido.Fecha; // Use the date as a unique identifier for the match
            // NEW FORMAT: DD/MM/AAAA
            const formattedDate = formatDateToDDMMYYYY(partido.Fecha);
            option.textContent = formattedDate;
            partidosSelect.appendChild(option);
        });
        mensajeElem.textContent = 'Partidos pendientes cargados exitosamente.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } catch (error) {
        console.error('Error al cargar partidos:', error);
        mensajeElem.textContent = `Error al cargar partidos pendientes: ${error.message}. Por favor, verifica: 1) Tu conexión a internet. 2) Que la URL del Apps Script en script.js sea EXACTA. 3) Que el Apps Script esté desplegado como "Aplicación web" con acceso "Cualquier persona". 4) Los nombres de las hojas ("Jugadores", "Partidos") y columnas ("Nombre", "Puntos", "Tipo", etc.) en Google Sheets.`;
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

    const selectedDate = partidosSelect.value;

    if (!selectedDate) {
        equipoClarosDetalle.value = '';
        equipoOscurosDetalle.value = '';
        mensajeElem.textContent = 'Selecciona una fecha de partido para ver los detalles.';
        mensajeElem.style.backgroundColor = '#f0f8ff';
        mensajeElem.style.color = '#0056b3';
        return;
    }

    const selectedMatch = currentPendingMatches.find(match => match.Fecha === selectedDate);

    if (selectedMatch) {
        equipoClarosDetalle.value = selectedMatch.EquipoClaros.split(',').join('\n');
        equipoOscurosDetalle.value = selectedMatch.EquipoOscuros.split(',').join('\n');
        mensajeElem.textContent = ''; // Clear message on successful load
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
 * de los jugadores en la hoja "Jugadores".
 */
async function registrarResultado() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    const fechaPartido = partidosSelect.value;
    const mensajeElem = document.getElementById('mensajeResultados');

    // Validaciones
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
    const ganador = ganadorRadio.value; // 'Claros', 'Oscuros', o 'Empate'

    // Find the selected match from the globally stored pending matches
    const selectedMatch = currentPendingMatches.find(match => match.Fecha === fechaPartido);

    if (!selectedMatch) {
        mensajeElem.textContent = 'Error: No se encontraron los detalles del partido seleccionado. Por favor, recarga la página.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    const jugadoresClaros = selectedMatch.EquipoClaros.split(',');
    const jugadoresOscuros = selectedMatch.EquipoOscuros.split(',');

    try {
        // 1. Obtener los puntos actuales de todos los jugadores
        const responseJugadores = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);
        const jugadoresActuales = await responseJugadores.json();

        // Función auxiliar para obtener los puntos actuales de un jugador por su nombre
        const obtenerPuntosActuales = (nombre) => {
            const jugador = jugadoresActuales.find(j => j.Nombre.trim() === nombre.trim()); // .trim() para evitar espacios extra
            return jugador ? parseInt(jugador.Puntos) : 0; // Si no se encuentra, asume 0 puntos
        };

        let jugadoresAActualizar = []; // Array para almacenar los jugadores con sus nuevos puntos

        // 2. Calcular los nuevos puntos según el resultado del partido
        if (ganador === 'Claros') {
            jugadoresClaros.forEach(nombre => {
                jugadoresAActualizar.push({ nombre: nombre.trim(), puntos: obtenerPuntosActuales(nombre) + 3 });
            });
            jugadoresOscuros.forEach(nombre => {
                jugadoresAActualizar.push({ nombre: nombre.trim(), puntos: obtenerPuntosActuales(nombre) + 0 });
            });
        } else if (ganador === 'Oscuros') {
            jugadoresOscuros.forEach(nombre => {
                jugadoresAActualizar.push({ nombre: nombre.trim(), puntos: obtenerPuntosActuales(nombre) + 3 });
            });
            jugadoresClaros.forEach(nombre => {
                jugadoresAActualizar.push({ nombre: nombre.trim(), puntos: obtenerPuntosActuales(nombre) + 0 });
            });
        } else { // Empate
            jugadoresClaros.forEach(nombre => {
                jugadoresAActualizar.push({ nombre: nombre.trim(), puntos: obtenerPuntosActuales(nombre) + 1 });
            });
            jugadoresOscuros.forEach(nombre => {
                jugadoresAActualizar.push({ nombre: nombre.trim(), puntos: obtenerPuntosActuales(nombre) + 1 });
            });
        }

        // 3. Enviar los datos de los jugadores actualizados a la hoja "Jugadores"
        const responsePuntos = await fetch(`${SCRIPT_URL}?sheet=Jugadores`, {
            method: 'POST',
            mode: 'no-cors', // Necesario para Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jugadores: jugadoresAActualizar }), // Envía el array de jugadores a actualizar
        });
        // Asumimos éxito por no-cors.

        // NOTA IMPORTANTE: La función doPost actual de tu Google Apps Script
        // no tiene la capacidad de buscar una fila específica en la hoja "Partidos"
        // (por ejemplo, por fecha) y actualizar su columna "Ganador".
        // Solo puede añadir nuevas filas o actualizar jugadores por nombre.
        // Por lo tanto, después de registrar el resultado y actualizar los puntos,
        // DEBERÁS IR MANUALMENTE A TU GOOGLE SHEET "Futbol5_Datos"
        // y cambiar el valor de 'PENDIENTE' a 'Claros', 'Oscuros' o 'Empate'
        // en la fila del partido correspondiente.
        // Si esto es un problema, se puede expandir el Apps Script para manejarlo.

        mensajeElem.textContent = 'Resultado registrado y puntos de jugadores actualizados. Por favor, actualiza manualmente el ganador en tu hoja de Google Sheets para este partido.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';

        // Recargar la lista de partidos pendientes para que el partido recién registrado
        // (que ahora debería estar marcado manualmente como no pendiente) desaparezca.
        cargarPartidosPendientes();
        // Clear team details after registration
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
 */
async function mostrarTablaPuntos() {
    const puntosTablaContainer = document.getElementById('puntosTablaContainer');
    const mensajePuntosElem = document.getElementById('mensajePuntos');

    if (!puntosTablaContainer || !mensajePuntosElem) {
        console.error('Error: Elementos HTML para la tabla de puntos no encontrados.');
        return;
    }

    mensajePuntosElem.textContent = 'Cargando tabla de puntos...';
    mensajePuntosElem.style.backgroundColor = '#f0f8ff';
    mensajePuntosElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const jugadores = await response.json();

        if (jugadores.length === 0) {
            mensajePuntosElem.textContent = 'No hay jugadores registrados para mostrar la tabla de puntos.';
            mensajePuntosElem.style.backgroundColor = '#fff3cd';
            mensajePuntosElem.style.color = '#856404';
            return;
        }

        // Filtra jugadores que tienen un nombre y puntos válidos, y los convierte a un formato numérico seguro
        const jugadoresValidos = jugadores.filter(j => j.Nombre && !isNaN(parseInt(j.Puntos)))
                                        .map(j => ({
                                            Nombre: j.Nombre,
                                            Puntos: parseInt(j.Puntos) // Asegura que Puntos sea un número
                                        }));

        // Ordena los jugadores por puntos de mayor a menor
        jugadoresValidos.sort((a, b) => b.Puntos - a.Puntos);

        // Crea la tabla HTML dinámicamente
        let tablaHTML = `
            <table class="puntos-table">
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>Jugador</th>
                        <th>Puntos</th>
                    </tr>
                </thead>
                <tbody>
        `;

        jugadoresValidos.forEach((jugador, index) => {
            tablaHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${jugador.Nombre}</td>
                    <td>${jugador.Puntos}</td>
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
        mensajePuntosElem.style.color = '#28a745';

    } catch (error) {
        console.error('Error al cargar la tabla de puntos:', error);
        mensajePuntosElem.textContent = `Error al cargar la tabla de puntos: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajePuntosElem.style.backgroundColor = '#f8d7da';
        mensajePuntosElem.style.color = '#721c24';
    }
}


// Lógica de inicialización para ambas páginas
document.addEventListener('DOMContentLoaded', () => {
    // Determina qué página se está cargando para ejecutar la función de inicialización correcta
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/futbol-martes/') {
        cargarJugadores();
        // Establece la fecha actual por defecto en el campo de fecha
        const fechaInput = document.getElementById('fechaPartido');
        if (fechaInput) {
            fechaInput.valueAsDate = new Date();
        }
    } else if (window.location.pathname.includes('resultados.html')) {
        cargarPartidosPendientes();
    } else if (window.location.pathname.includes('puntuaciones.html')) { // Nueva condición para la página de puntuaciones
        mostrarTablaPuntos();
    }
});
