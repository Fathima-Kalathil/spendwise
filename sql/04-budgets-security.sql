-- Run ONCE on your existing database (Vercel > Storage > Query, Read-only off).
-- Adds: budgets, login rate limiting, password reset codes, "log out other devices" support.
-- Safe to run twice. Your existing data is not changed.
DO $outer$
BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
  ALTER TABLE email_otps ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'verify';
  CREATE TABLE IF NOT EXISTS budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
    amount numeric(19, 4) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
  CREATE INDEX IF NOT EXISTS budgets_user_idx ON budgets USING btree (user_id);
  CREATE TABLE IF NOT EXISTS login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    ip text DEFAULT '' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
  CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts USING btree (email, created_at);
END
$outer$;
