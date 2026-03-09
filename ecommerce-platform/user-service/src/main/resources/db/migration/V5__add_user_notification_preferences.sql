ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS order_updates_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS account_alerts_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS marketing_emails_enabled boolean NOT NULL DEFAULT false;
