/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * LanguageSwitcher: Dropdown menu for switching between supported languages.
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import {Globe, Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';

interface LanguageOption {
    code: string;
    label: string;
    nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
    {code: 'zh', label: 'Chinese', nativeLabel: '中文'},
    {code: 'en', label: 'English', nativeLabel: 'English'},
    {code: 'ja', label: 'Japanese', nativeLabel: '日本語'},
];

interface LanguageSwitcherProps {
    className?: string;
    buttonClassName?: string;
    variant?: 'default' | 'compact';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
    className,
    buttonClassName,
    variant = 'default',
}) => {
    const {i18n} = useTranslation();
    const currentLanguage = i18n.language;

    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
    };

    const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size={variant === 'compact' ? 'icon' : 'icon'}
                    className={cn(
                        variant === 'compact' ? 'h-8 w-8' : 'h-10 w-10',
                        buttonClassName,
                    )}
                    aria-label={currentLang.nativeLabel}
                >
                    <Globe className={cn(variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5', 'text-primary')}/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={className}>
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className="flex items-center justify-between gap-4 cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <span className="text-sm font-medium">{lang.nativeLabel}</span>
                            <span className="text-xs text-muted-foreground">{lang.label}</span>
                        </span>
                        {currentLanguage === lang.code && (
                            <Check className="h-4 w-4 text-primary"/>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSwitcher;
