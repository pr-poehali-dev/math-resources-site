-- Создание таблицы для токенов сброса пароля
CREATE TABLE IF NOT EXISTS t_p99209851_math_resources_site.password_reset_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_email ON t_p99209851_math_resources_site.password_reset_tokens(email);
CREATE INDEX idx_password_reset_tokens_token ON t_p99209851_math_resources_site.password_reset_tokens(token);