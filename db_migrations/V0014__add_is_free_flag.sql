-- Добавление поля для отметки бесплатных материалов
ALTER TABLE products 
ADD COLUMN is_free BOOLEAN DEFAULT FALSE;