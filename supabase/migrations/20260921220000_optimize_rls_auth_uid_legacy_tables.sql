-- Performance fix, part 2: same auth_rls_initplan fix as
-- 20260921210000_optimize_rls_auth_uid.sql, applied to the tables that
-- predate this project's migrations folder (profiles, MemoLife, admin,
-- matrix, listings, messages, link-in-bio).
--
-- IMPORTANT: the policy names below were guessed from naming conventions
-- used elsewhere in this codebase — they were NOT verified against the
-- live database (no tool in this session has ever had DB access). A
-- previous version of this migration used plain ALTER POLICY statements
-- inside a single transaction, so a single name that didn't match the
-- real database would abort the whole batch with "policy ... does not
-- exist" and roll back everything. This version guards every ALTER
-- POLICY with an existence check: if the name matches, it's altered; if
-- not, it's skipped and reported via RAISE NOTICE (visible in the SQL
-- editor output) instead of failing. After running this, check the
-- NOTICE list for anything skipped — those policies still have the
-- unoptimized bare `auth.uid()` and need their real name confirmed.

DO $$
BEGIN
  -- profiles
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    ALTER POLICY "Users can view own profile" ON profiles USING ((select auth.uid()) = id);
  ELSE
    RAISE NOTICE 'Skipped: profiles / "Users can view own profile" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    ALTER POLICY "Users can update own profile" ON profiles USING ((select auth.uid()) = id);
  ELSE
    RAISE NOTICE 'Skipped: profiles / "Users can update own profile" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_can_update_profiles') THEN
    ALTER POLICY "admin_can_update_profiles" ON profiles
      USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));
  ELSE
    RAISE NOTICE 'Skipped: profiles / "admin_can_update_profiles" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_can_view_all_profiles') THEN
    ALTER POLICY "admin_can_view_all_profiles" ON profiles
      USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));
  ELSE
    RAISE NOTICE 'Skipped: profiles / "admin_can_view_all_profiles" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_update_own_last_seen') THEN
    ALTER POLICY "users_update_own_last_seen" ON profiles
      USING (id = (select auth.uid()))
      WITH CHECK (id = (select auth.uid()));
  ELSE
    RAISE NOTICE 'Skipped: profiles / "users_update_own_last_seen" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_insert_own_profile') THEN
    ALTER POLICY "users_insert_own_profile" ON profiles WITH CHECK ((select auth.uid()) = id);
  ELSE
    RAISE NOTICE 'Skipped: profiles / "users_insert_own_profile" not found';
  END IF;

  -- link_in_bio — drop only if the duplicate legacy policies actually exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'link_in_bio' AND policyname = 'Users can update their own link in bio') THEN
    DROP POLICY "Users can update their own link in bio" ON link_in_bio;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'link_in_bio' AND policyname = 'Users can insert their own link in bio') THEN
    DROP POLICY "Users can insert their own link in bio" ON link_in_bio;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'link_in_bio' AND policyname = 'users_view_own_bio') THEN
    ALTER POLICY "users_view_own_bio" ON link_in_bio USING (user_id = (select auth.uid()));
  ELSE
    RAISE NOTICE 'Skipped: link_in_bio / "users_view_own_bio" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'link_in_bio' AND policyname = 'users_update_own_bio') THEN
    ALTER POLICY "users_update_own_bio" ON link_in_bio USING (user_id = (select auth.uid()));
  ELSE
    RAISE NOTICE 'Skipped: link_in_bio / "users_update_own_bio" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'link_in_bio' AND policyname = 'users_insert_own_bio') THEN
    ALTER POLICY "users_insert_own_bio" ON link_in_bio WITH CHECK (user_id = (select auth.uid()));
  ELSE
    RAISE NOTICE 'Skipped: link_in_bio / "users_insert_own_bio" not found';
  END IF;

  -- contacts (MemoLife)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can view own contacts') THEN
    ALTER POLICY "Users can view own contacts" ON contacts USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: contacts / "Users can view own contacts" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can insert own contacts') THEN
    ALTER POLICY "Users can insert own contacts" ON contacts WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: contacts / "Users can insert own contacts" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can update own contacts') THEN
    ALTER POLICY "Users can update own contacts" ON contacts USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: contacts / "Users can update own contacts" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can delete own contacts') THEN
    ALTER POLICY "Users can delete own contacts" ON contacts USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: contacts / "Users can delete own contacts" not found';
  END IF;

  -- appointments (MemoLife)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Users can view own appointments') THEN
    ALTER POLICY "Users can view own appointments" ON appointments USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: appointments / "Users can view own appointments" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Users can insert own appointments') THEN
    ALTER POLICY "Users can insert own appointments" ON appointments WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: appointments / "Users can insert own appointments" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Users can update own appointments') THEN
    ALTER POLICY "Users can update own appointments" ON appointments USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: appointments / "Users can update own appointments" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Users can delete own appointments') THEN
    ALTER POLICY "Users can delete own appointments" ON appointments USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: appointments / "Users can delete own appointments" not found';
  END IF;

  -- tasks (MemoLife)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can view own tasks') THEN
    ALTER POLICY "Users can view own tasks" ON tasks USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: tasks / "Users can view own tasks" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can insert own tasks') THEN
    ALTER POLICY "Users can insert own tasks" ON tasks WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: tasks / "Users can insert own tasks" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can update own tasks') THEN
    ALTER POLICY "Users can update own tasks" ON tasks USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: tasks / "Users can update own tasks" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can delete own tasks') THEN
    ALTER POLICY "Users can delete own tasks" ON tasks USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: tasks / "Users can delete own tasks" not found';
  END IF;

  -- bills (MemoLife)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bills' AND policyname = 'Users can view own bills') THEN
    ALTER POLICY "Users can view own bills" ON bills USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: bills / "Users can view own bills" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bills' AND policyname = 'Users can insert own bills') THEN
    ALTER POLICY "Users can insert own bills" ON bills WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: bills / "Users can insert own bills" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bills' AND policyname = 'Users can update own bills') THEN
    ALTER POLICY "Users can update own bills" ON bills USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: bills / "Users can update own bills" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bills' AND policyname = 'Users can delete own bills') THEN
    ALTER POLICY "Users can delete own bills" ON bills USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: bills / "Users can delete own bills" not found';
  END IF;

  -- notes (MemoLife)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can view own notes') THEN
    ALTER POLICY "Users can view own notes" ON notes USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: notes / "Users can view own notes" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can insert own notes') THEN
    ALTER POLICY "Users can insert own notes" ON notes WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: notes / "Users can insert own notes" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can update own notes') THEN
    ALTER POLICY "Users can update own notes" ON notes USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: notes / "Users can update own notes" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can delete own notes') THEN
    ALTER POLICY "Users can delete own notes" ON notes USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: notes / "Users can delete own notes" not found';
  END IF;

  -- admin_users
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'read_own_admin_user') THEN
    ALTER POLICY "read_own_admin_user" ON admin_users USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: admin_users / "read_own_admin_user" not found';
  END IF;

  -- marketplace_settings
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_settings' AND policyname = 'admin_manage_marketplace_settings') THEN
    ALTER POLICY "admin_manage_marketplace_settings" ON marketplace_settings
      USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));
  ELSE
    RAISE NOTICE 'Skipped: marketplace_settings / "admin_manage_marketplace_settings" not found';
  END IF;

  -- marketplace_usage
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_usage' AND policyname = 'users_view_own_usage') THEN
    ALTER POLICY "users_view_own_usage" ON marketplace_usage
      USING (
        (user_id = (select auth.uid()))
        OR (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())))
      );
  ELSE
    RAISE NOTICE 'Skipped: marketplace_usage / "users_view_own_usage" not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_usage' AND policyname = 'users_insert_own_usage') THEN
    ALTER POLICY "users_insert_own_usage" ON marketplace_usage WITH CHECK (user_id = (select auth.uid()));
  ELSE
    RAISE NOTICE 'Skipped: marketplace_usage / "users_insert_own_usage" not found';
  END IF;

  -- system_settings
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'admin_manage_system_settings') THEN
    ALTER POLICY "admin_manage_system_settings" ON system_settings
      USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (select auth.uid())));
  ELSE
    RAISE NOTICE 'Skipped: system_settings / "admin_manage_system_settings" not found';
  END IF;

  -- matrix_nodes
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matrix_nodes' AND policyname = 'users_insert_own_matrix_node') THEN
    ALTER POLICY "users_insert_own_matrix_node" ON matrix_nodes WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: matrix_nodes / "users_insert_own_matrix_node" not found';
  END IF;

  -- listings (Bacheca Annunci)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Utenti possono creare annunci') THEN
    ALTER POLICY "Utenti possono creare annunci" ON listings WITH CHECK ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: listings / "Utenti possono creare annunci" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Utenti possono modificare i propri annunci') THEN
    ALTER POLICY "Utenti possono modificare i propri annunci" ON listings USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: listings / "Utenti possono modificare i propri annunci" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Utenti possono eliminare i propri annunci') THEN
    ALTER POLICY "Utenti possono eliminare i propri annunci" ON listings USING ((select auth.uid()) = user_id);
  ELSE
    RAISE NOTICE 'Skipped: listings / "Utenti possono eliminare i propri annunci" not found';
  END IF;

  -- messages
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Utenti possono vedere i propri messaggi') THEN
    ALTER POLICY "Utenti possono vedere i propri messaggi" ON messages
      USING (((select auth.uid()) = sender_id) OR ((select auth.uid()) = receiver_id));
  ELSE
    RAISE NOTICE 'Skipped: messages / "Utenti possono vedere i propri messaggi" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Utenti possono inviare messaggi') THEN
    ALTER POLICY "Utenti possono inviare messaggi" ON messages WITH CHECK ((select auth.uid()) = sender_id);
  ELSE
    RAISE NOTICE 'Skipped: messages / "Utenti possono inviare messaggi" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Utenti possono aggiornare i messaggi ricevuti') THEN
    ALTER POLICY "Utenti possono aggiornare i messaggi ricevuti" ON messages
      USING ((select auth.uid()) = receiver_id)
      WITH CHECK ((select auth.uid()) = receiver_id);
  ELSE
    RAISE NOTICE 'Skipped: messages / "Utenti possono aggiornare i messaggi ricevuti" not found';
  END IF;
END $$;
