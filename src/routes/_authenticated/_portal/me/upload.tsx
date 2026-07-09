import {createFileRoute, Navigate} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/upload')({
    component: () => <Navigate to="/me/videos" replace />,
});
