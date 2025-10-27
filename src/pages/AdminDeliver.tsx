import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const AdminDeliver = () => {
  const [loading, setLoading] = useState(false);
  const [email] = useState('svobodny.khudojnik@yandex.ru');
  const [productId] = useState('12');
  const [amount] = useState('10');

  const handleDeliver = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/4cad51da-a7d3-49bf-a277-98b51b37e58c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          product_ids: [parseInt(productId)],
          amount: parseFloat(amount)
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Заказ №${data.order_id} создан! Письмо отправлено на ${email}`);
      } else {
        toast.error(data.error || 'Ошибка отправки');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Ручная отправка товара</CardTitle>
          <CardDescription>Отправка товара "Метод площадей"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Email: {email}</p>
            <p className="text-sm text-gray-600 mb-2">Товар ID: {productId} (Метод площадей)</p>
            <p className="text-sm text-gray-600 mb-4">Сумма: {amount}₽</p>
          </div>
          
          <Button onClick={handleDeliver} disabled={loading} className="w-full">
            {loading ? 'Отправка...' : 'Отправить товар на почту'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeliver;
