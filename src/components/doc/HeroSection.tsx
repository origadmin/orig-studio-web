/**
 * HeroSection - Hero area for the Doc Home page.
 * Displays site name, description, and a search input.
 *
 * Migrated to compose the shadcn Card primitive as the hero surface.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useModuleState } from '@/contexts/ModuleConfigContext';
import { Card, CardContent } from '@/components/ui/card';
import DocSearch from '@/components/doc/DocSearch';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const { site } = useModuleState();

  return (
    <section className="py-12 md:py-16">
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="text-center p-0">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {site.site_name || 'OrigStudio'}
          </h1>
          {site.site_description && (
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {site.site_description}
            </p>
          )}
          <DocSearch variant="hero" />
        </CardContent>
      </Card>
    </section>
  );
};

export default HeroSection;
