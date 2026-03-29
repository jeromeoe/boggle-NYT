import type { User } from './client';

/**
 * Sign in via server-side API route.
 * Password comparison happens server-side — password_hash never reaches the browser.
 */
export async function signIn(
    username: string,
    password: string
): Promise<{ user: User | null; error: string | null }> {
    try {
        const res = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) return { user: null, error: data.error };
        return { user: data.user as User, error: null };
    } catch {
        return { user: null, error: 'Network error. Please try again.' };
    }
}

/**
 * Sign up via server-side API route.
 * Password hashing happens server-side.
 */
export async function signUp(
    username: string,
    password: string,
    email?: string,
    displayName?: string
): Promise<{ user: User | null; error: string | null }> {
    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email: email || undefined, displayName }),
        });
        const data = await res.json();
        if (!res.ok) return { user: null, error: data.error };
        return { user: data.user as User, error: null };
    } catch {
        return { user: null, error: 'Network error. Please try again.' };
    }
}

/**
 * Sign out: clear the httpOnly session cookie and local cache.
 */
export async function signOut(): Promise<void> {
    localStorage.removeItem('boggle_user');
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
}

/**
 * Get the current user from the local cache (fast, synchronous).
 * The cache is set by saveUserSession after a successful auth.
 */
export function getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('boggle_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr) as User;
    } catch {
        return null;
    }
}

/**
 * Cache non-sensitive user data locally for quick access (no password_hash).
 * The real session lives in the httpOnly cookie set by the API routes.
 */
export function saveUserSession(user: User): void {
    const safeUser: User = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        created_at: user.created_at,
    };
    localStorage.setItem('boggle_user', JSON.stringify(safeUser));
}

/**
 * Send a password reset email for the given username.
 * Always returns a generic message to prevent username enumeration.
 */
export async function forgotPassword(username: string): Promise<{ message: string }> {
    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });
        return res.json();
    } catch {
        return { message: 'If that account has an email address on file, a reset link has been sent.' };
    }
}
