import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  trainer1_url?: string;
  trainer2_url?: string;
  trainer3_url?: string;
  is_free?: boolean;
  preview_image_url?: string;
}

const API_URL = 'https://functions.poehali.dev/4350c782-6bfa-4c53-b148-e1f621446eaa';

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    const email = localStorage.getItem('user_email');
    if (token && email) {
      setIsLoggedIn(true);
      loadProduct(email);
    } else {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async (email?: string) => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      const foundProduct = data.find((p: Product) => p.id === Number(id));
      
      if (foundProduct) {
        setProduct(foundProduct);
        
        if (email) {
          const purchasesResponse = await fetch(`https://functions.poehali.dev/3a1ed603-9a84-4270-a759-a900fcc8d5b3?email=${encodeURIComponent(email)}`);
          const purchasesData = await purchasesResponse.json();
          
          if (purchasesResponse.ok && purchasesData.purchases) {
            const purchased = purchasesData.purchases.some((p: any) => p.product_id === Number(id));
            setIsPurchased(purchased);
          }
        }
      } else {
        navigate('/');
        toast.error('Товар не найден');
      }
    } catch (error) {
      toast.error('Ошибка загрузки товара');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!product) return;
    
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = currentCart.find((item: any) => item.id === product.id);
    
    if (existing) {
      toast.info('Товар уже в корзине');
    } else {
      currentCart.push({ ...product, quantity: 1 });
      localStorage.setItem('cart', JSON.stringify(currentCart));
      toast.success(`${product.title} добавлен в корзину`);
    }
    
    navigate('/');
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = currentCart.find((item: any) => item.id === product.id);
    
    if (!existing) {
      currentCart.push({ ...product, quantity: 1 });
      localStorage.setItem('cart', JSON.stringify(currentCart));
    }
    
    navigate('/?checkout=true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const getProductImageUrl = () => {
    if (product.preview_image_url) return product.preview_image_url;
    if (product.type === 'Тренажёр') {
      return 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80';
  };

  return (
    <>
      <SEO
        title={product.title}
        description={product.description}
        keywords={`${product.category}, ${product.type}, математика, образование`}
        image={getProductImageUrl()}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Вернуться к каталогу
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <img
                src={getProductImageUrl()}
                alt={product.title}
                className="w-full h-auto rounded-lg shadow-lg object-cover"
              />
              
              {product.sample_pdf_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(product.sample_pdf_url, '_blank')}
                >
                  <Icon name="FileText" className="mr-2 h-4 w-4" />
                  Посмотреть образец
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{product.category}</Badge>
                  <Badge variant="outline">{product.type}</Badge>
                  {product.is_free && <Badge className="bg-green-500">Бесплатно</Badge>}
                  {isPurchased && <Badge className="bg-blue-500">Куплено</Badge>}
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>
                
                <p className="text-gray-700 text-lg whitespace-pre-line">{product.description}</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-purple-600">{product.price} ₽</span>
                </div>

                {isPurchased ? (
                  <div className="space-y-2">
                    <p className="text-green-600 font-medium flex items-center gap-2">
                      <Icon name="CheckCircle" className="h-5 w-5" />
                      Вы уже купили этот товар
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate('/my-purchases')}
                    >
                      Перейти к покупкам
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                      onClick={handleBuyNow}
                    >
                      <Icon name="ShoppingCart" className="mr-2 h-5 w-5" />
                      Купить сейчас
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={addToCart}
                    >
                      Добавить в корзину
                    </Button>
                  </div>
                )}
              </div>

              {!isLoggedIn && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <Icon name="Info" className="inline mr-2 h-4 w-4" />
                    Войдите в аккаунт, чтобы получить доступ к покупкам
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Product;
