import React, {ReactNode} from 'react';

interface ContentWithSidebarProps {
    main: ReactNode;
    sidebar?: ReactNode;
    className?: string;
    mainClassName?: string;
    sidebarClassName?: string;
    stickyTop?: string;
}

export function ContentWithSidebar({
    main,
    sidebar,
    className = '',
    mainClassName = '',
    sidebarClassName = '',
    stickyTop = 'top-28',
}: ContentWithSidebarProps) {
    if (!sidebar) {
        return <div className={className}>{main}</div>;
    }

    return (
        <div className={`xl:flex xl:gap-6 ${className}`}>
            <div className={`flex-1 min-w-0 ${mainClassName}`}>
                {main}
            </div>
            <aside
                className={`mt-6 xl:mt-0 xl:w-72 xl:flex-shrink-0 ${sidebarClassName}`}
            >
                <div className={`xl:sticky ${stickyTop} space-y-4`}>
                    {sidebar}
                </div>
            </aside>
        </div>
    );
}
