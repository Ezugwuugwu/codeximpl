CREATE TABLE otp_verifications (
    id         BIGSERIAL    PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    otp        VARCHAR(6)   NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON otp_verifications(email);
