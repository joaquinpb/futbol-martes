/**
 * @file Script principal para el Panel de Administración (admin.html).
 * Orquesta la autenticación, carga de datos, renderizado de vistas,
 * interacciones de UI y comunicación con la API.
 */

import supabase, { getPlayers, getMatches, getUsersWithRoles, uploadFile } from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- APLICATION STATE ---
    const AppState = {
        players: [],
        matches: [],
        users: [],
        userRole: null,
        userName: null,
        userEmail: null,
        avatarUrl: null,
        selectedMatchId: null,
        isInitialized: false,
        isInitializing: false,
        activePlayerElement: null,
        realtimeChannel: null,
        heartbeatInterval: null,
        selectedPhotoFile: null,
        selectedAvatarFile: null,
        cropper: null,
        cropperContext: 'player',
        playerSortState: { key: 'id', dir: 'asc' },
        userSortState: { key: 'email', dir: 'asc' },
    };

    // --- DOM ELEMENT CACHE ---
    const DOMElements = {
        body: document.body,
        appContainer: document.getElementById('app-container'),
        authContainer: document.getElementById('auth-container'),
        loginForm: document.getElementById('login-form'),
        authStatus: document.getElementById('auth-status'),
        mainNav: document.getElementById('main-nav'),
        mobileMenu: document.getElementById('mobile-menu'),
        mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
        mobileMenuOverlay: document.getElementById('mobile-menu-overlay'),
        adminContentArea: document.getElementById('admin-content-area'),
        loadingContainer: document.getElementById('loading-container'),
    };
    
    // --- CONFIGURATION ---
    const NAV_ITEMS = {
        dashboard: [{ id: 'dashboard', name: 'Dashboard', icon: 'fa-tachometer-alt' }],
        main: [
            { id: 'team-formation', name: 'Armar Equipos', icon: 'fa-users-cog' },
            { id: 'match-results', name: 'Resultados', icon: 'fa-trophy' },
            { id: 'chamigo-management', name: 'Chamigo', icon: 'fa-star' },
            { id: 'tt-attendance', name: 'Asistencia TT', icon: 'fa-beer' },
        ],
        admin: [
            { id: 'edit-match', name: 'Editar Partido', icon: 'fa-edit' },
            { id: 'players-management', name: 'ABM Jugadores', icon: 'fa-user-plus' },
            { id: 'user-management', name: 'ABM Usuarios', icon: 'fa-user-shield' },
        ],
        links: [{ href: 'index.html', name: 'Ver Estadísticas', icon: 'fa-chart-line', target: '_blank' }]
    };

    // --- INITIALIZATION ---
    function init() {
        UI.setupTheme();
        setupGlobalEventListeners();

        window.addEventListener('hashchange', () => {
            const tabId = window.location.hash.substring(1) || NAV_ITEMS.dashboard[0].id;
            renderPage(tabId);
        });

        Auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                if (!AppState.isInitialized) loadAdminPanel();
            } else if (event === 'SIGNED_OUT' || !session) {
                showLoginScreen();
            }
        });
    }

    // --- AUTHENTICATION FLOW ---
    async function loadAdminPanel() {
        if (AppState.isInitializing) return;
        AppState.isInitializing = true;
        
        DOMElements.authContainer.classList.add('hidden');
        DOMElements.appContainer.classList.remove('hidden');
        DOMElements.loadingContainer.classList.remove('hidden');
        DOMElements.adminContentArea.innerHTML = '';
        DOMElements.body.classList.add('admin-layout');
        DOMElements.body.classList.remove('logged-out');

        try {
            const profileData = await Auth.getUserProfile();
            if (!profileData) throw new Error("No se pudo obtener el perfil del usuario.");
            
            AppState.userRole = profileData.profile.role;
            AppState.userName = profileData.profile.name;
            AppState.userEmail = profileData.user.email;
            AppState.avatarUrl = profileData.profile.avatar_url;

            const dataPromises = [getPlayers(), getMatches()];
            if (AppState.userRole === 'Admin') dataPromises.push(getUsersWithRoles());
            
            const [players, matches, users] = await Promise.all(dataPromises);
            
            AppState.players = players;
            AppState.matches = matches;
            AppState.users = users || [];

            setupMainUI();
            setupRealtimeSubscriptions();
            
            const hash = window.location.hash.substring(1);
            const initialTab = hash || NAV_ITEMS.dashboard[0].id;
            await renderPage(initialTab);

        } catch (error) {
            console.error("Error fatal al cargar el panel de administración:", error);
            UI.showNotification("Ocurrió un error inesperado al cargar el panel.", "error");
            await Auth.signOutUser();
        } finally {
            DOMElements.loadingContainer.classList.add('hidden');
            AppState.isInitializing = false;
            AppState.isInitialized = true;
        }
    }

    function showLoginScreen() {
        AppState.isInitialized = false;
        if (AppState.realtimeChannel) {
            supabase.removeChannel(AppState.realtimeChannel);
            AppState.realtimeChannel = null;
            clearInterval(AppState.heartbeatInterval);
        }
        
        DOMElements.body.classList.add('logged-out');
        DOMElements.body.classList.remove('admin-layout');
        DOMElements.appContainer.classList.add('hidden');
        DOMElements.authContainer.classList.remove('hidden');
        
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = 'Entrar';
        }
        DOMElements.loginForm.reset();
        DOMElements.authStatus.textContent = '';
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginButton = e.submitter;

        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        
        const { error } = await Auth.signInUser(email, password);

        if (error) {
            DOMElements.authStatus.textContent = 'Email o contraseña incorrectos.';
            loginButton.disabled = false;
            loginButton.innerHTML = 'Entrar';
        }
    }

    // --- UI SETUP & CONTROLS ---
    function setupMainUI() {
        setupNavigationMenus();
        UI.renderUserMenu({
            user: { email: AppState.userEmail },
            profile: { name: AppState.userName, avatar_url: AppState.avatarUrl },
            onSignOut: async (e) => { 
                e.preventDefault();
                await Auth.signOutUser(); 
            },
            onChangeName: (e) => { 
                e.preventDefault(); 
                // Aquí podrías agregar lógica para mostrar un modal de cambio de nombre
                console.log("Cambiar nombre clickeado");
            },
            onChangePassword: (e) => { 
                e.preventDefault();
                // Lógica para el modal de cambio de contraseña
                console.log("Cambiar contraseña clickeado");
            },
            onAvatarClick: (e) => { 
                e.preventDefault(); 
                // Lógica para el modal de avatar
                console.log("Avatar clickeado");
            }
        });
    }

    function setupNavigationMenus() {
        let navHtml = `
            ${NAV_ITEMS.dashboard.map(item => `
                <a href="#${item.id}" data-tab="${item.id}" class="nav-link nav-link-dashboard w-full text-left flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors duration-200">
                    <i class="fas ${item.icon} w-5 text-center"></i><span>${item.name}</span>
                </a>`).join('')}
            
            <div>
                <button class="collapsible-trigger sidebar-group-header w-full flex justify-between items-center px-4 py-2.5 text-left font-semibold rounded-lg">
                    <span class="flex items-center gap-3"><i class="fas fa-cogs w-5 text-center"></i>Principal</span>
                    <i class="fas fa-chevron-down transform transition-transform rotate-180"></i>
                </button>
                <div class="collapsible-content mt-1 space-y-1 pl-4">
                    ${NAV_ITEMS.main.map(item => `<a href="#${item.id}" data-tab="${item.id}" class="nav-link w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg"><i class="fas ${item.icon} w-5 text-center"></i><span>${item.name}</span></a>`).join('')}
                </div>
            </div>
            
            ${AppState.userRole === 'Admin' ? `
            <div class="mt-2">
                <button class="collapsible-trigger sidebar-group-header w-full flex justify-between items-center px-4 py-2.5 text-left font-semibold rounded-lg">
                    <span class="flex items-center gap-3"><i class="fas fa-user-shield w-5 text-center"></i>Administración</span>
                    <i class="fas fa-chevron-down transform transition-transform"></i>
                </button>
                <div class="collapsible-content hidden mt-1 space-y-1 pl-4">
                    ${NAV_ITEMS.admin.map(item => `<a href="#${item.id}" data-tab="${item.id}" class="nav-link w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg"><i class="fas ${item.icon} w-5 text-center"></i><span>${item.name}</span></a>`).join('')}
                </div>
            </div>` : ''}

            <div class="mt-2">
                <button class="collapsible-trigger sidebar-group-header w-full flex justify-between items-center px-4 py-2.5 text-left font-semibold rounded-lg">
                    <span class="flex items-center gap-3"><i class="fas fa-link w-5 text-center"></i>Enlaces</span>
                    <i class="fas fa-chevron-down transform transition-transform"></i>
                </button>
                <div class="collapsible-content hidden mt-1 space-y-1 pl-4">
                    ${NAV_ITEMS.links.map(item => `<a href="${item.href}" target="${item.target || '_self'}" class="nav-link w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg"><i class="fas ${item.icon} w-5 text-center"></i><span>${item.name}</span></a>`).join('')}
                </div>
            </div>
        `;
        DOMElements.mainNav.innerHTML = navHtml;
        DOMElements.mobileMenu.innerHTML = `<div class="p-4 border-b flex justify-between items-center"><span class="font-bold">Menú</span><button id="close-mobile-menu"><i class="fas fa-times"></i></button></div><div class="p-2">${navHtml}</div>`;

        document.querySelectorAll('.collapsible-trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const content = trigger.nextElementSibling;
                content.classList.toggle('hidden');
                trigger.querySelector('i.fa-chevron-down')?.classList.toggle('rotate-180');
            });
        });

        document.getElementById('close-mobile-menu')?.addEventListener('click', closeMobileMenu);
    }

    function openMobileMenu() {
        DOMElements.mobileMenuOverlay.classList.remove('hidden');
        DOMElements.mobileMenu.classList.remove('-translate-x-full');
        DOMElements.body.classList.add('modal-open');
    }

    function closeMobileMenu() {
        DOMElements.mobileMenu.classList.add('-translate-x-full');
        DOMElements.mobileMenuOverlay.classList.add('hidden');
        DOMElements.body.classList.remove('modal-open');
    }

    // --- PAGE ROUTING & RENDERING ---
    async function renderPage(tabId) {
        const isAdminPage = NAV_ITEMS.admin.some(item => item.id === tabId);
        if (isAdminPage && AppState.userRole !== 'Admin') {
            tabId = 'dashboard';
            history.replaceState(null, '', '#dashboard');
        }

        const pageConfig = [...NAV_ITEMS.dashboard, ...NAV_ITEMS.main, ...NAV_ITEMS.admin].find(i => i.id === tabId);
        if (pageConfig) {
            const desktopTitle = document.getElementById('desktop-header-title');
            if (desktopTitle) desktopTitle.innerHTML = `<i class="fas ${pageConfig.icon} text-2xl mr-3"></i><span>${pageConfig.name}</span>`;
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabId);
        });
        
        const controller = pageControllers[tabId];
        if (controller && typeof controller === 'function') {
            controller(DOMElements.adminContentArea);
        } else {
            DOMElements.adminContentArea.innerHTML = `<div class="p-8">Contenido para ${tabId} no implementado.</div>`;
        }
    }
    
    // --- PAGE CONTROLLERS & TEMPLATES ---
    const pageControllers = {
        dashboard: (container) => {
            container.innerHTML = `
                <div class="p-4 sm:p-6 lg:p-8">
                    <div class="mb-6 rounded-xl shadow-lg text-center card card-styled">
                        <div class="p-4 bg-muted"><h1 class="text-3xl font-bold">Dashboard</h1></div>
                        <div class="p-3 bg-secondary border-t"><p id="dashboard-match-date" class="text-text-secondary text-sm"></p></div>
                    </div>
                    <div id="dashboard-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        </div>
                </div>`;
            renderDashboardContent();
        },
        'players-management': (container) => {
            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-3 h-full">
                    <div class="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-border-color">
                        <div class="card h-full">
                            <h3 class="p-3 text-center font-semibold bg-muted border-b">JUGADOR</h3>
                            <div class="p-4">
                                <form id="player-form" class="space-y-3">
                                    <input type="hidden" id="player-id">
                                    <div>
                                        <label class="block text-sm font-medium mb-2 text-center">Foto</label>
                                        <div class="flex justify-center">
                                            <label for="player-photo-input" class="cursor-pointer group relative">
                                                <img id="player-photo-preview" src="https://placehold.co/128x128/e2e8f0/64748b?text=⚽" class="w-28 h-28 rounded-full object-cover border-4 border-border-color">
                                                <div class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <i class="fas fa-camera text-white text-2xl"></i>
                                                </div>
                                            </label>
                                        </div>
                                        <input type="file" id="player-photo-input" class="hidden" accept="image/png, image/jpeg">
                                    </div>
                                    <div>
                                        <label for="player-name" class="block text-sm font-medium mb-1">Nombre</label>
                                        <input type="text" id="player-name" class="w-full p-2" required>
                                    </div>
                                    <div>
                                        <label for="player-status" class="block text-sm font-medium mb-1">Estado</label>
                                        <select id="player-status" class="w-full p-2"><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select>
                                    </div>
                                    <div>
                                        <label for="player-role" class="block text-sm font-medium mb-1">Rol</label>
                                        <select id="player-role" class="w-full p-2"><option value="Titular">Titular</option><option value="Suplente">Suplente</option></select>
                                    </div>
                                    <div class="flex flex-col gap-2 pt-2">
                                        <button type="submit" id="save-player-button" class="button button-success">Guardar Jugador</button>
                                        <button type="button" id="delete-player-button" class="button button-danger">Eliminar Jugador</button>
                                        <button type="button" id="clear-player-form-button" class="button button-secondary">Limpiar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="lg:col-span-2">
                        <div class="card h-full">
                            <h3 class="p-3 text-center font-semibold bg-muted border-b">LISTA DE JUGADORES</h3>
                            <div class="p-4">
                                <input type="text" id="player-search-input" placeholder="Buscar por nombre..." class="w-full p-2 border rounded-md mb-4">
                                <div id="players-table-container" class="overflow-y-auto max-h-[70vh]">
                                    <table class="w-full text-sm">
                                        <thead class="text-xs uppercase">
                                            <tr>
                                                <th class="p-2" data-sort-by="id">ID</th>
                                                <th class="p-2" data-sort-by="name">Nombre</th>
                                                <th class="p-2" data-sort-by="status">Estado</th>
                                                <th class="p-2" data-sort-by="role">Rol</th>
                                            </tr>
                                        </thead>
                                        <tbody id="players-list-admin"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            document.getElementById('player-form').addEventListener('submit', handleSavePlayer);
            document.getElementById('delete-player-button').addEventListener('click', handleDeletePlayer);
            document.getElementById('clear-player-form-button').addEventListener('click', clearPlayerForm);
            document.getElementById('player-search-input').addEventListener('input', (e) => renderPlayersListAdmin(e.target.value));
            document.getElementById('players-table-container').querySelector('thead').addEventListener('click', (e) => {
                const header = e.target.closest('th[data-sort-by]');
                if (header) {
                    const key = header.dataset.sortBy;
                    if (AppState.playerSortState.key === key) {
                        AppState.playerSortState.dir = AppState.playerSortState.dir === 'asc' ? 'desc' : 'asc';
                    } else {
                        AppState.playerSortState.key = key;
                        AppState.playerSortState.dir = 'asc';
                    }
                    renderPlayersListAdmin(document.getElementById('player-search-input').value);
                }
            });

            renderPlayersListAdmin();
        },
    };
    
    // --- RENDER FUNCTIONS ---
    function renderDashboardContent() {
        const grid = document.getElementById('dashboard-grid');
        const matchDateEl = document.getElementById('dashboard-match-date');
        if (!grid || !matchDateEl) return;

        const latestMatch = AppState.matches[0];
        if (!latestMatch) {
            grid.innerHTML = '<p>No hay partidos cargados.</p>';
            return;
        }

        const matchDate = new Date(latestMatch.match_date + 'T00:00:00');
        matchDateEl.textContent = `Próximo partido: ${matchDate.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }

    function renderPlayersListAdmin(searchTerm = '') {
        const tableBody = document.getElementById('players-list-admin');
        if (!tableBody) return;

        const normalizedSearch = searchTerm.toLowerCase();
        let filteredPlayers = AppState.players.filter(p => p.name.toLowerCase().includes(normalizedSearch));

        const { key, dir } = AppState.playerSortState;
        filteredPlayers.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            const compareResult = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return dir === 'asc' ? compareResult : -compareResult;
        });

        tableBody.innerHTML = filteredPlayers.map(p => `
            <tr class="selectable-row border-b border-border-color cursor-pointer" data-player-id="${p.id}">
                <td class="p-2">${p.id}</td>
                <td class="p-2 text-left">${p.name}</td>
                <td class="p-2">${p.status}</td>
                <td class="p-2">${p.role}</td>
            </tr>
        `).join('');

        tableBody.querySelectorAll('.selectable-row').forEach(row => {
            row.addEventListener('click', () => {
                tableBody.querySelectorAll('.selected').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                const player = AppState.players.find(p => p.id == row.dataset.playerId);
                if (player) populatePlayerForm(player);
            });
        });
    }

    function populatePlayerForm(player) {
        document.getElementById('player-id').value = player.id;
        document.getElementById('player-name').value = player.name;
        document.getElementById('player-status').value = player.status;
        document.getElementById('player-role').value = player.role;
        document.getElementById('player-photo-preview').src = player.photo_url || 'https://placehold.co/128x128/e2e8f0/64748b?text=⚽';
    }

    function clearPlayerForm() {
        document.getElementById('player-form').reset();
        document.getElementById('player-id').value = '';
        document.getElementById('player-photo-preview').src = 'https://placehold.co/128x128/e2e8f0/64748b?text=⚽';
        document.querySelectorAll('#players-list-admin .selected').forEach(r => r.classList.remove('selected'));
    }

    // --- EVENT HANDLERS (CRUD) ---
    async function handleSavePlayer(e) {
        e.preventDefault();
        const id = document.getElementById('player-id').value;
        const name = document.getElementById('player-name').value;
        const status = document.getElementById('player-status').value;
        const role = document.getElementById('player-role').value;
        const photoFile = document.getElementById('player-photo-input').files[0];

        const playerData = { name, status, role };

        try {
            let error, data;
            if (id) {
                ({ error, data } = await supabase.from('players').update(playerData).eq('id', id).select().single());
            } else {
                ({ error, data } = await supabase.from('players').insert(playerData).select().single());
            }
            if (error) throw error;

            if (photoFile) {
                const newPlayerId = data.id;
                const filePath = `${newPlayerId}/${photoFile.name}`;
                const { publicUrl, error: uploadError } = await uploadFile('player-photos', filePath, photoFile);
                if (uploadError) throw uploadError;
                
                const { error: updateError } = await supabase.from('players').update({ photo_url: publicUrl }).eq('id', newPlayerId);
                if (updateError) throw updateError;
            }

            UI.showNotification('Jugador guardado con éxito', 'success');
            clearPlayerForm();
            // Recargar datos y renderizar
            AppState.players = await getPlayers();
            renderPlayersListAdmin();

        } catch (error) {
            UI.showNotification(`Error al guardar jugador: ${error.message}`, 'error');
        }
    }

    async function handleDeletePlayer() {
        const id = document.getElementById('player-id').value;
        if (!id) {
            UI.showNotification('Selecciona un jugador para eliminar.', 'warning');
            return;
        }

        const confirmed = await UI.showConfirmModal({
            title: 'Confirmar Eliminación',
            message: `¿Estás seguro de que quieres eliminar a este jugador? Esta acción no se puede deshacer.`
        });

        if (confirmed) {
            const { error } = await supabase.from('players').delete().eq('id', id);
            if (error) {
                UI.showNotification(`Error al eliminar: ${error.message}`, 'error');
            } else {
                UI.showNotification('Jugador eliminado.', 'success');
                clearPlayerForm();
                // Recargar datos y renderizar
                AppState.players = await getPlayers();
                renderPlayersListAdmin();
            }
        }
    }

    // --- REALTIME ---
    function setupRealtimeSubscriptions() {
        if (AppState.realtimeChannel) {
            supabase.removeChannel(AppState.realtimeChannel);
        }
        const channel = supabase.channel('public:admin_changes');
        channel
            .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
                console.log('Change received!', payload);
                // Recargar todos los datos para mantener la consistencia
                const [players, matches, users] = await Promise.all([
                    getPlayers(), 
                    getMatches(), 
                    AppState.userRole === 'Admin' ? getUsersWithRoles() : Promise.resolve(AppState.users)
                ]);
                AppState.players = players;
                AppState.matches = matches;
                AppState.users = users;

                // Re-renderizar la vista actual
                const currentTab = window.location.hash.substring(1) || 'dashboard';
                renderPage(currentTab);
            })
            .subscribe();
        AppState.realtimeChannel = channel;
    }

    // --- GLOBAL EVENT LISTENERS ---
    function setupGlobalEventListeners() {
        DOMElements.loginForm.addEventListener('submit', handleLogin);
        DOMElements.mobileMenuToggle.addEventListener('click', openMobileMenu);
        DOMElements.mobileMenuOverlay.addEventListener('click', closeMobileMenu);
        
        document.addEventListener('click', (e) => {
            const openDropdown = document.querySelector('.user-menu-dropdown:not(.hidden)');
            if (openDropdown && !e.target.closest('.user-menu-button')) {
                openDropdown.classList.add('hidden');
            }
        });
    }

    // --- START THE APP ---
    init();
});
