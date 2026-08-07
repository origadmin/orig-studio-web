import React, {useState, useEffect} from 'react';
import {Outlet, useLocation} from '@tanstack/react-router';
import Header from '@/components/portal/Header';
import Sidebar from '@/components/portal/Sidebar';
import CategoryChips from '@/components/portal/CategoryChips';
import Footer from '@/components/portal/Footer';
import UploadDialog from '@/components/upload/UploadDialog';
import {useTheme} from '@/themes';

const PortalLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const {isDark, toggleDark} = useTheme();
    const location = useLocation();

    // BUG-170: 顶部分类 chips 只在首页显示（首页是分类聚合入口，YouTube 式）。
    // 其他页面各有导航语义——/browse 有完整筛选区、/tags 有标签云、/search 有结果，
    // 全站每页顶部分类排是噪音（用户反馈「乱、不美观」）。
    const hideCategoryChips = location.pathname !== '/';

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed') === 'true';
        setSidebarCollapsed(saved);
    }, []);

    useEffect(() => {
        const checkScreen = () => setIsDesktop(window.innerWidth >= 768);
        checkScreen();
        window.addEventListener('resize', checkScreen);
        return () => window.removeEventListener('resize', checkScreen);
    }, []);

    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem('sidebarCollapsed', String(next));
    };

    const sidebarWidth = isDesktop ? (sidebarCollapsed ? 72 : 240) : 0;

    return (
        <div className="min-h-screen bg-background transition-colors flex flex-col">
            <Header
                onToggleSidebar={toggleSidebar}
                onOpenMobileSidebar={toggleSidebar}
                sidebarCollapsed={sidebarCollapsed}
                darkMode={isDark}
                onToggleDarkMode={toggleDark}
            />

            <Sidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebar}
            />

            <main
                className="min-h-screen transition-all duration-300 bg-background relative z-10 flex-1 flex flex-col"
                style={{
                    marginLeft: sidebarWidth,
                    paddingTop: 56,
                }}
            >
                {!hideCategoryChips && (
                    <div className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
                        <CategoryChips embedded={true}/>
                    </div>
                )}
                <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 flex-1">
                    <Outlet/>
                </div>
                <Footer/>
            </main>
            <UploadDialog/>
        </div>
    );
};

export default PortalLayout;
