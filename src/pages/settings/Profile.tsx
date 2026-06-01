import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { profileApi, userApi } from '@/lib/api/user';
import { Camera, Loader2 } from 'lucide-react';

const ORIGSTUDIO_URL = 'origstudio.com/@';

export default function ProfilePage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [user, setUser] = useState<{
    username: string;
    nickname: string;
    email: string;
    phone: string;
    bio: string;
    location: string;
    avatar: string;
  }>({
    username: '',
    nickname: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    avatar: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      const [profile, me] = await Promise.all([
        profileApi.getProfile(),
        userApi.getMe(),
      ]);
      setUser({
        username: me.username || '',
        nickname: me.nickname || '',
        email: me.email || '',
        phone: me.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        avatar: me.avatar || profile.avatar || '',
      });
      setAvatarUrl(me.avatar || profile.avatar || '');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await profileApi.uploadAvatar(file);
      setAvatarUrl(res.avatar_url);
      toast.success(t('avatarUpload'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateProfile({
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
      });
      toast.success(t('profileSave'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profileTitle')}</CardTitle>
          <CardDescription>{t('profileDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} alt={user.nickname || user.username} />
                <AvatarFallback className="text-2xl">
                  {(user.nickname || user.username || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t('avatarChange')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nickname">{t('profileNickname')}</Label>
              <Input
                id="nickname"
                value={user.nickname}
                onChange={(e) => setUser((p) => ({ ...p, nickname: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('profileEmail')}</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                onChange={(e) => setUser((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('profilePhone')}</Label>
              <Input
                id="phone"
                value={user.phone}
                onChange={(e) => setUser((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">{t('profileBio')}</Label>
              <Textarea
                id="bio"
                rows={3}
                value={user.bio}
                onChange={(e) => setUser((p) => ({ ...p, bio: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t('profileLocation')}</Label>
              <Input
                id="location"
                value={user.location}
                onChange={(e) => setUser((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profileSlug')}</CardTitle>
          <CardDescription>{t('profileSlugDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm">
            <span className="text-muted-foreground">{ORIGSTUDIO_URL}</span>
            <span className="font-medium">{user.username}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}>
          {t('profileReset')}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('profileSave')}
        </Button>
      </div>
    </div>
  );
}