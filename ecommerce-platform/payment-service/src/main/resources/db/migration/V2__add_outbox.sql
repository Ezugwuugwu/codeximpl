CREATE TABLE IF NOT EXISTS outbox_events (
    id          BIGSERIAL    PRIMARY KEY,
    exchange    VARCHAR(255) NOT NULL,
    routing_key VARCHAR(255) NOT NULL,
    payload     TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox_events (created_at);
