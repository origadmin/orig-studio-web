import {Spinner} from "@/components/ui/spinner"
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const Page = lazy(() => import('@/pages/home/Watch'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] bg-background text-foreground">
        <Spinner />
    </div>
);

export const Route = createFileRoute('/_portal/watch')({
    validateSearch: (search: Record<string, unknown>): {
        v: string | undefined;
        autoplay?: string | undefined;
        /** Playlist context for continuous playback (BUG-197, playlist design 2.3). */
        playlist?: string | undefined;
        /** 0-based position inside the playlist. */
        index?: string | undefined;
        /** Shuffle mode: play the playlist in a seeded random order (BUG-371). */
        shuffle?: string | undefined;
        /** Loop mode: wrap to the first item after the last (BUG-371). */
        loop?: string | undefined;
        /** Deterministic shuffle seed so the order is stable across navigations. */
        shuffleSeed?: string | undefined;
    } => {
        const strip = (value: unknown) => (value ? String(value).replace(/["']/g, '').trim() : undefined);
        return {
            v: strip(search.v),
            autoplay: strip(search.autoplay),
            playlist: strip(search.playlist),
            index: strip(search.index),
            shuffle: strip(search.shuffle),
            loop: strip(search.loop),
            shuffleSeed: strip(search.shuffleSeed),
        };
    },
    component: () => <Suspense fallback={<PageLoader />}><Page /></Suspense>,
});
