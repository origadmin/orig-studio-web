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

    const hideCategoryChips = location.pathname.startsWith('/categories') ||
        location.pathname.startsWith('/me') ||
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/upload');

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
