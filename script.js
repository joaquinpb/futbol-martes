// URL Válido: https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec

// Define a URL do seu Google Apps Script aqui.
// Esta URL é a que me forneceu e é crucial para a comunicação!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMfXQc7qi6YgSQkK23gDDZxalyF60NkWTJpNXIejBqMBg7UQa59JlF4-qgpyBeXRNX/exec'; // URL ATUALIZADA!

// Função auxiliar para formatar a data de string ISO para DD/MM/AAAA
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Obtém dia, mês, ano. Preenche com zeros à esquerda, se necessário.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // O mês é indexado em 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Variável global para armazenar partidas pendentes para fácil acesso
let currentPendingMatches = [];

// --- Funções para index.html (Criar Partida) ---

/**
 * Carrega a lista de jogadores da folha "Jogadores" do Google Sheets,
 * classifica-os como Titulares ou Suplentes e os exibe nas suas respectivas listas.
 */
async function cargarJugadores() {
    // Obtém referências a todos os elementos <select> e ao elemento de mensagem
    const jugadoresTitularesSelect = document.getElementById('jugadoresTitulares');
    const jugadoresSuplentesSelect = document.getElementById('jugadoresSuplentes');
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    // **VERIFICAÇÃO CRÍTICA: Garante que todos os elementos HTML existam antes de usá-los.**
    if (!jugadoresTitularesSelect || !jugadoresSuplentesSelect || !equipoClarosSelect || !equipoOscurosSelect || !mensajeElem) {
        const missingElements = [];
        if (!jugadoresTitularesSelect) missingElements.push('jugadoresTitulares');
        if (!jugadoresSuplentesSelect) missingElements.push('jugadoresSuplentes');
        if (!equipoClarosSelect) missingElements.push('equipoClaros');
        if (!equipoOscurosSelect) missingElements.push('equipoOscuros');
        if (!mensajeElem) missingElements.push('mensaje');

        const errorMessage = `Erro crítico: Não foram encontrados os seguintes elementos HTML na página: ${missingElements.join(', ')}. Certifique-se de que o HTML está completo e os IDs estão corretos.`;
        console.error(errorMessage);

        if (mensajeElem) {
            mensajeElem.textContent = errorMessage;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        } else {
            alert(errorMessage + "\nPor favor, verifique a consola do navegador para mais detalhes.");
        }
        return;
    }

    // Limpa as opções existentes em todos os selects
    jugadoresTitularesSelect.innerHTML = '';
    jugadoresSuplentesSelect.innerHTML = '';
    equipoClarosSelect.innerHTML = '';
    equipoOscurosSelect.innerHTML = '';

    // Mensagem de depuração inicial
    mensajeElem.textContent = 'A tentar carregar jogadores (Titulares/Suplentes)...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText || ''}. Possível problema com a implementação do Apps Script ou permissões.`);
        }

        const jugadores = await response.json();

        if (jugadores.length === 0) {
            mensajeElem.textContent = 'Não foram encontrados jogadores na folha "Jogadores". Certifique-se de que a folha não está vazia e os cabeçalhos estão corretos (Nome, Puntos, Tipo).';
            mensajeElem.style.backgroundColor = '#fff3cd';
            mensajeElem.style.color = '#856404';
            return;
        }

        jugadores.forEach(jugador => {
            if (jugador.Nombre && jugador.Tipo) {
                const option = document.createElement('option');
                option.value = jugador.Nombre;
                option.textContent = jugador.Nombre; // Exibir apenas o nome
                // Guarda o tipo original e apara para evitar espaços extras
                option.dataset.originalType = jugador.Tipo.toLowerCase().trim();
                option.dataset.puntos = jugador.Puntos; // Guarda os pontos para referência

                if (option.dataset.originalType === 'titular') {
                    jugadoresTitularesSelect.appendChild(option);
                } else if (option.dataset.originalType === 'suplente') {
                    jugadoresSuplentesSelect.appendChild(option);
                }
            }
        });
        mensajeElem.textContent = 'Jogadores carregados com sucesso nos seus papéis (Titulares/Suplentes).';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        mensajeElem.textContent = `Erro ao carregar jogadores: ${error.message}. Por favor, verifique: 1) A sua ligação à internet. 2) Se o URL do Apps Script em script.js é EXATO. 3) Se o Apps Script está implementado como "Aplicação web" com acesso "Qualquer pessoa". 4) Os nomes das folhas ("Jogadores", "Partidos") e colunas ("Nome", "Puntos", "Tipo", etc.) no Google Sheets.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Move jogadores selecionados de uma lista de origem (Titulares/Suplentes) para uma equipa (Claros/Oscuros).
 * @param {string} sourceListType - 'titulares' ou 'suplentes'.
 * @param {string} teamType - 'claros' ou 'oscuros'.
 */
function moveToTeam(sourceListType, teamType) {
    const sourceSelectId = `jugadores${sourceListType.charAt(0).toUpperCase() + sourceListType.slice(1)}`;
    const teamSelectId = `equipo${teamType.charAt(0).toUpperCase() + teamType.slice(1)}`;

    const sourceSelect = document.getElementById(sourceSelectId);
    const teamSelect = document.getElementById(teamSelectId);
    const mensajeElem = document.getElementById('mensaje');

    if (!sourceSelect || !teamSelect || !mensajeElem) {
        console.error(`Erro: Elementos não encontrados para moveToTeam (Origem: ${sourceSelectId}, Destino: ${teamSelectId}).`);
        if (mensajeElem) {
            mensajeElem.textContent = 'Erro interno: Elementos da interface não encontrados.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
        return;
    }

    const selectedOptions = Array.from(sourceSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        mensajeElem.textContent = 'Por favor, selecione pelo menos um jogador para mover para a equipa.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    let movedCount = 0;
    selectedOptions.forEach(option => {
        if (teamSelect.options.length < 5) { // Limite de 5 jogadores por equipa
            teamSelect.appendChild(option);
            movedCount++;
        } else {
            mensajeElem.textContent = `Não foi possível mover ${option.textContent}. A equipa ${teamType} já tem 5 jogadores.`;
            mensajeElem.style.backgroundColor = '#fff3cd';
            mensajeElem.style.color = '#856404';
        }
    });

    if (movedCount > 0) {
        mensajeElem.textContent = `Foram movidos ${movedCount} jogador(es) para a equipa ${teamType}.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } else if (selectedOptions.length > 0 && teamSelect.options.length >= 5) {
        // Mensagem de limite já exibida
    } else {
        mensajeElem.textContent = `Não foi possível mover nenhum jogador para a equipa ${teamType}.`;
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}

/**
 * Move jogadores selecionados de uma equipa (Claros/Oscuros) de volta para a sua lista original (Titulares/Suplentes).
 * @param {string} teamType - 'claros' ou 'oscuros'.
 */
function moveFromTeam(teamType) {
    const teamSelectId = `equipo${teamType.charAt(0).toUpperCase() + teamType.slice(1)}`;
    const teamSelect = document.getElementById(teamSelectId);
    const mensajeElem = document.getElementById('mensaje');

    if (!teamSelect || !mensajeElem) {
        console.error(`Erro: Elementos não encontrados para moveFromTeam (Origem: ${teamSelectId}).`);
        if (mensajeElem) {
            mensajeElem.textContent = 'Erro interno: Elementos da interface não encontrados.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
        return;
    }

    const selectedOptions = Array.from(teamSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        mensajeElem.textContent = 'Por favor, selecione pelo menos um jogador para mover de volta.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    let movedCount = 0;
    selectedOptions.forEach(option => {
        // Obtém o tipo original (titular/suplente) do atributo data-originalType
        const originalType = option.dataset.originalType;
        console.log(`[moveFromTeam] A mover jogador: ${option.textContent}, Tipo Original (dataset): '${originalType}'`);

        // Valida que o tipo original seja 'titular' ou 'suplente'
        if (!originalType || (originalType !== 'titular' && originalType !== 'suplente')) {
            console.error(`[moveFromTeam] Erro: Tipo original inesperado para o jogador ${option.textContent}: '${originalType}'. Não foi possível mover de volta.`);
            mensajeElem.textContent = `Erro: Tipo de jogador desconhecido ao tentar mover de volta para ${option.textContent}.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return; // Salta esta opção se o tipo for inválido
        }

        let destinationSelectId;
        // **CORREÇÃO AQUI:** Garantimos que o ID de destino seja plural.
        if (originalType === 'titular') {
            destinationSelectId = 'jugadoresTitulares'; // Correto: plural
        } else if (originalType === 'suplente') {
            destinationSelectId = 'jugadoresSuplentes'; // Correto: plural
        } else {
            // Isto não deve ocorrer se a validação anterior estiver correta, mas é um fallback
            console.error(`[moveFromTeam] Fallback: Tipo original não reconhecido para destino: '${originalType}'`);
            mensajeElem.textContent = `Erro interno ao determinar a lista de destino para ${option.textContent}.`;
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return;
        }

        const destinationSelect = document.getElementById(destinationSelectId);

        if (destinationSelect) {
            destinationSelect.appendChild(option);
            movedCount++;
        } else {
            console.error(`[moveFromTeam] Erro: Lista de destino '${destinationSelectId}' não encontrada para o jogador ${option.textContent}. Tipo Original era: ${originalType}`);
            mensajeElem.textContent = `Erro: Não foi possível mover ${option.textContent}. Lista de destino não encontrada.`
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
        }
    });

    if (movedCount > 0) {
        mensajeElem.textContent = `Foram movidos ${movedCount} jogador(es) de volta da equipa ${teamType}.`;
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } else {
        // Esta mensagem só é exibida se NENHUM jogador foi movido e não houve um erro específico de "lista não encontrada"
        mensajeElem.textContent = `Não foi possível mover nenhum jogador de volta.`;
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}

// A função togglePlayerRole foi removida, pois os botões associados foram removidos.

/**
 * Guarda os detalhes da partida (data, jogadores de cada equipa)
 * na folha "Partidos" do Google Sheets.
 */
async function guardarPartido() {
    const fecha = document.getElementById('fechaPartido').value;
    const equipoClarosSelect = document.getElementById('equipoClaros');
    const equipoOscurosSelect = document.getElementById('equipoOscuros');
    const mensajeElem = document.getElementById('mensaje');

    // Validações básicas antes de guardar
    if (!fecha) {
        mensajeElem.textContent = 'Por favor, selecione a data da partida.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    if (equipoClarosSelect.options.length !== 5 || equipoOscurosSelect.options.length !== 5) {
        mensajeElem.textContent = 'Ambas as equipas (Claros e Oscuros) devem ter exatamente 5 jogadores cada para guardar a partida.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    try {
        // **NOVA VALIDAÇÃO:** Não é possível adicionar 2 partidas com a mesma data
        const existingMatchesResponse = await fetch(`${SCRIPT_URL}?sheet=Partidos`);
        if (!existingMatchesResponse.ok) {
            throw new Error(`Erro HTTP ao verificar partidas existentes: ${existingMatchesResponse.status} ${existingMatchesResponse.statusText || ''}.`);
        }
        const existingMatches = await existingMatchesResponse.json();

        // Log de depuração para ver os valores de data
        console.log(`[guardarPartido] Data do input: '${fecha}'`);
        const isDuplicateDate = existingMatches.some(match => {
            // **CORREÇÃO AQUI:** Extrai apenas a parte da data (YYYY-MM-DD) da string ISO
            const matchDateOnly = match.Fecha.split('T')[0];
            console.log(`[guardarPartido] A comparar com data existente (apenas data): '${matchDateOnly}'`);
            return matchDateOnly === fecha;
        });

        if (isDuplicateDate) {
            mensajeElem.textContent = 'Já existe uma partida agendada para esta data. Por favor, escolha outra data.';
            mensajeElem.style.backgroundColor = '#f8d7da';
            mensajeElem.style.color = '#721c24';
            return; // Interrompe a execução se a data for duplicada
        }

        // Converte as listas de jogadores de cada equipa em strings separadas por vírgulas
        const equipoClaros = Array.from(equipoClarosSelect.options).map(opt => opt.value).join(',');
        const equipoOscuros = Array.from(equipoOscurosSelect.options).map(opt => opt.value).join(',');

        // Prepara os dados a enviar para o Google Apps Script
        const data = {
            fecha: fecha,
            equipoClaros: equipoClaros,
            equipoOscuros: equipoOscuros,
            ganador: 'PENDIENTE' // Marca a partida como pendente de resultado
        };

        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        mensajeElem.textContent = 'Partida guardada com sucesso. Não se esqueça de registar o resultado mais tarde!';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';

        // Limpar as equipas e recarregar a lista de jogadores Titulares/Suplentes
        equipoClarosSelect.innerHTML = '';
        equipoOscurosSelect.innerHTML = '';
        cargarJugadores(); // Recarrega a lista de jogadores com os seus papéis fixos
        document.getElementById('fechaPartido').valueAsDate = new Date(); // Reinicia a data atual
    } catch (error) {
        console.error('Erro ao guardar partida:', error);
        mensajeElem.textContent = `Erro ao guardar a partida: ${error.message}. Verifique a sua ligação e o Apps Script.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}


// --- Funções para resultados.html (Registrar Resultados) ---

/**
 * Carrega as partidas marcadas como 'PENDIENTE' da folha "Partidos"
 * e as exibe no select para registar resultados.
 */
async function cargarPartidosPendientes() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    // Limpa as opções existentes e adiciona uma opção por padrão
    partidosSelect.innerHTML = '<option value="">Selecione uma partida...</option>';
    const mensajeElem = document.getElementById('mensajeResultados');

    // Mensagem de depuração inicial
    mensajeElem.textContent = 'A tentar carregar partidas pendentes...';
    mensajeElem.style.backgroundColor = '#f0f8ff';
    mensajeElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Partidos`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText || ''}. Possível problema com a implementação do Apps Script ou permissões.`);
        }

        const partidos = await response.json();
        currentPendingMatches = partidos.filter(p => p.Ganador === 'PENDIENTE'); // Armazena partidas pendentes globalmente

        if (currentPendingMatches.length === 0) {
            mensajeElem.textContent = 'Não há partidas pendentes para registar resultados.';
            mensajeElem.style.backgroundColor = '#e6e6e6';
            mensajeElem.style.color = '#333';
            return;
        }

        // Adiciona cada partida pendente como uma opção no select
        currentPendingMatches.forEach(partido => {
            const option = document.createElement('option');
            option.value = partido.Fecha; // Usa a data como identificador único para a partida
            // NOVO FORMATO: DD/MM/AAAA
            const formattedDate = formatDateToDDMMYYYY(partido.Fecha);
            option.textContent = formattedDate;
            partidosSelect.appendChild(option);
        });
        mensajeElem.textContent = 'Partidas pendentes carregadas com sucesso.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';
    } catch (error) {
        console.error('Erro ao carregar partidas:', error);
        mensajeElem.textContent = `Erro ao carregar partidas pendentes: ${error.message}. Por favor, verifique: 1) A sua ligação à internet. 2) Se o URL do Apps Script em script.js é EXATO. 3) Se o Apps Script está implementado como "Aplicação web" com acesso "Qualquer pessoa". 4) Os nomes das folhas ("Jogadores", "Partidos") e colunas ("Nome", "Puntos", "Tipo", etc.) no Google Sheets.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Exibe os detalhes da partida selecionada nas caixas de texto das equipas.
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
        mensajeElem.textContent = 'Selecione uma data de partida para ver os detalhes.';
        mensajeElem.style.backgroundColor = '#f0f8ff';
        mensajeElem.style.color = '#0056b3';
        return;
    }

    const selectedMatch = currentPendingMatches.find(match => match.Fecha === selectedDate);

    if (selectedMatch) {
        equipoClarosDetalle.value = selectedMatch.EquipoClaros.split(',').join('\n');
        equipoOscurosDetalle.value = selectedMatch.EquipoOscuros.split(',').join('\n');
        mensajeElem.textContent = ''; // Limpa a mensagem ao carregar com sucesso
    } else {
        equipoClarosDetalle.value = '';
        equipoOscurosDetalle.value = '';
        mensajeElem.textContent = 'Não foram encontrados detalhes para a partida selecionada.';
        mensajeElem.style.backgroundColor = '#fff3cd';
        mensajeElem.style.color = '#856404';
    }
}


/**
 * Regista o resultado de uma partida selecionada e atualiza os pontos
 * dos jogadores na folha "Jogadores".
 */
async function registrarResultado() {
    const partidosSelect = document.getElementById('seleccionarPartido');
    const fechaPartido = partidosSelect.value;
    const mensajeElem = document.getElementById('mensajeResultados');

    // Validações
    if (!fechaPartido) {
        mensajeElem.textContent = 'Por favor, selecione uma partida da lista.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    const ganadorRadio = document.querySelector('input[name="ganador"]:checked');
    if (!ganadorRadio) {
        mensajeElem.textContent = 'Por favor, selecione a equipa vencedora ou se foi empate.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }
    const ganador = ganadorRadio.value; // 'Claros', 'Oscuros', ou 'Empate'

    // Encontra a partida selecionada nas partidas pendentes armazenadas globalmente
    const selectedMatch = currentPendingMatches.find(match => match.Fecha === fechaPartido);

    if (!selectedMatch) {
        mensajeElem.textContent = 'Erro: Não foram encontrados os detalhes da partida selecionada. Por favor, recarregue a página.';
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
        return;
    }

    const jugadoresClaros = selectedMatch.EquipoClaros.split(',');
    const jugadoresOscuros = selectedMatch.EquipoOscuros.split(',');

    try {
        // 1. Obter os pontos atuais de todos os jogadores
        const responseJugadores = await fetch(`${SCRIPT_URL}?sheet=Jugadores`);
        const jugadoresActuales = await responseJugadores.json();

        // Função auxiliar para obter os pontos atuais de um jogador pelo seu nome
        const obtenerPuntosActuales = (nombre) => {
            const jugador = jugadoresActuales.find(j => j.Nombre.trim() === nombre.trim()); // .trim() para evitar espaços extras
            return jugador ? parseInt(jugador.Puntos) : 0; // Se não for encontrado, assume 0 pontos
        };

        let jugadoresAActualizar = []; // Array para armazenar os jogadores com os seus novos pontos

        // 2. Calcular os novos pontos de acordo com o resultado da partida
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

        // 3. Enviar os dados dos jogadores atualizados para a folha "Jogadores"
        const responsePuntos = await fetch(`${SCRIPT_URL}?sheet=Jugadores`, {
            method: 'POST',
            mode: 'no-cors', // Necessário para Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jogadores: jugadoresAActualizar }), // Envia o array de jogadores para atualizar
        });
        // Assumimos sucesso por não-cors.

        // NOTA IMPORTANTE: A função doPost atual do seu Google Apps Script
        // não tem a capacidade de procurar uma linha específica na folha "Partidos"
        // (por exemplo, por data) e atualizar a sua coluna "Ganador".
        // Apenas pode adicionar novas linhas ou atualizar jogadores por nome.
        // Portanto, depois de registar o resultado e atualizar os pontos,
        // DEVERÁ IR MANUALMENTE À SUA FOLHA DO GOOGLE "Futbol5_Datos"
        // e alterar o valor de 'PENDIENTE' para 'Claros', 'Oscuros' ou 'Empate'
        // na linha da partida correspondente.
        // Se isto for um problema, o Apps Script pode ser expandido para lidar com isso.

        mensajeElem.textContent = 'Resultado registado e pontos dos jogadores atualizados. Por favor, atualize manualmente o vencedor na sua folha do Google Sheets para esta partida.';
        mensajeElem.style.backgroundColor = '#e2f0cb';
        mensajeElem.style.color = '#28a745';

        // Recarregar a lista de partidas pendentes para que a partida recém-registada
        // (que agora deve ser marcada manualmente como não pendente) desapareça.
        cargarPartidosPendientes();
        // Limpar os detalhes da equipa após o registo
        document.getElementById('equipoClarosDetalle').value = '';
        document.getElementById('equipoOscurosDetalle').value = '';

    } catch (error) {
        console.error('Erro ao registar resultado ou atualizar pontos:', error);
        mensajeElem.textContent = `Erro ao registar o resultado ou atualizar pontos: ${error.message}. Verifique a sua ligação e o Apps Script.`;
        mensajeElem.style.backgroundColor = '#f8d7da';
        mensajeElem.style.color = '#721c24';
    }
}

/**
 * Exibe a tabela de pontos dos jogadores, ordenada do maior para o menor.
 */
async function mostrarTablaPuntos() {
    const puntosTablaContainer = document.getElementById('puntosTablaContainer');
    const mensajePuntosElem = document.getElementById('mensajePuntos');

    if (!puntosTablaContainer || !mensajePuntosElem) {
        console.error('Erro: Elementos HTML para a tabela de pontos não encontrados.');
        return;
    }

    mensajePuntosElem.textContent = 'A carregar tabela de pontos...';
    mensajePuntosElem.style.backgroundColor = '#f0f8ff';
    mensajePuntosElem.style.color = '#0056b3';

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Jogadores`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText || ''}. Possível problema com a implementação do Apps Script ou permissões.`);
        }

        const jugadores = await response.json();

        if (jugadores.length === 0) {
            mensajePuntosElem.textContent = 'Não há jogadores registados para exibir a tabela de pontos.';
            mensajePuntosElem.style.backgroundColor = '#fff3cd';
            mensajePuntosElem.style.color = '#856404';
            return;
        }

        // Filtra jogadores que têm um nome e pontos válidos, e os converte para um formato numérico seguro
        const jugadoresValidos = jugadores.filter(j => j.Nombre && !isNaN(parseInt(j.Puntos)))
                                        .map(j => ({
                                            Nombre: j.Nombre,
                                            Puntos: parseInt(j.Puntos) // Garante que Puntos é um número
                                        }));

        // Ordena os jogadores por pontos do maior para o menor
        jugadoresValidos.sort((a, b) => b.Puntos - a.Puntos);

        // Cria a tabela HTML dinamicamente
        let tablaHTML = `
            <table class="puntos-table">
                <thead>
                    <tr>
                        <th>Posição</th>
                        <th>Jogador</th>
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
        mensajePuntosElem.textContent = 'Tabela de pontos carregada com sucesso.';
        mensajePuntosElem.style.backgroundColor = '#e2f0cb';
        mensajePuntosElem.style.color = '#28a745';

    } catch (error) {
        console.error('Erro ao carregar a tabela de pontos:', error);
        mensajePuntosElem.textContent = `Erro ao carregar a tabela de pontos: ${error.message}. Verifique a sua ligação e o Apps Script.`;
        mensajePuntosElem.style.backgroundColor = '#f8d7da';
        mensajePuntosElem.style.color = '#721c24';
    }
}


// Lógica de inicialização para ambas as páginas
document.addEventListener('DOMContentLoaded', () => {
    // Determina qual página está a ser carregada para executar a função de inicialização correta
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/futbol-martes/') {
        cargarJugadores();
        // Define a data atual por padrão no campo de data
        const fechaInput = document.getElementById('fechaPartido');
        if (fechaInput) {
            fechaInput.valueAsDate = new Date();
        }
    } else if (window.location.pathname.includes('resultados.html')) {
        cargarPartidosPendientes();
    } else if (window.location.pathname.includes('puntuacoes.html')) { // Nova condição para a página de pontuações
        mostrarTablaPuntos();
    }
});
