import {Spinner} from "@/components/ui/spinner"
import {createFileRoute} from '@tanstack/react-router';
import {lazy, Suspense} from 'react';

// BUG-307: same as me/channels — the redirect target (?tab=videos) is the
// profile tab, not the management page, so MyVideos was never reachable.
const Page = lazy(() => import('@/pages/home/me/MyVideos'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] bg-background text-foreground">
        <Spinner/>
    </div>
);

export const Route = createFileRoute('/_authenticated/_portal/me/videos')({
    component: () => (
        <Suspense fallback={<PageLoader/>}>
            <Page/>
        </Suspense>
    ),
});
