-- Migration: Add svat_qc_reports table for SVAT QR Check community reports
-- Stores user reports (phishing/scam/impersonation/other) tied to a scanned QR payload

CREATE TABLE IF NOT EXISTS svat_qc_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_data TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('phishing', 'scam', 'impersonation', 'other')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS svat_qc_reports_qr_data_idx ON svat_qc_reports (qr_data);

ALTER TABLE svat_qc_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own report"
  ON svat_qc_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read aggregated reports"
  ON svat_qc_reports FOR SELECT
  TO authenticated
  USING (true);
