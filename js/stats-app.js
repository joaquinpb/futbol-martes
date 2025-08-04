/**
 * @file Script principal para la página de estadísticas públicas (index.html).
 * Orquesta la carga de datos, el renderizado de la UI y la interacción del usuario.
 */

import { getPlayers, getMatches } from './api.js';
import { setupTheme, applyTheme } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allPlayersData = [];
    let allMatchesData = [];
    let currentStatsData = { players: [], teamStats: {} };
    let lastSelectedFixtureMatchId = null;
    let estadisticasSortState = { criterion: 'points', order: 'desc' };

    // --- DOM ELEMENTS CACHE ---
    const DOMElements = {
        body: document.body,
        hamburgerButton: document.getElementById('hamburger-button'),
        sideMenu: document.getElementById('side-menu'),
        overlay: document.getElementById('overlay'),
        mainContentArea: document.querySelector('main'),
        desktopHeaderTitle: document.getElementById('desktop-header-title'),
        mobileHeaderTitle: document.getElementById('mobile-header-title'),
        playerModal: {
            overlay: document.getElementById('player-modal-overlay'),
            closeBtn: document.getElementById('player-modal-close'),
            photo: document.getElementById('player-modal-photo'),
            name: document.getElementById('player-modal-name'),
            tournament: document.getElementById('player-modal-tournament'),
            points: document.getElementById('player-modal-points'),
            chamigo: document.getElementById('player-modal-chamigo'),
            tt: document.getElementById('player-modal-tt'),
        },
        simplePlayerModal: {
            overlay: document.getElementById('simple-player-modal-overlay'),
            content: document.getElementById('simple-player-modal-content'),
            closeBtn: document.getElementById('simple-player-modal-close'),
            photo: document.getElementById('simple-player-modal-photo'),
            name: document.getElementById('simple-player-modal-name'),
            statusIndicator: document.getElementById('player-status-indicator'),
        }
    };

    // --- CONFIGURATION ---
    const PAGE_CONFIG = {
        'leaderboard-content': { title: 'Posiciones', icon: 'fa-trophy' },
        'chamigo-content': { title: 'Chamigo', icon: 'fa-star' },
        'tt-content': { title: 'Tercer Tiempo', icon: 'fa-beer' },
        'presentismo-content': { title: 'Presentismo', icon: 'fa-check-circle' },
        'ausentismo-content': { title: 'Ausentismo', icon: 'fa-times-circle' },
        'equipos-content': { title: 'Equipos', icon: 'fa-futbol' },
        'fixture-content': { title: 'Fixture', icon: 'fa-calendar-alt' },
        'estadisticas-content': { title: 'Estadísticas', icon: 'fa-chart-bar' },
        'individual-stats-content': { title: 'Histórico', icon: 'fa-history' },
        'comparador-content': { title: 'Comparador', icon: 'fa-users' }
    };

    const HASH_TO_TAB_MAP = {
        "#leaderboard": "leaderboard-content", "#chamigo": "chamigo-content", "#tt": "tt-content",
        "#presentismo": "presentismo-content", "#ausentismo": "ausentismo-content", "#estadisticas": "estadisticas-content",
        "#equipos": "equipos-content", "#fixture": "fixture-content", "#individual-stats": "individual-stats-content",
        "#comparador": "comparador-content"
    };

    // --- INITIALIZATION ---
    async function initializeApp() {
        setupTheme();
        setupEventListeners();

        try {
            DOMElements.mainContentArea.innerHTML = `<div class="p-6 text-center"><i class="fas fa-spinner fa-spin text-3xl text-accent-color"></i><p class="mt-2 text-text-secondary">Cargando datos...</p></div>`;
            [allPlayersData, allMatchesData] = await Promise.all([getPlayers(), getMatches()]);

            const hash = window.location.hash;
            const storedTabId = localStorage.getItem('lastActiveTab');
            let initialTabId = HASH_TO_TAB_MAP[hash] || storedTabId || 'leaderboard-content';
            
            if (!PAGE_CONFIG[initialTabId]) {
                initialTabId = 'leaderboard-content';
            }
            activateTab(initialTabId);
        } catch (error) {
            console.error("Error fatal en la inicialización:", error);
            DOMElements.mainContentArea.innerHTML = `<div class="p-6 text-center text-danger-color"><p>Error al cargar datos. Por favor, recarga la página.</p></div>`;
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Listener para botones de navegación del menú lateral
        DOMElements.sideMenu.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button, .collapsible-trigger');
            if (!button) return;

            if (button.classList.contains('tab-button')) {
                e.preventDefault();
                activateTab(button.dataset.tab);
                if (window.innerWidth < 768) closeSideMenu();
            } else if (button.classList.contains('collapsible-trigger')) {
                const content = button.nextElementSibling;
                const icon = button.querySelector('i.fa-chevron-down');
                content.classList.toggle('hidden');
                icon?.classList.toggle('rotate-180');
            }
        });
        
        // Listener para cambios de hash en la URL
        window.addEventListener('hashchange', () => {
            const tabId = HASH_TO_TAB_MAP[window.location.hash] || 'leaderboard-content';
            activateTab(tabId);
        });

        // Listeners para abrir/cerrar menú móvil
        DOMElements.hamburgerButton.addEventListener('click', openSideMenu);
        DOMElements.overlay.addEventListener('click', closeSideMenu);

        // Listeners para cerrar modales
        DOMElements.playerModal.closeBtn.addEventListener('click', hidePlayerModal);
        DOMElements.playerModal.overlay.addEventListener('click', (e) => {
            if (e.target === DOMElements.playerModal.overlay) hidePlayerModal();
        });
        DOMElements.simplePlayerModal.closeBtn.addEventListener('click', hideSimplePlayerModal);
        DOMElements.simplePlayerModal.overlay.addEventListener('click', (e) => {
            if (e.target === DOMElements.simplePlayerModal.overlay) hideSimplePlayerModal();
        });

        // Listener delegado para abrir modal de jugador desde tablas
        DOMElements.mainContentArea.addEventListener('click', (e) => {
            const photoTrigger = e.target.closest('.player-photo-clickable');
            if (photoTrigger && photoTrigger.dataset.playerId) {
                e.preventDefault();
                showSimplePlayerModal(photoTrigger.dataset.playerId);
            }
        });

        // Listener global para cerrar menús desplegables de filtros
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.custom-select-options:not(.hidden)').forEach(dropdown => {
                if (!dropdown.parentElement.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    dropdown.previousElementSibling.querySelector('i.fa-chevron-down')?.classList.remove('rotate-180');
                }
            });
        });
        
        // Listener para re-renderizar el fixture al cambiar tamaño de ventana
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (document.getElementById('fixture-content') && lastSelectedFixtureMatchId) {
                    renderFixtureDetails(lastSelectedFixtureMatchId);
                }
            }, 200);
        });
    }

    // --- UI & NAVIGATION ---
    function openSideMenu() {
        DOMElements.overlay.classList.remove('hidden');
        DOMElements.sideMenu.classList.remove('-translate-x-full');
        DOMElements.body.classList.add('modal-open');
    }

    function closeSideMenu() {
        DOMElements.sideMenu.classList.add('-translate-x-full');
        DOMElements.overlay.classList.add('hidden');
        DOMElements.body.classList.remove('modal-open');
    }

    function activateTab(tabId) {
        const config = PAGE_CONFIG[tabId];
        if (!config) return;

        const titleHTML = `<i class="fas ${config.icon} text-xl mr-3"></i><span>${config.title}</span>`;
        if (DOMElements.desktopHeaderTitle) DOMElements.desktopHeaderTitle.innerHTML = titleHTML;
        if (DOMElements.mobileHeaderTitle) DOMElements.mobileHeaderTitle.innerHTML = titleHTML;

        DOMElements.sideMenu.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        DOMElements.mainContentArea.innerHTML = getTabContentHTML(tabId);
        
        const controller = pageControllers[tabId];
        if (controller) {
            controller();
        }

        localStorage.setItem('lastActiveTab', tabId);
        const hash = Object.keys(HASH_TO_TAB_MAP).find(key => HASH_TO_TAB_MAP[key] === tabId);
        if (hash && window.location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    }

    // --- MODALS ---
    function showPlayerModal(playerId) {
        const playerStats = currentStatsData.players.find(p => p.id == playerId);
        const playerData = allPlayersData.find(p => p.id == playerId);
        if (!playerData || !playerStats) return;

        const { playerModal } = DOMElements;
        playerModal.photo.src = playerData.photo_url || 'https://placehold.co/128x128/e2e8f0/64748b?text=⚽';
        playerModal.name.textContent = playerData.name;
        playerModal.points.textContent = playerStats.points;
        playerModal.chamigo.textContent = playerStats.chamigos;
        playerModal.tt.textContent = playerStats.tt;
        
        playerModal.overlay.classList.add('visible');
        DOMElements.body.classList.add('modal-open');
    }

    function hidePlayerModal() {
        DOMElements.playerModal.overlay.classList.remove('visible');
        DOMElements.body.classList.remove('modal-open');
    }
    
    function showSimplePlayerModal(playerId) {
        const playerData = allPlayersData.find(p => p.id == playerId);
        if (!playerData) return;

        const { simplePlayerModal } = DOMElements;
        simplePlayerModal.photo.src = playerData.photo_url || 'https://placehold.co/128x128/e2e8f0/64748b?text=⚽';
        simplePlayerModal.name.textContent = playerData.name;
        
        simplePlayerModal.statusIndicator.style.backgroundColor = playerData.status === 'Activo' ? 'var(--success-color)' : 'var(--danger-color)';

        simplePlayerModal.overlay.classList.add('visible');
        DOMElements.body.classList.add('modal-open');
    }

    function hideSimplePlayerModal() {
        DOMElements.simplePlayerModal.overlay.classList.remove('visible');
        DOMElements.body.classList.remove('modal-open');
    }

    // --- STATS CALCULATION ---
    function calculateAllStats(filters) {
        const { selectedYears, selectedPeriod, selectedMonths } = filters;
        
        let timeFilteredMatches = allMatchesData;

        if (selectedYears && selectedYears.length > 0 && !selectedYears.includes('all')) {
            timeFilteredMatches = timeFilteredMatches.filter(match => {
                const matchYear = new Date(match.match_date).getUTCFullYear();
                return selectedYears.includes(String(matchYear));
            });
        }
    
        if (selectedPeriod && selectedPeriod !== 'total') {
            timeFilteredMatches = timeFilteredMatches.filter(match => {
                const month = new Date(match.match_date).getUTCMonth();
                return selectedPeriod === 'apertura' ? month <= 5 : month > 5;
            });
        } else if (selectedMonths && selectedMonths.length > 0 && !selectedMonths.includes('all')) {
             timeFilteredMatches = timeFilteredMatches.filter(match => {
                const month = new Date(match.match_date).getUTCMonth() + 1;
                return selectedMonths.includes(String(month));
            });
        }

        const playerStats = {};
        allPlayersData.forEach(player => {
            playerStats[player.id] = { 
                name: player.name, photo_url: player.photo_url, status: player.status, id: player.id,
                points: 0, pg: 0, pe: 0, pp: 0, pj: 0, efectividad: "0.00", 
                chamigos: 0, tt: 0, ausentes: 0 
            };
        });

        const teamStats = { clarosWins: 0, oscurosWins: 0, empates: 0, suspendidos: 0, totalPJMatches: 0 };
        const matchesWithResult = timeFilteredMatches.filter(m => m.result);

        matchesWithResult.forEach(match => {
            if (match.result !== 'Suspendido') {
                teamStats.totalPJMatches++;
            } else {
                teamStats.suspendidos++;
                return;
            }

            if (match.result === 'Claros') teamStats.clarosWins++;
            else if (match.result === 'Oscuros') teamStats.oscurosWins++;
            else if (match.result === 'Empate') teamStats.empates++;
            
            const allPlayersInMatch = [...new Set([...(match.team_white_players || []), ...(match.team_dark_players || [])])];
            
            allPlayersInMatch.forEach(pId => {
                if (!playerStats[pId]) return;
                playerStats[pId].pj++;
                if (match.result === 'Claros' && (match.team_white_players || []).includes(String(pId))) { playerStats[pId].points += 3; playerStats[pId].pg++; }
                else if (match.result === 'Oscuros' && (match.team_dark_players || []).includes(String(pId))) { playerStats[pId].points += 3; playerStats[pId].pg++; }
                else if (match.result === 'Empate') { playerStats[pId].points += 1; playerStats[pId].pe++; }
                else { playerStats[pId].pp++; }
            });

            if (match.chamigo_votes) {
                const votesArray = Object.values(match.chamigo_votes);
                if (votesArray.length > 0) {
                    const maxVotes = Math.max(...votesArray);
                    Object.keys(match.chamigo_votes).forEach(pId => {
                        if (match.chamigo_votes[pId] === maxVotes && playerStats[pId]) {
                            playerStats[pId].chamigos++;
                        }
                    });
                }
            }
            if (match.tt_attendees) {
                match.tt_attendees.forEach(pId => { if (playerStats[String(pId)]) playerStats[String(pId)].tt++; });
            }
        });

        Object.values(playerStats).forEach(player => {
            const maxPossiblePoints = player.pj * 3;
            player.efectividad = maxPossiblePoints > 0 ? ((player.points / maxPossiblePoints) * 100).toFixed(2) : "0.00";
            player.ausentes = Math.max(0, teamStats.totalPJMatches - player.pj);
        });
        
        currentStatsData = { players: Object.values(playerStats), teamStats };
        return currentStatsData;
    }

    // --- PAGE CONTROLLERS ---
    const pageControllers = {
        'leaderboard-content': () => setupFilteredView('leaderboard', (a, b) => b.points - a.points, ['#', '', 'Jugador', 'Puntos', 'Efectividad'], 
            (p, i) => `<tr><td class="font-semibold">${i + 1}</td><td class="w-14"><a href="#" class="player-photo-clickable" data-player-id="${p.id}"><img src="${p.photo_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=⚽'}" alt="Avatar" class="w-8 h-8 rounded-full object-cover mx-auto"></a></td><td class="text-left font-medium">${p.name}</td><td>${p.points}</td><td>${p.efectividad}%</td></tr>`),
        'chamigo-content': () => setupFilteredView('chamigo', (a, b) => b.chamigos - a.chamigos, ['#', '', 'Jugador', 'Chamigos'], 
            (p, i) => `<tr><td class="font-semibold">${i + 1}</td><td class="w-14"><a href="#" class="player-photo-clickable" data-player-id="${p.id}"><img src="${p.photo_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=⚽'}" alt="Avatar" class="w-8 h-8 rounded-full object-cover mx-auto"></a></td><td class="text-left font-medium">${p.name}</td><td>${p.chamigos}</td></tr>`, p => p.chamigos > 0),
        'tt-content': () => setupFilteredView('tt', (a, b) => b.tt - a.tt, ['#', '', 'Jugador', 'TT'], 
            (p, i) => `<tr><td class="font-semibold">${i + 1}</td><td class="w-14"><a href="#" class="player-photo-clickable" data-player-id="${p.id}"><img src="${p.photo_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=⚽'}" alt="Avatar" class="w-8 h-8 rounded-full object-cover mx-auto"></a></td><td class="text-left font-medium">${p.name}</td><td>${p.tt}</td></tr>`, p => p.tt > 0),
        'presentismo-content': () => setupFilteredView('presentismo', (a, b) => b.pj - a.pj, ['#', '', 'Jugador', 'PJ'], 
            (p, i) => `<tr><td class="font-semibold">${i + 1}</td><td class="w-14"><a href="#" class="player-photo-clickable" data-player-id="${p.id}"><img src="${p.photo_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=⚽'}" alt="Avatar" class="w-8 h-8 rounded-full object-cover mx-auto"></a></td><td class="text-left font-medium">${p.name}</td><td>${p.pj}</td></tr>`),
        'ausentismo-content': () => setupFilteredView('ausentismo', (a, b) => b.ausentes - a.ausentes, ['#', '', 'Jugador', 'Ausentes'], 
            (p, i) => `<tr><td class="font-semibold">${i + 1}</td><td class="w-14"><a href="#" class="player-photo-clickable" data-player-id="${p.id}"><img src="${p.photo_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=⚽'}" alt="Avatar" class="w-8 h-8 rounded-full object-cover mx-auto"></a></td><td class="text-left font-medium">${p.name}</td><td>${p.ausentes}</td></tr>`),
        'equipos-content': () => {
            setupFilterEventListeners('equipos', () => {
                const { teamStats } = calculateAllStats(getCurrentFilters('equipos'));
                const statsDisplay = document.getElementById('equipos-stats-display');
                const loadingMessage = document.getElementById('equipos-loading-message');
                if (!statsDisplay || !loadingMessage) return;

                const statCard = (value, label, bgColor, textColor = 'var(--button-text-color)') => `<div class="p-4 rounded-lg shadow-md flex flex-col items-center justify-center" style="background-color: ${bgColor}; color: ${textColor};"><span class="text-3xl font-bold">${value}</span><span class="text-sm uppercase mt-1">${label}</span></div>`;
                
                statsDisplay.innerHTML = 
                    statCard(teamStats.oscurosWins, 'Oscuros Ganados', '#1a202c') +
                    statCard(teamStats.clarosWins, 'Claros Ganados', '#E2E8F0', '#1A202C') +
                    statCard(teamStats.empates, 'Empates', 'var(--warning-color)') +
                    statCard(teamStats.suspendidos, 'Suspendidos', 'var(--danger-color)') +
                    statCard(teamStats.totalPJMatches, 'Partidos Jugados', 'var(--accent-color)');

                loadingMessage.classList.add('hidden');
                statsDisplay.classList.remove('hidden');
            });
            document.getElementById('equipos-hoy-button')?.click();
        },
        'fixture-content': renderFixture,
        'estadisticas-content': renderEstadisticas,
        'individual-stats-content': () => {
            DOMElements.mainContentArea.innerHTML = `<div class="p-8">Sección "Histórico" no implementada aún.</div>`;
        },
        'comparador-content': () => {
            DOMElements.mainContentArea.innerHTML = `<div class="p-8">Sección "Comparador" no implementada aún.</div>`;
        }
    };
    
    function setupFilteredView(prefix, sortFn, headers, rowTemplateFn, filterFn = () => true) {
        setupFilterEventListeners(prefix, () => {
            const { players } = calculateAllStats(getCurrentFilters(prefix));
            const rankedPlayers = [...players].filter(filterFn).sort(sortFn);
            renderGenericTable(prefix, rankedPlayers, headers, rowTemplateFn);
        });
        document.getElementById(`${prefix}-hoy-button`)?.click();
    }

    function renderGenericTable(prefix, data, headers, renderRowFn) {
        const container = document.getElementById(`${prefix}-content`);
        if (!container) return;
        const table = container.querySelector('table');
        const loadingMsg = container.querySelector('.loading-message');
        
        if (!data || data.length === 0) {
            if (table) table.innerHTML = '';
            loadingMsg.textContent = 'No hay datos para los filtros seleccionados.';
            loadingMsg.classList.remove('hidden');
            return;
        }

        table.innerHTML = `
            <thead><tr>${headers.map(h => `<th class="p-3 text-center">${h}</th>`).join('')}</tr></thead>
            <tbody>${data.map(renderRowFn).join('')}</tbody>`;
        
        loadingMsg.classList.add('hidden');
        if (table) table.classList.remove('hidden');
    }

    // --- FILTERS ---
    function getCurrentFilters(prefix) {
        const yearCheckboxes = document.querySelectorAll(`#${prefix}-year-select-dropdown input[type="checkbox"]:checked`);
        let selectedYears = Array.from(yearCheckboxes).map(cb => cb.value);

        let selectedPeriod = null;
        const periodEl = document.getElementById(`${prefix}-period-select`);
        if (periodEl) selectedPeriod = periodEl.value;

        let selectedMonths = null;
        const monthCheckboxes = document.querySelectorAll(`#${prefix}-month-select-dropdown input[type="checkbox"]:checked`);
        if (monthCheckboxes.length > 0) selectedMonths = Array.from(monthCheckboxes).map(cb => cb.value);
        
        return { selectedYears, selectedPeriod, selectedMonths };
    }
    
    // ... Implementaciones completas de renderFixture, renderEstadisticas y sus helpers
    function renderFixture() { /* MIGRAR LOGICA COMPLETA DE INDEX.HTML ORIGINAL */ }
    function renderEstadisticas() { /* MIGRAR LOGICA COMPLETA DE INDEX.HTML ORIGINAL */ }

    // --- HTML TEMPLATES ---
    function getTabContentHTML(tabId) {
        const prefix = tabId.replace('-content', '');
        let filterHTML = '';

        if (PAGE_CONFIG[tabId] && !['individual-stats-content', 'comparador-content'].includes(tabId)) {
            const yearFilterHTML = `...`; // El HTML del filtro de año
            const periodOrMonthFilterHTML = `...`; // El HTML del filtro de período/mes

            filterHTML = `...`; // El contenedor de filtros completo
        }
        
        let contentHTML = '';
        switch(tabId) {
            case 'leaderboard-content': case 'chamigo-content': case 'tt-content': case 'presentismo-content': case 'ausentismo-content':
                 contentHTML = `<div id="${prefix}-content" class="table-container"><p class="loading-message p-4">Cargando...</p><table class="w-full"></table></div>`;
                 break;
            case 'equipos-content':
                 contentHTML = `<p id="equipos-loading-message" class="loading-message p-4">Cargando...</p><div id="equipos-stats-display" class="grid grid-cols-1 md:grid-cols-3 gap-4 hidden"></div>`;
                 break;
            case 'fixture-content':
                 contentHTML = `...`; // HTML completo para el fixture
                 break;
            case 'estadisticas-content':
                 contentHTML = `...`; // HTML completo para estadísticas
                 break;
            default:
                contentHTML = `<div class="p-8">Contenido para <strong>${prefix}</strong> no implementado.</div>`;
        }
        return `<div id="${tabId}" class="main-content-container space-y-4">${filterHTML}${contentHTML}</div>`;
    }

    // --- START APP ---
    initializeApp();
});

// Helper para parsear fechas consistentemente
function parseDate(dateString) {
    if (!dateString) return new Date();
    // Asegura que la fecha se interprete como UTC para evitar problemas de zona horaria
    return new Date(dateString + 'T00:00:00');
}
