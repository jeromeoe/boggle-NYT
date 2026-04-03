import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client using the service role key.
 * ONLY used in server-side API routes — never exposed to the browser.
 * The service role bypasses Row Level Security and can read password_hash.
 */
export function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }

    return createClient(url, key);
}
