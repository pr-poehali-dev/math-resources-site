import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  type: string;
}

const API_URL = 'https://functions.poehali.dev/4350c782-6bfa-4c53-b148-e1f621446eaa';

const categories = ['5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс', 'ОГЭ', 'ЕГЭ'];
const types = ['Методичка', 'Тренажёр', 'Рабочий лист'];

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '5 класс',
    type: 'Методичка'
  });

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price),
        ...(editingProduct && { id: editingProduct.id })
      };

      const response = await fetch(API_URL, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingProduct ? 'Товар обновлён' : 'Товар добавлен');
        setIsDialogOpen(false);
        resetForm();
        loadProducts();
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return;

    try {
      await fetch(API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      toast.success('Товар удалён');
      loadProducts();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      type: product.type
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      description: '',
      price: '',
      category: '5 класс',
      type: 'Методичка'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <Icon name="Settings" size={24} className="text-primary" />
              <h1 className="text-xl font-bold">Админ-панель</h1>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Icon name="Plus" size={18} className="mr-2" />
                Добавить товар
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Редактировать' : 'Добавить'} товар</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о материале
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Название</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="price">Цена (₽)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category">Категория</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type">Тип</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Все товары</h2>
          <p className="text-muted-foreground">Всего: {products.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{product.category}</Badge>
                  <Badge variant="outline">{product.type}</Badge>
                </div>
                <CardTitle className="text-lg">{product.title}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between items-center gap-2">
                <p className="text-xl font-bold">{product.price} ₽</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(product)}
                  >
                    <Icon name="Pencil" size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="Package" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Нет товаров. Добавьте первый!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
