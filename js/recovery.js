/**
 * @file Módulo para la página de recuperación de contraseña.
 * Gestiona el envío del email de reseteo y la actualización de la nueva contraseña.
 */

import * as Auth from './auth.js';
import * as UI from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const requestResetContainer = document.getElementById('request-reset-container');
    const updatePasswordContainer = document.getElementById('update-password-container');
    const requestResetForm = document.getElementById('request-reset-form');
    const updatePasswordForm = document.getElementById('update-password-form');
    const requestMessage = document.getElementById('request-message');
    const updateMessage = document.getElementById('update-message');

    // Inicializar el tema (claro/oscuro)
    UI.setupTheme();

    // --- LÓGICA DE VISIBILIDAD DE CONTRASEÑA ---
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        const passwordInput = toggle.closest('.relative').querySelector('input[type="password"]');
        const icon = toggle.querySelector('i');
        if (!passwordInput) return;

        toggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });

        passwordInput.addEventListener('blur', () => {
            passwordInput.type = 'password';
            icon.classList.add('fa-eye');
            icon.classList.remove('fa-eye-slash');
        });
    });

    // --- LÓGICA PRINCIPAL DE RECUPERACIÓN ---
    Auth.onAuthStateChange((event) => {
        // Si el usuario llega a esta página con un token de recuperación en la URL,
        // Supabase dispara este evento.
        if (event === 'PASSWORD_RECOVERY') {
            requestResetContainer.classList.add('hidden');
            updatePasswordContainer.classList.remove('hidden');
        }
    });

    // Formulario para solicitar el enlace de reseteo
    requestResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;
        const button = e.submitter;

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        requestMessage.textContent = '';

        const { error } = await Auth.sendPasswordResetEmail(email);

        if (error) {
            requestMessage.textContent = `Error: ${error.message}`;
            requestMessage.style.color = 'var(--danger-color)';
            button.disabled = false;
            button.textContent = 'Enviar enlace de recuperación';
        } else {
            requestMessage.textContent = '¡Enlace enviado! Revisa tu correo.';
            requestMessage.style.color = 'var(--success-color)';
            // No redirigir, el usuario debe hacer clic en el enlace de su email.
        }
    });

    // Formulario para establecer la nueva contraseña
    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const button = e.submitter;

        updateMessage.style.color = 'var(--danger-color)';
    
        if (newPassword.length < 8) {
            updateMessage.textContent = 'La contraseña debe tener al menos 8 caracteres.';
            return;
        }
        if (newPassword !== confirmPassword) {
            updateMessage.textContent = 'Las contraseñas no coinciden.';
            return;
        }
    
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        updateMessage.textContent = '';

        const { error } = await Auth.updateUserPassword(newPassword);
    
        if (error) {
            if (error.message.toLowerCase().includes('password should contain') || error.message.includes('weak password')) {
                updateMessage.textContent = 'Contraseña débil. Debe incluir mayúsculas, minúsculas, números y símbolos.';
            } else {
                updateMessage.textContent = `Error: ${error.message}`;
            }
            button.disabled = false;
            button.innerHTML = 'Guardar nueva contraseña';
        } else {
            updateMessage.textContent = '¡Contraseña actualizada! Redirigiendo al login...';
            updateMessage.style.color = 'var(--success-color)';
            setTimeout(() => { window.location.href = 'admin.html'; }, 3000);
        }
    });
});
