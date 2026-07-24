import {createFileRoute, useNavigate} from '@tanstack/react-router';
import {useEffect} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Spinner} from '@/components/ui/spinner';

function MeIndexRedirect() {
    const navigate = useNavigate();
    const {user, isLoading} = useAuth();

    useEffect(() => {
        if (user?.username) {
            navigate({
                to: '/$handle/$tab',
                params: {handle: `@${user.username}`, tab: 'videos'},
                replace: true,
            });
        }
    }, [user?.username, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    return null;
}

export const Route = createFileRoute('/_authenticated/_portal/me/')({
    component: MeIndexRedirect,
});
