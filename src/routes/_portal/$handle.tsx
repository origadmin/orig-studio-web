import {Spinner} from "@/components/ui/spinner"
import {createFileRoute} from '@tanstack/react-router';
import {lazy, Suspense} from 'react';

const ProfileHomePage = lazy(() => import('@/components/profile/ProfileHomePage'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] bg-background text-foreground">
        <Spinner/>
    </div>
);

export const Route = createFileRoute('/_portal/$handle')({
    component: () => {
        const {handle} = Route.useParams();
        const username = handle.startsWith('@') ? handle.slice(1) : handle;
        return (
            <Suspense fallback={<PageLoader/>}>
                <ProfileHomePage username={username}/>
            </Suspense>
        );
    },
});
