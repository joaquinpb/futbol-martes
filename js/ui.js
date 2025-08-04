/**
 * @file Módulo de Interfaz de Usuario (UI).
 * Contiene funciones reutilizables para manipular el DOM, como modales,
 * notificaciones, menús y gestión del tema.
 */

// ==========================================================================
// Gestión del Tema (Modo Oscuro/Claro)
// ==========================================================================

/**
 * Aplica el tema especificado (claro u oscuro) al documento.
 * @param {'light' | 'dark'} theme - El tema a aplicar.
 */
function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);

    const isDark = theme === 'dark';
    const themeIcons = document.querySelectorAll('.theme-toggle-icon');

    themeIcons.forEach(icon => {
        if (icon) {
            icon.classList.toggle('fa-sun', isDark);
            icon.classList.toggle('fa-moon', !isDark);
        }
    });
}

/**
 * Cambia entre el tema claro y oscuro.
 */
function toggleTheme() {
    const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(newTheme);
}

/**
 * Configura los listeners para los botones de cambio de tema y aplica el tema guardado.
 */
export function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    document.body.addEventListener('click', e => {
        if (e.target.closest('.theme-toggle-button')) {
            toggleTheme();
        }
    });
}


// ==========================================================================
// Notificaciones y Modales
// ==========================================================================

/**
 * Muestra una notificación flotante.
 * @param {string} message - El mensaje a mostrar.
 * @param {'success' | 'error' | 'warning'} type - El tipo de notificación.
 */
export function showNotification(message, type = 'success') {
    const modal = document.getElementById('notification-modal');
    const content = document.getElementById('notification-content');
    const icon = document.getElementById('notification-icon');
    const messageEl = document.getElementById('notification-message');

    if (!modal || !content || !icon || !messageEl) return;

    messageEl.innerHTML = message;
    content.className = 'flex items-center gap-4 text-white font-semibold p-6 rounded-lg shadow-xl max-w-sm w-full'; // Reset classes
    icon.className = 'fas fa-2x'; // Reset classes

    switch (type) {
        case 'error':
            content.classList.add('bg-danger-color');
            icon.classList.add('fa-times-circle');
            break;
        case 'warning':
            content.classList.add('bg-warning-color');
            icon.classList.add('fa-exclamation-triangle');
            break;
        default: // success
            content.classList.add('bg-success-color');
            icon.classList.add('fa-check-circle');
            break;
    }

    modal.classList.remove('hidden');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 3500);
}

/**
 * Muestra un modal de confirmación genérico.
 * @param {object} options - Opciones para el modal.
 * @param {string} options.title - Título del modal.
 * @param {string} options.message - Mensaje del modal.
 * @param {string} [options.confirmText='Confirmar'] - Texto del botón de confirmación.
 * @param {string} [options.cancelText='Cancelar'] - Texto del botón de cancelación.
 * @param {string} [options.confirmClass='button-danger'] - Clase de color para el botón de confirmación.
 * @returns {Promise<boolean>} Una promesa que se resuelve a `true` si se confirma, o `false` si se cancela.
 */
export function showConfirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = 'button-danger' }) {
    return new Promise(resolve => {
        const modal = document.getElementById('custom-confirm-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-button');
        const cancelBtn = document.getElementById('modal-cancel-button');

        if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
            resolve(false); // No se puede mostrar el modal
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        // Limpia clases viejas y añade la nueva
        confirmBtn.className = `px-4 py-2 font-semibold rounded-md hover:opacity-90 transition ${confirmClass}`;

        const cleanup = (result) => {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            modal.removeEventListener('click', overlayClickHandler);
            resolve(result);
        };

        const confirmHandler = () => cleanup(true);
        const cancelHandler = () => cleanup(false);
        const overlayClickHandler = (e) => {
            if (e.target === modal) {
                cleanup(false);
            }
        };

        confirmBtn.addEventListener('click', confirmHandler, { once: true });
        cancelBtn.addEventListener('click', cancelHandler, { once: true });
        modal.addEventListener('click', overlayClickHandler);

        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    });
}


// ==========================================================================
// Renderizado de Componentes de UI
// ==========================================================================

/**
 * Renderiza el menú de usuario en los contenedores de escritorio y móvil.
 * @param {object} user - El objeto de usuario de Supabase.
 * @param {object} profile - El objeto de perfil de la base de datos.
 * @param {function} onSignOut - Callback para ejecutar al cerrar sesión.
 * @param {function} onChangeName - Callback para abrir el modal de cambiar nombre.
 * @param {function} onChangePassword - Callback para abrir el modal de cambiar contraseña.
 * @param {function} onAvatarClick - Callback para abrir el modal de avatar.
 */
export function renderUserMenu({ user, profile, onSignOut, onChangeName, onChangePassword, onAvatarClick }) {
    const desktopContainer = document.getElementById('user-menu-container');
    const mobileContainer = document.getElementById('mobile-user-menu-container');
    if (!desktopContainer || !mobileContainer) return;

    const userName = profile?.name || user.email.split('@')[0];
    const userEmail = user.email;
    const avatarSrc = profile?.avatar_url ? `${profile.avatar_url}?t=${new Date().getTime()}` : 'https://placehold.co/128x128/e2e8f0/64748b?text=⚽';

    const dropdownHTML = `
        <div class="user-menu-dropdown card card-styled hidden origin-top-right absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg py-1 text-sm z-50">
            <div class="px-4 py-2 border-b border-border-color text-center">
                <div class="avatar-trigger mt-2 mb-3 flex justify-center cursor-pointer group">
                    <div class="relative">
                        <img src="${avatarSrc}" alt="Avatar de usuario" class="w-24 h-24 rounded-full object-cover border-4 border-border-color group-hover:opacity-75 transition-opacity">
                        <div class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <i class="fas fa-camera text-white text-3xl"></i>
                        </div>
                    </div>
                </div>
                <p class="font-semibold truncate text-text-primary text-base">${userName}</p>
                <p class="text-xs text-text-secondary truncate">${userEmail}</p>
            </div>
            <div class="py-1">
                <a href="#" class="change-name-trigger dropdown-item flex items-center gap-3 px-4 py-2 text-text-primary"><i class="fas fa-user-edit w-5 text-center"></i>Cambiar nombre</a>
                <a href="#" class="change-password-trigger dropdown-item flex items-center gap-3 px-4 py-2 text-text-primary"><i class="fas fa-key w-5 text-center"></i>Cambiar contraseña</a>
                <div class="border-t border-border-color my-1"></div>
                <button class="theme-toggle-button dropdown-item w-full text-left flex items-center gap-3 px-4 py-2 text-text-primary">
                    <i class="fas fa-moon w-5 text-center theme-toggle-icon"></i>
                    <span>Modo Oscuro</span>
                </button>
                <div class="border-t border-border-color my-1"></div>
                <a href="#" class="signout-trigger dropdown-item flex items-center gap-3 px-4 py-2 text-danger-color">
                    <i class="fas fa-sign-out-alt w-5 text-center"></i>
                    <span>Cerrar Sesión</span>
                </a>
            </div>
        </div>
    `;

    const headerAvatarHTML = `<img src="${avatarSrc}" alt="Avatar" class="w-8 h-8 rounded-full object-cover border-2 border-white/50 hover:border-white transition-all">`;

    desktopContainer.innerHTML = `
        <button class="user-menu-button flex items-center gap-3 p-1 rounded-full hover:bg-white/20 transition-colors">
            <span class="font-semibold text-sm hidden sm:inline truncate max-w-[100px] text-white">${userName}</span>
            ${headerAvatarHTML}
        </button>
        ${dropdownHTML}
    `;

    mobileContainer.innerHTML = `
        <button class="user-menu-button flex items-center">
             ${headerAvatarHTML}
        </button>
        ${dropdownHTML}
    `;

    // Re-asociar eventos
    document.querySelectorAll('.user-menu-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = button.nextElementSibling;
            dropdown.classList.toggle('hidden');
        });
    });

    document.querySelectorAll('.avatar-trigger').forEach(trigger => trigger.addEventListener('click', onAvatarClick));
    document.querySelectorAll('.change-name-trigger').forEach(trigger => trigger.addEventListener('click', onChangeName));
    document.querySelectorAll('.change-password-trigger').forEach(trigger => trigger.addEventListener('click', onChangePassword));
    document.querySelectorAll('.signout-trigger').forEach(trigger => trigger.addEventListener('click', onSignOut));

    // Asegurarse de que el ícono del tema esté correcto
    applyTheme(localStorage.getItem('theme') || 'light');
}
