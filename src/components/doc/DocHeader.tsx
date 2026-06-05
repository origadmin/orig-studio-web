/**
 * DocHeader - Documentation-style top navigation bar.
 * Simpler than the YouTube-style Header: no QuickLinks, no Upload/Write buttons.
 * Includes: Logo + Site name | Search | Language switch | Dark mode toggle | User menu
 *
 * Migrated to compose shadcn Button + DropdownMenu for the user menu and
 * dark-mode toggle, with lucide icons only.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Search, Menu, Sun, Moon, LogIn, User, LogOut, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useModuleState } from '@/contexts/ModuleConfigContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface DocHeaderProps {
  onToggleSidebar?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const DocHeader: React.FC<DocHeaderProps> = ({ onToggleSidebar, darkMode, onToggleDarkMode }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { site } = useModuleState();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate({ to: '/search', search: { q: search } });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-background border-b z-50">
      <div className="h-full flex items-center px-4 gap-3">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="shrink-0 md:hidden h-8 w-8"
          aria-label={t('doc.toggleSidebar')}
        >
          <Menu size={18} />
        </Button>

        {/* Logo + Site name */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="text-base font-bold hidden sm:inline">
            {site.site_name || 'OrigStudio'}
          </span>
        </Link>

        {/* Search - centered, wider than YouTube style */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-auto">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('doc.searchDocs')}
              className="pl-9 pr-4 h-8 rounded-full bg-muted border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </form>

        {/* Right side controls */}
        <div className="flex items-center gap-1 shrink-0">
          {onToggleDarkMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDarkMode}
              className="h-8 w-8"
              title={darkMode ? t('nav.toggleLight') : t('nav.toggleDark')}
            >
              {darkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} />}
            </Button>
          )}
          <LanguageSwitcher />

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Avatar className="h-7 w-7">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                    ) : null}
                    <AvatarFallback>
                      <User size={14} />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">
                    {user.displayName || user.username}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <Shield size={14} className="mr-2" />
                      {t('nav.admin')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate({ to: '/' });
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut size={14} className="mr-2" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-8 rounded-full">
              <Link to="/auth/signin">
                <LogIn size={14} className="mr-1" />
                <span className="hidden sm:inline">{t('nav.login')}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default DocHeader;
