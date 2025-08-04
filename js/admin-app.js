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
                // Lógica para abrir modal de nombre 
            },
            onChangePassword: (e) => { 
                e.preventDefault();
                // Lógica para abrir modal de contraseña 
            },
            onAvatarClick: (e) => { 
                e.preventDefault();
                // Lógica para abrir modal de avatar 
            }
        });
    }

    function setupNavigationMenus() {
        const navHtml = `
            ${NAV_ITEMS.dashboard.map(item => `<a href="#${item.id}" data-tab="${item.id}" class="nav-link nav-link-dashboard ...">${item.name}</a>`).join('')}
            
            <!-- Grupos Colapsables -->
            <div>
                <button class="collapsible-trigger ...">Principal <i class="fas fa-chevron-down"></i></button>
                <div class="collapsible-content ...">
                    ${NAV_ITEMS.main.map(item => `<a href="#${item.id}" data-tab="${item.id}" class="nav-link ...">${item.name}</a>`).join('')}
                </div>
            </div>
            
            ${AppState.userRole === 'Admin' ? `
            <div>
                <button class="collapsible-trigger ...">Administración <i class="fas fa-chevron-down"></i></button>
                <div class="collapsible-content hidden ...">
                    ${NAV_ITEMS.admin.map(item => `<a href="#${item.id}" data-tab="${item.id}" class="nav-link ...">${item.name}</a>`).join('')}
                </div>
            </div>
            ` : ''}

            <div>
                <button class="collapsible-trigger ...">Enlaces <i class="fas fa-chevron-down"></i></button>
                <div class="collapsible-content hidden ...">
                    ${NAV_ITEMS.links.map(item => `<a href="${item.href}" target="${item.target || '_self'}" class="nav-link ...">${item.name}</a>`).join('')}
                </div>
            </div>
        `;
        DOMElements.mainNav.innerHTML = navHtml;
        DOMElements.mobileMenu.innerHTML = `<div class="p-4 border-b">...</div><div class="p-2">${navHtml}</div>`; // Versión simplificada

        // Añadir listeners a los nuevos elementos
        DOMElements.appContainer.querySelectorAll('.collapsible-trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const content = trigger.nextElementSibling;
                content.classList.toggle('hidden');
                trigger.querySelector('i')?.classList.toggle('rotate-180');
            });
        });
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
            if (desktopTitle) desktopTitle.textContent = pageConfig.name;
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabId);
        });

        // Aquí es donde el contenido se inyecta en el DOM
        DOMElements.adminContentArea.innerHTML = getPageTemplate(tabId);
        
        // Llamar a la función controladora de esa página para que añada la lógica
        const controller = pageControllers[tabId];
        if (controller && typeof controller === 'function') {
            controller();
        } else {
            console.warn(`No controller found for tab: ${tabId}`);
        }
    }

    function getPageTemplate(tabId) {
        // Esta función devuelve el esqueleto HTML de cada sección.
        // Es una forma de mantener el HTML fuera de la lógica de JS.
        const templates = {
            dashboard: `<div>Dashboard Content</div>`,
            'team-formation': `<div>Team Formation Content</div>`,
            'players-management': `
                <div class="grid grid-cols-1 lg:grid-cols-3 h-full">
                    <div class="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-border-color">
                        <div class="card h-full">
                            <h3 class="p-3 text-center font-semibold bg-muted">JUGADOR</h3>
                            <div class="p-4">
                                <form id="player-form"><!-- ... Formulario ... --></form>
                            </div>
                        </div>
                    </div>
                    <div class="lg:col-span-2">
                        <div class="card h-full">
                             <h3 class="p-3 text-center font-semibold bg-muted">JUGADORES</h3>
                            <div class="p-4">
                                <input type="text" id="player-search-input" placeholder="Buscar..." class="w-full p-2 border rounded-md mb-4">
                                <div id="players-table-container" class="overflow-y-auto max-h-[70vh]">
                                    <table class="w-full text-sm">
                                        <thead><!-- ... Headers ... --></thead>
                                        <tbody id="players-list-admin"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            // ... más plantillas para cada sección
        };
        return templates[tabId] || `<div class="p-8">Contenido para ${tabId} no encontrado.</div>`;
    }

    // --- PAGE CONTROLLERS ---
    // Cada controlador se encarga de la lógica de una página específica
    const pageControllers = {
        dashboard: () => {
            // Lógica específica del dashboard
            console.log('Initializing Dashboard');
        },
        'players-management': () => {
            console.log('Initializing Players Management');
            // Listeners para el formulario, búsqueda, tabla, etc.
            const form = document.getElementById('player-form');
            form.addEventListener('submit', handleSavePlayer);
            
            const search = document.getElementById('player-search-input');
            search.addEventListener('input', (e) => renderPlayersListAdmin(e.target.value));

            renderPlayersListAdmin();
        },
        // ... más controladores
    };
    
    // --- RENDER FUNCTIONS (Llamadas por los controladores) ---
    function renderPlayersListAdmin(searchTerm = '') {
        const tableBody = document.getElementById('players-list-admin');
        if (!tableBody) return;

        const normalizedSearch = searchTerm.toLowerCase();
        let filteredPlayers = AppState.players.filter(p => p.name.toLowerCase().includes(normalizedSearch));

        // Lógica de ordenamiento (usando AppState.playerSortState)
        // ...

        tableBody.innerHTML = filteredPlayers.map(p => `
            <tr class="selectable-row cursor-pointer" data-player-id="${p.id}">
                <td class="p-2">${p.id}</td>
                <td class="p-2">${p.name}</td>
                <td class="p-2">${p.status}</td>
                <td class="p-2">${p.role}</td>
            </tr>
        `).join('');

        // Re-attach listeners para las filas
        tableBody.querySelectorAll('.selectable-row').forEach(row => {
            row.addEventListener('click', () => {
                // Lógica para poblar el formulario con el jugador seleccionado
            });
        });
    }

    // --- EVENT HANDLERS ---
    async function handleSavePlayer(e) {
        e.preventDefault();
        // Lógica para guardar o actualizar un jugador
        UI.showNotification('Jugador guardado!', 'success');
    }

    // --- REALTIME ---
    function setupRealtimeSubscriptions() {
        const handleChanges = (payload) => {
            console.log('Realtime change received:', payload);
            // Actualizar AppState de forma inteligente
            // ...
            // Re-renderizar la vista actual
            const currentTab = window.location.hash.substring(1) || 'dashboard';
            renderPage(currentTab);
        };

        if (AppState.realtimeChannel) supabase.removeChannel(AppState.realtimeChannel);

        AppState.realtimeChannel = supabase.channel('public:admin_changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, handleChanges)
            .subscribe(status => {
                if (status === 'SUBSCRIBED') console.log('Connected to realtime channel.');
            });
    }

    // --- GLOBAL EVENT LISTENERS ---
    function setupGlobalEventListeners() {
        DOMElements.loginForm.addEventListener('submit', handleLogin);
        DOMElements.mobileMenuToggle.addEventListener('click', openMobileMenu);
        DOMElements.mobileMenuOverlay.addEventListener('click', closeMobileMenu);
        
        // Cerrar menús de usuario al hacer clic fuera
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
