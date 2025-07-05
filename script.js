// https://script.google.com/macros/s/AKfycbxHgezrkEPvQYPGIlV2rcMne9d4px1ZfJ_60rVR4CsGunuyKFazNypVmGtYVYZwsuF6/exec

// Define la URL de tu Google Apps Script aquí.
// ¡Esta URL es la que me proporcionaste y es crucial para la comunicación!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHgezrkEPvQYPGIlV2rcMne9d4px1ZfJ_60rVR4CsGunuyKFazNypVmGtYVYZwsuF6/exec'; // ¡URL ACTUALIZADA!

// Función auxiliar para formatear la fecha de string ISO a DD/MM/AAAA
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Obtiene día, mes, año. Rellena con ceros a la izquierda, si es necesario.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // El mes es indexado en 0
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
    return dateString; // Si ya está en YYYY-MM-DD o es otro formato, lo devuelve tal cual
}


// Variable global para almacenar partidos pendientes para fácil acceso
let currentPendingMatches = [];
// Variable global para almacenar TODOS los partidos para la página de administración
let allMatches = [];

// --- Funciones para index.html (Crear Partido) ---

/**
 * Carga la lista de jugadores de la hoja "Jugadores" del Google Sheets,
 * los clasifica como Titulares o Suplentes y los muestra en sus respectivas listas.
 */
async function cargarJugadores() {
    // Obtiene referencias a todos los elementos <select> y al elemento de mensaje
    const jugadoresTitularesSelect = document.getElementById('jugadoresTitulares');
    const jugadoresSuplentesSelect = document.getElementById('jugadoresSuplentes');
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    // **VERIFICACIÓN CRÍTICA: Asegura que todos los elementos HTML existan antes de usarlos.**
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
                // Guarda el tipo original y lo recorta para evitar espacios extras
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
        // Aseguramos que el ID de destino sea plural.
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
        // Este mensaje solo se muestra si no se movió NINGÚN jugador y no hubo un error específico de "lista no encontrada"
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
        // **VALIDACIÓN:** No se pueden agregar 2 partidos con la misma fecha
        const existingMatchesResponse = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!existingMatchesResponse.ok) {
            throw new Error(`Error HTTP al verificar partidos existentes: ${existingMatchesResponse.status} ${existingMatchesResponse.statusText || ''}.`);
        }
        const existingMatches = await existingMatchesResponse.json();

        const isDuplicateDate = existingMatches.some(match => {
            // Extrae solo la parte de la fecha (YYYY-MM-DD) de la string ISO del Apps Script
            const matchDateOnly = match.Fecha.split('T')[0];
            return matchDateOnly === fecha; // Compara solo la parte de la fecha
        });

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
 * Carga los partidos marcados como 'PENDIENTE' de la hoja "Partidos"
 * y los muestra en el select para registrar resultados.
 */
async function cargarPartidosPendientes() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    // Verifica si el elemento existe antes de intentar manipularlo
    if (!partidosSelect) {
        console.error("Elemento 'seleccionarPartido' no encontrado. Asegúrate de que estás en la página correcta (resultados.html) y el ID es correcto.");
        return; // Sale de la función si el elemento no existe
    }

    // Limpia las opciones existentes y añade una opción por defecto
    partidosSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
    const mensajeElem = document.getElementById('mensajeResultados');

    // Verifica si el elemento existe antes de intentar manipularlo
    if (!mensajeElem) {
        console.error("Elemento 'mensajeResultados' no encontrado.");
        return; // Sale de la función si el elemento no existe
    }

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
        currentPendingMatches = partidos.filter(p => p.Ganador === 'PENDIENTE'); // Almacena partidos pendientes globalmente

        if (currentPendingMatches.length === 0) {
            mensajeElem.textContent = 'No hay partidos pendientes de registrar resultados.';
            mensajeElem.style.backgroundColor = '#e6e6e6';
            mensajeElem.style.color = '#333';
            return;
        }

        // Añade cada partido pendiente como una opción en el select
        currentPendingMatches.forEach(partido => {
            const option = document.createElement('option');
            // Almacena la fecha ISO completa en el valor para poder recuperarla después
            option.value = partido.Fecha;
            // Formatea la fecha para mostrarla en el menú desplegable
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

    const selectedDateValue = partidosSelect.value; // Este valor es la fecha ISO completa

    if (!selectedDateValue) {
        equipoClarosDetalle.value = '';
        equipoOscurosDetalle.value = '';
        mensajeElem.textContent = 'Selecciona una fecha de partido para ver los detalles.';
        mensajeElem.style.backgroundColor = '#f0f8ff';
        mensajeElem.style.color = '#0056b3';
        return;
    }

    // Busca el partido usando el valor completo (fecha ISO)
    const selectedMatch = currentPendingMatches.find(match => match.Fecha === selectedDateValue);

    if (selectedMatch) {
        equipoClarosDetalle.value = selectedMatch.EquipoClaros.split(',').join('\n');
        equipoOscurosDetalle.value = selectedMatch.EquipoOscuros.split(',').join('\n');
        mensajeElem.textContent = ''; // Limpia el mensaje al cargar con éxito
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
    const fechaPartido = partidosSelect.value; // Este valor es la fecha ISO completa
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

    // Encuentra el partido seleccionado de las partidas pendientes almacenadas globalmente
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
            const jugador = jugadoresActuales.find(j => j.Nombre.trim() === nombre.trim()); // .trim() para evitar espacios extras
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
        // Limpiar los detalles del equipo después del registro
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

// --- Funciones para administrador.html ---

/**
 * Carga todos los partidos de la hoja "Partidos" y los muestra en el select de administración.
 */
async function cargarTodosLosPartidos() {
    const partidosAdminSelect = document.getElementById('seleccionarPartidoAdmin');
    const mensajeAdminElem = document.getElementById('mensajeAdmin');
    const adminForm = document.getElementById('adminForm');

    // **CORRECCIÓN AQUÍ:** Verifica si los elementos existen antes de intentar manipularlos
    if (!partidosAdminSelect || !mensajeAdminElem || !adminForm) {
        console.error("Error: Elementos HTML para la administración de partidos no encontrados. Asegúrate de que estás en la página correcta (administrador.html) y los IDs son correctos.");
        return;
    }

    partidosAdminSelect.innerHTML = '<option value="">Selecciona un partido...</option>';
    adminForm.style.display = 'none'; // Oculta el formulario de edición por defecto
    mensajeAdminElem.textContent = 'Cargando todos los partidos...';
    mensajeAdminElem.style.backgroundColor = '#f0f8ff';
    mensajeAdminElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        console.log('[cargarTodosLosPartidos] Respuesta del fetch:', response); // Debug: ver la respuesta cruda
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}.`);
        }
        allMatches = await response.json(); // Almacena todos los partidos globalmente
        console.log('[cargarTodosLosPartidos] Datos recibidos (allMatches):', allMatches); // Debug: ver los datos parseados

        if (allMatches.length === 0) {
            mensajeAdminElem.textContent = 'No hay partidos registrados para administrar.';
            mensajeAdminElem.style.backgroundColor = '#fff3cd';
            mensajeAdminElem.style.color = '#856404';
            return;
        }

        allMatches.forEach((partido, index) => {
            console.log('[cargarTodosLosPartidos] Procesando partido:', partido); // Debug: ver cada objeto partido
            const option = document.createElement('option');
            option.value = index; // Usamos el índice como valor para acceder fácilmente al objeto en allMatches
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
        document.getElementById('fechaPartidoAdmin').value = selectedMatch.Fecha.split('T')[0]; // Solo la parte de la fecha
        document.getElementById('equipoClarosAdmin').value = selectedMatch.EquipoClaros.split(',').join('\n');
        document.getElementById('equipoOscurosAdmin').value = selectedMatch.EquipoOscuros.split(',').join('\n');

        // Seleccionar el radio button del ganador
        const ganadorRadios = document.querySelectorAll('input[name="ganadorAdmin"]');
        ganadorRadios.forEach(radio => {
            if (radio.value === selectedMatch.Ganador) {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });

        adminForm.style.display = 'block'; // Muestra el formulario
        mensajeAdminElem.textContent = ''; // Limpia el mensaje
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

    // Validación de fecha duplicada (excluyendo el propio partido que se está editando)
    const isDuplicateDate = allMatches.some((match, idx) => {
        if (idx === parseInt(selectedIndex)) return false; // Ignorar el partido actual
        return match.Fecha.split('T')[0] === nuevaFecha;
    });

    if (isDuplicateDate) {
        mensajeAdminElem.textContent = 'Ya existe otro partido programado para esta fecha. Por favor, elige otra fecha.';
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeAdminElem.style.color = '#721c24';
        return;
    }

    // Prepara los datos para la actualización
    // Necesitamos la fecha original para identificar la fila en el Apps Script
    const data = {
        originalFecha: originalMatch.Fecha, // Usamos la fecha original como identificador único
        nuevaFecha: nuevaFecha,
        equipoClaros: nuevosClaros,
        equipoOscuros: nuevosOscuros,
        ganador: nuevoGanador,
        action: 'updateMatch' // Acción específica para el Apps Script
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
        // Como es no-cors, asumimos éxito. La verdadera confirmación vendría de una respuesta CORS.
        // Por ahora, recargamos la lista para reflejar los cambios.

        mensajeAdminElem.textContent = 'Partido actualizado exitosamente.';
        mensajeAdminElem.style.backgroundColor = '#e2f0cb';
        mensajeAdminElem.style.color = '#28a745';
        cargarTodosLosPartidos(); // Recarga la lista para ver los cambios
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

    // Confirmación antes de eliminar
    if (!confirm(`¿Estás seguro de que quieres eliminar el partido del ${formatDateToDDMMYYYY(matchToDelete.Fecha)}? Esta acción es irreversible.`)) {
        mensajeAdminElem.textContent = 'Eliminación cancelada.';
        mensajeAdminElem.style.backgroundColor = '#fff3cd';
        mensajeAdminElem.style.color = '#856404';
        return;
    }

    const data = {
        fecha: matchToDelete.Fecha, // Usamos la fecha original como identificador
        action: 'deleteMatch' // Acción específica para el Apps Script
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
        // Como es no-cors, asumimos éxito.

        mensajeAdminElem.textContent = 'Partido eliminado exitosamente.';
        mensajeAdminElem.style.backgroundColor = '#e2f0cb';
        mensajeAdminElem.style.color = '#28a745';

        adminForm.style.display = 'none'; // Oculta el formulario después de eliminar
        cargarTodosLosPartidos(); // Recarga la lista para reflejar la eliminación
    } catch (error) {
        console.error('Error al eliminar partido:', error);
        mensajeAdminElem.textContent = `Error al eliminar partido: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeAdminElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}


// Lógica de inicialización para cada página
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
    } else if (window.location.pathname.includes('puntuaciones.html')) {
        mostrarTablaPuntos();
    } else if (window.location.pathname.includes('administrador.html')) { // Nueva condición para la página de administración
        cargarTodosLosPartidos();
    }
});
