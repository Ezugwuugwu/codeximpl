CREATE TABLE IF NOT EXISTS customer_orders (
    id           VARCHAR(36)    PRIMARY KEY,
    user_id      VARCHAR(255)   NOT NULL,
    status       VARCHAR(50)    NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at   TIMESTAMPTZ    NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id           BIGSERIAL      PRIMARY KEY,
    order_id     VARCHAR(36)    NOT NULL REFERENCES customer_orders(id),
    product_id   BIGINT         NOT NULL,
    product_name VARCHAR(255)   NOT NULL,
    quantity     INTEGER        NOT NULL,
    unit_price   NUMERIC(12, 2) NOT NULL
);
