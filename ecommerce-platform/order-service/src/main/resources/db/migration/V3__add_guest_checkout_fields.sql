ALTER TABLE customer_orders
    ADD COLUMN IF NOT EXISTS guest_checkout BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS customer_first_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS customer_last_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shipping_street_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(120);

UPDATE customer_orders
SET customer_email = user_id
WHERE customer_email IS NULL OR customer_email = '';
