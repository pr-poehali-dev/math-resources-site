import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Введите email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/92d2b35e-cf32-49d8-abac-c8312f15c71c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_reset',
          email
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        toast.success('Письмо с инструкциями отправлено на почту');
      } else {
        toast.error(data.error || 'Ошибка при отправке');
      }
    } catch (error) {
      toast.error('Ошибка при отправке запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO 
        title="Восстановление пароля"
        description="Восстановите доступ к вашему аккаунту"
      />
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit mb-4"
            onClick={() => navigate('/')}
          >
            <Icon name="ArrowLeft" size={18} className="mr-2" />
            На главную
          </Button>
          
          <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
          <CardDescription>
            {sent 
              ? 'Проверьте вашу почту' 
              : 'Введите email для восстановления доступа'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="Mail" size={32} className="text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Письмо с инструкциями отправлено на <strong>{email}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Не получили письмо? Проверьте папку "Спам"
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Вернуться на главную
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={18} className="mr-2" />
                    Отправить инструкции
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
