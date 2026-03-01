-- Partial index covering only active products, ordered by updated_at descending.
-- Matches the pagination query exactly: WHERE active = TRUE ORDER BY updated_at DESC LIMIT n
-- This makes paginated product listing near-instant regardless of total table size.
CREATE INDEX IF NOT EXISTS idx_products_active_updated_at
    ON products (updated_at DESC)
    WHERE active = TRUE;
