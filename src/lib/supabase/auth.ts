import { supabase } from './client';
import bcrypt from 'bcryptjs';

/**
 * Sign up with username and password
 * Email is optional (for password reset only)
 */
export async function signUp(username: string, password: string, email?: string, displayName?: string) {
    try {
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username.toLowerCase(),
                    email: email?.toLowerCase(),
                    password_hash: passwordHash,
                    display_name: displayName || username,
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return { user: data, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
}

/**
 * Sign in with username and password
 */
export async function signIn(username: string, password: string) {
    try {
        // Get user by username
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username.toLowerCase())
            .single();

        if (fetchError || !user) {
            throw new Error('Invalid username or password');
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid username or password');
        }

        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        return { user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
}

/**
 * Sign out (clear local session)
 */
export function signOut() {
    localStorage.removeItem('boggle_user');
    localStorage.removeItem('boggle_session');
}

/**
 * Get current user from local storage
 */
export function getCurrentUser() {
    const userStr = localStorage.getItem('boggle_user');
    if (!userStr) return null;
    return JSON.parse(userStr);
}

/**
 * Save user session to local storage
 */
export function saveUserSession(user: any) {
    localStorage.setItem('boggle_user', JSON.stringify(user));
    localStorage.setItem('boggle_session', new Date().toISOString());
}
