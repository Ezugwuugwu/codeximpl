CREATE TABLE IF NOT EXISTS support_messages (
    id          VARCHAR(36) PRIMARY KEY,
    reference   VARCHAR(32)  NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    subject     VARCHAR(255) NOT NULL,
    message     TEXT         NOT NULL,
    status      VARCHAR(50)  NOT NULL DEFAULT 'RECEIVED',
    created_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_email ON support_messages (email);
