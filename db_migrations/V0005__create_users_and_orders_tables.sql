-- Создаём таблицу пользователей (покупателей)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаём таблицу заказов
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    guest_email VARCHAR(255),
    total_price INTEGER NOT NULL,
    payment_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_or_guest CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- Создаём таблицу товаров в заказе
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    product_title VARCHAR(255) NOT NULL,
    product_price INTEGER NOT NULL,
    full_pdf_url TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
CREATE INDEX idx_orders_payment_id ON orders(payment_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);