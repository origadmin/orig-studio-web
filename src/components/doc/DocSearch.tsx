/**
 * DocSearch - Documentation-style search component.
 * Used in both DocHeader (inline) and HeroSection (standalone).
 * This is a simple search input that navigates to /search?q=xxx.
 *
 * Migrated to compose shadcn Input (via InputGroup pattern) with the lucide
 * Search icon. Public prop signature (variant, className) is preserved.
 */
import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

interface DocSearchProps {
  variant?: 'header' | 'hero';
  className?: string;
}

const DocSearch: React.FC<DocSearchProps> = ({ variant = 'header', className = '' }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate({ to: '/search', search: { q: search } });
    }
  };

  if (variant === 'hero') {
    return (
      <form onSubmit={handleSearch} className={`w-full max-w-md mx-auto ${className}`}>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('doc.searchDocs')}
            className="pl-11 pr-4 h-11 rounded-xl shadow-sm"
          />
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSearch} className={`flex-1 max-w-lg mx-auto ${className}`}>
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
  );
};

export default DocSearch;
