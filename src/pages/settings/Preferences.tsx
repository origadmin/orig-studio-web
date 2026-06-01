import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { profileApi } from '@/lib/api/user';
import { Loader2 } from 'lucide-react';

interface Preferences {
  email_notifications: boolean;
  push_notifications: boolean;
  comment_reply: boolean;
  new_subscriber: boolean;
  profile_visibility: string;
  show_activity: boolean;
  show_subscriptions: boolean;
  default_quality: string;
  autoplay: boolean;
  notify_likes: boolean;
}

const defaultPreferences: Preferences = {
  email_notifications: true,
  push_notifications: true,
  comment_reply: true,
  new_subscriber: false,
  profile_visibility: 'public',
  show_activity: true,
  show_subscriptions: false,
  default_quality: 'auto',
  autoplay: true,
  notify_likes: true,
};

export default function PreferencesPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);

  const fetchPreferences = useCallback(async () => {
    try {
      const setting = await profileApi.getSetting();
      const saved = setting.preferences || {};
      setPrefs({
        ...defaultPreferences,
        ...Object.fromEntries(
          Object.entries(saved).map(([k, v]) => [k, v === 'true' ? true : v === 'false' ? false : v])
        ),
      });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const toggle = (key: keyof Preferences) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const setValue = (key: keyof Preferences, value: string) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stringPrefs: Record<string, string> = {};
      for (const [k, v] of Object.entries(prefs)) {
        stringPrefs[k] = typeof v === 'boolean' ? v.toString() : v;
      }
      await profileApi.updateSetting({ preferences: stringPrefs });
      toast.success(t('prefSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
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
          <CardTitle>{t('prefNotifications')}</CardTitle>
          <CardDescription>{t('prefNotificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">{t('prefEmailNotifications')}</Label>
            <Switch
              id="email-notifications"
              checked={prefs.email_notifications}
              onCheckedChange={() => toggle('email_notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications">{t('prefPushNotifications')}</Label>
            <Switch
              id="push-notifications"
              checked={prefs.push_notifications}
              onCheckedChange={() => toggle('push_notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="comment-reply">{t('prefCommentReply')}</Label>
            <Switch
              id="comment-reply"
              checked={prefs.comment_reply}
              onCheckedChange={() => toggle('comment_reply')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-subscriber">{t('prefNewSubscriber')}</Label>
            <Switch
              id="new-subscriber"
              checked={prefs.new_subscriber}
              onCheckedChange={() => toggle('new_subscriber')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('prefPrivacy')}</CardTitle>
          <CardDescription>{t('prefPrivacyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="profile-visibility">{t('prefProfileVisibility')}</Label>
            <select
              id="profile-visibility"
              value={prefs.profile_visibility}
              onChange={(e) => setValue('profile_visibility', e.target.value)}
              className="flex h-9 w-40 rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="public">{t('common.public')}</option>
              <option value="private">{t('common.private')}</option>
              <option value="followers">{t('prefFollowersOnly')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-activity">{t('prefShowActivity')}</Label>
            <Switch
              id="show-activity"
              checked={prefs.show_activity}
              onCheckedChange={() => toggle('show_activity')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-subscriptions">{t('prefShowSubscriptions')}</Label>
            <Switch
              id="show-subscriptions"
              checked={prefs.show_subscriptions}
              onCheckedChange={() => toggle('show_subscriptions')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('prefPlayback')}</CardTitle>
          <CardDescription>{t('prefPlaybackDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="default-quality">{t('prefDefaultQuality')}</Label>
            <select
              id="default-quality"
              value={prefs.default_quality}
              onChange={(e) => setValue('default_quality', e.target.value)}
              className="flex h-9 w-40 rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="autoplay">{t('prefAutoplay')}</Label>
            <Switch
              id="autoplay"
              checked={prefs.autoplay}
              onCheckedChange={() => toggle('autoplay')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-likes">{t('prefNotifyLikes')}</Label>
            <Switch
              id="notify-likes"
              checked={prefs.notify_likes}
              onCheckedChange={() => toggle('notify_likes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('prefSave')}
        </Button>
      </div>
    </div>
  );
}