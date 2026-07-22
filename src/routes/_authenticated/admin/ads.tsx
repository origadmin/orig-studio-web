import {createFileRoute} from '@tanstack/react-router';
import {useEffect} from 'react';

// D2（G6-3 重构）：独立 /admin/ads 页已废弃，重定向到唯一标准展示页（门户配置 → 广告管理）。
// 广告管理现已收编进 Portal 标准页，创意一次定义、可复用到多个广告位。
export const Route = createFileRoute('/_authenticated/admin/ads')({
    component: () => {
        useEffect(() => {
            window.location.replace('/admin/portal?tab=ad-management');
        }, []);
        return null;
    },
});
