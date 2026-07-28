/*
# Create profiles table for analyst account metadata

1. Purpose
   This migration adds a `profiles` table that stores per-analyst metadata
   that does not belong in Supabase Auth's `auth.users` table — specifically
   the analyst's display name (first + last name collected at registration).

2. New Tables
   - `profiles`
     - `id` (uuid, primary key) — matches the auth user's id (auth.users.id).
     - `display_name` (text, not null) — the friendly name shown in the UI.
     - `first_name` (text) — first name collected at registration.
     - `last_name` (text) — last name collected at registration.
     - `created_at` (timestamptz, default now()) — account creation date.
     - `last_login_at` (timestamptz, nullable) — last successful sign-in time.

3. Security (RLS)
   - Enable RLS on `profiles`.
   - Owner-scoped CRUD: each authenticated user can only read, insert, update,
     and delete their own profile row (matched on `id = auth.uid()`).
   - The `id` column defaults to `auth.uid()` so an insert that omits the id
     still satisfies the INSERT policy's WITH CHECK.

4. Notes
   - This table is purely supplementary to auth.users; authentication,
     passwords, OAuth, and MFA factors all remain managed by Supabase Auth.
   - No service-role keys are used in the frontend; all access is through the
     anon key with an authenticated session.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);
