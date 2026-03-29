import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client using the service role key.
 * ONLY used in server-side API routes — never exposed to the browser.
 * The service role bypasses Row Level Security and can read password_hash.
 */
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
