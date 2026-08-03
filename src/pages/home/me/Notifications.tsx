/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Notifications Page
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import NotificationCenter from '@/components/common/NotificationCenter';

const NotificationsPage = () => {
    const {t} = useTranslation();
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-foreground">{t('notifications.title')}</h1>
            <NotificationCenter/>
        </div>
    );
};

export default NotificationsPage;
