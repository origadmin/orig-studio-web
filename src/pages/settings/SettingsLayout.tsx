import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { User, Lock, Palette, Sliders } from 'lucide-react';

const navItems = [
  { to: '/settings/profile', icon: User, label: 'profileTitle' },
  { to: '/settings/password', icon: Lock, label: 'passwordTitle' },
  { to: '/settings/appearance', icon: Palette, label: 'appearanceTitle' },
  { to: '/settings/preferences', icon: Sliders, label: 'preferencesTitle' },
];

export default function SettingsLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <nav className="md:w-48 shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}