// URL Válido: https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec

// Define la URL de tu Google Apps Script aquí.
// ¡Esta URL es la que me proporcionaste y es crucial para la comunicación!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec';

// --- Funciones para index.html (Crear Partido) ---

/**
 * Carga la lista de jugadores desde la hoja "Jugadores" de Google Sheets,
 * los clasifica como Titulares o Suplentes y los muestra en sus respectivas listas.
 */
async function cargarJugadores() {
    const jugadoresTitularesSelect = document.getElementById('jugadoresTitulares');
    const jugadoresSuplentesSelect = document.getElementById('jugadoresSuplentes');
    // Limpia las opciones existentes en todos los selects
    jugadoresTitularesSelect.innerHTML = '';
    jugadoresSuplentesSelect.innerHTML = '';
    document.getElementById('equipoClaros').innerHTML = '';
    document.getElementById('equipoOscuros').innerHTML = '';
    const mensajeElem = document.getElementById('mensaje');

    // Mensaje de depuración inicial
    mensajeElem.textContent = 'Intentando cargar jugadores (Titulares/Suplentes)...';
    mensajeElem.style.backgroundColor = '#f0f8ff'; // Azul claro para información
    mensajeElem.style.color = '#0056b3';

    try {
        // Realiza una petición GET a tu Apps Script para obtener los datos de la hoja "Jugadores"
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const jugadores = await response.json(); // Parsea la respuesta JSON

        if (jugadores.length === 0) {
            mensajeElem.textContent = 'No se encontraron jugadores en la hoja "Jugadores". Asegúrate de que la hoja no está vacía y los encabezados son correctos (Nombre, Puntos, Tipo).';
            mensajeElem.style.backgroundColor = '#fff3cd'; // Amarillo claro para advertencia
            mensajeElem.style.color = '#856404';
            return;
        }

        // Itera sobre cada jugador obtenido y lo clasifica por su "Tipo"
        jugadores.forEach(jugador => {
            if (jugador.Nombre && jugador.Tipo) { // Asegúrate de que tenga Nombre y Tipo
                const option = document.createElement('option');
                option.value = jugador.Nombre;
                option.textContent = `${jugador.Nombre} (Puntos: ${jugador.Puntos})`;

                if (jugador.Tipo.toLowerCase() === 'titular') {
                    jugadoresTitularesSelect.appendChild(option);
                } else if (jugador.Tipo.toLowerCase() === 'suplente') {
                    jugadoresSuplentesSelect.appendChild(option);
                }
                // Ignora otros tipos o jugadores sin tipo definido
            }
        });
        mensajeElem.textContent = 'Jugadores cargados exitosamente en sus roles (Titulares/Suplentes).';
        mensajeElem.style.backgroundColor = '#e2f0cb'; // Verde claro para éxito
        mensajeElem.style.color = '#28a745'; // Verde oscuro para éxito
    } catch (error) {
        console.error('Error al cargar jugadores:', error);
        mensajeElem.textContent = `Error al cargar jugadores: ${error.message}. Por favor, verifica: 1) Tu conexión a internet. 2) Que la URL del Apps Script en script.js sea EXACTA. 3) Que el Apps Script esté desplegado como "Aplicación web" con acceso "Cualquier persona". 4) Los nombres de las hojas ("Jugadores", "Partidos") y columnas ("Nombre", "Puntos", "Tipo", etc.) en Google Sheets.`;
        mensajeElem.style.backgroundColor = '#f8d7da'; // Rojo claro para error
        mensajeElem.style.color = '#721c24'; // Rojo oscuro para error
    }
}

/**
 * Transfiere jugadores seleccionados de una lista a otra.
 * @param {string} sourceId - ID del elemento <select> de origen.
 * @param {string} destinationId - ID del elemento <select> de destino.
 * @param {number} [limit=-1] - Límite de jugadores en la lista de destino. -1 para sin límite.
 */
function transferPlayers(sourceId, destinationId, limit = -1) {
    const sourceSelect = document.getElementById(sourceId);
    const destinationSelect = document.getElementById(destinationId);
    const mensajeElem = document.getElementById('mensaje');

    const selectedOptions = Array.from(sourceSelect.selectedOptions);

    if (selectedOptions.length === 0) {
        mensajeElem.textContent = 'Por favor, selecciona al menos un jugador para mover.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    let movedCount = 0;
    selectedOptions.forEach(option => {
        if (limit === -1 || destinationSelect.options.length < limit) {
            destinationSelect.appendChild(option); // Mueve la opción al nuevo select
            movedCount++;
        } else {
            // Si se alcanza el límite para un jugador específico, se puede notificar.
            // Por simplicidad, no se muestra un mensaje por cada jugador que excede el límite.
        }
    });

    if (movedCount > 0) {
        mensajeElem.textContent = `Se movieron ${movedCount} jugador(es) a la lista.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } else {
        mensajeElem.textContent = `No se pudo mover ningún jugador. Límite de ${limit} alcanzado o no hay espacio.`;
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
    const jugadoresTitularesSelect = document.getElementById('jugadoresTitulares'); // Ahora es la fuente para armar equipos
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

    // Validar que la lista de Titulares tenga 10 jugadores ANTES de armar los equipos
    // (Aunque los botones de "Mover a Claros/Oscuros" ya lo validan a 5 cada uno,
    // esta es una validación final para el total de titulares en el partido)
    if (jugadoresTitularesSelect.options.length !== 10) {
        mensajeElem.textContent = 'La lista de "Jugadores Titulares" debe contener exactamente 10 jugadores para formar los equipos del partido.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    if (equipoClarosSelect.options.length !== 5 || equipoOscurosSelect.options.length !== 5) {
        mensajeElem.textContent = 'Ambos equipos (Claros y Oscuros) deben tener exactamente 5 jugadores cada uno.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
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

    try {
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
        document.getElementById('jugadoresTitulares').innerHTML = '';
        document.getElementById('jugadoresSuplentes').innerHTML = '';
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
    mensajeElem.style.backgroundColor = '#f0f8ff'; // Azul claro para información
    mensajeElem.style.color = '#0056b3';

    try {
        // Realiza una petición GET a tu Apps Script para obtener los datos de la hoja "Partidos"
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText || ''}. Posible problema con el despliegue del Apps Script o permisos.`);
        }

        const partidos = await response.json();

        const partidosPendientes = partidos.filter(p => p.Ganador === 'PENDIENTE');

        if (partidosPendientes.length === 0) {
            mensajeElem.textContent = 'No hay partidos pendientes de registrar resultados.';
            mensajeElem.style.backgroundColor = '#e6e6e6'; // Color neutro
            mensajeElem.style.color = '#333';
            return;
        }

        // Añade cada partido pendiente como una opción en el select
        partidosPendientes.forEach(partido => {
            const option = document.createElement('option');
            option.value = partido.Fecha; // Usa la fecha como identificador único para el partido
            option.textContent = `${partido.Fecha} - Claros: ${partido.EquipoClaros} vs Oscuros: ${partido.EquipoOscuros}`;
            // Guarda los nombres de los jugadores de cada equipo en atributos 'data-'
            // Esto es útil para calcular los puntos más tarde
            option.dataset.equipoClaros = partido.EquipoClaros;
            option.dataset.equipoOscuros = partido.EquipoOscuros;
            partidosSelect.appendChild(option);
        });
        mensajeElem.textContent = 'Partidos pendientes cargados exitosamente.';
        mensajeElem.style.backgroundColor = '#e2f0cb'; // Verde claro para éxito
        mensajeElem.style.color = '#28a745'; // Verde oscuro para éxito
    } catch (error) {
        console.error('Error al cargar partidos:', error);
        mensajeElem.textContent = `Error al cargar partidos pendientes: ${error.message}. Por favor, verifica: 1) Tu conexión a internet. 2) Que la URL del Apps Script en script.js sea EXACTA. 3) Que el Apps Script esté desplegado como "Aplicación web" con acceso "Cualquier persona". 4) Los nombres de las hojas ("Jugadores", "Partidos") y columnas ("Nombre", "Puntos", "Tipo", etc.) en Google Sheets.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
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

    // Obtiene los nombres de los jugadores de los equipos Claros y Oscuros
    // desde los atributos 'data-' de la opción seleccionada
    const selectedOption = partidosSelect.options[partidosSelect.selectedIndex];
    const jugadoresClaros = selectedOption.dataset.equipoClaros.split(',');
    const jugadoresOscuros = selectedOption.dataset.equipoOscuros.split(',');

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

    } catch (error) {
        console.error('Error al registrar resultado o actualizar puntos:', error);
        mensajeElem.textContent = `Error al registrar el resultado o actualizar puntos: ${error.message}. Verifica tu conexión y el Apps Script.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
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
    }
});
