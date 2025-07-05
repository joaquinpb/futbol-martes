// Define la URL de tu Google Apps Script aquí.
// ¡Esta URL es la que me proporcionaste y es crucial para la comunicación!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec';

// --- Funciones para index.html (Crear Partido) ---

/**
 * Carga la lista de jugadores desde la hoja "Jugadores" de Google Sheets
 * y los muestra en el select de "Jugadores Disponibles".
 */
async function cargarJugadores() {
    const jugadoresSelect = document.getElementById('jugadoresDisponibles');
    // Limpia las opciones existentes en todos los selects de jugadores y equipos
    jugadoresSelect.innerHTML = '';
    document.getElementById('equipoClaros').innerHTML = '';
    document.getElementById('equipoOscuros').innerHTML = '';
    const mensajeElem = document.getElementById('mensaje');

    try {
        // Realiza una petición GET a tu Apps Script para obtener los datos de la hoja "Jugadores"
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);
        const jugadores = await response.json(); // Parsea la respuesta JSON

        // Itera sobre cada jugador obtenido y crea una opción en el select
        jugadores.forEach(jugador => {
            // Asegúrate de que el jugador tenga un nombre (para evitar filas vacías o encabezados)
            if (jugador.Nombre) {
                const option = document.createElement('option');
                option.value = jugador.Nombre; // El valor de la opción será el nombre del jugador
                option.textContent = `${jugador.Nombre} (Puntos: ${jugador.Puntos})`; // Texto visible
                jugadoresSelect.appendChild(option); // Añade la opción al select
            }
        });
        mensajeElem.textContent = ''; // Limpia cualquier mensaje anterior
    } catch (error) {
        // Manejo de errores si la carga de jugadores falla
        console.error('Error al cargar jugadores:', error);
        mensajeElem.textContent = 'Error al cargar jugadores. Asegúrate de que la hoja "Jugadores" existe y el Apps Script está desplegado correctamente.';
        mensajeElem.style.backgroundColor = '#f8d7da'; // Color de fondo para error
        mensajeElem.style.color = '#721c24'; // Color de texto para error
    }
}

/**
 * Mueve los jugadores seleccionados de la lista de "Jugadores Disponibles"
 * a la lista del equipo especificado (Claros u Oscuros).
 * Limita a 5 jugadores por equipo.
 * @param {string} destino - 'claros' o 'oscuros' para indicar el equipo de destino.
 */
function moverJugadores(destino) {
    const origenSelect = document.getElementById('jugadoresDisponibles');
    // Obtiene el select del equipo de destino (EquipoClaros o EquipoOscuros)
    const destinoSelect = document.getElementById(`equipo${destino.charAt(0).toUpperCase() + destino.slice(1)}`);
    const mensajeElem = document.getElementById('mensaje');

    // Verifica si el equipo de destino ya tiene 5 jugadores
    if (destinoSelect.options.length >= 5) {
        mensajeElem.textContent = `El equipo ${destino.charAt(0).toUpperCase() + destino.slice(1)} ya tiene 5 jugadores.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    // Obtiene una copia de los jugadores seleccionados en la lista de origen
    const seleccionados = Array.from(origenSelect.selectedOptions);
    if (seleccionados.length === 0) {
        mensajeElem.textContent = 'Por favor, selecciona al menos un jugador de la lista de disponibles.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    // Mueve los jugadores seleccionados al equipo de destino, respetando el límite de 5
    seleccionados.forEach(option => {
        if (destinoSelect.options.length < 5) {
            destinoSelect.appendChild(option); // Mueve la opción al nuevo select
        }
    });
    mensajeElem.textContent = ''; // Limpia mensajes anteriores
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
        mensajeElem.textContent = 'Ambos equipos deben tener exactamente 5 jugadores para guardar el partido.';
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
        // Envía los datos a tu Apps Script usando un método POST
        // 'mode: no-cors' es necesario para que funcione con Apps Script desde GitHub Pages,
        // pero significa que no podemos leer la respuesta directa del script.
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), // Convierte el objeto JavaScript a una cadena JSON
        });

        // Como usamos 'no-cors', no podemos verificar el 'ok' de la respuesta HTTP,
        // pero asumimos que si no hay un error en la promesa, la petición fue enviada.
        mensajeElem.textContent = 'Partido guardado exitosamente. ¡No olvides registrar el resultado más tarde!';
        mensajeElem.style.backgroundColor = '#e2f0cb'; // Color de fondo para éxito
        mensajeElem.style.color = '#28a745'; // Color de texto para éxito

        // Opcional: Limpiar los equipos y recargar la lista de jugadores disponibles
        equipoClarosSelect.innerHTML = '';
        equipoOscurosSelect.innerHTML = '';
        cargarJugadores(); // Recarga la lista de jugadores disponibles
        document.getElementById('fechaPartido').valueAsDate = new Date(); // Restablece la fecha actual
    } catch (error) {
        // Manejo de errores si la petición falla
        console.error('Error al guardar partido:', error);
        mensajeElem.textContent = 'Error al guardar el partido. Verifica tu conexión y el Apps Script.';
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

    try {
        // Realiza una petición GET a tu Apps Script para obtener los datos de la hoja "Partidos"
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        const partidos = await response.json();

        // Filtra los partidos que aún no tienen un ganador registrado ('PENDIENTE')
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
        mensajeElem.textContent = ''; // Limpia mensajes anteriores
    } catch (error) {
        // Manejo de errores si la carga de partidos falla
        console.error('Error al cargar partidos:', error);
        mensajeElem.textContent = 'Error al cargar partidos pendientes. Verifica tu conexión y el Apps Script.';
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
        // Manejo de errores si el registro del resultado o la actualización de puntos falla
        console.error('Error al registrar resultado o actualizar puntos:', error);
        mensajeElem.textContent = 'Error al registrar el resultado o actualizar puntos. Verifica tu conexión y el Apps Script.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

// Lógica de inicialización para ambas páginas
document.addEventListener('DOMContentLoaded', () => {
    // Determina qué página se está cargando para ejecutar la función de inicialización correcta
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
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
