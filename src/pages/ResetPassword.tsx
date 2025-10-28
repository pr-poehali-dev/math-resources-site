import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      toast.error('Недействительная ссылка');
      navigate('/');
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/92d2b35e-cf32-49d8-abac-c8312f15c71c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          token,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Пароль успешно изменён');
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast.error(data.error || 'Ошибка при смене пароля');
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
        title="Создание нового пароля"
        description="Создайте новый пароль для вашего аккаунта"
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
          
          <CardTitle className="text-2xl">Новый пароль</CardTitle>
          <CardDescription>
            {success ? 'Пароль успешно изменён' : 'Создайте новый пароль для входа'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="CheckCircle2" size={32} className="text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Вы будете перенаправлены на главную страницу...
              </p>
              <Button
                className="w-full"
                onClick={() => navigate('/')}
              >
                Перейти на главную
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Icon name="Key" size={18} className="mr-2" />
                    Сохранить новый пароль
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

export default ResetPassword;
