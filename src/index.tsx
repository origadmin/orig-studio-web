import React, {StrictMode, useContext, useRef, useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider, createRouter} from '@tanstack/react-router';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'sonner';
import {AuthProvider} from '@/contexts/auth';
import {AuthContext} from '@/contexts/auth/AuthContext';
import {NotificationProvider} from '@/contexts/NotificationContext';
import {UploadProvider} from '@/contexts/UploadContext';
import {ThemeProvider} from '@/themes';
import {routeTree} from './routes.gen';
import {plainParseSearch, plainStringifySearch} from '@/lib/router-search';
import './i18n';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof createRouter<typeof routeTree>>;
    }
}

function InnerApp() {
    const auth = useContext(AuthContext);
    if (!auth) throw new Error('InnerApp must be used within AuthProvider');

    const authRef = useRef(auth);
    authRef.current = auth;

    const router = useMemo(() => createRouter({
        routeTree,
        context: {get auth() { return authRef.current; }},
        defaultPreload: 'intent',
        pathParamsAllowedCharacters: ['@'],
        // BUG-183: default serializer JSON-quotes JSON-parseable strings, so the
        // tag `1` produced ?v="1". Plain strings must stay verbatim in the URL.
        parseSearch: plainParseSearch,
        stringifySearch: plainStringifySearch,
    }), []);

    return <RouterProvider router={router}/>;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <UploadProvider>
                        <NotificationProvider>
                            <InnerApp/>
                        </NotificationProvider>
                    </UploadProvider>
                </AuthProvider>
                <Toaster position="bottom-right" richColors closeButton/>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
