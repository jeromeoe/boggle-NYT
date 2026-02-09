# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `boggle-web` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Get Your API Credentials

1. In your project dashboard, click the **Settings** icon (⚙️) in the sidebar
2. Navigate to **API** section
3. Copy these values:
   - **Project URL** → Goes in `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Create `.env.local` in your project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Run Database Migrations

### If this is your FIRST setup:

1. In Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **New Query**
3. Copy the contents of `sql/01_users_schema.sql` and paste into the editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Repeat for:
   - `sql/02_rls_policies.sql`
   - `sql/03_functions.sql`

⚠️ **Important**: Run them in order (01, 02, 03)!

### If you ALREADY ran the migrations and got RLS errors:

The original RLS policies used `auth.uid()` which doesn't work with custom username/password auth. Here's how to fix:

1. In Supabase **SQL Editor**, run `sql/00_drop_policies.sql` first
2. Then run `sql/02_rls_policies.sql` again to create the fixed policies
3. Try creating an account again - it should work now!

**Why the error happened**: The old policies checked for Supabase's built-in authentication (`auth.uid()`), but we're using custom username/password authentication. The new policies allow operations without auth.uid() checks, with security enforced in the application layer instead.

## Step 4: Verify Setup

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `users`
   - `game_stats`
   - `daily_challenges`
   - `daily_leaderboard`

3. Click on `users` table → **Policies** tab
4. You should see RLS policies like "Users can view own profile"

## Step 5: Test Authentication

1. Start your dev server: `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000)
3. Click "Sign In" and create an account
4. Check Supabase **Table Editor** → `users` table
5. You should see your new user!

## Optional: Disable Email Confirmations

Since we're using username/password (not email auth), you can disable email confirmations:

1. Go to **Authentication** → **Providers** → **Email**
2. Disable "Confirm email"
3. Save changes

This prevents Supabase from sending verification emails.

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file has correct values
- Restart dev server after changing `.env.local`
- Make sure there are no extra spaces in the keys

### "Row Level Security" errors
- Ensure all RLS policies are created (check `sql/02_rls_policies.sql`)
- Go to Table Editor → select table → Policies tab to verify

### Users can't sign up
- Check browser console for errors
- Verify `users` table exists with correct columns
- Check SQL Editor for any migration errors (red text)

### "Cannot find module '@supabase/supabase-js'"
- Run `npm install` to ensure all dependencies are installed

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Open an issue on GitHub

---

Happy building! 🚀
