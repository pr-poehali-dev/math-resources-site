import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Purchase {
  id: number;
  product_title: string;
  product_price: number;
  full_pdf_with_answers_url: string;
  full_pdf_without_answers_url: string;
  created_at: string;
}

const MyPurchases = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const userEmail = localStorage.getItem('user_email');

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token) {
      navigate('/');
      toast.error('Войдите в аккаунт');
      return;
    }
    loadPurchases();
  }, [navigate]);

  const loadPurchases = async () => {
    try {
      // TODO: Создать backend функцию для загрузки покупок
      // Пока показываем пустой список
      setPurchases([]);
    } catch (error) {
      toast.error('Ошибка загрузки покупок');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_email');
    navigate('/');
    toast.info('Вы вышли из аккаунта');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <Icon name="GraduationCap" size={28} className="text-primary" />
            <h1 className="text-2xl font-bold">Мои покупки</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{userEmail}</div>
            <Button variant="ghost" onClick={handleLogout}>
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {loading ? (
          <div className="text-center py-12">
            <Icon name="Loader2" size={48} className="mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="ShoppingBag" size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Пока нет покупок</h2>
            <p className="text-muted-foreground mb-6">
              Купленные материалы появятся здесь после оплаты
            </p>
            <Button onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" size={18} className="mr-2" />
              Вернуться к каталогу
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{purchase.product_title}</CardTitle>
                  <CardDescription>
                    Куплено: {new Date(purchase.created_at).toLocaleDateString('ru-RU')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{purchase.product_price} ₽</Badge>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Оплачено
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {purchase.full_pdf_with_answers_url && (
                        <a
                          href={purchase.full_pdf_with_answers_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full">
                            <Icon name="Download" size={18} className="mr-2" />
                            Скачать с ответами
                          </Button>
                        </a>
                      )}
                      
                      {purchase.full_pdf_without_answers_url && (
                        <a
                          href={purchase.full_pdf_without_answers_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full" variant="outline">
                            <Icon name="Download" size={18} className="mr-2" />
                            Скачать без ответов
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPurchases;