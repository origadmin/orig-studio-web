import {Spinner} from "@/components/ui/spinner"
import {createFileRoute} from '@tanstack/react-router';
import {lazy, Suspense} from 'react';

// BUG-307: this route used to redirect to /@<user>?tab=channels, but the
// profile "my channels" tab was removed in REDESIGN-B r3 (it duplicated the
// videos tab), so the redirect landed on the videos tab and the channel
// management page became unreachable. Render the management page directly.
const Page = lazy(() => import('@/pages/home/me/MyChannels'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] bg-background text-foreground">
        <Spinner/>
    </div>
);

export const Route = createFileRoute('/_authenticated/_portal/me/channels')({
    component: () => (
        <Suspense fallback={<PageLoader/>}>
            <Page/>
        </Suspense>
    ),
});
