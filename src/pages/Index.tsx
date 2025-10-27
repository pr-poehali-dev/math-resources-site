import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  type: string;
  sample_pdf_url?: string;
  full_pdf_with_answers_url?: string;
  full_pdf_without_answers_url?: string;
}

interface CartItem extends Product {
  quantity: number;
}

const API_URL = 'https://functions.poehali.dev/4350c782-6bfa-4c53-b148-e1f621446eaa';

const categories = ['Все', '5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс', 'ОГЭ', 'ЕГЭ'];

const Index = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory === 'Все' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.title} добавлен в корзину`);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.info('Товар удалён из корзины');
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleGuestCheckout = async () => {
    if (!guestEmail || cart.length === 0) return;
    
    setCheckoutLoading(true);
    try {
      const orderDescription = cart.map(item => `${item.title} (${item.quantity} шт.)`).join(', ');
      const returnUrl = window.location.origin + '/';
      
      const productIds = cart.map(item => item.id);
      
      const response = await fetch('https://functions.poehali.dev/c3183bd5-f862-4c83-bf32-b86987ab972c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPrice,
          description: orderDescription,
          return_url: returnUrl,
          customer_email: guestEmail,
          product_ids: productIds
        })
      });
      
      const data = await response.json();
      
      if (data.payment_url) {
        localStorage.setItem('pending_order', JSON.stringify({ cart, email: guestEmail }));
        window.location.href = data.payment_url;
      } else {
        toast.error('Ошибка создания платежа');
      }
    } catch (error) {
      toast.error('Ошибка при оплате');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRegisterCheckout = async () => {
    if (!registerEmail || !registerPassword || cart.length === 0) return;
    
    setCheckoutLoading(true);
    try {
      const authResponse = await fetch('https://functions.poehali.dev/952cea32-e71e-48d7-8465-264417100e39', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: registerEmail,
          password: registerPassword,
          full_name: registerName
        })
      });
      
      const authData = await authResponse.json();
      
      if (authResponse.ok && authData.token) {
        localStorage.setItem('user_token', authData.token);
        localStorage.setItem('user_email', authData.email);
        
        const orderDescription = cart.map(item => `${item.title} (${item.quantity} шт.)`).join(', ');
        const returnUrl = window.location.origin + '/my-purchases';
        const productIds = cart.map(item => item.id);
        
        const response = await fetch('https://functions.poehali.dev/c3183bd5-f862-4c83-bf32-b86987ab972c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPrice,
            description: orderDescription,
            return_url: returnUrl,
            customer_email: registerEmail,
            product_ids: productIds
          })
        });
        
        const data = await response.json();
        
        if (data.payment_url) {
          localStorage.setItem('pending_order', JSON.stringify({ cart, user_id: authData.user_id }));
          window.location.href = data.payment_url;
        } else {
          toast.error('Ошибка создания платежа');
        }
      } else {
        toast.error(authData.error || 'Ошибка регистрации');
      }
    } catch (error) {
      toast.error('Ошибка при оформлении');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="GraduationCap" size={28} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Математическая кухня</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <Icon name="Settings" size={18} className="mr-2" />
              Админка
            </Button>
          
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Icon name="ShoppingCart" size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-white flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Корзина</SheetTitle>
                <SheetDescription>
                  {totalItems > 0 ? `Товаров в корзине: ${totalItems}` : 'Корзина пуста'}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-8 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Icon name="ShoppingBag" size={48} className="mb-4 opacity-50" />
                    <p>Добавьте товары в корзину</p>
                  </div>
                ) : (
                  <>
                    {cart.map(item => (
                      <Card key={item.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Icon name="Trash2" size={16} />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Icon name="Minus" size={14} />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Icon name="Plus" size={14} />
                              </Button>
                            </div>
                            <p className="font-bold">{item.price * item.quantity} ₽</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Separator className="my-6" />
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Итого:</span>
                        <span>{totalPrice} ₽</span>
                      </div>
                      
                      <Button className="w-full" size="lg" onClick={openCheckout}>
                        <Icon name="CreditCard" size={20} className="mr-2" />
                        Оформить заказ
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <section className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Учебные материалы по математике</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Методички, рабочие листы и тренажёры для 5–11 классов, подготовка к ОГЭ и ЕГЭ
          </p>
        </section>

        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className="transition-all"
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Icon name="Loader2" size={48} className="mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{product.category}</Badge>
                  <Badge variant="outline">{product.type}</Badge>
                </div>
                <CardTitle className="text-lg">{product.title}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {product.sample_pdf_url && product.sample_pdf_url.trim() !== '' && (
                  <a
                    href={product.sample_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Icon name="FileText" size={16} />
                    Скачать бесплатный образец (PDF)
                  </a>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <p className="text-2xl font-bold">{product.price} ₽</p>
                <Button 
                  onClick={() => addToCart(product)}
                >
                  <Icon name="ShoppingCart" size={18} className="mr-2" />
                  В корзину
                </Button>
              </CardFooter>
            </Card>
          ))}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t bg-white py-8">
        <div className="container text-center text-sm text-muted-foreground space-y-4">
          <div className="flex justify-center gap-4 items-center flex-wrap">
            <div className="px-3 py-2 bg-white border rounded flex items-center gap-2">
              <svg className="h-6" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="60" height="24" rx="4" fill="#4B57A5"/>
                <text x="30" y="15" fontFamily="Arial" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">СБП</text>
              </svg>
              <span className="text-xs font-medium text-foreground">СБП</span>
            </div>
            <div className="px-3 py-2 bg-white border rounded flex items-center gap-2">
              <svg className="h-5" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="32" fill="white"/>
                <path d="M18 11L20 21H23L21 11H18Z" fill="#1434CB"/>
                <path d="M30 11L28 21H31L33 11H30Z" fill="#FAA61A"/>
              </svg>
              <span className="text-xs font-medium text-foreground">Visa</span>
            </div>
            <div className="px-3 py-2 bg-white border rounded flex items-center gap-2">
              <svg className="h-5" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="16" r="10" fill="#EB001B"/>
                <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
              </svg>
              <span className="text-xs font-medium text-foreground">Mastercard</span>
            </div>
            <div className="px-3 py-2 bg-white border rounded flex items-center gap-2">
              <svg className="h-5" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="32" fill="white"/>
                <circle cx="16" cy="16" r="8" fill="#4DB45E"/>
                <circle cx="32" cy="16" r="8" fill="#0F754E"/>
              </svg>
              <span className="text-xs font-medium text-foreground">МИР</span>
            </div>
          </div>
          <div className="flex justify-center">
            <a 
              href="https://vk.com/mk_room" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Icon name="MessageCircle" size={18} />
              Обратная связь ВКонтакте
            </a>
          </div>
          <div className="space-y-1">
            <p>© 2024 Математическая кухня | Тренажёры по математике</p>
            <p>ИП Александрова Людмила Геннадьевна</p>
            <p>ИНН: 820100655703</p>
          </div>
        </div>
      </footer>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Оформление заказа</DialogTitle>
            <DialogDescription>
              Сумма к оплате: {totalPrice} ₽
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="guest" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guest">Без регистрации</TabsTrigger>
              <TabsTrigger value="register">С аккаунтом</TabsTrigger>
            </TabsList>

            <TabsContent value="guest" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email для получения материалов</Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="your@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  После оплаты материалы придут на этот email
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleGuestCheckout}
                disabled={checkoutLoading || !guestEmail}
              >
                {checkoutLoading ? 'Обработка...' : 'Перейти к оплате'}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Имя (необязательно)</Label>
                <Input
                  id="register-name"
                  placeholder="Ваше имя"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Пароль</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Создайте аккаунт — все покупки сохранятся в разделе "Мои покупки"
              </p>

              <Button 
                className="w-full" 
                onClick={handleRegisterCheckout}
                disabled={checkoutLoading || !registerEmail || !registerPassword}
              >
                {checkoutLoading ? 'Обработка...' : 'Создать аккаунт и оплатить'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;