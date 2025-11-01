import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
  trainer1_url?: string;
  trainer2_url?: string;
  trainer3_url?: string;
  is_free?: boolean;
  preview_image_url?: string;
}

const API_URL = 'https://functions.poehali.dev/4350c782-6bfa-4c53-b148-e1f621446eaa';

const categories = ['5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс', 'ОГЭ', 'ЕГЭ'];
const types = ['Методичка', 'Тренажёр', 'Рабочий лист', 'Презентация'];

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stats, setStats] = useState<{ total_products: number; total_files: number } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '5 класс',
    type: 'Методичка',
    sample_pdf_url: '',
    full_pdf_with_answers_url: '',
    full_pdf_without_answers_url: '',
    trainer1_url: '',
    trainer2_url: '',
    trainer3_url: '',
    is_free: false,
    preview_image_url: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadProducts();
    loadStats();
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

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}?stats=true`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики');
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

      const token = localStorage.getItem('auth_token');
      const response = await fetch(API_URL, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': token || ''
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingProduct ? 'Товар обновлён' : 'Товар добавлен');
        setIsDialogOpen(false);
        resetForm();
        await loadProducts();
        await loadStats();
      } else {
        toast.error('Ошибка сохранения');
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
      const token = localStorage.getItem('auth_token');
      await fetch(API_URL, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': token || ''
        },
        body: JSON.stringify({ id })
      });
      toast.success('Товар удалён');
      loadProducts();
      loadStats();
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
      type: product.type,
      sample_pdf_url: product.sample_pdf_url || '',
      full_pdf_with_answers_url: product.full_pdf_with_answers_url || '',
      full_pdf_without_answers_url: product.full_pdf_without_answers_url || '',
      trainer1_url: product.trainer1_url || '',
      trainer2_url: product.trainer2_url || '',
      trainer3_url: product.trainer3_url || '',
      is_free: product.is_free || false,
      preview_image_url: product.preview_image_url || ''
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
      type: 'Методичка',
      sample_pdf_url: '',
      full_pdf_with_answers_url: '',
      full_pdf_without_answers_url: '',
      trainer1_url: '',
      trainer2_url: '',
      trainer3_url: '',
      is_free: false,
      preview_image_url: ''
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 5MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, preview_image_url: base64 });
        toast.success('Изображение загружено');
        setUploadingImage(false);
      };
      reader.onerror = () => {
        toast.error('Ошибка чтения файла');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки изображения');
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    navigate('/login');
    toast.info('Вы вышли из системы');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Админ-панель"
        description="Управление каталогом материалов по математике"
      />
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name="Settings" size={24} className="text-primary" />
              <h1 className="text-xl font-bold">Админ-панель</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {stats && (
              <div className="flex items-center gap-6 px-4 py-2 bg-primary/5 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.total_products}</div>
                  <div className="text-xs text-muted-foreground">товаров</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.total_files}</div>
                  <div className="text-xs text-muted-foreground">файлов</div>
                </div>
              </div>
            )}
            <Button variant="outline" onClick={() => navigate('/')}>
              <Icon name="Home" size={18} className="mr-2" />
              На главную
            </Button>
            <Button variant="outline" onClick={() => navigate('/orders-history')}>
              <Icon name="Receipt" size={18} className="mr-2" />
              История заказов
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти
            </Button>
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                      placeholder="Например: 1 стр - кликабельное оглавление, 2-3 стр - теория. 4-5 стр - примеры. 6 стр - задачи на готовых чертежах, 7-8 страница - задания (20 штук), 9 страница - ответы, 10 страница - список литературы."
                      rows={5}
                      required
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Опишите структуру материала — это поможет покупателям понять, что они получат
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="is_free"
                        checked={formData.is_free}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_free: !!checked })}
                      />
                      <Label htmlFor="is_free" className="cursor-pointer font-medium">
                        Бесплатный материал
                      </Label>
                    </div>
                    
                    {!formData.is_free && (
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
                    )}
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

                  <div className="grid gap-2">
                    <Label htmlFor="preview_image_url">Превью товара (важно!)</Label>
                    <div className="relative">
                      <Input
                        id="preview_image_url"
                        type="url"
                        placeholder="Вставьте ссылку на картинку"
                        value={formData.preview_image_url}
                        onChange={(e) => setFormData({ ...formData, preview_image_url: e.target.value })}
                        className="pr-10"
                      />
                      {formData.preview_image_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, preview_image_url: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="text-xs bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                      <p className="font-medium text-blue-900">📸 Как добавить картинку:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Откройте <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="underline font-medium">postimages.org</a> в новой вкладке</li>
                        <li>Нажмите "Choose images" и выберите вашу картинку</li>
                        <li>Дождитесь загрузки (5-10 секунд)</li>
                        <li>Найдите поле "Direct link" и нажмите "Copy"</li>
                        <li>Вернитесь сюда и вставьте ссылку в поле выше</li>
                      </ol>
                      <p className="text-blue-700 text-xs italic">✓ Бесплатно, без регистрации, картинки не удаляются</p>
                    </div>
                    {formData.preview_image_url && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Предпросмотр:</p>
                        <img 
                          src={formData.preview_image_url} 
                          alt="Превью" 
                          className="h-32 w-auto rounded border object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).alt = '❌ Неверная ссылка';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sample_pdf_url">Ссылка на бесплатный образец (необязательно)</Label>
                    <div className="relative">
                      <Input
                        id="sample_pdf_url"
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={formData.sample_pdf_url}
                        onChange={(e) => setFormData({ ...formData, sample_pdf_url: e.target.value })}
                        className="pr-10"
                      />
                      {formData.sample_pdf_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, sample_pdf_url: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Бесплатный образец (1-2 листа) — виден всем посетителям
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="full_pdf_with_answers_url">Ссылка на файл с ответами (необязательно)</Label>
                    <div className="relative">
                      <Input
                        id="full_pdf_with_answers_url"
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={formData.full_pdf_with_answers_url}
                        onChange={(e) => setFormData({ ...formData, full_pdf_with_answers_url: e.target.value })}
                        className="pr-10"
                      />
                      {formData.full_pdf_with_answers_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, full_pdf_with_answers_url: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Если указано — доступен только после оплаты. Если пусто — товар бесплатный
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="full_pdf_without_answers_url">Ссылка на файл без ответов (необязательно)</Label>
                    <div className="relative">
                      <Input
                        id="full_pdf_without_answers_url"
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={formData.full_pdf_without_answers_url}
                        onChange={(e) => setFormData({ ...formData, full_pdf_without_answers_url: e.target.value })}
                        className="pr-10"
                      />
                      {formData.full_pdf_without_answers_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, full_pdf_without_answers_url: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Если указано — доступен только после оплаты. Если пусто — товар бесплатный
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold">Бесплатные тренажёры</Label>
                    <p className="text-xs text-muted-foreground mb-3">Дополнительные бесплатные материалы для этого товара</p>
                    
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="trainer1_url">Тренажёр №1 (необязательно)</Label>
                        <div className="relative">
                          <Input
                            id="trainer1_url"
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={formData.trainer1_url}
                            onChange={(e) => setFormData({ ...formData, trainer1_url: e.target.value })}
                            className="pr-10"
                          />
                          {formData.trainer1_url && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, trainer1_url: '' })}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="trainer2_url">Тренажёр №2 (необязательно)</Label>
                        <div className="relative">
                          <Input
                            id="trainer2_url"
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={formData.trainer2_url}
                            onChange={(e) => setFormData({ ...formData, trainer2_url: e.target.value })}
                            className="pr-10"
                          />
                          {formData.trainer2_url && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, trainer2_url: '' })}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="trainer3_url">Тренажёр №3 (необязательно)</Label>
                        <div className="relative">
                          <Input
                            id="trainer3_url"
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={formData.trainer3_url}
                            onChange={(e) => setFormData({ ...formData, trainer3_url: e.target.value })}
                            className="pr-10"
                          />
                          {formData.trainer3_url && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, trainer3_url: '' })}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Icon name={showPreview ? "EyeOff" : "Eye"} size={18} className="mr-2" />
                      {showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр'}
                    </Button>
                    
                    {showPreview && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-3">Так увидят покупатели:</p>
                        <Card className="hover:shadow-lg transition-shadow flex flex-col">
                          {formData.preview_image_url && (
                            <div className="w-full aspect-[3/4] overflow-hidden rounded-t-lg">
                              <img 
                                src={formData.preview_image_url} 
                                alt={formData.title || 'Превью'} 
                                className="w-full h-full object-contain bg-white"
                              />
                            </div>
                          )}
                          <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant="secondary">{formData.category}</Badge>
                              <Badge variant="outline">{formData.type}</Badge>
                            </div>
                            <CardTitle className="text-lg">{formData.title || 'Название товара'}</CardTitle>
                            <CardDescription className="text-sm leading-relaxed">
                              {(formData.description || 'Описание товара').split('\n').map((line, i) => (
                                <div key={i} className={line.trim() ? "mb-1" : "mb-2"}>{line || '\u00A0'}</div>
                              ))}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {formData.sample_pdf_url && (
                              <div className="flex items-center gap-2 text-sm text-primary">
                                <Icon name="FileText" size={16} />
                                Скачать бесплатный образец (PDF)
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="flex justify-between items-center">
                            {formData.is_free ? (
                              <p className="text-2xl font-bold text-green-600">Бесплатно</p>
                            ) : (
                              <p className="text-2xl font-bold">{formData.price || '0'} ₽</p>
                            )}
                            <Button>
                              <Icon name="ShoppingCart" size={18} className="mr-2" />
                              В корзину
                            </Button>
                          </CardFooter>
                        </Card>
                      </div>
                    )}
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