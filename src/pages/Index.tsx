import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
}

interface CartItem extends Product {
  quantity: number;
}

const products: Product[] = [
  { id: 1, title: 'Методичка "Дроби и проценты"', description: 'Полное руководство по работе с дробями', price: 299, category: '5 класс', type: 'Методичка' },
  { id: 2, title: 'Тренажёр "Уравнения"', description: '50 задач с решениями', price: 199, category: '6 класс', type: 'Тренажёр' },
  { id: 3, title: 'Рабочий лист "Геометрия"', description: 'Базовые фигуры и их свойства', price: 149, category: '7 класс', type: 'Рабочий лист' },
  { id: 4, title: 'Методичка "Квадратные уравнения"', description: 'Теория и практика решения', price: 349, category: '8 класс', type: 'Методичка' },
  { id: 5, title: 'Тренажёр "Функции"', description: 'Графики и свойства функций', price: 249, category: '9 класс', type: 'Тренажёр' },
  { id: 6, title: 'Подготовка к ОГЭ', description: 'Комплексный курс подготовки', price: 499, category: 'ОГЭ', type: 'Методичка' },
  { id: 7, title: 'Методичка "Тригонометрия"', description: 'От основ до сложных задач', price: 399, category: '10 класс', type: 'Методичка' },
  { id: 8, title: 'Тренажёр "Производные"', description: '100 задач разной сложности', price: 279, category: '11 класс', type: 'Тренажёр' },
  { id: 9, title: 'Подготовка к ЕГЭ', description: 'Полный курс с разбором типовых заданий', price: 599, category: 'ЕГЭ', type: 'Методичка' },
];

const categories = ['Все', '5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс', 'ОГЭ', 'ЕГЭ'];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="GraduationCap" size={28} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">МатМаркет</h1>
          </div>
          
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
                      
                      <Button className="w-full" size="lg">
                        <Icon name="CreditCard" size={20} className="mr-2" />
                        Оплатить
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
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
              <CardFooter className="flex justify-between items-center">
                <p className="text-2xl font-bold">{product.price} ₽</p>
                <Button onClick={() => addToCart(product)}>
                  <Icon name="ShoppingCart" size={18} className="mr-2" />
                  В корзину
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <footer className="mt-16 border-t bg-white py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 МатМаркет. Образовательные материалы по математике</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
