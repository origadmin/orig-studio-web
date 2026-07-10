import React, {useState, useEffect} from 'react';
import {Outlet} from '@tanstack/react-router';
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

    return (
        <div className="min-h-screen bg-background transition-colors flex flex-col">
            <Header
                onToggleSidebar={toggleSidebar}
                sidebarCollapsed={sidebarCollapsed}
                darkMode={isDark}
                onToggleDarkMode={toggleDark}
            />

            <CategoryChips/>

            <Sidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebar}
            />

            <main
                className="pt-14 min-h-screen transition-all duration-300 bg-background relative z-10 flex-1"
                style={{
                    marginLeft: isDesktop ? (sidebarCollapsed ? 72 : 240) : 0
                }}
            >
                <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
                    <Outlet/>
                </div>
                <Footer/>
            </main>
            <UploadDialog/>
        </div>
    );
};

export default PortalLayout;