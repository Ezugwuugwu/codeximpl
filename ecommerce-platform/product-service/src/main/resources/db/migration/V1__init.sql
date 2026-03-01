CREATE TABLE IF NOT EXISTS products (
    id          BIGSERIAL      PRIMARY KEY,
    name        VARCHAR(255)   NOT NULL,
    description VARCHAR(2000)  NOT NULL,
    price       NUMERIC(12, 2) NOT NULL,
    stock       INTEGER        NOT NULL,
    category    VARCHAR(255)   NOT NULL,
    active      BOOLEAN        NOT NULL DEFAULT TRUE,
    updated_at  TIMESTAMPTZ    NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
    product_id BIGINT NOT NULL REFERENCES products(id),
    image_url  TEXT   NOT NULL
);
