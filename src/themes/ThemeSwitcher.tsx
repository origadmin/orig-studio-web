/**
 * ThemeSwitcher - UI component for theme and color mode selection.
 *
 * Displays theme cards grouped by category with color preview swatches.
 * Integrates with useTheme hook for state management.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './useTheme';
import type { ThemeMeta, ThemeCategory } from './types';
import { Check, Loader2, Sun, Moon, Monitor } from 'lucide-react';

const CATEGORY_LABEL_KEYS: Record<ThemeCategory, string> = {
  professional: 'theme.categoryProfessional',
  social: 'theme.categorySocial',
  creative: 'theme.categoryCreative',
  minimal: 'theme.categoryMinimal',
  custom: 'theme.categoryCustom',
};

const COLOR_MODE_OPTIONS = [
  { value: 'light' as const, labelKey: 'theme.modeLight', icon: Sun },
  { value: 'dark' as const, labelKey: 'theme.modeDark', icon: Moon },
  { value: 'system' as const, labelKey: 'theme.modeSystem', icon: Monitor },
];

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { themeId, setTheme, colorMode, setColorMode, themes, isLoading } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  // Group themes by category
  const grouped = themes.reduce<Record<string, ThemeMeta[]>>((acc, theme) => {
    const cat = theme.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(theme);
    return acc;
  }, {});

  const categories = Object.keys(grouped) as ThemeCategory[];

  const handleThemeSwitch = async (id: string) => {
    if (id === themeId) return;
    setSwitchingTo(id);
    try {
      await setTheme(id);
    } finally {
      setSwitchingTo(null);
    }
  };

  const displayThemes =
    activeCategory === 'all' ? themes : grouped[activeCategory] || [];

  return (
    <div className="space-y-6">
      {/* Color mode toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{t('theme.appearanceMode')}</span>
        <div className="flex rounded-lg border p-1">
          {COLOR_MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setColorMode(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  colorMode === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {t('theme.allCategories')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {t(CATEGORY_LABEL_KEYS[cat] || cat)}
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={themeId === theme.id}
            isSwitching={switchingTo === theme.id}
            onSelect={() => handleThemeSwitch(theme.id)}
          />
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('theme.loadingThemes')}
        </div>
      )}
    </div>
  );
}



function ThemeCard({
  theme,
  isActive,
  isSwitching,
  onSelect,
}: {
  theme: ThemeMeta;
  isActive: boolean;
  isSwitching: boolean;
  onSelect: () => void;
}) {
  const preview = theme.preview as Record<string, string>;

  // Use CSS variables for accurate theme color representation
  const gradient1 = preview['primary-900'] || preview.primary || 'hsl(var(--primary))';
  const gradient2 = preview.primary || 'hsl(var(--primary))';
  const gradient3 = preview.accent || 'hsl(var(--info))';

  // Get swatch colors (5 distinct component colors)
  const swatch1 = preview['primary-900'] || preview.primary || 'hsl(var(--primary))';
  const swatch2 = preview['primary-700'] || preview['primary-600'] || preview.primary || 'hsl(var(--primary))';
  const swatch3 = preview['primary-500'] || preview.primary || 'hsl(var(--primary))';
  const swatch4 = preview['primary-300'] || preview.accent || 'hsl(var(--info))';
  const swatch5 = preview['primary-100'] || preview.accent || 'hsl(var(--muted))';

  return (
    <button
      onClick={onSelect}
      disabled={isSwitching}
      className={`relative flex flex-col rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
        isActive
          ? 'border-primary ring-4 ring-primary/10 shadow-sm'
          : 'border-border hover:border-primary/30'
      } ${isSwitching ? 'opacity-70 cursor-wait' : ''}`}
    >
      {isActive && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {isSwitching && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-muted rounded-full flex items-center justify-center">
          <Loader2 className="w-3 h-3 animate-spin" />
        </div>
      )}

      {theme.thumbnail ? (
        <img
          src={`/themes/${theme.id}/${theme.thumbnail}`}
          alt={theme.name}
          className="w-full h-16 object-cover rounded-lg mb-3"
        />
      ) : (
        <div className="mb-3">
          {/* Gradient bar */}
          <div className="h-7 rounded-lg overflow-hidden mb-2">
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(to right, ${gradient1}, ${gradient2}, ${gradient3})`,
              }}
            />
          </div>
          {/* Key swatches - no selection highlight */}
          <div className="flex gap-1">
            <div
              key="swatch1"
              className="flex-1 h-4 rounded-sm"
              style={{ backgroundColor: swatch1 }}
            />
            <div
              key="swatch2"
              className="flex-1 h-4 rounded-sm"
              style={{ backgroundColor: swatch2 }}
            />
            <div
              key="swatch3"
              className="flex-1 h-4 rounded-sm"
              style={{ backgroundColor: swatch3 }}
            />
            <div
              key="swatch4"
              className="flex-1 h-4 rounded-sm"
              style={{ backgroundColor: swatch4 }}
            />
            <div
              key="swatch5"
              className="flex-1 h-4 rounded-sm"
              style={{ backgroundColor: swatch5 }}
            />
          </div>
        </div>
      )}

      <span className="text-sm font-medium">{theme.name}</span>
      {theme.description && (
        <span className="text-xs text-muted-foreground line-clamp-1">{theme.description}</span>
      )}
    </button>
  );
}
