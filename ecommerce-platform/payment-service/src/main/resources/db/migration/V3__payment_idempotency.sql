-- Enforce at most one APPROVED transaction per order at the database level.
-- DECLINED transactions are excluded so the user can retry after a failed payment.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_transactions_approved_order
    ON payment_transactions (order_id)
    WHERE status = 'APPROVED';
