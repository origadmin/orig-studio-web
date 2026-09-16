import {createFileRoute} from '@tanstack/react-router';
import PlaylistsPage from '@/pages/home/me/Playlists';

// /me/playlists renders the dedicated playlists management page (create / edit /
// delete / empty state). It used to redirect to the profile playlists tab, which
// made the standalone management page unreachable — BUG-197.
export const Route = createFileRoute('/_authenticated/_portal/me/playlists')({
    component: PlaylistsPage,
});
