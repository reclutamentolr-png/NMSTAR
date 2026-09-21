-- profiles.is_admin is referenced throughout the admin code (verifyAdmin's
-- full-admin bypass in src/app/actions/admin.ts, the maintenance gate in
-- src/app/actions/system.ts, the admin panel access check and the profile
-- editor's "Amministratore" checkbox) but was never captured in a tracked
-- migration — it predates migration tracking and, per the "Could not find
-- the 'is_admin' column of 'profiles' in the schema cache" error, does not
-- actually exist in the database. Every read of it has been silently
-- failing (errors ignored) and falling through to the admin_users/role
-- check instead; only the profile-save path surfaces the PostgREST error,
-- which is how this was noticed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
