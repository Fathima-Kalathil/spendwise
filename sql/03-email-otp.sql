-- Run ONCE on your existing database (Vercel > Storage > Query, Read-only off).
-- Adds email verification. Everyone who already has an account is marked as verified.
DO $outer$
BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp;
  UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL;
  CREATE TABLE IF NOT EXISTS email_otps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    expires_at timestamp NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_sent_at timestamp DEFAULT now() NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
  CREATE INDEX IF NOT EXISTS email_otps_user_idx ON email_otps USING btree (user_id);
END
$outer$;
