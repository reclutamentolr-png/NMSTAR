-- Migration: Admin-managed messages — a broadcast (all users, one JSONB blob
-- per language so each user reads it in their own site locale) or an
-- individual message to a single user. Writes only ever happen from a
-- server action via the service-role client after verifyAdmin() (same
-- principle as coupons/vouchers/rewards in src/app/actions/admin.ts) —
-- there is deliberately no INSERT/UPDATE/DELETE RLS policy for the
-- `authenticated` role on admin_messages itself.

CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('broadcast', 'individual')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title JSONB NOT NULL DEFAULT '{}',
  body JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_messages_target_user_idx ON admin_messages (target_user_id);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Every authenticated user can see active broadcasts and their own
-- individual messages — but only through this SELECT policy, never write.
CREATE POLICY "Users can read messages visible to them"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (is_active AND (type = 'broadcast' OR target_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS admin_message_reads (
  message_id UUID NOT NULL REFERENCES admin_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE admin_message_reads ENABLE ROW LEVEL SECURITY;

-- The dismissal itself IS a normal user action (not admin-gated): a user
-- marking their own message as read.
CREATE POLICY "Users can manage their own read receipts"
  ON admin_message_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SECURITY INVOKER (not DEFINER): the caller's own RLS on admin_messages
-- already scopes this correctly, no privilege elevation needed.
CREATE OR REPLACE FUNCTION get_unread_messages_for_me()
RETURNS SETOF admin_messages
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT m.*
  FROM admin_messages m
  WHERE m.is_active
    AND (m.type = 'broadcast' OR m.target_user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM admin_message_reads r
      WHERE r.message_id = m.id AND r.user_id = auth.uid()
    )
  ORDER BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_unread_messages_for_me() TO authenticated;
