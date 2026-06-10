ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS google_linked_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_subject
    ON auth.users(google_subject)
    WHERE google_subject IS NOT NULL;