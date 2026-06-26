/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * Transcoding parent route — Renders child routes via Outlet.
 * Redirects to profiles page only when visiting the exact parent path.
 */

import {useEffect} from 'react';
import {Outlet, useNavigate, useLocation} from '@tanstack/react-router';

export default function Transcoding() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Only redirect when exactly at /admin/transcoding (no child route)
        if (location.pathname === '/admin/transcoding') {
            navigate({to: '/admin/transcoding/profiles', replace: true});
        }
    }, [navigate, location.pathname]);

    return <Outlet/>;
}
