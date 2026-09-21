-- Migration: Add subscription_expires_at column to profiles table
-- Adds the column only if it doesn't already exist

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
