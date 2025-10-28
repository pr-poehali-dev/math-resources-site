import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';

interface Order {
  id: number;
  guest_email: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
}

interface OrderItem {
  product_id: number;
  product_title: string;
  quantity: number;
  price: number;
}

const API_URL = 'https://functions.poehali.dev/e69706f3-b187-4b9b-804d-1bbad6464463';

const OrdersHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadOrders();
  }, [navigate]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      toast.error('Ошибка загрузки истории заказов');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      paid: { label: 'Оплачен', variant: 'default' },
      pending: { label: 'Ожидает оплаты', variant: 'secondary' },
      failed: { label: 'Не оплачен', variant: 'destructive' }
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalRevenue = orders
    .filter(order => order.payment_status === 'paid')
    .reduce((sum, order) => sum + order.total_price, 0);

  const totalOrders = orders.length;
  const paidOrders = orders.filter(order => order.payment_status === 'paid').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon name="Loader2" className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="История заказов"
        description="Просмотр всех заказов и статистика продаж"
      />
      
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <Icon name="Receipt" size={24} className="text-primary" />
              <h1 className="text-xl font-bold">История заказов</h1>
            </div>
          </div>
          <Button variant="outline" onClick={loadOrders}>
            <Icon name="RefreshCw" size={18} className="mr-2" />
            Обновить
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Всего заказов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Оплаченных</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{paidOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Выручка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRevenue} ₽</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Icon name="ShoppingBag" size={48} className="text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Заказов пока нет</p>
                <p className="text-sm text-muted-foreground">Когда появятся первые заказы, они отобразятся здесь</p>
              </CardContent>
            </Card>
          ) : (
            orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Заказ #{order.id}</CardTitle>
                        {getStatusBadge(order.payment_status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Icon name="Mail" size={14} />
                          {order.guest_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="Calendar" size={14} />
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{order.total_price} ₽</div>
                    </div>
                  </div>
                </CardHeader>
                
                {order.items && order.items.length > 0 && (
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 rounded-full p-2">
                              <Icon name="FileText" size={16} className="text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{item.product_title}</div>
                              <div className="text-sm text-muted-foreground">Количество: {item.quantity}</div>
                            </div>
                          </div>
                          <div className="font-medium">{item.price} ₽</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default OrdersHistory;