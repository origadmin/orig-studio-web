import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { profileApi } from '@/lib/api/user';
import { useTheme } from '@/themes/useTheme';
import type { ColorMode } from '@/themes/types';
import { Sun, Moon, Monitor } from 'lucide-react';

const themeOptions: { mode: ColorMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'appearanceLight' },
  { mode: 'dark', icon: Moon, label: 'appearanceDark' },
  { mode: 'system', icon: Monitor, label: 'appearanceSystem' },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文简体' },
  { value: 'ja', label: '日本語' },
];

export default function AppearancePage() {
  const { t, i18n } = useTranslation();
  const { colorMode, setColorMode } = useTheme();
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [savingLang, setSavingLang] = useState(false);

  useEffect(() => {
    setLanguage(i18n.language || 'en');
  }, [i18n.language]);

  const handleThemeChange = async (mode: ColorMode) => {
    setColorMode(mode);
    try {
      await profileApi.updateSetting({ theme: mode });
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setSavingLang(true);
    setLanguage(lang);
    try {
      await i18n.changeLanguage(lang);
      await profileApi.updateSetting({ language: lang });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingLang(false);
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    setTimezone(tz);
    try {
      await profileApi.updateSetting({ timezone: tz });
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('appearanceTheme')}</CardTitle>
          <CardDescription>{t('appearanceThemeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.mode}
                onClick={() => handleThemeChange(option.mode)}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
                  colorMode === option.mode
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <option.icon
                  className={cn(
                    'w-8 h-8',
                    colorMode === option.mode ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm font-medium">{t(option.label)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('appearanceLanguage')}</CardTitle>
          <CardDescription>{t('appearanceLanguageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="language-select" className="sr-only">
              {t('appearanceLanguage')}
            </Label>
            <select
              id="language-select"
              value={language}
              disabled={savingLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="flex h-9 w-full rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('appearanceTimezone')}</CardTitle>
          <CardDescription>{t('appearanceTimezoneDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="timezone-select" className="sr-only">
              {t('appearanceTimezone')}
            </Label>
            <select
              id="timezone-select"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="flex h-9 w-full rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Intl.supportedValuesOf?.('timeZone')?.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              )) || (
                <option value={timezone}>{timezone}</option>
              )}
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}