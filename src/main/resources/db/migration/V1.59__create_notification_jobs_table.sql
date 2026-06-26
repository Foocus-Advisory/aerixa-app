-- V1.59__create_notification_jobs_table.sql
-- Outbox transactionnel: notification_jobs (in-app, email, whatsapp outbound)

CREATE TABLE IF NOT EXISTS auth.notification_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL,
    job_type VARCHAR(30) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_jobs_establishment
        FOREIGN KEY (establishment_id)
        REFERENCES auth.establishments(id),
    CONSTRAINT ck_notification_jobs_job_type
        CHECK (job_type IN ('IN_APP_NOTIFICATION', 'EMAIL', 'WHATSAPP_OUTBOUND')),
    CONSTRAINT ck_notification_jobs_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER'))
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_next_attempt
    ON auth.notification_jobs(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_establishment
    ON auth.notification_jobs(establishment_id);
