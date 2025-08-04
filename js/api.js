/**
 * @file Módulo API para la interacción con Supabase.
 * Centraliza todas las llamadas a la base de datos.
 */

// Importamos el cliente de Supabase desde la CDN.
// Es importante usar la misma versión que en los HTML originales.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Las variables de configuración se cargan globalmente desde config.js
// en el HTML antes de que se ejecute este script de tipo módulo.
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Exportamos el cliente de Supabase como el valor por defecto para que
// otros módulos puedan importarlo y usarlo.
export default supabase;

/**
 * Obtiene todos los jugadores de la base de datos.
 * @returns {Promise<Array>} Una promesa que se resuelve con un array de jugadores.
 */
export async function getPlayers() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('id', { ascending: true });
        
    if (error) {
        console.error('Error fetching players:', error);
        return [];
    }
    return data;
}

/**
 * Obtiene todos los partidos de la base de datos, ordenados por fecha descendente.
 * @returns {Promise<Array>} Una promesa que se resuelve con un array de partidos.
 */
export async function getMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false });

    if (error) {
        console.error('Error fetching matches:', error);
        return [];
    }
    return data;
}

/**
 * Obtiene todos los usuarios y sus roles (función RPC para Admins).
 * @returns {Promise<Array>} Una promesa que se resuelve con un array de usuarios.
 */
export async function getUsersWithRoles() {
    const { data, error } = await supabase.rpc('get_all_users_with_roles');
    
    if (error) {
        console.error('Error fetching users with roles:', error);
        return [];
    }
    return data;
}

/**
 * Sube un archivo a un bucket de Supabase Storage.
 * @param {string} bucket - El nombre del bucket (ej. 'player-photos', 'avatars').
 * @param {string} filePath - La ruta/nombre del archivo dentro del bucket.
 * @param {File} file - El objeto File para subir.
 * @returns {Promise<object>} Un objeto con `publicUrl` o `error`.
 */
export async function uploadFile(bucket, filePath, file) {
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        console.error(`Error uploading to ${bucket}:`, uploadError);
        return { error: uploadError };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    
    return { publicUrl: data.publicUrl, error: null };
}
