import {createFileRoute, useNavigate} from '@tanstack/react-router';
import {useEffect} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Spinner} from '@/components/ui/spinner';

function MePlaylistsRedirect() {
    const navigate = useNavigate();
    const {user, isLoading} = useAuth();

    useEffect(() => {
        if (user?.username) {
            navigate({
                to: '/$handle/$tab',
                params: {handle: `@${user.username}`, tab: 'playlists'},
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

export const Route = createFileRoute('/_authenticated/_portal/me/playlists')({
    component: MePlaylistsRedirect,
});
