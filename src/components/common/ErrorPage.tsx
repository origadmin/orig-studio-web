import React from 'react';
import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from '@/components/ui/empty';
import {useTranslation} from 'react-i18next';

interface ErrorPageProps {
    statusCode?: number;
    title?: string;
    message?: string;
    showBackButton?: boolean;
    backButtonText?: string;
    backButtonPath?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
    statusCode,
    title,
    message,
    showBackButton = true,
    backButtonText,
    backButtonPath = '/',
}) => {
    const {t} = useTranslation();

    const defaultTitle = statusCode === 404 ? t('error.404Title') : t('error.genericTitle');
    const defaultMessage = statusCode === 404 ? t('error.404Message') : t('error.genericMessage');
    const defaultBackButtonText = t('error.backToHome');

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <Empty>
                <EmptyHeader>
                    {statusCode && (
                        <EmptyMedia variant="icon">
                            <span className="text-2xl font-bold text-destructive">{statusCode}</span>
                        </EmptyMedia>
                    )}
                    <EmptyTitle>{title || defaultTitle}</EmptyTitle>
                    <EmptyDescription>{message || defaultMessage}</EmptyDescription>
                </EmptyHeader>
                {showBackButton && (
                    <EmptyContent>
                        <Button asChild size="lg" className="px-6">
                            <Link to={backButtonPath}>
                                {backButtonText || defaultBackButtonText}
                            </Link>
                        </Button>
                    </EmptyContent>
                )}
            </Empty>
        </div>
    );
};

export default ErrorPage;
