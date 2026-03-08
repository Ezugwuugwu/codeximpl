ALTER TABLE products
    ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_count INTEGER NOT NULL DEFAULT 0;

WITH image_stats AS (
    SELECT
        product_id,
        MIN(image_url) AS primary_image_url,
        COUNT(*)::INTEGER AS image_count
    FROM product_images
    GROUP BY product_id
)
UPDATE products AS p
SET primary_image_url = image_stats.primary_image_url,
    image_count = image_stats.image_count
FROM image_stats
WHERE p.id = image_stats.product_id;
