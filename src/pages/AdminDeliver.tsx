import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const AdminDeliver = () => {
  const [loading, setLoading] = useState(false);
  const [email] = useState('svobodny.khudojnik@yandex.ru');
  const [orderId] = useState('3');

  const handleDeliver = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/fa6783b1-aae1-4057-8f19-8f9ccb0665f1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: email,
          order_id: parseInt(orderId)
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Письмо отправлено на ${email}!`);
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
            <p className="text-sm text-gray-600 mb-2">Заказ №{orderId} (Метод площадей)</p>
          </div>
          
          <Button onClick={handleDeliver} disabled={loading} className="w-full">
            {loading ? 'Отправка...' : 'Отправить письмо с материалами'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeliver;