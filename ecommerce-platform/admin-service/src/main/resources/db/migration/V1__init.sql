CREATE TABLE IF NOT EXISTS live_sessions (
    session_id             VARCHAR(36)  PRIMARY KEY,
    ticket_id              VARCHAR(255) NOT NULL,
    name                   VARCHAR(255) NOT NULL,
    email                  VARCHAR(255) NOT NULL,
    issue                  TEXT,
    order_id               VARCHAR(255),
    preferred_contact      VARCHAR(50)  NOT NULL DEFAULT 'email',
    status                 VARCHAR(50)  NOT NULL DEFAULT 'QUEUED',
    assigned_agent_name    VARCHAR(255),
    assigned_queue         VARCHAR(255) NOT NULL DEFAULT 'General',
    estimated_wait_minutes INT          NOT NULL DEFAULT 5,
    created_at             TIMESTAMPTZ  NOT NULL,
    last_activity_at       TIMESTAMPTZ  NOT NULL,
    ended_at               TIMESTAMPTZ,
    ended_by               VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS live_messages (
    id          VARCHAR(36) PRIMARY KEY,
    session_id  VARCHAR(36) NOT NULL REFERENCES live_sessions(session_id),
    author      VARCHAR(50) NOT NULL,
    sender_name VARCHAR(255),
    text        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions (status);
CREATE INDEX IF NOT EXISTS idx_live_messages_session ON live_messages (session_id, created_at);
