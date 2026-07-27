import {createFileRoute} from '@tanstack/react-router';
import {lazy, Suspense} from 'react';
import {Spinner} from '@/components/ui/spinner';

const ProfileHomePage = lazy(() => import('@/components/profile/ProfileHomePage'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg"/>
    </div>
);

export const Route = createFileRoute('/_portal/$handle/')({
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
