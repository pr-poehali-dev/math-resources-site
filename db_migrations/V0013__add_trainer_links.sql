-- Добавление полей для трёх бесплатных тренажёров
ALTER TABLE products 
ADD COLUMN trainer1_url TEXT,
ADD COLUMN trainer2_url TEXT,
ADD COLUMN trainer3_url TEXT;