/**
 * @file Módulo de Autenticación.
 * Gestiona el inicio de sesión, cierre de sesión, estado del usuario y perfiles.
 */

// Importamos el cliente de Supabase desde nuestro módulo API centralizado.
import supabase from './api.js';

/**
 * Inicia sesión de un usuario con email y contraseña.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña del usuario.
 * @returns {Promise<object>} La respuesta de Supabase auth.
 */
export async function signInUser(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<object>} La respuesta de Supabase auth.
 */
export async function signOutUser() {
    return await supabase.auth.signOut();
}

/**
 * Registra una función que se ejecuta cada vez que cambia el estado de autenticación.
 * @param {function} callback - La función a ejecutar (ej. (event, session) => { ... }).
 */
export function onAuthStateChange(callback) {
    supabase.auth.onAuthStateChange(callback);
}

/**
 * Obtiene el usuario autenticado actual y su perfil de la base de datos.
 * @returns {Promise<object|null>} Un objeto con { user, profile } o null si no hay sesión.
 */
export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return null;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, name, avatar_url')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        // Devolvemos el usuario aunque el perfil falle, para no romper la sesión.
        return { user, profile: { role: null, name: user.email.split('@')[0], avatar_url: null } };
    }

    return { user, profile };
}

/**
 * Actualiza el nombre de usuario tanto en el perfil como en los metadatos de auth.
 * @param {string} newName - El nuevo nombre para el usuario.
 * @returns {Promise<object>} Un objeto indicando el resultado de la operación.
 */
export async function updateUserName(newName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Usuario no autenticado." } };

    const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: newName })
        .eq('id', user.id);

    const { error: authError } = await supabase.auth.updateUser({
        data: { name: newName }
    });

    const error = profileError || authError;
    if (error) {
        console.error('Error updating user name:', error);
    }
    return { error };
}

/**
 * Actualiza la contraseña del usuario autenticado.
 * @param {string} newPassword - La nueva contraseña.
 * @returns {Promise<object>} La respuesta de Supabase auth.
 */
export async function updateUserPassword(newPassword) {
    return await supabase.auth.updateUser({ password: newPassword });
}

/**
 * Envía un email para recuperar la contraseña.
 * @param {string} email - El email al que se enviará el enlace.
 * @returns {Promise<object>} La respuesta de Supabase auth.
 */
export async function sendPasswordResetEmail(email) {
    return await supabase.auth.resetPasswordForEmail(email, {
        // Redirige a la misma página donde se solicitó.
        // Supabase añadirá los tokens necesarios a la URL.
        redirectTo: window.location.href,
    });
}
