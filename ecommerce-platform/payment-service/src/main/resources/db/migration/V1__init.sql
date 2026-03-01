CREATE TABLE IF NOT EXISTS payment_transactions (
    id                 VARCHAR(36)    PRIMARY KEY,
    order_id           VARCHAR(255)   NOT NULL,
    user_id            VARCHAR(255)   NOT NULL,
    amount             NUMERIC(12, 2) NOT NULL,
    currency           VARCHAR(10)    NOT NULL,
    provider           VARCHAR(255)   NOT NULL,
    provider_reference VARCHAR(255),
    status             VARCHAR(50)    NOT NULL,
    created_at         TIMESTAMPTZ    NOT NULL
);
