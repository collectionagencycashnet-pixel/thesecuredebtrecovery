-- Supabase RLS policies for safe admin deletes
-- Two recommended approaches are provided:
-- 1) Claim-based: Allow deletes only for JWTs containing a custom boolean claim `is_admin`.
-- 2) Admin-table-based: Maintain an `admin_users` table of allowed admin `uid`s and allow deletes only for those uids.

-- IMPORTANT: Do NOT expose your `service_role` key to the client. Using the service_role key from a server-side function is still the safest option.

-- -------------------------------
-- Option A — Claim-based (requires issuing JWTs with custom claim `is_admin=true`)
-- Use this if you can issue admin JWTs with a custom claim (advanced).

-- Enable RLS for the table
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Policy: allow delete only when the JWT contains is_admin=true
CREATE POLICY allow_admin_delete_by_claim ON public.loan_applications
  FOR DELETE
  USING ( (auth.jwt() ->> 'is_admin')::boolean = true );

-- Notes:
-- - You must ensure admin tokens include the claim `is_admin: true`.
-- - Supabase Auth does not by default provide arbitrary custom claims; you will need to mint such a token server-side (service role) or use another identity provider that includes the claim.

-- -------------------------------
-- Option B — Admin table (recommended when using Supabase Auth users)
-- Create a small table of admin user uids and check auth.uid against it.

-- Create admin table (run once)
CREATE TABLE IF NOT EXISTS public.admin_users (
  uid uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Example: add an admin user (replace <ADMIN_UID> with the user's uid from Auth)
-- INSERT INTO public.admin_users (uid) VALUES ('<ADMIN_UID>');

-- Enable RLS for the applications table (if not already enabled)
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Policy: allow delete only when current auth.uid is present in admin_users
CREATE POLICY allow_admin_delete_by_uid ON public.loan_applications
  FOR DELETE
  USING ( auth.uid() IN (SELECT uid FROM public.admin_users) );

-- Notes:
-- - To get an admin user's `uid`: in Supabase Dashboard → Authentication → Users, copy the user `id`.
-- - Insert that `uid` into `public.admin_users` to grant delete rights.
-- - This approach does not require custom JWT claims and is easier to manage.

-- Optional: grant insert/select on admin_users to the authenticated role so you can manage admin_users via API
-- GRANT SELECT, INSERT, DELETE ON public.admin_users TO authenticated;

-- Testing tips:
-- - After applying the policy, attempt a DELETE from the client as the admin user (make sure you are signed in as that user).
-- - If the DELETE is rejected, check the user's uid and that it's present in `admin_users`.
-- - If you need server-side deletion, prefer using a serverless function with the service_role key as implemented in netlify/functions/clear-applications.js
