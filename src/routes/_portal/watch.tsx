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
        /**
         * Series context (2026-09-21 ruling). Explicit and highest priority:
         * it outranks both `?playlist=` and the implicit series lookup.
         */
        series?: string | undefined;
        /** 0-based position inside the playlist, or the episode's position inside the series. */
        index?: string | undefined;
    } => {
        const strip = (value: unknown) => (value ? String(value).replace(/["']/g, '').trim() : undefined);
        return {
            v: strip(search.v),
            autoplay: strip(search.autoplay),
            playlist: strip(search.playlist),
            series: strip(search.series),
            index: strip(search.index),
        };
    },
    component: () => <Suspense fallback={<PageLoader />}><Page /></Suspense>,
});
