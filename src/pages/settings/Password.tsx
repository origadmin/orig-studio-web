import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { userApi } from '@/lib/api/user';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  const labels = ['', 'weak', 'fair', 'good', 'strong'];
  return { score, label: labels[score] };
}

const requirements = [
  { key: 'reqMinLength', test: (p: string) => p.length >= 8 },
  { key: 'reqUpperLower', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'reqNumber', test: (p: string) => /\d/.test(p) },
  { key: 'reqSpecialChar', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function PasswordPage() {
  const { t } = useTranslation();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const strengthPercent = useMemo(() => (strength.score / 4) * 100, [strength.score]);
  const passwordsMatch = !confirmPassword || confirmPassword === newPassword;
  const canSubmit = oldPassword && newPassword && confirmPassword && passwordsMatch && strength.score > 0;

  const handleChangePassword = async () => {
    if (!canSubmit) return;
    setChanging(true);
    try {
      await userApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success(t('password.successTitle'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('password.changeFailed'));
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('password.title')}</CardTitle>
          <CardDescription>{t('password.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="old-password">{t('password.oldPassword')}</Label>
            <div className="relative">
              <Input
                id="old-password"
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={t('password.oldPasswordPlaceholder')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-password">{t('password.newPassword')}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('password.newPasswordPlaceholder')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {newPassword && (
              <div className="space-y-2 mt-1">
                <Progress value={strengthPercent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {t(`password.strength.${strength.label}`)}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">{t('password.confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('password.confirmPasswordPlaceholder')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmPassword && (
              <p className={`text-xs ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                {passwordsMatch ? t('password.match') : t('password.mismatch')}
              </p>
            )}
          </div>

          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-sm font-medium mb-2">{t('password.requirements')}</p>
            <ul className="space-y-1.5">
              {requirements.map((req) => {
                const met = req.test(newPassword);
                return (
                  <li key={req.key} className="flex items-center gap-2 text-xs">
                    {met ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={met ? 'text-green-600' : 'text-muted-foreground'}>
                      {t(`password.${req.key}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleChangePassword} disabled={!canSubmit || changing}>
          {changing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('password.submit')}
        </Button>
      </div>
    </div>
  );
}