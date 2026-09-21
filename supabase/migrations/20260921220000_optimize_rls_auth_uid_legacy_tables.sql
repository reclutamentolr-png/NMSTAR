-- Performance fix, part 2: same auth_rls_initplan fix as
-- 20260921210000_optimize_rls_auth_uid.sql, applied to the tables that
-- predate this project's migrations folder (profiles, MemoLife, admin,
-- matrix, listings, messages, link-in-bio).
--
-- Uses ALTER POLICY instead of DROP + CREATE. These policies weren't
-- authored in this session, so their exact `TO <role>` grant isn't known
-- here — ALTER POLICY only replaces the USING/WITH CHECK expression and
-- leaves every other attribute (roles, command) exactly as it already is,
-- so there's no risk of silently widening a policy to a role it wasn't
-- granted to. Every expression below was copied verbatim from a
-- pg_policies introspection query against the live database before being
-- wrapped in `(select auth.uid())`, so this reproduces exactly what's
-- already running today.

BEGIN;

-- profiles
ALTER POLICY "Users can view own profile" ON profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can update own profile" ON profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "admin_can_update_profiles" ON profiles
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));

ALTER POLICY "admin_can_view_all_profiles" ON profiles
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));

ALTER POLICY "users_update_own_last_seen" ON profiles
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

ALTER POLICY "users_insert_own_profile" ON profiles
  WITH CHECK ((select auth.uid()) = id);

-- link_in_bio — this table had two policies per write command (an older
-- "Users can ... their own link in bio" set and a newer "users_*_own_bio"
-- set) with byte-for-byte equivalent conditions, just with the two sides of
-- the comparison swapped (`auth.uid() = user_id` vs `user_id = auth.uid()`).
-- Postgres was evaluating both on every INSERT/UPDATE for no behavioral
-- difference. The duplicates are dropped here (their conditions are exactly
-- reproduced by the surviving users_*_own_bio policy altered right after),
-- keeping the naming already used for SELECT.
DROP POLICY IF EXISTS "Users can update their own link in bio" ON link_in_bio;
DROP POLICY IF EXISTS "Users can insert their own link in bio" ON link_in_bio;

ALTER POLICY "users_view_own_bio" ON link_in_bio
  USING (user_id = (select auth.uid()));

ALTER POLICY "users_update_own_bio" ON link_in_bio
  USING (user_id = (select auth.uid()));

ALTER POLICY "users_insert_own_bio" ON link_in_bio
  WITH CHECK (user_id = (select auth.uid()));

-- contacts (MemoLife)
ALTER POLICY "Users can view own contacts" ON contacts
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own contacts" ON contacts
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own contacts" ON contacts
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own contacts" ON contacts
  USING ((select auth.uid()) = user_id);

-- appointments (MemoLife)
ALTER POLICY "Users can view own appointments" ON appointments
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own appointments" ON appointments
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own appointments" ON appointments
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own appointments" ON appointments
  USING ((select auth.uid()) = user_id);

-- tasks (MemoLife)
ALTER POLICY "Users can view own tasks" ON tasks
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own tasks" ON tasks
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own tasks" ON tasks
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own tasks" ON tasks
  USING ((select auth.uid()) = user_id);

-- bills (MemoLife)
ALTER POLICY "Users can view own bills" ON bills
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own bills" ON bills
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own bills" ON bills
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own bills" ON bills
  USING ((select auth.uid()) = user_id);

-- notes (MemoLife)
ALTER POLICY "Users can view own notes" ON notes
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own notes" ON notes
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own notes" ON notes
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own notes" ON notes
  USING ((select auth.uid()) = user_id);

-- admin_users
ALTER POLICY "read_own_admin_user" ON admin_users
  USING ((select auth.uid()) = user_id);

-- marketplace_settings
ALTER POLICY "admin_manage_marketplace_settings" ON marketplace_settings
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));

-- marketplace_usage
ALTER POLICY "users_view_own_usage" ON marketplace_usage
  USING (
    (user_id = (select auth.uid()))
    OR (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())))
  );

ALTER POLICY "users_insert_own_usage" ON marketplace_usage
  WITH CHECK (user_id = (select auth.uid()));

-- system_settings
ALTER POLICY "admin_manage_system_settings" ON system_settings
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));

-- matrix_nodes
ALTER POLICY "users_insert_own_matrix_node" ON matrix_nodes
  WITH CHECK ((select auth.uid()) = user_id);

-- listings (Bacheca Annunci)
ALTER POLICY "Utenti possono creare annunci" ON listings
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Utenti possono modificare i propri annunci" ON listings
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Utenti possono eliminare i propri annunci" ON listings
  USING ((select auth.uid()) = user_id);

-- messages
ALTER POLICY "Utenti possono vedere i propri messaggi" ON messages
  USING (((select auth.uid()) = sender_id) OR ((select auth.uid()) = receiver_id));

ALTER POLICY "Utenti possono inviare messaggi" ON messages
  WITH CHECK ((select auth.uid()) = sender_id);

ALTER POLICY "Utenti possono aggiornare i messaggi ricevuti" ON messages
  USING ((select auth.uid()) = receiver_id)
  WITH CHECK ((select auth.uid()) = receiver_id);

COMMIT;
