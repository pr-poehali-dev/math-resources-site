-- SQL скрипт для удаления дублирующихся заказов
-- Выполните этот скрипт в интерфейсе управления базой данных

-- Шаг 1: Удаляем связанные записи в order_items для дублированных заказов
DELETE FROM t_p99209851_math_resources_site.order_items
WHERE order_id IN (
  SELECT o.id 
  FROM t_p99209851_math_resources_site.orders o
  INNER JOIN (
    SELECT payment_id, MIN(id) as first_order_id
    FROM t_p99209851_math_resources_site.orders
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) duplicates ON o.payment_id = duplicates.payment_id
  WHERE o.id != duplicates.first_order_id
);

-- Шаг 2: Удаляем дублирующиеся заказы, оставляя только самый первый (с минимальным id)
DELETE FROM t_p99209851_math_resources_site.orders
WHERE id IN (
  SELECT o.id 
  FROM t_p99209851_math_resources_site.orders o
  INNER JOIN (
    SELECT payment_id, MIN(id) as first_order_id
    FROM t_p99209851_math_resources_site.orders
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) duplicates ON o.payment_id = duplicates.payment_id
  WHERE o.id != duplicates.first_order_id
);

-- Проверка результата: должны остаться только уникальные payment_id
SELECT payment_id, COUNT(*) as count 
FROM t_p99209851_math_resources_site.orders 
WHERE payment_id IS NOT NULL 
GROUP BY payment_id 
HAVING COUNT(*) > 1;
