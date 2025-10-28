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
import SEO from '@/components/SEO';

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
  const [searchQuery, setSearchQuery] = useState('');
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
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [purchasedProductIds, setPurchasedProductIds] = useState<number[]>([]);

  useEffect(() => {
    // Add Yandex verification meta tag
    const meta = document.createElement('meta');
    meta.name = 'yandex-verification';
    meta.content = 'bc4ced2e8c5210d7';
    document.head.appendChild(meta);

    loadProducts();
    const token = localStorage.getItem('user_token');
    const email = localStorage.getItem('user_email');
    if (token && email) {
      setIsLoggedIn(true);
      setCurrentUserEmail(email);
      loadPurchasedProducts(email);
    }

    return () => {
      // Cleanup meta tag on unmount
      const existingMeta = document.querySelector('meta[name="yandex-verification"]');
      if (existingMeta) existingMeta.remove();
    };
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      console.log('Index page - loaded product with id=1:', data.find((p: any) => p.id === 1)?.description);
      setProducts(data);
    } catch (error) {
      toast.error('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasedProducts = async (email: string) => {
    try {
      const response = await fetch(`https://functions.poehali.dev/3a1ed603-9a84-4270-a759-a900fcc8d5b3?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (response.ok && data.purchases) {
        const productIds = data.purchases.map((p: any) => p.product_id);
        setPurchasedProductIds(productIds);
      }
    } catch (error) {
      console.error('Ошибка загрузки покупок');
    }
  };

  const filteredProducts = products
    .filter(p => selectedCategory === 'Все' || p.category === selectedCategory)
    .filter(p => searchQuery === '' || p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      toast.info('Товар уже в корзине');
      return;
    }
    setCart(prev => [...prev, { ...product, quantity: 1 }]);
    toast.success(`${product.title} добавлен в корзину`);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.info('Товар удалён из корзины');
  };

  const totalItems = cart.length;
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const hasDiscount = totalItems >= 10;
  const discountPercent = 15;
  const discountAmount = hasDiscount ? Math.round(subtotal * discountPercent / 100) : 0;
  const totalPrice = subtotal - discountAmount;

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
      <SEO 
        title="Тренажёры и методички по математике"
        description="Качественные методички, рабочие листы и тренажёры по математике для 5–11 классов. Эффективная подготовка к ОГЭ и ЕГЭ с ответами и без."
        keywords="математика, ОГЭ, ЕГЭ, тренажёры по математике, методички, рабочие листы, подготовка к экзаменам"
      />
      <div className="bg-primary text-primary-foreground py-2 text-center text-sm font-medium">
        🎉 Скидка 15% при покупке от 10 материалов!
      </div>
      
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

            {isLoggedIn ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-purchases')}>
                <Icon name="User" size={18} className="mr-2" />
                Личный кабинет
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/forgot-password')}>
                  <Icon name="KeyRound" size={18} className="mr-2" />
                  Восстановить пароль
                </Button>
                <Button variant="default" size="sm" onClick={() => setIsAuthDialogOpen(true)}>
                  <Icon name="LogIn" size={18} className="mr-2" />
                  Войти
                </Button>
              </>
            )}
          
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
                    {!hasDiscount && totalItems > 0 && totalItems < 10 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon name="Tag" size={16} />
                          <span className="font-semibold">Добавьте ещё {10 - totalItems} {(10 - totalItems) === 1 ? 'товар' : 'товара'} для скидки 15%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(totalItems / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {hasDiscount && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-900">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon name="PartyPopper" size={20} />
                          <span className="font-bold text-base">Скидка 15% активирована!</span>
                        </div>
                        <p className="text-sm">Ваша выгода: <span className="font-bold text-lg">{discountAmount} ₽</span></p>
                      </div>
                    )}
                    
                    <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Сумма:</span>
                        <span>{subtotal} ₽</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Скидка 15%:</span>
                          <span>-{discountAmount} ₽</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Итого:</span>
                        <span>{totalPrice} ₽</span>
                      </div>
                    </div>
                    
                    <Button className="w-full" size="lg" onClick={openCheckout}>
                      <Icon name="CreditCard" size={20} className="mr-2" />
                      Оформить заказ
                    </Button>
                    
                    <Separator />
                    
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
                            <Badge variant="outline">1 шт.</Badge>
                            <p className="font-bold">{item.price} ₽</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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

        <div className="mb-6 flex justify-center">
          <div className="relative max-w-md w-full">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по названию материала..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <Icon name="X" size={16} />
              </Button>
            )}
          </div>
        </div>

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
            <Card key={product.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{product.category}</Badge>
                  <Badge variant="outline">{product.type}</Badge>
                </div>
                <CardTitle className="text-lg">{product.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {product.description.split('\n').map((line, i) => (
                    <div key={i} className={line.trim() ? "mb-1" : "mb-2"}>{line || '\u00A0'}</div>
                  ))}
                </CardDescription>
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
                {(() => {
                  const isPurchased = purchasedProductIds.includes(product.id);
                  const isInCart = cart.find(item => item.id === product.id);
                  
                  if (isPurchased) {
                    return (
                      <Button
                        className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 cursor-default"
                        disabled
                      >
                        <Icon name="CheckCircle2" size={18} className="mr-2" />
                        Оплачен
                      </Button>
                    );
                  }
                  
                  if (isInCart) {
                    return (
                      <Button
                        className="bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-100 cursor-default"
                        disabled
                      >
                        <Icon name="ShoppingCart" size={18} className="mr-2" />
                        В корзине
                      </Button>
                    );
                  }
                  
                  return (
                    <Button onClick={() => addToCart(product)}>
                      <Icon name="ShoppingCart" size={18} className="mr-2" />
                      В корзину
                    </Button>
                  );
                })()}
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

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Войти или зарегистрироваться</DialogTitle>
            <DialogDescription>
              Получите доступ к своим покупкам в любое время
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Пароль</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Введите пароль"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                className="w-full" 
                onClick={async () => {
                  if (!loginEmail || !loginPassword) return;
                  try {
                    const response = await fetch('https://functions.poehali.dev/952cea32-e71e-48d7-8465-264417100e39', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'login',
                        email: loginEmail,
                        password: loginPassword
                      })
                    });
                    const data = await response.json();
                    if (response.ok && data.token) {
                      localStorage.setItem('user_token', data.token);
                      localStorage.setItem('user_email', data.email);
                      setIsLoggedIn(true);
                      setCurrentUserEmail(data.email);
                      setIsAuthDialogOpen(false);
                      loadPurchasedProducts(data.email);
                      toast.success('Вход выполнен успешно!');
                    } else {
                      toast.error(data.error || 'Ошибка входа');
                    }
                  } catch (error) {
                    toast.error('Ошибка при входе');
                  }
                }}
                disabled={!loginEmail || !loginPassword}
              >
                Войти
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate('/forgot-password')}
              >
                Забыли пароль?
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-register-name">Имя (необязательно)</Label>
                <Input
                  id="auth-register-name"
                  placeholder="Ваше имя"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-register-email">Email</Label>
                <Input
                  id="auth-register-email"
                  type="email"
                  placeholder="your@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-register-password">Пароль</Label>
                <Input
                  id="auth-register-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Все покупки сохранятся в вашем личном кабинете
              </p>

              <Button 
                className="w-full" 
                onClick={async () => {
                  if (!registerEmail || !registerPassword) return;
                  try {
                    const response = await fetch('https://functions.poehali.dev/952cea32-e71e-48d7-8465-264417100e39', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'register',
                        email: registerEmail,
                        password: registerPassword,
                        full_name: registerName
                      })
                    });
                    const data = await response.json();
                    if (response.ok && data.token) {
                      localStorage.setItem('user_token', data.token);
                      localStorage.setItem('user_email', data.email);
                      setIsLoggedIn(true);
                      setCurrentUserEmail(data.email);
                      setIsAuthDialogOpen(false);
                      toast.success('Регистрация выполнена успешно!');
                    } else {
                      toast.error(data.error || 'Ошибка регистрации');
                    }
                  } catch (error) {
                    toast.error('Ошибка при регистрации');
                  }
                }}
                disabled={!registerEmail || !registerPassword}
              >
                Зарегистрироваться
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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