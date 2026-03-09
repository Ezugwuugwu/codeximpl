CREATE TABLE IF NOT EXISTS user_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    label VARCHAR(80) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(120) NOT NULL DEFAULT '',
    state VARCHAR(120) NOT NULL DEFAULT '',
    postal_code VARCHAR(40) NOT NULL DEFAULT '',
    country VARCHAR(120) NOT NULL DEFAULT 'Nigeria',
    default_address BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON user_addresses(user_id, default_address);

INSERT INTO user_addresses (user_id, label, street_address, city, state, postal_code, country, default_address, created_at, updated_at)
SELECT
    id,
    'Primary',
    TRIM(address),
    '',
    '',
    '',
    'Nigeria',
    TRUE,
    created_at,
    NOW()
FROM app_users
WHERE TRIM(COALESCE(address, '')) <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM user_addresses existing
      WHERE existing.user_id = app_users.id
  );
